// Real users service fetching from Supabase database
import { createClient } from '@/lib/supabase/client';

export const usersService = {
  /**
   * Insert a user into the database
   */
  insertUser: async (data: any) => {
    const supabase = createClient();
    
    try {
      // Add timeout protection for database operations
      const insertPromise = supabase
        .from('user_profiles')
        .insert([
          {
            email: data.email,
            role_id: data.role_id,
            first_name: data.first_name || null,
            last_name: data.last_name || null,
            is_active: true,
            profile: data.profile || null,
          }
        ])
        .select('*, roles(name)')
        .single();

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database insert timeout')), 15000);
      });

      const { data: newUser, error } = await Promise.race([insertPromise, timeoutPromise]) as any;

      if (error) {
        // Handle specific error types
        if (error.code === '23505') { // Unique constraint violation
          throw new Error(`User with email ${data.email} already exists`);
        }
        if (error.code === '23503') { // Foreign key constraint violation
          throw new Error('Invalid role_id provided');
        }
        throw error;
      }
      return newUser;
    } catch (error) {
      console.error("Error inserting user:", error);
      throw error;
    }
  },

  /**
   * Create a user - wrapper for insertUser
   */
  createUser: async (data: any) => {
    return await usersService.insertUser(data);
  },

  /**
   * Get all users from the database
   */
  getUsers: async () => {
    const supabase = createClient();
    
    try {
      // Add timeout protection for database queries
      const queryPromise = supabase
        .from('user_profiles')
        .select(`
          *,
          roles:role_id (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database query timeout')), 10000);
      });

      const { data: users, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (error) {
        console.error("Error fetching users:", error);
        
        // Try fallback query without role join if join fails
        if (error.message?.includes('roles') || error.message?.includes('relation')) {
          console.log("Retrying query without role join...");
          const { data: basicUsers, error: basicError } = await supabase
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (!basicError && basicUsers) {
            return basicUsers.map(user => ({
              ...user,
              roles: { name: 'user' } // Default role for fallback
            }));
          }
        }
        
        throw error;
      }

      // Transform the data to match expected format
      const transformedUsers = users?.map(user => ({
        ...user,
        roles: user.roles ? { name: user.roles.name } : { name: 'user' }
      })) || [];

      return transformedUsers;
    } catch (error) {
      console.error("Error fetching users:", error);
      return [];
    }
  },

  /**
   * Get users with pagination and search
   */
  getUsersPagination: async (search: string, limit: number, offset: number) => {
    const supabase = createClient();
    
    try {
      // Build the base query with proper role join
      let query = supabase
        .from('user_profiles')
        .select(`
          *,
          roles:role_id (
            id,
            name
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Add search filter if provided and valid
      if (search && typeof search === 'string' && search.trim() !== '') {
        const searchTerm = search.trim();
        
        // Skip invalid search terms
        if (searchTerm !== 'undefined' && searchTerm !== 'null' && searchTerm.length > 0) {
          query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
        }
      }

      // Apply pagination after filters
      query = query.range(offset, offset + limit - 1);

      const { data: users, error, count } = await query;

      if (error) {
        console.error("Supabase error in getUsersPagination:", error);
        console.error("Query details:", { search, limit, offset });
        throw error;
      }

      console.log("Users fetched successfully:", users?.length || 0, "total:", count);

      // Transform the data to match expected format
      const transformedUsers = users?.map(user => ({
        ...user,
        roles: user.roles ? { name: user.roles.name } : { name: 'user' }
      })) || [];

      return {
        users: transformedUsers,
        totalCount: count || 0
      };
    } catch (error) {
      console.error("Error fetching users with pagination:", error);
      // Return empty result instead of throwing to prevent UI crashes
      return {
        users: [],
        totalCount: 0
      };
    }
  },

  /**
   * Update a user in the database
   */
  updateUser: async (data: any): Promise<void> => {
    const supabase = createClient();
    
    try {
      // Add timeout protection for database operations
      const updatePromise = supabase
        .from('user_profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          role_id: data.role_id,
          is_active: data.is_active,
          profile: data.profile,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database update timeout')), 10000);
      });

      const { error } = await Promise.race([updatePromise, timeoutPromise]) as any;

      if (error) {
        // Handle specific error types
        if (error.code === '23505') { // Unique constraint violation
          throw new Error(`User with email ${data.email} already exists`);
        }
        if (error.code === '23503') { // Foreign key constraint violation
          throw new Error('Invalid role_id provided');
        }
        if (error.code === 'PGRST116') { // No rows found
          throw new Error(`User with id ${data.id} not found`);
        }
        throw error;
      }
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  },

  /**
   * Delete a user from the database
   */
  deleteUser: async (id: string): Promise<void> => {
    const supabase = createClient();
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  },

  /**
   * Get a user by id from the database
   */
  getUserById: async (id: string) => {
    const supabase = createClient();
    
    try {
      const { data: user, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          roles:role_id (
            id,
            name
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error("Error fetching user by ID:", error);
        throw error;
      }

      // Transform the data to match expected format
      if (user) {
        return {
          ...user,
          roles: user.roles ? { name: user.roles.name } : { name: 'user' }
        };
      }

      return user;
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      return null;
    }
  }
}; 