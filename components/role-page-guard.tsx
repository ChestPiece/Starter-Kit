"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/auth/user-context";
import {
  canAccessRoute,
  getUnauthorizedRedirect,
  UserRole,
} from "@/lib/role-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from '@/lib/services/logger';

interface RolePageGuardProps {
  children: React.ReactNode;
  requiredRole: UserRole;
  currentPath: string;
}

/**
 * Page-level role guard that redirects users if they don't have access
 */
export function RolePageGuard({
  children,
  requiredRole,
  currentPath,
}: RolePageGuardProps) {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // Still loading, don't redirect yet

    const userRole = (user?.roles?.name as UserRole) || "user";

    // Check if user can access this route
    if (!canAccessRoute(userRole, currentPath)) {
      logger.info(
        `Role-based access denied: ${userRole} trying to access ${currentPath}`
      );

      // Get the appropriate redirect URL for this user's role
      const redirectUrl = getUnauthorizedRedirect(userRole, currentPath);

      // Add access denied parameter
      const url = new URL(redirectUrl, window.location.origin);
      url.searchParams.set("access_denied", "true");
      // Use replace to avoid back button returning to unauthorized page
      router.replace(url.toString());
      return;
    }
  }, [user, loading, router, currentPath, requiredRole]);

  // Show loading skeleton while checking permissions
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  const userRole = (user?.roles?.name as UserRole) || "user";

  // Final check before rendering
  if (!canAccessRoute(userRole, currentPath)) {
    // This should not happen due to the useEffect above, but just in case
    return null;
  }

  return <>{children}</>;
}

/**
 * HOC for protecting pages with role-based access
 */
export function withRoleProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredRole: UserRole,
  pagePath: string
) {
  const ProtectedComponent = (props: P) => {
    return (
      <RolePageGuard requiredRole={requiredRole} currentPath={pagePath}>
        <WrappedComponent {...props} />
      </RolePageGuard>
    );
  };

  ProtectedComponent.displayName = `withRoleProtection(${WrappedComponent.displayName || WrappedComponent.name})`;

  return ProtectedComponent;
}

/**
 * Hook to check current user's role and permissions
 */
export function useRolePermissions() {
  const { user, loading } = useUser();

  const userRole = (user?.roles?.name as UserRole) || "user";

  const hasRole = (role: UserRole): boolean => {
    const roleHierarchy = { user: 1, manager: 2, admin: 3 };
    return roleHierarchy[userRole] >= roleHierarchy[role];
  };

  const canAccess = (path: string): boolean => {
    return canAccessRoute(userRole, path);
  };

  return {
    user,
    userRole,
    loading,
    hasRole,
    canAccess,
    isUser: userRole === "user",
    isManager: userRole === "manager" || userRole === "admin",
    isAdmin: userRole === "admin",
  };
}
