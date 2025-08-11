"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { User as CustomUser } from "@/types/types";
import { createClient } from "@/lib/supabase/client";
import { mapSupabaseUserToCustomUser } from "@/types/auth";
import {
  setupSessionMonitoring,
  initializeAuth,
  forceLogoutAndRedirect,
  validateUserSession,
  checkSessionExpiry,
} from "@/lib/auth-utils";
import {
  SESSION_CONFIG,
  initializeSessionTracking,
  clearSessionTracking,
  updateLastActivity,
} from "@/lib/session-config";
import {
  handleForceLogoutOnStart,
  getEffectiveSessionTimeout,
} from "@/lib/session-control";

interface UserContextType {
  user: CustomUser | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  supabaseUser: null,
  loading: true,
  refreshUser: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Enhanced user fetching with role data from user_profiles table
  const fetchUserWithProfile = useCallback(
    async (supaUser: SupabaseUser | null) => {
      if (!supaUser) {
        setUser(null);
        return null;
      }

      try {
        // Fetch user profile with role information
        const { data: userProfile, error } = await supabase
          .from("user_profiles")
          .select(
            `
          id,
          email,
          first_name,
          last_name,
          role_id,
          is_active,
          profile,
          created_at,
          updated_at,
          roles:roles(name)
        `
          )
          .eq("id", supaUser.id)
          .single();

        if (error) {
          console.warn("Error fetching user profile:", error);
          // Fallback to mapped Supabase user
          const mappedUser = mapSupabaseUserToCustomUser(supaUser);
          setUser(mappedUser);
          return mappedUser;
        }

        // Handle role data properly - check different possible structures
        let roleData = { name: "user" }; // Default role

        if (userProfile.roles) {
          if (
            Array.isArray(userProfile.roles) &&
            userProfile.roles.length > 0
          ) {
            roleData = { name: userProfile.roles[0].name };
          } else if (
            typeof userProfile.roles === "object" &&
            userProfile.roles !== null &&
            "name" in userProfile.roles
          ) {
            const roleName = userProfile.roles.name;
            roleData = {
              name: typeof roleName === "string" ? roleName : "user",
            };
          }
        }

        // Create enhanced user object with profile data
        const enhancedUser: CustomUser = {
          id: userProfile.id,
          email: userProfile.email || supaUser.email || "",
          first_name:
            userProfile.first_name || supaUser.user_metadata?.first_name || "",
          last_name:
            userProfile.last_name || supaUser.user_metadata?.last_name || "",
          profile:
            userProfile.profile || supaUser.user_metadata?.avatar_url || null,
          is_active: userProfile.is_active ?? true,
          created_at: userProfile.created_at,
          updated_at: userProfile.updated_at,
          role_id: userProfile.role_id,
          roles: roleData,
        };

        // Only log when role data is actually meaningful
        const roleChanged =
          user && user.roles?.name !== enhancedUser.roles?.name;
        if (roleChanged || !user) {
          console.log(
            `👤 User profile loaded: ${enhancedUser.first_name} ${enhancedUser.last_name} (${enhancedUser.roles?.name})`
          );
          if (roleChanged) {
            console.log(
              `🎭 ROLE CHANGED: ${user?.roles?.name} → ${enhancedUser.roles?.name}`
            );
          }
        }
        setUser(enhancedUser);
        return enhancedUser;
      } catch (error) {
        console.error("Error in fetchUserWithProfile:", error);
        // Fallback to mapped Supabase user
        const mappedUser = mapSupabaseUserToCustomUser(supaUser);
        setUser(mappedUser);
        return mappedUser;
      }
    },
    [supabase, user]
  );

  // Manual refresh function
  const refreshUser = useCallback(async () => {
    if (supabaseUser) {
      await fetchUserWithProfile(supabaseUser);
    }
  }, [supabaseUser, fetchUserWithProfile]);

