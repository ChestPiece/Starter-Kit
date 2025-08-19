// User profiles types - consolidated from multiple type files

export interface UserProfile {
  id: string;
  email: string;
  role_id?: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  profile?: string;
}

export interface Role {
  id: string;
  name: 'admin' | 'manager' | 'user';
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfileWithRole extends UserProfile {
  roles?: Role;
}

// Utility types for role checking
export type UserRole = 'admin' | 'manager' | 'user';

// Role hierarchy (higher number = more permissions)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  manager: 2,
  user: 1,
};

// Helper functions
export const hasPermission = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

export const isAdmin = (userRole?: UserRole): boolean => {
  return userRole === 'admin';
};

export const isManager = (userRole?: UserRole): boolean => {
  return userRole === 'admin' || userRole === 'manager';
};

export const canManageUser = (currentUserRole: UserRole, targetUserRole: UserRole): boolean => {
  // Admins can manage everyone
  if (currentUserRole === 'admin') return true;
  
  // Managers can manage users but not other managers or admins
  if (currentUserRole === 'manager' && targetUserRole === 'user') return true;
  
  return false;
};

// Role display names
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  user: 'User',
};

// Role descriptions
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Full access to all features and user management',
  manager: 'Can manage users and access most features',
  user: 'Basic access to core features',
};
