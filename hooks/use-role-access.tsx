"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/components/auth/user-context';
import { 
  hasRouteAccess, 
  requiresRedirect, 
  validateRouteAccess,
  UserRole 
} from '@/lib/auth/role-access-control';

/**
 * Hook to handle role-based access control with real-time updates
 */
export function useRoleAccess() {
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const previousRoleRef = useRef<UserRole | undefined>();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  
  const currentRole = (user?.roles as any)?.name as UserRole | undefined;

  useEffect(() => {
    // Skip auth routes - they don't need role protection
    if (pathname.startsWith('/auth/') || pathname.startsWith('/login')) {
      setIsCheckingAccess(false);
      return;
    }

    // Wait for user data to load
    if (!user) {
      setIsCheckingAccess(true);
      return;
    }

    const previousRole = previousRoleRef.current;
    
    // Check if role has changed
    if (previousRole !== currentRole) {
      console.log(`Role changed from ${previousRole} to ${currentRole}`);
      
      // Check if redirect is needed due to role change
      const { shouldRedirect, redirectTo } = requiresRedirect(
        pathname, 
        previousRole, 
        currentRole
      );
      
      if (shouldRedirect && redirectTo) {
        console.log(`Redirecting to ${redirectTo} due to role change`);
        setIsCheckingAccess(true);
        router.replace(redirectTo);
        previousRoleRef.current = currentRole;
        return;
      }
      
      // Update previous role reference
      previousRoleRef.current = currentRole;
    }
    
    // Validate current route access
    const { hasAccess, redirectTo } = validateRouteAccess(pathname, currentRole);
    
    if (!hasAccess && redirectTo) {
      console.log(`Access denied to ${pathname} for role ${currentRole}, redirecting to ${redirectTo}`);
      setIsCheckingAccess(true);
      router.replace(redirectTo);
      return;
    }
    
    // Access is valid
    setIsCheckingAccess(false);
  }, [user, currentRole, pathname, router]);

  // Initialize previous role on first load
  useEffect(() => {
    if (currentRole && !previousRoleRef.current) {
      previousRoleRef.current = currentRole;
    }
  }, [currentRole]);

  return {
    hasAccess: hasRouteAccess(currentRole, pathname),
    currentRole,
    isCheckingAccess,
    // Utility functions
    canAccess: (route: string) => hasRouteAccess(currentRole, route),
  };
}

/**
 * Component wrapper that enforces role-based access
 */
export function withRoleAccess<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredRole?: UserRole | UserRole[]
) {
  return function RoleProtectedComponent(props: P) {
    const { hasAccess, isCheckingAccess, currentRole } = useRoleAccess();
    
    // Show loading state while checking access
    if (isCheckingAccess) {
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-sm text-gray-500">Loading...</div>
        </div>
      );
    }
    
    // Check specific role requirements if provided
    if (requiredRole) {
      const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      const hasRequiredRole = currentRole && requiredRoles.includes(currentRole);
      
      if (!hasRequiredRole) {
        return (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <div className="text-sm text-gray-500">Access Denied</div>
              <div className="text-xs text-gray-400 mt-1">
                Insufficient permissions for this resource
              </div>
            </div>
          </div>
        );
      }
    }
    
    // Check general route access
    if (!hasAccess) {
      return (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="text-sm text-gray-500">Access Denied</div>
            <div className="text-xs text-gray-400 mt-1">
              You don't have permission to view this page
            </div>
          </div>
        </div>
      );
    }
    
    return <WrappedComponent {...props} />;
  };
}
