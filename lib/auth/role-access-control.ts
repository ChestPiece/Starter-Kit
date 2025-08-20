/**
 * Role-based Access Control System
 * Handles real-time role changes and route protection
 */

export type UserRole = 'admin' | 'manager' | 'user';

// Define which routes each role can access
export const ROLE_ACCESS_MAP: Record<UserRole, string[]> = {
  admin: ['/', '/settings', '/users'],
  manager: ['/', '/settings'], 
  user: ['/']
};

// Define fallback routes for each role when they lose access
export const ROLE_FALLBACK_MAP: Record<UserRole, string> = {
  admin: '/',
  manager: '/',
  user: '/'
};

/**
 * Check if a user role has access to a specific route
 */
export function hasRouteAccess(role: UserRole | undefined, route: string): boolean {
  if (!role) return false;
  
  const allowedRoutes = ROLE_ACCESS_MAP[role] || [];
  
  // Check exact match first
  if (allowedRoutes.includes(route)) {
    return true;
  }
  
  // Check if route starts with any allowed route (for sub-routes)
  return allowedRoutes.some(allowedRoute => {
    if (allowedRoute === '/') {
      return route === '/';
    }
    return route.startsWith(allowedRoute);
  });
}

/**
 * Get the appropriate fallback route for a role
 */
export function getFallbackRoute(role: UserRole | undefined): string {
  if (!role) return '/auth/login';
  return ROLE_FALLBACK_MAP[role] || '/';
}

/**
 * Get all accessible routes for a role
 */
export function getAccessibleRoutes(role: UserRole | undefined): string[] {
  if (!role) return [];
  return ROLE_ACCESS_MAP[role] || [];
}

/**
 * Check if role change requires redirect
 */
export function requiresRedirect(
  currentRoute: string,
  oldRole: UserRole | undefined,
  newRole: UserRole | undefined
): { shouldRedirect: boolean; redirectTo?: string } {
  // If no role change, no redirect needed
  if (oldRole === newRole) {
    return { shouldRedirect: false };
  }
  
  // If new role doesn't have access to current route, redirect
  if (!hasRouteAccess(newRole, currentRoute)) {
    return {
      shouldRedirect: true,
      redirectTo: getFallbackRoute(newRole)
    };
  }
  
  return { shouldRedirect: false };
}

/**
 * Validate route access and get redirect if needed
 */
export function validateRouteAccess(
  route: string,
  role: UserRole | undefined
): { hasAccess: boolean; redirectTo?: string } {
  const hasAccess = hasRouteAccess(role, route);
  
  if (!hasAccess) {
    return {
      hasAccess: false,
      redirectTo: getFallbackRoute(role)
    };
  }
  
  return { hasAccess: true };
}
