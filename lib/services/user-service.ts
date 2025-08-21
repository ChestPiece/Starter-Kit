import { getSupabaseClient } from '@/lib/supabase/singleton-client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { User as CustomUser } from '@/types/types';
import { mapSupabaseUserToCustomUser } from '@/types/auth';

/**
 * Centralized User Service using Supabase optimizations
 * Replaces all duplicate user fetching logic across the application
 */
class UserService {
  private static instance: UserService;
  private supabase = getSupabaseClient();
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Get user profile with optimized Supabase query and caching
   */
  async getUserProfile(userId: string, options: { useCache?: boolean } = {}): Promise<CustomUser | null> {
    const { useCache = true } = options;
    
    // Check cache first
    if (useCache) {
      const cached = this.getCachedData(`profile_${userId}`);
      if (cached) return cached;
    }

    try {
      // Try to use the optimized database function first
      const { data: funcData, error: funcError } = await this.supabase
        .rpc('get_user_with_role', { profile_user_id: userId });

      if (!funcError && funcData && funcData.length > 0) {
        const user = funcData[0];
        const transformedUser: CustomUser = {
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
        };

        if (useCache) {
          this.setCachedData(`profile_${userId}`, transformedUser);
        }

        return transformedUser;
      }

      // Fallback to direct query if function not available
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          role_id,
          is_active,
          profile,
          created_at,
          updated_at,
          roles:role_id(name)
        `)
        .eq('id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !data) return null;

      // Transform to CustomUser format
      const transformedUser: CustomUser = {
        id: data.id,
        email: data.email || '',
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        role_id: data.role_id,
        is_active: data.is_active,
        profile: data.profile,
        created_at: data.created_at,
        updated_at: data.updated_at,
        roles: {
          name: (data.roles as any)?.name || 'user'
        }
      };

      if (useCache) {
        this.setCachedData(`profile_${userId}`, transformedUser);
      }

      return transformedUser;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  /**
   * Create enhanced user from Supabase user + profile data
   */
  async createEnhancedUser(supaUser: SupabaseUser): Promise<CustomUser> {
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
   * Get users with pagination (optimized for data tables)
   */
  async getUsersPagination(
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

      // Fallback to direct query if function doesn't exist
      let query = this.supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          role_id,
          is_active,
          profile,
          created_at,
          updated_at,
          roles:role_id(name)
        `, { count: 'exact' });

      // Add search filter if provided
      if (searchTerm) {
        query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      // Add pagination
      const from = currentPage * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await query
        .range(from, to)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match expected format
      const transformedUsers = (data || []).map(user => ({
        ...user,
        roles: user.roles ? { name: (user.roles as any).name } : { name: 'user' }
      }));

      return {
        users: transformedUsers,
        totalCount: count || 0
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      return {
        users: [],
        totalCount: 0
      };
    }
  }

  /**
   * Update user profile with optimistic updates
   */
  async updateUserProfile(userId: string, updates: Partial<CustomUser>): Promise<CustomUser | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .update({
          first_name: updates.first_name,
          last_name: updates.last_name,
          email: updates.email,
          role_id: updates.role_id,
          is_active: updates.is_active,
          profile: updates.profile
        })
        .eq('id', userId)
        .select(`
          id,
          email,
          first_name,
          last_name,
          role_id,
          is_active,
          profile,
          created_at,
          updated_at,
          roles:role_id!inner(name)
        `)
        .single();

      if (error) throw error;

      // Update cache
      this.invalidateUserCache(userId);
      
      const transformedUser: CustomUser = {
        id: data.id,
        email: data.email,
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        role_id: data.role_id,
        is_active: data.is_active,
        profile: data.profile,
        created_at: data.created_at,
        updated_at: data.updated_at,
        roles: {
          name: (data.roles as any)?.name || 'user'
        }
      };

      this.setCachedData(`profile_${userId}`, transformedUser);
      return transformedUser;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Subscribe to user profile changes using Supabase real-time
   */
  subscribeToUserChanges(userId: string, callback: (user: CustomUser | null) => void) {
    return this.supabase
      .channel(`user_profile_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${userId}`
        },
        async (payload) => {
          // Invalidate cache and fetch fresh data
          this.invalidateUserCache(userId);
          const updatedUser = await this.getUserProfile(userId, { useCache: false });
          callback(updatedUser);
        }
      )
      .subscribe();
  }

  /**
   * Create user profile in background
   */
  private async createUserProfileInBackground(supaUser: SupabaseUser): Promise<void> {
    try {
      // Get default user role
      const { data: defaultRole } = await this.supabase
        .from('roles')
        .select('id')
        .eq('name', 'user')
        .single();

      // Create user profile
      await this.supabase
        .from('user_profiles')
        .insert({
          id: supaUser.id,
          email: supaUser.email,
          first_name: supaUser.user_metadata?.first_name || '',
          last_name: supaUser.user_metadata?.last_name || '',
          role_id: defaultRole?.id || 'd9a0935b-9fe1-4550-8f7e-67639fd0c6f0',
          is_active: true,
          profile: supaUser.user_metadata?.avatar_url || null
        });
    } catch (error) {
      // Silent failure - profile creation will be retried on next fetch
    }
  }

  /**
   * Cache management
   */
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private invalidateUserCache(userId: string): void {
    this.cache.delete(`profile_${userId}`);
  }

  /**
   * Clear all cache (useful for logout)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const userService = UserService.getInstance();
