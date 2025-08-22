/**
 * Enhanced User Service using Base Service
 * Consolidated user service with all functionality from legacy user-service.ts
 * Provides comprehensive user management with roles, caching, and optimizations
 */

import { BaseService, ServiceResponse, QueryOptions } from './base-service';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { User as CustomUser } from '@/types/types';
import { mapSupabaseUserToCustomUser } from '@/types/auth';

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  role_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profile?: string | null;
  roles?: {
    name: string;
  };
}

export interface CreateUserData {
  first_name: string;
  last_name: string;
  email: string;
  role_id?: string;
  avatar_url?: string;
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string;
  role_id?: string;
  is_active?: boolean;
}

/**
 * Enhanced User Service
 */
class EnhancedUserService extends BaseService {
  constructor() {
    super('user_profiles', 10 * 60 * 1000); // 10 minutes cache
  }

  /**
   * Get user with role information
   */
  public async getUserWithRole(
    id: string,
    options: QueryOptions = {}
  ): Promise<ServiceResponse<UserProfile>> {
    const queryOptions = {
      ...options,
      select: 'id, first_name, last_name, email, avatar_url, role_id, is_active, created_at, updated_at, roles:role_id(name)'
    };

    return this.findById<UserProfile>(id, queryOptions);
  }

  /**
   * Get all users with roles and pagination
   */
  public async getUsersWithRoles(options: QueryOptions = {}) {
    const queryOptions = {
      ...options,
      select: 'id, first_name, last_name, email, avatar_url, role_id, is_active, created_at, updated_at, roles:role_id(name)',
      orderBy: 'created_at',
      orderDirection: 'desc' as const
    };

    return this.findAll<UserProfile>(queryOptions);
  }

