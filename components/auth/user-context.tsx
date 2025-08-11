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
          if (Array.isArray(userProfile.roles) && userProfile.roles.length > 0) {
            roleData = { name: userProfile.roles[0].name };
          } else if (userProfile.roles.name) {
            roleData = { name: userProfile.roles.name };
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

        console.log("Enhanced user created:", enhancedUser);
        console.log("User role:", enhancedUser.roles?.name);
        console.log("Role data from database:", userProfile.roles);
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
    [supabase]
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

      console.log("Auth state changed in UserContext:", event, authUser?.email);

      // Use authenticated user instead of session.user for security
      const supaUser = authUser ?? null;
      setSupabaseUser(supaUser);
      await fetchUserWithProfile(supaUser);
      setLoading(false);

      // Handle specific auth events with session tracking
      if (event === "SIGNED_OUT") {
        console.log("User signed out, clearing user data and session tracking");
        clearSessionTracking();
        setUser(null);
        setSupabaseUser(null);
      }

      if (event === "SIGNED_IN" && session && authUser) {
        console.log(
          "User signed in successfully, initializing session tracking"
        );
        initializeSessionTracking();
        updateLastActivity();

        // Ensure the user is properly set and loading is complete
        setLoading(false);

        // Redirect to main app after successful login if on auth page
        if (typeof window !== "undefined") {
          const currentPath = window.location.pathname;
          if (
            currentPath.startsWith("/auth") ||
            currentPath.startsWith("/login")
          ) {
            console.log("Redirecting to main app after successful login");
            window.location.href = "/";
          }
        }
      }

      if (event === "TOKEN_REFRESHED" && !session) {
        console.log("Token refresh failed, user needs to re-authenticate");
        clearSessionTracking();
        setUser(null);
        setSupabaseUser(null);
      }

      if (event === "TOKEN_REFRESHED" && session) {
        console.log("Token refreshed successfully, updating activity");
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

    console.log("Setting up real-time subscription for user:", supabaseUser.id);

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
          console.log("🔄 User profile changed via real-time subscription:", payload);
          console.log("📊 Change type:", payload.eventType);
          
          if (payload.eventType === "UPDATE") {
            const oldRole = user?.roles?.name;
            console.log("🎭 Current role before update:", oldRole);
            
            // Refresh user data when profile changes
            const updatedUser = await fetchUserWithProfile(supabaseUser);
            const newRole = updatedUser?.roles?.name;
            
            if (oldRole !== newRole) {
              console.log("🎯 ROLE CHANGED! From:", oldRole, "to:", newRole);
              console.log("🔄 Navigation should update automatically now");
            }
          } else {
            // For other events, just refresh the data
            await fetchUserWithProfile(supabaseUser);
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 Real-time subscription status:", status);
        if (status === "SUBSCRIBED") {
          console.log("✅ Successfully subscribed to role changes for user:", supabaseUser.id);
        }
      });

    return () => {
      console.log("🔌 Unsubscribing from user profile changes");
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
