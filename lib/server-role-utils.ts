import { createClient } from "@/lib/supabase/server";

export type UserRole = 'admin' | 'manager' | 'user';

/**
 * Get user role from server-side Supabase client
 */
export const getServerUserRole = async (): Promise<UserRole | null> => {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get role from user_profiles table using the database function
    const { data, error } = await supabase
      .rpc('get_user_role');

    if (error) {
      console.error('Error fetching user role:', error);
      return 'user'; // Default role
    }

    // The function returns the role name directly
    const roleName = data || 'user';
    return roleName as UserRole;
  } catch (error) {
    console.error('Error in getServerUserRole:', error);
    return 'user'; // Default role
  }
};

/**
 * Check if user has required role or higher (server-side)
 */
export const hasServerPermission = (userRole: UserRole, requiredRole: UserRole): boolean => {
  const ROLE_HIERARCHY: Record<UserRole, number> = {
    admin: 3,
    manager: 2,
    user: 1,
  };

  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

/**
 * Check if user can access a specific route based on their role (server-side)
 */
export const canAccessServerRoute = (userRole: UserRole, route: string): boolean => {
  // Dashboard is accessible to all authenticated users
  if (route === '/' || route === '/dashboard') {
    return true;
  }

  // Settings page access (manager and admin)
  if (route.startsWith('/settings')) {
    return hasServerPermission(userRole, 'manager');
  }

  // Users page access (admin only)
  if (route.startsWith('/users')) {
    return hasServerPermission(userRole, 'admin');
  }

  // By default, allow access (for other pages like profile, etc.)
  return true;
};

/**
 * Check if a route requires authentication
 */
export const requiresAuth = (route: string): boolean => {
  const publicRoutes = [
    '/auth/login',
    '/auth/signup',
    '/auth/reset-password',
    '/auth/confirm',
  ];

  return !publicRoutes.some(publicRoute => route.startsWith(publicRoute));
};

/**
 * Get redirect URL for unauthorized access based on user role
 */
export const getUnauthorizedRedirect = (userRole: UserRole, attemptedRoute: string): string => {
  switch (userRole) {
    case 'admin':
      // Admin has access to everything
      return '/';
    case 'manager':
      // Manager trying to access admin-only route
      if (attemptedRoute.startsWith('/users')) {
        return '/settings';
      }
      return '/';
    case 'user':
    default:
      // Regular user trying to access restricted content
      return '/';
  }
};