  /**
   * Search users by name or email
   */
  public async searchUsers(
    searchTerm: string,
    options: QueryOptions = {}
  ): Promise<ServiceResponse<UserProfile[]>> {
    try {
      const cacheKey = this.generateCacheKey('searchUsers', { searchTerm, ...options });
      
      // Check cache first
      if (options.useCache !== false) {
        const cached = this.getCachedData<UserProfile[]>(cacheKey);
        if (cached) {
          return { data: cached, error: null, success: true };
        }
      }

      const query = this.supabase
        .from(this.tableName)
        .select('id, first_name, last_name, email, avatar_url, role_id, is_active, created_at, updated_at, roles:role_id(name)')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(options.limit || 10);

      return this.executeQuery<UserProfile[]>(
        query,
        'searchUsers',
        cacheKey,
        options.cacheTTL
      );
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error as Error, 'searchUsers'),
        success: false
      };
    }
  }

  /**
   * Get users by role
   */
  public async getUsersByRole(
    roleName: string,
    options: QueryOptions = {}
  ): Promise<ServiceResponse<UserProfile[]>> {
    try {
      const cacheKey = this.generateCacheKey('getUsersByRole', { roleName, ...options });
      
      // Check cache first
      if (options.useCache !== false) {
        const cached = this.getCachedData<UserProfile[]>(cacheKey);
        if (cached) {
          return { data: cached, error: null, success: true };
        }
      }

      const query = this.supabase
        .from(this.tableName)
        .select('id, first_name, last_name, email, avatar_url, role_id, is_active, created_at, updated_at, roles:role_id!inner(name)')
        .eq('roles.name', roleName)
        .order('created_at', { ascending: false });

      return this.executeQuery<UserProfile[]>(
        query,
        'getUsersByRole',
        cacheKey,
        options.cacheTTL
      );
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error as Error, 'getUsersByRole'),
        success: false
      };
    }
  }

  /**
   * Create user with profile
   */
  public async createUser(userData: CreateUserData): Promise<ServiceResponse<UserProfile>> {
    try {
      // Get default role if not specified
      let roleId = userData.role_id;
      if (!roleId) {
        const { data: userRole } = await this.supabase
          .from('roles')
          .select('id')
          .eq('name', 'user')
          .single();
        
        roleId = userRole?.id;
      }

      if (!roleId) {
        return {
          data: null,
          error: 'Unable to assign default role to user',
          success: false
        };
      }

      const userToCreate = {
        ...userData,
        role_id: roleId,
        is_active: true
      };

      const result = await this.create<UserProfile>(userToCreate);
      
      if (result.success && result.data) {
        // Fetch the complete user with role information
        return this.getUserWithRole(result.data.id);
      }

      return result;
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error as Error, 'createUser'),
        success: false
      };
    }
  }

  /**
   * Update user profile
   */
  public async updateUser(
    id: string,
    userData: UpdateUserData
  ): Promise<ServiceResponse<UserProfile>> {
    const result = await this.update<UserProfile>(id, userData);
    
    if (result.success && result.data) {
      // Return updated user with role information
      return this.getUserWithRole(id, { useCache: false });
    }
    
    return result;
  }

  /**
   * Activate/Deactivate user
   */
  public async setUserStatus(
    id: string,
    isActive: boolean
  ): Promise<ServiceResponse<UserProfile>> {
    return this.updateUser(id, { is_active: isActive });
  }

  /**
   * Change user role
   */
  public async changeUserRole(
    id: string,
    roleId: string
  ): Promise<ServiceResponse<UserProfile>> {
    return this.updateUser(id, { role_id: roleId });
  }

  /**
   * Create enhanced user from Supabase auth user
   * Provides fallback handling for missing profiles
   */
  public async createEnhancedUser(supaUser: SupabaseUser): Promise<CustomUser> {
    // Try to get existing profile
    const existingProfile = await this.getUserProfile(supaUser.id, { useCache: false });
    
    if (existingProfile) {
      return existingProfile;
    }

    // Create fallback user with auth metadata
    const fallbackUser = mapSupabaseUserToCustomUser(supaUser);
    if (fallbackUser) {
      fallbackUser.roles = { name: 'user' };
      
      // Try to create profile in background
      this.createUserProfileInBackground(supaUser);
      
      return fallbackUser;
    }

    // Ultimate fallback
    return {
      id: supaUser.id,
      email: supaUser.email || '',
      first_name: supaUser.user_metadata?.first_name || '',
      last_name: supaUser.user_metadata?.last_name || '',
      role_id: 'default-user-role',
      is_active: true,
      profile: supaUser.user_metadata?.avatar_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      roles: { name: 'user' }
    };
  }

  /**
   * Get user profile with legacy compatibility
   */
  public async getUserProfile(userId: string, options: { useCache?: boolean } = {}): Promise<CustomUser | null> {
    const result = await this.getUserWithRole(userId, options);
    if (result.success && result.data) {
      // Convert UserProfile to CustomUser format for compatibility
      return {
        id: result.data.id,
        email: result.data.email,
        first_name: result.data.first_name,
        last_name: result.data.last_name,
        role_id: result.data.role_id,
        is_active: result.data.is_active,
        profile: result.data.avatar_url || result.data.profile || null,
        created_at: result.data.created_at,
        updated_at: result.data.updated_at,
        roles: result.data.roles
      };
    }
    return null;
  }

  /**
   * Get users with pagination (optimized for data tables)
   */
  public async getUsersPagination(
    searchTerm: string = '',
    pageSize: number = 10,
    currentPage: number = 0
  ) {
    try {
      // First try using the optimized database function
      const { data: funcData, error: funcError } = await this.supabase
        .rpc('get_users_with_roles_pagination', {
          search_term: searchTerm || '',
          page_size: pageSize,
          page_number: currentPage
        });

      if (!funcError && funcData) {
        const transformedUsers = funcData.map((user: any) => ({
          id: user.id,
          email: user.email || '',
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          role_id: user.role_id,
          is_active: user.is_active,
          profile: user.profile,
          created_at: user.created_at,
          updated_at: user.updated_at,
          roles: {
            name: user.role_name || 'user'
          }
        }));

        return {
          users: transformedUsers,
          totalCount: funcData[0]?.total_count || transformedUsers.length
        };
      }

      // Fallback to base service pagination
      const result = await this.getUsersWithRoles({
        page: currentPage + 1,
        limit: pageSize,
        filters: searchTerm ? {
          or: `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
        } : {}
      });

      if (result.success) {
        return {
          users: result.data,
          totalCount: result.total
        };
      }

      return {
        users: [],
        totalCount: 0
      };
    } catch (error) {
      console.error('Error in getUsersPagination:', error);
      return {
        users: [],
        totalCount: 0
      };
    }
  }

  /**
   * Update user profile with legacy compatibility
   */
  public async updateUserProfile(userId: string, updates: Partial<CustomUser>): Promise<CustomUser | null> {
    const result = await this.updateUser(userId, {
      first_name: updates.first_name,
      last_name: updates.last_name,
      email: updates.email,
      avatar_url: updates.profile,
      role_id: updates.role_id,
      is_active: updates.is_active
    });

    if (result.success && result.data) {
      return this.getUserProfile(userId, { useCache: false });
    }
    return null;
  }

  /**
   * Create user profile in background
   */
  private async createUserProfileInBackground(supaUser: SupabaseUser): Promise<void> {
    try {
      await this.createUser({
        first_name: supaUser.user_metadata?.first_name || '',
        last_name: supaUser.user_metadata?.last_name || '',
        email: supaUser.email || '',
        avatar_url: supaUser.user_metadata?.avatar_url
      });
    } catch (error) {
      console.error('Error creating user profile in background:', error);
    }
  }

  /**
   * Get user statistics
   */
  public async getUserStats(): Promise<ServiceResponse<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
  }>> {
    try {
      const cacheKey = this.generateCacheKey('getUserStats');
      
      // Check cache first
      const cached = this.getCachedData<any>(cacheKey);
      if (cached) {
        return { data: cached, error: null, success: true };
      }

      // Get total and active counts
      const [totalResult, activeResult, roleStatsResult] = await Promise.all([
        this.count(),
        this.count({ is_active: true }),
        this.supabase
          .from('user_profiles')
          .select('roles:role_id(name)')
          .eq('is_active', true)
      ]);

      if (!totalResult.success || !activeResult.success || roleStatsResult.error) {
        return {
          data: null,
          error: 'Failed to fetch user statistics',
          success: false
        };
      }

      const total = totalResult.data || 0;
      const active = activeResult.data || 0;
      const inactive = total - active;

      // Calculate by role
      const byRole: Record<string, number> = {};
      if (roleStatsResult.data) {
        roleStatsResult.data.forEach((user: any) => {
          const roleName = user.roles?.name || 'unknown';
          byRole[roleName] = (byRole[roleName] || 0) + 1;
        });
      }

      const stats = { total, active, inactive, byRole };
      
      // Cache for 5 minutes
      this.setCachedData(cacheKey, stats, 5 * 60 * 1000);

      return { data: stats, error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error as Error, 'getUserStats'),
        success: false
      };
    }
  }

  /**
   * Batch update user roles
   */
  public async batchUpdateRoles(
    userIds: string[],
    roleId: string
  ): Promise<ServiceResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .update({ 
          role_id: roleId,
          updated_at: new Date().toISOString()
        })
        .in('id', userIds);

      if (error) {
        return {
          data: false,
          error: this.handleError(error, 'batchUpdateRoles'),
          success: false
        };
      }

      // Clear cache
      this.clearCache();

      return { data: true, error: null, success: true };
    } catch (error) {
      return {
        data: false,
        error: this.handleError(error as Error, 'batchUpdateRoles'),
        success: false
      };
    }
  }

  /**
   * Real-time user updates subscription
   */
  public subscribeToUserChanges(
    callback: (payload: any) => void
  ) {
    return this.supabase
      .channel('user_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles'
        },
        (payload) => {
          // Clear cache when changes occur
          this.clearCache();
          callback(payload);
        }
      )
      .subscribe();
  }
}

// Export singleton instance
export const enhancedUserService = new EnhancedUserService();
