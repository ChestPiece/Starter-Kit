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
import { createClient } from "@/lib/supabase/client";
import { mapSupabaseUserToCustomUser } from "@/types/auth";
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

  const supabase = createClient();
  const router = useRouter();

  // Safety: prevent indefinite loading in extreme network cases
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn(
          "⚠️ User context loading timeout - using emergency fallback"
        );
        // Try to get basic user info even if profile loading fails
        const tryEmergencyAuth = async () => {
          try {
            const {
              data: { user },
              error,
            } = await supabase.auth.getUser();
            if (user && !error) {
              console.log("🚨 Emergency auth recovery successful");
              setSupabaseUser(user);
              const fallbackUser = mapSupabaseUserToCustomUser(user);
              if (fallbackUser) {
                fallbackUser.roles = { name: "user" };
                setUser(fallbackUser);
              }
            }
          } catch (emergencyError) {
            console.error("Emergency auth recovery failed:", emergencyError);
          } finally {
            setLoading(false);
          }
        };
        tryEmergencyAuth();
      }
    }, 10000); // Reduced to 10 seconds for faster emergency recovery
    return () => clearTimeout(timeoutId);
  }, [loading, supabase]);

  // Helper function to extract role data
  const extractRoleData = useCallback((roles: any) => {
    if (!roles) return { name: "user" };

    if (Array.isArray(roles) && roles.length > 0) {
      return { name: roles[0].name };
    } else if (typeof roles === "object" && roles !== null && "name" in roles) {
      return { name: typeof roles.name === "string" ? roles.name : "user" };
    }

    return { name: "user" };
  }, []);

  // Helper function to create enhanced user object
  const createEnhancedUser = useCallback(
    (userProfile: any, supaUser: SupabaseUser, roleData: any): CustomUser => {
      return {
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
    },
    []
  );

  // Helper function to create user profile in background
  const createUserProfileInBackground = useCallback(
    async (supaUser: SupabaseUser) => {
      try {
        // Get default user role
        const { data: defaultRole } = await supabase
          .from("roles")
          .select("id")
          .eq("name", "user")
          .single();

        // Create user profile
        const { data: newProfile, error: createError } = await supabase
          .from("user_profiles")
          .insert([
            {
              id: supaUser.id,
              email: supaUser.email,
              first_name: supaUser.user_metadata?.first_name || "",
              last_name: supaUser.user_metadata?.last_name || "",
              role_id:
                defaultRole?.id || "d9a0935b-9fe1-4550-8f7e-67639fd0c6f0",
              is_active: true,
              profile: supaUser.user_metadata?.avatar_url || null,
            },
          ])
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
            roles:role_id(name)
          `
          )
          .single();

        if (!createError && newProfile) {
          console.log("✅ Background profile creation successful");
          // Update the user with the new profile data
          const roleData = extractRoleData(newProfile.roles);
          const enhancedUser = createEnhancedUser(
            newProfile,
            supaUser,
            roleData
          );
          setUser(enhancedUser);
        }
      } catch (error) {
        console.warn("Background profile creation failed:", error);
      }
    },
    [supabase, extractRoleData, createEnhancedUser]
  );

  // Optimized user fetching with faster fallbacks and non-blocking profile creation
  const fetchUserWithProfile = useCallback(
    async (supaUser: SupabaseUser | null) => {
      if (!supaUser) {
        setUser(null);
        return null;
      }

      // First, immediately set a basic fallback user to prevent timeouts
      const fallbackUser = mapSupabaseUserToCustomUser(supaUser);
      if (fallbackUser) {
        fallbackUser.roles = { name: "user" };
      }

      try {
        // Try to fetch user profile with optimized query
        const profilePromise = supabase
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
          roles:role_id!inner(name)
        `
          )
          .eq("id", supaUser.id)
          .maybeSingle();

        // Set a very short timeout for faster fallback (2 seconds)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Database query timeout")), 2000);
        });

        let userProfile, error;
        try {
          const result = (await Promise.race([
            profilePromise,
            timeoutPromise,
          ])) as any;
          userProfile = result.data;
          error = result.error;
        } catch (timeoutError: any) {
          if (timeoutError.message === "Database query timeout") {
            console.info(
              "⏱️ Database query timed out - using fallback immediately"
            );
            error = timeoutError;
            userProfile = null;
          } else {
            throw timeoutError;
          }
        }

        if (error || !userProfile) {
          if (error?.message === "Database query timeout") {
            console.info(
              "⏱️ Database query timed out - using fallback user profile (this is normal on slow networks)"
            );
          } else {
            console.warn(
              "👤 User profile query failed, trying backup query:",
              error?.message || "No profile data returned"
            );

            // Try a simpler query without role join as backup with shorter timeout
            try {
              const basicPromise = supabase
                .from("user_profiles")
                .select(
                  "id, email, first_name, last_name, role_id, is_active, profile, created_at, updated_at"
                )
                .eq("id", supaUser.id)
                .maybeSingle();

              const basicTimeoutPromise = new Promise((_, reject) => {
                setTimeout(
                  () => reject(new Error("Backup query timeout")),
                  1500
                );
              });

              const { data: basicProfile, error: basicError } =
                (await Promise.race([
                  basicPromise,
                  basicTimeoutPromise,
                ])) as any;

              if (basicProfile && !basicError) {
                console.log("✅ Backup profile query successful");
                // Get role separately with quick timeout
                try {
                  const rolePromise = supabase
                    .from("roles")
                    .select("name")
                    .eq("id", basicProfile.role_id)
                    .maybeSingle();

                  const roleTimeoutPromise = new Promise((_, reject) => {
                    setTimeout(
                      () => reject(new Error("Role query timeout")),
                      1000
                    );
                  });

                  const { data: roleData } = (await Promise.race([
                    rolePromise,
                    roleTimeoutPromise,
                  ])) as any;

                  const enhancedUserFromBackup = createEnhancedUser(
                    basicProfile,
                    supaUser,
                    roleData ? { name: roleData.name } : { name: "user" }
                  );
                  setUser(enhancedUserFromBackup);
                  return enhancedUserFromBackup;
                } catch (roleError) {
                  console.warn(
                    "Role lookup failed, using default role:",
                    roleError
                  );
                  const enhancedUserFromBackup = createEnhancedUser(
                    basicProfile,
                    supaUser,
                    { name: "user" }
                  );
                  setUser(enhancedUserFromBackup);
                  return enhancedUserFromBackup;
                }
              }
            } catch (backupError) {
              console.warn("Backup profile query also failed:", backupError);
            }

            // Create profile in background without blocking the UI
            setTimeout(async () => {
              try {
                await createUserProfileInBackground(supaUser);
              } catch (backgroundError) {
                console.warn(
                  "Background profile creation failed:",
                  backgroundError
                );
              }
            }, 100);
          }

          // Always set fallback user for any error to prevent loading loops
          setUser(fallbackUser);
          return fallbackUser;
        }

        // Successfully got profile data
        const roleData = extractRoleData(userProfile.roles);
        const enhancedUser = createEnhancedUser(
          userProfile,
          supaUser,
          roleData
        );

        console.log(
          `👤 User profile loaded: ${enhancedUser.first_name} ${enhancedUser.last_name} (${enhancedUser.roles?.name})`
        );

        setUser(enhancedUser);
        return enhancedUser;
      } catch (error) {
        console.error("Error in fetchUserWithProfile:", error);
        // Always fall back to basic user to prevent loading timeouts
        setUser(fallbackUser);
        return fallbackUser;
      }
    },
    [
      supabase,
      createUserProfileInBackground,
      extractRoleData,
      createEnhancedUser,
    ]
  );

  // Manual refresh function
  const refreshUser = useCallback(async () => {
    if (supabaseUser) {
      console.log("🔄 Manual user refresh triggered");
      await fetchUserWithProfile(supabaseUser);
    }
  }, [supabaseUser, fetchUserWithProfile]);

  // Force refresh function for role changes
  const forceRefreshUserRole = useCallback(async () => {
    if (supabaseUser) {
      console.log("🔄 Force refreshing user role data");

      // Clear any potential caches and force fresh data
      await fetchUserWithProfile(supabaseUser);

      // Also refresh the router to update any server-side role checks
      try {
        router.refresh();
      } catch (e) {
        console.warn("Router refresh failed:", e);
      }
    }
  }, [supabaseUser, fetchUserWithProfile, router]);

  // Enhanced manual role check function for debugging/testing
  const checkRoleNow = useCallback(async () => {
    if (!supabaseUser) {
      console.warn("❌ No authenticated user for role check");
      return;
    }

    console.log("🔍 Manual role check triggered");
    try {
      const { data: currentProfile, error } = await supabase
        .from("user_profiles")
        .select("role_id, roles:role_id!inner(name)")
        .eq("id", supabaseUser.id)
        .maybeSingle();

      if (!error && currentProfile) {
        const currentRoleId = currentProfile.role_id;
        const currentRoleName = (currentProfile.roles as any)?.name;
        const storedRoleId = user?.role_id;

        console.log("=".repeat(50));
        console.log("📊 ROLE CHECK RESULTS:");
        console.log(`📋 Database role: ${currentRoleName} (${currentRoleId})`);
        console.log(`📋 App role: ${user?.roles?.name} (${storedRoleId})`);
        console.log(`📋 User ID: ${supabaseUser.id}`);
        console.log(
          `📋 Environment: ${process.env.NODE_ENV === "production" ? "Production" : "Development"}`
        );
        console.log("=".repeat(50));

        if (currentRoleId !== storedRoleId) {
          console.log(
            "🚨 ROLE MISMATCH DETECTED! Triggering automatic refresh..."
          );
          window.location.reload();
        } else {
          console.log("✅ Roles are synchronized - no refresh needed");
        }
      } else {
        console.error("❌ Failed to retrieve role data:", error);
      }
    } catch (error) {
      console.error("❌ Manual role check failed:", error);
    }
  }, [supabaseUser, supabase, user]);

  // Make role check available globally for debugging in production
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).checkUserRole = checkRoleNow;
      console.log(
        "🔧 Debug: You can manually check roles with: checkUserRole()"
      );
    }

    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).checkUserRole;
      }
    };
  }, [checkRoleNow]);

  useEffect(() => {
    // Optimized user initialization with timeout protection
    const getUser = async () => {
      try {
        console.log("🔄 Initializing user context...");

        // Set a timeout for the entire initialization process (8 seconds)
        const initTimeout = setTimeout(() => {
          console.warn(
            "⚠️ User initialization taking too long, using emergency fallback"
          );
          setLoading(false);
        }, 8000);

        // Simple check: get current user and session with timeout
        const authPromise = Promise.all([
          supabase.auth.getUser(),
          supabase.auth.getSession(),
        ]);

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error("Auth initialization timeout")),
            5000 // Reduced to 5 seconds for faster response
          );
        });

        const [userRes, sessionRes] = (await Promise.race([
          authPromise,
          timeoutPromise,
        ])) as any;

        // Remove timeout clearing since we removed the timeout

        const supaUser = userRes.data?.user;
        const session = sessionRes.data?.session;

        console.log("👤 User check result:", {
          hasUser: !!supaUser,
          hasSession: !!session,
          email: supaUser?.email || "none",
        });

        // If we have a user and session, set them up
        if (supaUser && session && !userRes.error && !sessionRes.error) {
          console.log("✅ Valid user session found, setting up user context");

          // Session tracking is handled by Supabase natively

          setSupabaseUser(supaUser);

          // Check if this is a recently confirmed user (email confirmation flow)
          const isRecentlyConfirmed =
            supaUser.email_confirmed_at &&
            new Date(supaUser.email_confirmed_at).getTime() >
              Date.now() - 60000; // Within last minute

          if (isRecentlyConfirmed) {
            console.log(
              "🎉 Recently confirmed user detected, optimizing profile setup"
            );
            // Give a bit more time for the profile to be available
            setTimeout(() => {
              fetchUserWithProfile(supaUser).finally(() => {
                setLoading(false);
              });
            }, 1000);
          } else {
            // Don't wait for profile fetch - do it asynchronously
            fetchUserWithProfile(supaUser).finally(() => {
              setLoading(false);
            });
          }
          return;
        }

        // No valid user/session - clear everything and set loading to false
        console.log("❌ No valid user session found");
        setSupabaseUser(null);
        setUser(null);
        setLoading(false);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Auth initialization timeout"
        ) {
          console.info(
            "⏱️ Auth initialization timed out - using fallback mode (this is normal on slow networks)"
          );
        } else {
          console.error("❌ Error getting initial user:", error);
        }

        // Try one more time with a simple auth check as final fallback
        try {
          const {
            data: { user: fallbackUser },
          } = await supabase.auth.getUser();
          if (fallbackUser) {
            console.log(
              "🔄 Fallback auth check successful, using basic user data"
            );
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
          console.error(
            "Final fallback auth check also failed:",
            fallbackError
          );
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
        // Only log significant auth state changes
        if (
          event === "SIGNED_IN" ||
          event === "SIGNED_OUT" ||
          event === "TOKEN_REFRESHED"
        ) {
          console.log(`🔐 Auth event: ${event}`);
        }

        // Get authenticated user data with timeout
        const authUserPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Auth user fetch timeout")), 10000);
        });

        let authUser = null;
        try {
          const result = (await Promise.race([
            authUserPromise,
            timeoutPromise,
          ])) as any;
          authUser = result.data?.user ?? null;
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (errorMessage.includes("Auth user fetch timeout")) {
            console.info(
              "⏱️ Auth user fetch timed out - using session fallback (this is normal on slow networks)"
            );
          } else {
            console.warn(
              "⏱️ Auth user fetch failed, using session fallback:",
              errorMessage
            );
          }
          authUser = session?.user ?? null;

          // If session fallback also fails, log it but continue
          if (!authUser && session) {
            console.warn("⚠️ Session fallback also failed, no user available");
          }
        }

        setSupabaseUser(authUser);

        // Handle specific auth events
        if (event === "SIGNED_OUT") {
          setUser(null);
          setSupabaseUser(null);
          setLoading(false);
          return;
        }

        if (event === "SIGNED_IN" && authUser) {
          console.log(`🔐 Processing sign-in for: ${authUser.email}`);

          // Session tracking is handled by Supabase natively

          // Fetch profile asynchronously without blocking
          fetchUserWithProfile(authUser).finally(() => {
            setLoading(false);
          });

          // On confirmation flows, don't auto-redirect - let the confirmation page handle it
          if (typeof window !== "undefined") {
            const path = window.location.pathname;
            const searchParams = new URLSearchParams(window.location.search);
            if (path.startsWith("/auth/confirm")) {
              // Only auto-redirect if this is NOT the success page (i.e., it has confirmation tokens but not the confirmed=true flag)
              if (
                !searchParams.get("confirmed") &&
                (searchParams.get("code") || searchParams.get("token_hash"))
              ) {
                console.log(
                  "🔄 Processing confirmation tokens - let page handle redirect"
                );
              }
              return; // Always return here to let the confirmation page control navigation
            }
          }
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
  }, [supabase.auth, fetchUserWithProfile]);

  // Role change detection using Supabase real-time subscriptions only
  useEffect(() => {
    if (!supabaseUser) return;

    let profileUpdateSubscription:
      | ReturnType<typeof supabase.channel>
      | undefined;

    // Automatic role change handler
    const handleRoleChange = async (source: string) => {
      console.log(
        `🔄 Role change detected via ${source}! Refreshing user context...`
      );
      try {
        if (supabaseUser) {
          await fetchUserWithProfile(supabaseUser);
        }
      } catch (e) {
        console.warn("Context refresh after role change failed:", e);
        // Fallback: refresh the page to ensure role updates are picked up
        window.location.reload();
      }
    };

    // Use Supabase real-time subscriptions for role changes
    try {
      profileUpdateSubscription = supabase
        .channel(`profile_updates_${supabaseUser.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "user_profiles",
            filter: `id=eq.${supabaseUser.id}`,
          },
          async (payload) => {
            const oldRecord = payload.old as any;
            const newRecord = payload.new as any;

            console.log("📡 Real-time profile update received");

            if (oldRecord?.role_id !== newRecord?.role_id) {
              console.log(
                `📋 Role changed from ${oldRecord?.role_id} to ${newRecord?.role_id}`
              );
              await handleRoleChange("real-time subscription");
            } else {
              // Non-role updates, just refresh user data silently
              await fetchUserWithProfile(supabaseUser);
            }
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log("✅ Real-time role monitoring active");
          } else if (status === "CHANNEL_ERROR") {
            console.warn(
              "❌ Real-time subscription failed - role changes may not be detected immediately"
            );
          }
        });
    } catch (error) {
      console.warn("Failed to set up real-time role monitoring:", error);
    }

    return () => {
      if (profileUpdateSubscription) {
        try {
          profileUpdateSubscription.unsubscribe();
          console.log("🛑 Stopped real-time profile monitoring");
        } catch (error) {
          console.warn("Error unsubscribing from profile updates:", error);
        }
      }
    };
  }, [supabaseUser, fetchUserWithProfile, supabase]);

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
