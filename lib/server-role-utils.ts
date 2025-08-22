import { createClient } from "@/lib/supabase/server";
import { logger } from '@/lib/services/logger';
import { ROLE_HIERARCHY } from './role-utils';

export type UserRole = 'admin' | 'manager' | 'user';

/**
 * Get user role from server-side Supabase client with fallback
 */
export const getServerUserRole = async (): Promise<UserRole | null> => {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Try using the database function first
    try {
      const { data, error } = await supabase.rpc('get_user_role');
      
      if (!error && data) {
        return data as UserRole;
      }
    } catch (funcError) {
      logger.warn('RPC function failed, using direct query:', funcError as Record<string, any>);
    }

    // Fallback to direct query if function fails
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        role_id,
        roles:role_id!inner(name)
      `)
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      logger.error('Error fetching user role with fallback:', { error: profileError });
      
      // Last resort: try basic query and separate role lookup
      try {
        const { data: basicData, error: basicError } = await supabase
          .from('user_profiles')
          .select('role_id')
          .eq('id', user.id)
          .maybeSingle();
          
        if (basicData && !basicError) {
          const { data: roleData } = await supabase
            .from('roles')
            .select('name')
            .eq('id', basicData.role_id)
            .maybeSingle();
            
          return (roleData?.name as UserRole) || 'user';
        }
      } catch (lastResortError) {
        logger.error('Last resort role query failed:', { error: lastResortError instanceof Error ? lastResortError.message : String(lastResortError) });
      }
      
      return 'user'; // Default role
    }

    // Extract role name from the response
    const roleName = (profileData?.roles as any)?.name || 'user';
    return roleName as UserRole;
  } catch (error) {
    logger.error('Error in getServerUserRole:', { error: error instanceof Error ? error.message : String(error) });
    return 'user'; // Default role
  }
};

/**
 * Check if user has required role or higher (server-side)
 */
export const hasServerPermission = (userRole: UserRole, requiredRole: UserRole): boolean => {
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

  // Settings page access: only managers and admins
  if (route.startsWith('/settings')) {
    return hasServerPermission(userRole, 'manager');
  }

  // Users page access (admin only)
  if (route.startsWith('/users')) {
    return hasServerPermission(userRole, 'admin');
  }

  // For all other routes, allow access by default (for basic pages)
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
