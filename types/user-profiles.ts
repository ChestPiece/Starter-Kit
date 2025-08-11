// Enhanced user profiles types with role management

export interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  bio?: string;
  website?: string;
  location?: string;
  date_of_birth?: string;
  profile?: string;
  
  // Role management
  role_id?: string;
  role_name: 'admin' | 'manager' | 'user';
  
  // Status
  is_active: boolean;
  last_login?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: 'admin' | 'manager' | 'user';
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface RoleAccess {
  id: string;
  role_id: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete';
  created_at: string;
  updated_at: string;
}

// Utility types for role checking
export type UserRole = 'admin' | 'manager' | 'user';

export interface UserWithRole extends UserProfile {
  role: Role;
  permissions?: RoleAccess[];
}

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
