import { createClient } from './client';
import { UserProfile, UserRole } from '@/types/user-profiles-simple';

export class UserProfileService {
  private supabase = createClient();

  // Get current user's profile
  async getCurrentUserProfile(): Promise<UserProfile | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting current user profile:', error);
      return null;
    }
  }

  // Get user profile by ID
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // Get all user profiles (admin/manager only)
  async getAllUserProfiles(): Promise<UserProfile[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting all user profiles:', error);
      return [];
    }
  }

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return null;
    }
  }

  // Update user role (admin only)
  async updateUserRole(userId: string, roleId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_profiles')
        .update({ 
          role_id: roleId,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      return !error;
    } catch (error) {
      console.error('Error updating user role:', error);
      return false;
    }
  }

  // Check if current user has admin role
  async isCurrentUserAdmin(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .rpc('is_admin');

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Check if current user has manager role or higher
  async isCurrentUserManager(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .rpc('is_manager');

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error checking manager status:', error);
      return false;
    }
  }

  // Get current user's role
  async getCurrentUserRole(): Promise<UserRole> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_user_role');

      if (error) throw error;
      return (data as UserRole) || 'user';
    } catch (error) {
      console.error('Error getting user role:', error);
      return 'user';
    }
  }

  // Get all roles
  async getAllRoles() {
    try {
      const { data, error } = await this.supabase
        .from('roles')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting roles:', error);
      return [];
    }
  }

  // Delete user profile (admin only)
  async deleteUserProfile(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      return !error;
    } catch (error) {
      console.error('Error deleting user profile:', error);
      return false;
    }
  }

  // Search users by name or email
  async searchUsers(query: string): Promise<UserProfile[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,full_name.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  // Get users by role
  async getUsersByRole(roleName: UserRole): Promise<UserProfile[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('role_name', roleName)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting users by role:', error);
      return [];
    }
  }

  // Update last login time
  async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.supabase
        .from('user_profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }
}

// Create singleton instance
export const userProfileService = new UserProfileService();
