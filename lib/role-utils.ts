"use client";

import { getSupabaseClient } from "@/lib/supabase/singleton-client";
import { logger } from '@/lib/services/logger';

export type UserRole = 'admin' | 'manager' | 'user';

// Role hierarchy for permission checking (higher number = more permissions)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  manager: 2,
  user: 1,
};

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
 * Check if user has required role or higher
 */
export const hasPermission = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

/**
 * Check if user can access a specific route based on their role
 */
export const canAccessRoute = (userRole: UserRole, route: string): boolean => {
  // Dashboard is accessible to all authenticated users
  if (route === '/' || route === '/dashboard') {
    return true;
  }

  // Settings page access: only managers and admins
  if (route.startsWith('/settings')) {
    return hasPermission(userRole, 'manager');
  }

  // Users page access (admin only)
  if (route.startsWith('/users')) {
    return hasPermission(userRole, 'admin');
  }

  // For all other routes, allow access by default (for basic pages)
  return true;
};

/**
 * Get user role from Supabase with cache control
 */
export const getUserRole = async (forceRefresh: boolean = false): Promise<UserRole | null> => {
  try {
    const supabase = getSupabaseClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Build query - forcing refresh is handled by the calling context
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        role_id,
        roles:role_id!inner(name)
      `)
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching user role:', { error });
      
      // Try fallback query without join as backup
      try {
        const { data: basicData, error: basicError } = await supabase
          .from('user_profiles')
          .select('role_id')
          .eq('id', user.id)
          .maybeSingle();
          
        if (basicData && !basicError) {
          // Get role separately
          const { data: roleData } = await supabase
            .from('roles')
            .select('name')
            .eq('id', basicData.role_id)
            .maybeSingle();
            
          return (roleData?.name as UserRole) || 'user';
        }
      } catch (fallbackError) {
        logger.error('Fallback role query failed:', { error: fallbackError });
      }
      
      return 'user'; // Default role
    }

    // Handle the response structure - roles might be returned as an object or null
    let roleName = 'user';
    
    if (data?.roles && typeof data.roles === 'object' && 'name' in (data as any).roles) {
      roleName = ((data as any).roles as { name: string }).name;
    } else if (Array.isArray(data?.roles) && data.roles.length > 0) {
      // Handle array case if returned as array
      roleName = data.roles[0]?.name || 'user';
    }
    
    return (roleName === 'admin' || roleName === 'manager' || roleName === 'user') 
      ? roleName as UserRole 
      : 'user';
  } catch (error) {
    logger.error('Error in getUserRole:', { error });
    return 'user'; // Default role
  }
};

/**
 * Role-based route definitions
 */
export const ROLE_ROUTES = {
  user: [
    '/', // Dashboard only
    '/dashboard', // Dashboard access
  ],
  manager: [
    '/', // Dashboard
    '/dashboard', // Dashboard access
    '/settings', // Settings access
  ],
  admin: [
    '/', // Dashboard
    '/dashboard', // Dashboard access
    '/settings', // Settings access
    '/users', // User management
    // Admin has access to all routes
  ],
} as const;

/**
 * Get allowed routes for a user role
 */
export const getAllowedRoutes = (role: UserRole): string[] => {
  return [...(ROLE_ROUTES[role] || ROLE_ROUTES.user)];
};

/**
 * Check if a route requires authentication
 */
export const requiresAuth = (route: string): boolean => {
  // Define public routes that don't require authentication
  const publicRoutes = [
    '/auth/login',
    '/auth/signup',
    '/auth/reset-password',
    '/auth/confirm',
  ];

  return !publicRoutes.some(publicRoute => route.startsWith(publicRoute));
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

/**
 * Get redirect URL for unauthorized access based on user role
 */
export const getUnauthorizedRedirect = (userRole: UserRole, attemptedRoute: string): string => {
  // If user tries to access a route they don't have permission for,
  // redirect them to their highest allowed route
  
  switch (userRole) {
    case 'admin':
      // Admin has access to everything, so this shouldn't happen
      return '/';
    case 'manager':
      // Manager trying to access admin-only route, redirect to settings
      if (attemptedRoute.startsWith('/users')) {
        return '/settings';
      }
      return '/';
    case 'user':
    default:
      // Regular user trying to access restricted content, redirect to dashboard
      return '/';
  }
};

/**
 * Check if user role is valid
 */
export const isValidRole = (role: string): role is UserRole => {
  return ['admin', 'manager', 'user'].includes(role);
};
