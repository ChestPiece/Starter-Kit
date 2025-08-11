"use client";

import { createClient } from "@/lib/supabase/client";

export type UserRole = 'admin' | 'manager' | 'user';

// Role hierarchy for permission checking (higher number = more permissions)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  manager: 2,
  user: 1,
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

  // Settings page - all authenticated users can access profile settings
  // But only managers+ can access organization/appearance settings
  if (route.startsWith('/settings')) {
    return true; // All users can access settings (role guards handle specific sections)
  }

  // Users page access (admin only)
  if (route.startsWith('/users')) {
    return hasPermission(userRole, 'admin');
  }

  // By default, allow access (for other pages)
  return true;
};

/**
 * Get user role from Supabase
 */
export const getUserRole = async (): Promise<UserRole | null> => {
  try {
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Try to get role from user_profiles table
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        roles:role_id (
          name
        )
      `)
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user role:', error);
      return 'user'; // Default role
    }

    // Handle the response structure - roles might be returned as an object or null
    let roleName = 'user';
    
    if (data?.roles && typeof data.roles === 'object' && 'name' in data.roles) {
      roleName = (data.roles as { name: string }).name;
    } else if (Array.isArray(data?.roles) && data.roles.length > 0) {
      // Handle array case if returned as array
      roleName = data.roles[0]?.name || 'user';
    }
    
    return (roleName === 'admin' || roleName === 'manager' || roleName === 'user') 
      ? roleName as UserRole 
      : 'user';
  } catch (error) {
    console.error('Error in getUserRole:', error);
    return 'user'; // Default role
  }
};

/**
 * Role-based route definitions
 */
export const ROLE_ROUTES = {
  user: [
    '/', // Dashboard only
  ],
  manager: [
    '/', // Dashboard
    '/settings', // Settings access
  ],
  admin: [
    '/', // Dashboard
    '/settings', // Settings access
    '/users', // User management
    // Add more admin routes as needed
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