  useEffect(() => {
    // Enhanced user initialization with session expiry checks
    const getUser = async () => {
      try {
        // Handle force logout on start safely
        const forceLogoutHandled = await handleForceLogoutOnStart();
        if (forceLogoutHandled) {
          console.log("Force logout on start handled");
          clearSessionTracking();
          setSupabaseUser(null);
          setUser(null);
          setLoading(false);
          return;
        }

        // Check for session expiry before validating user (skip if already on auth pages)
        if (typeof window !== "undefined") {
          const currentPath = window.location.pathname;
          const expiryReason = checkSessionExpiry();
          if (
            expiryReason &&
            !currentPath.startsWith("/auth") &&
            !currentPath.startsWith("/login")
          ) {
            console.log("Session expired on app start:", expiryReason);
            clearSessionTracking();
            await forceLogoutAndRedirect("session_expired_on_start");
            setLoading(false);
            return;
          } else if (expiryReason) {
            console.log(
              "Session expired but already on auth page, clearing data only"
            );
            clearSessionTracking();
            setSupabaseUser(null);
            setUser(null);
            setLoading(false);
            return;
          }
        }

        // Validate session using enhanced validation (skip redirect if already on auth pages)
        const isValidSession = await validateUserSession();
        if (!isValidSession) {
          console.log("Invalid session detected on app start");
          clearSessionTracking();
          setSupabaseUser(null);
          setUser(null);
          setLoading(false);

          // Only redirect if not already on auth pages
          if (typeof window !== "undefined") {
            const currentPath = window.location.pathname;
            if (
              !currentPath.startsWith("/auth") &&
              !currentPath.startsWith("/login")
            ) {
              // Only add error parameter if there's an actual session that became invalid
              const hasSessionData =
                localStorage.getItem("lastActivity") ||
                localStorage.getItem("sessionStart");
              if (hasSessionData) {
                window.location.href =
                  "/auth/login?reason=invalid_session_on_start";
              } else {
                window.location.href = "/auth/login";
              }
            }
          }
          return;
        }

        const {
          data: { user: supaUser },
          error: userError,
        } = await supabase.auth.getUser();
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        // If there are any errors or no user/session, clear everything
        if (userError || sessionError || !supaUser || !session) {
          console.log("No valid user/session on initial load, clearing data");
          clearSessionTracking();
          setSupabaseUser(null);
          setUser(null);
          setLoading(false);
          return;
        }

        // Initialize session tracking for valid sessions
        initializeSessionTracking();
        updateLastActivity();

        setSupabaseUser(supaUser);
        await fetchUserWithProfile(supaUser);
        setLoading(false);
      } catch (error) {
        console.error("Error getting initial user:", error);
        clearSessionTracking();
        setSupabaseUser(null);
        setUser(null);
        setLoading(false);
      }
    };

    getUser();

    // Listen for auth changes and set up enhanced session monitoring
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Get authenticated user data instead of using potentially insecure session.user
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      // Only log significant auth state changes
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "TOKEN_REFRESHED"
      ) {
        console.log(
          `🔐 Auth event: ${event}`,
          authUser?.email ? `(${authUser.email})` : ""
        );
      }

      // Use authenticated user instead of session.user for security
      const supaUser = authUser ?? null;
      setSupabaseUser(supaUser);
      await fetchUserWithProfile(supaUser);
      setLoading(false);

      // Handle specific auth events with session tracking
      if (event === "SIGNED_OUT") {
        clearSessionTracking();
        setUser(null);
        setSupabaseUser(null);
      }

      if (event === "SIGNED_IN" && session && authUser) {
        initializeSessionTracking();
        updateLastActivity();
        setLoading(false);

        // Redirect to main app after successful login if on auth page
        if (typeof window !== "undefined") {
          const currentPath = window.location.pathname;
          if (
            currentPath.startsWith("/auth") ||
            currentPath.startsWith("/login")
          ) {
            console.log("🏠 Redirecting to dashboard after login");
            window.location.href = "/";
          }
        }
      }

      if (event === "TOKEN_REFRESHED" && !session) {
        console.log("❌ Token refresh failed - re-authentication required");
        clearSessionTracking();
        setUser(null);
        setSupabaseUser(null);
      }

      if (event === "TOKEN_REFRESHED" && session) {
        updateLastActivity();
      }
    });

    // Set up session monitoring for automatic logout handling
    setupSessionMonitoring();

    return () => authSubscription.unsubscribe();
  }, [supabase.auth, fetchUserWithProfile]);

  // Real-time subscription for user profile changes (especially role changes)
  useEffect(() => {
    if (!supabaseUser) return;

    // Set up real-time monitoring for role changes

    // Subscribe to changes in user_profiles table for current user
    const subscription = supabase
      .channel("user_profile_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_profiles",
          filter: `id=eq.${supabaseUser.id}`,
        },
        async (payload) => {
          if (payload.eventType === "UPDATE") {
            const oldRole = user?.roles?.name;

            // Refresh user data when profile changes
            const updatedUser = await fetchUserWithProfile(supabaseUser);
            const newRole = updatedUser?.roles?.name;

            if (oldRole !== newRole) {
              console.log("🚀 REAL-TIME ROLE CHANGE DETECTED!");
              console.log(
                `   From: ${oldRole || "unknown"} → To: ${newRole || "unknown"}`
              );
              console.log("   🧭 Sidebar navigation will update automatically");
              console.log("   ✅ New permissions now active");
            }
          } else if (payload.eventType === "INSERT") {
            console.log("📡 New profile created via Supabase");
            await fetchUserWithProfile(supabaseUser);
          } else {
            // For other events, just refresh silently
            await fetchUserWithProfile(supabaseUser);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Real-time role monitoring active");
        } else if (
          status === "CLOSED" ||
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT"
        ) {
          console.error("❌ Real-time subscription failed:", status);
        }
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabaseUser, fetchUserWithProfile, supabase, user?.roles?.name]);

  return (
    <UserContext.Provider value={{ user, supabaseUser, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
