"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { User as CustomUser } from "@/types/types";
import { getSupabaseClient } from "@/lib/supabase/singleton-client";
import { userService } from "@/lib/services/user-service";
import { mapSupabaseUserToCustomUser } from "@/types/auth";
import { shouldPreventAutoRedirect } from "@/lib/auth/prevent-auto-redirect";
import {
  shouldAllowAuth,
  isAuthTab,
  getCurrentTabId,
  initializeTabIsolation,
  wasTabRefreshed,
  getTabSession,
  clearTabSession,
  resetTabIsolation,
  shouldBlockAuthStateChange,
  enforceTabIsolation,
} from "@/lib/auth/tab-isolation";
import {
  setupSessionMonitoring,
  initializeAuth,
  forceLogoutAndRedirect,
  validateUserSession,
} from "@/lib/auth-utils";
import {
  handleForceLogoutOnStart,
  getEffectiveSessionTimeout,
} from "@/lib/session-control";

interface UserContextType {
  user: CustomUser | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  forceRefreshUserRole: () => Promise<void>;
  checkRoleNow: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  supabaseUser: null,
  loading: true,
  refreshUser: async () => {},
  forceRefreshUserRole: async () => {},
  checkRoleNow: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = getSupabaseClient();
  const router = useRouter();

  // Safety: prevent indefinite loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
      }
    }, 8000);
    return () => clearTimeout(timeoutId);
  }, [loading]);

  // No need for complex helper functions - using centralized service

  // Simplified user fetching using centralized service
  const fetchUserWithProfile = useCallback(
    async (supaUser: SupabaseUser | null) => {
      if (!supaUser) {
        setUser(null);
        return null;
      }

      try {
        const enhancedUser = await userService.createEnhancedUser(supaUser);
        setUser(enhancedUser);
        return enhancedUser;
      } catch (error) {
        console.error("Error in fetchUserWithProfile:", error);
        setUser(null);
        return null;
      }
    },
    []
  );

  // Manual refresh function using centralized service
  const refreshUser = useCallback(async () => {
    if (supabaseUser) {
      const updatedUser = await userService.getUserProfile(supabaseUser.id, {
        useCache: false,
      });
      setUser(updatedUser);
    }
  }, [supabaseUser]);

  // Force refresh function for role changes
  const forceRefreshUserRole = useCallback(async () => {
    if (supabaseUser) {
      // Clear cache and force fresh data
      userService.clearCache();
      await refreshUser();

      // Also refresh the router to update any server-side role checks (rate limited)
      try {
        const lastRefresh = sessionStorage.getItem("last_router_refresh");
        const now = Date.now();

        // Only refresh if it's been more than 2 seconds since last refresh
        if (!lastRefresh || now - parseInt(lastRefresh) > 2000) {
          router.refresh();
          sessionStorage.setItem("last_router_refresh", now.toString());
        }
      } catch (e) {
        console.warn("Router refresh failed:", e);
      }
    }
  }, [supabaseUser, refreshUser, router]);

  // Enhanced role check function with role change detection
  const checkRoleNow = useCallback(async () => {
    if (!supabaseUser) return;

    // Capture current user values to avoid dependency issues
    const currentUser = user;
    const storedRoleId = currentUser?.role_id;
    const storedRoleName = (currentUser?.roles as any)?.name;

    try {
      const { data: currentProfile, error } = await supabase
        .from("user_profiles")
        .select("role_id, roles:role_id!inner(name)")
        .eq("id", supabaseUser.id)
        .maybeSingle();

      if (!error && currentProfile) {
        const currentRoleId = currentProfile.role_id;
        const currentRoleName = (currentProfile.roles as any)?.name;

        // Check if role has actually changed
        if (
          currentRoleId !== storedRoleId ||
          currentRoleName !== storedRoleName
        ) {
          console.log(
            `Role change detected: ${storedRoleName} -> ${currentRoleName}`
          );

          // Refresh user data to trigger role access updates
          await refreshUser();

          // Force a small delay to ensure state updates
          setTimeout(() => {
            // The useRoleAccess hook will handle redirects automatically
          }, 100);
        }
      }
    } catch (error) {
      console.error("Error checking role:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseUser, supabase, refreshUser]);

  useEffect(() => {
    // Initialize tab isolation system
    initializeTabIsolation();

    // Simplified user initialization
    const getUser = async () => {
      try {
        // Get current user and session
        const [userRes, sessionRes] = await Promise.all([
          supabase.auth.getUser(),
          supabase.auth.getSession(),
        ]);

        const supaUser = userRes.data?.user;
        const session = sessionRes.data?.session;

        // If we have a user and session, check if this tab should be authenticated
        if (supaUser && session && !userRes.error && !sessionRes.error) {
          // Enforce tab isolation - only allow auth in proper tabs
          if (!shouldAllowAuth() && !wasTabRefreshed()) {
            console.log(
              `🚫 Initial auth blocked for tab ${getCurrentTabId()} - not the auth tab`
            );
            enforceTabIsolation(supabase);
            setSupabaseUser(null);
            setUser(null);
            setLoading(false);
            return;
          }

          setSupabaseUser(supaUser);

          // Fetch user profile asynchronously
          fetchUserWithProfile(supaUser).finally(() => {
            setLoading(false);
          });
          return;
        }

        // No valid user/session - clear everything
        setSupabaseUser(null);
        setUser(null);
        setLoading(false);
      } catch (error) {
        // Try simple fallback
        try {
          const {
            data: { user: fallbackUser },
          } = await supabase.auth.getUser();
          if (fallbackUser) {
            setSupabaseUser(fallbackUser);
            const basicUser = mapSupabaseUserToCustomUser(fallbackUser);
            if (basicUser) {
              basicUser.roles = { name: "user" };
              setUser(basicUser);
            }
          } else {
            setSupabaseUser(null);
            setUser(null);
          }
        } catch (fallbackError) {
          setSupabaseUser(null);
          setUser(null);
        } finally {
          setLoading(false);
        }
      }
    };

    getUser();

    // Listen for auth changes with improved error handling and timeouts
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        // Only log significant auth state changes (rate limited to prevent spam)
        const logKey = `auth_log_${event}`;
        const lastLog = sessionStorage.getItem(logKey);
        const now = Date.now();

        if (
          (event === "SIGNED_IN" ||
            event === "SIGNED_OUT" ||
            event === "TOKEN_REFRESHED") &&
          (!lastLog || now - parseInt(lastLog) > 1000)
        ) {
          console.log(`🔐 Auth event: ${event} in tab: ${getCurrentTabId()}`);
          sessionStorage.setItem(logKey, now.toString());
        }

        // Check if this auth state change should be blocked
        if (shouldBlockAuthStateChange(event)) {
          console.log(
            `🚫 Blocking auth state change ${event} in tab ${getCurrentTabId()}`
          );

          // Force sign out and keep user signed out in this tab
          setSupabaseUser(null);
          setUser(null);
          setLoading(false);

          // Enforce tab isolation at Supabase level
          enforceTabIsolation(supabase);
          return;
        }

        // Use session user directly - Supabase handles auth state efficiently
        const authUser = session?.user ?? null;

        setSupabaseUser(authUser);

        // Handle specific auth events
        if (event === "SIGNED_OUT") {
          const tabId = getCurrentTabId();
          console.log(`🚪 User signed out in tab: ${tabId}`);

          // Clear tab isolation data on logout
          resetTabIsolation();

          setUser(null);
          setSupabaseUser(null);
          setLoading(false);
          return;
        }

        if (event === "SIGNED_IN" && authUser) {
          const tabId = getCurrentTabId();
          console.log(
            `🔐 Processing sign-in for: ${authUser.email} in tab: ${tabId}`
          );

          if (wasTabRefreshed()) {
            console.log(
              `🔄 Tab ${tabId} was refreshed - allowing auth state sync`
            );
          } else if (!shouldAllowAuth()) {
            console.log(
              `🚫 Tab isolation: Sign-in blocked for tab ${tabId} - not the auth tab`
            );
            // This should not happen as it's already handled above, but double-check
            setSupabaseUser(null);
            setUser(null);
            setLoading(false);
            enforceTabIsolation(supabase);
            return;
          }

          // Session tracking is handled by Supabase natively

          // Fetch profile asynchronously without blocking
          fetchUserWithProfile(authUser).finally(() => {
            setLoading(false);
          });

          // No automatic redirects - users should explicitly choose to enter the app
          if (shouldPreventAutoRedirect()) {
            console.log("🚫 Auto-redirect prevented - user is on auth page");
            return;
          }

          console.log(
            `🔐 User signed in in tab ${tabId} - no automatic redirect, waiting for user action`
          );
          return;
        }

        if (event === "TOKEN_REFRESHED") {
          if (!session) {
            console.log("❌ Token refresh failed - re-authentication required");
            setUser(null);
            setSupabaseUser(null);
            setLoading(false);
          } else {
            // Fetch profile asynchronously
            fetchUserWithProfile(authUser).finally(() => {
              setLoading(false);
            });
          }
          return;
        }

        // For other events, just ensure loading is cleared
        fetchUserWithProfile(authUser).finally(() => {
          setLoading(false);
        });
      } catch (error: unknown) {
        console.error("❌ Error in auth state change handler:", error);

        // Ensure we don't leave the app in a loading state
        setLoading(false);

        // On critical auth errors, clear everything to prevent inconsistent state
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes("timeout") ||
          errorMessage.includes("network")
        ) {
          console.warn(
            "🔄 Network/timeout error detected, clearing auth state for safety"
          );
          setSupabaseUser(null);
          setUser(null);
        }
      }
    });

    // Set up session monitoring for automatic logout handling
    setupSessionMonitoring();

    return () => authSubscription.unsubscribe();
  }, [supabase.auth, supabase, fetchUserWithProfile]);

  // Real-time user updates using centralized service
  useEffect(() => {
    if (!supabaseUser) return;

    const subscription = userService.subscribeToUserChanges(
      supabaseUser.id,
      (updatedUser) => {
        setUser(updatedUser);
      }
    );

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [supabaseUser]);

  return (
    <UserContext.Provider
      value={{
        user,
        supabaseUser,
        loading,
        refreshUser,
        forceRefreshUserRole,
        checkRoleNow,
      }}
    >
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
