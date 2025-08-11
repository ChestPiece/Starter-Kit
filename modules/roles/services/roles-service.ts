// Real roles service connected to Supabase database
import { createClient } from '@/lib/supabase/client';
import { Role, RoleWithAccess } from '../models/role';

interface PaginatedRolesResponse {
  roles: Role[];
  roles_aggregate: {
    aggregate: {
      count: number;
    };
  };
}

export const rolesService = {
  /**
   * Get all roles from database
   */
  getAllRoles: async (): Promise<Role[]> => {
    const supabase = createClient();
    
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        console.error("Error fetching roles:", error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error("Error in getAllRoles:", error);
      // Return fallback roles on error
      return [
        {
          id: "admin-role-id",
          name: "admin",
          description: "Administrator with full access",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: "user-role-id",
          name: "user", 
          description: "Regular user with basic access",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
    }
  },

  /**
   * Get a role by ID from database
   */
  getRoleById: async (id: string): Promise<Role | null> => {
    const supabase = createClient();
    
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        console.error("Error fetching role by ID:", error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error("Error in getRoleById:", error);
      return null;
    }
  },

  /**
   * Get roles with their access permissions from database
   */
  getRolesWithAccess: async (): Promise<RoleWithAccess[]> => {
    const supabase = createClient();
    
    try {
      const { data, error } = await supabase
        .from('roles')
        .select(`
          *,
          role_access (
            id,
            resource,
            action
          )
        `)
        .order('name', { ascending: true });
      
      if (error) {
        console.error("Error fetching roles with access:", error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error("Error in getRolesWithAccess:", error);
      // Return fallback roles with basic access on error
      const fallbackRoles = await rolesService.getAllRoles();
      return fallbackRoles.map(role => ({
        ...role,
        role_access: [
          {
            id: `access-${role.id}`,
            resource: "*",
            action: role.name === "admin" ? "*" : "read"
          }
        ]
      }));
    }
  },

  /**
   * Get paginated roles from database
   */
  getPaginatedRoles: async (page = 1, pageSize = 10): Promise<{ roles: Role[], total: number }> => {
    const supabase = createClient();
    
    try {
      const offset = (page - 1) * pageSize;
      
      // Get total count
      const { count, error: countError } = await supabase
        .from('roles')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error("Error counting roles:", countError);
        throw countError;
      }
      
      // Get paginated data
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name', { ascending: true })
        .range(offset, offset + pageSize - 1);
      
      if (error) {
        console.error("Error fetching paginated roles:", error);
        throw error;
      }
      
      return {
        roles: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error("Error in getPaginatedRoles:", error);
      const fallbackRoles = await rolesService.getAllRoles();
      const offset = (page - 1) * pageSize;
      const paginatedRoles = fallbackRoles.slice(offset, offset + pageSize);
      
      return {
        roles: paginatedRoles,
        total: fallbackRoles.length
      };
    }
  },

  /**
   * Search roles by name or description in database
   */
  searchRoles: async (searchTerm: string): Promise<Role[]> => {
    const supabase = createClient();
    
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('name', { ascending: true });
      
      if (error) {
        console.error("Error searching roles:", error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error("Error in searchRoles:", error);
      // Fallback to client-side filtering on error
      const allRoles = await rolesService.getAllRoles();
      return allRoles.filter(role => 
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  },
  
  /**
   * Get role ID by name from database
   */
  getRoleByName: async (roleName: string = "user"): Promise<string> => {
    const supabase = createClient();
    
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id')
        .eq('name', roleName)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Role not found, return fallback
          console.warn(`Role "${roleName}" not found, returning fallback`);
          return "user-role-id";
        }
        console.error("Error fetching role by name:", error);
        throw error;
      }
      
      return data.id;
    } catch (error) {
      console.error("Error in getRoleByName:", error);
      return "user-role-id"; // Default fallback
    }
  },

  /**
   * Create a new role in database
   */
  createRole: async (roleData: Omit<Role, 'id' | 'created_at' | 'updated_at'>): Promise<Role> => {
    const supabase = createClient();
    
    try {
      const { data, error } = await supabase
        .from('roles')
        .insert([{
          ...roleData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select('*')
        .single();
      
      if (error) {
        console.error("Error creating role:", error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error("Error in createRole:", error);
      throw error;
    }
  },

  /**
   * Update an existing role in database
   */
  updateRole: async (id: string, updates: Partial<Omit<Role, 'id' | 'created_at'>>): Promise<Role> => {
    const supabase = createClient();
    
    try {
      const { data, error } = await supabase
        .from('roles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')
        .single();
      
      if (error) {
        console.error("Error updating role:", error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error("Error in updateRole:", error);
      throw error;
    }
  },

  /**
   * Delete a role from database
   */
  deleteRole: async (id: string): Promise<boolean> => {
    const supabase = createClient();
    
    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error("Error deleting role:", error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error("Error in deleteRole:", error);
      return false;
    }
  }
};