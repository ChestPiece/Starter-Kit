// Real roles service connected to Supabase database
import { getSupabaseClient } from '@/lib/supabase/singleton-client';
import { Role, RoleWithAccess } from '../models/role';
import { logger } from '@/lib/services/logger';
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
    const supabase = getSupabaseClient();
    
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        logger.error("Error fetching roles:", { error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
      
      return data || [];
    } catch (error) {
      logger.error("Error in getAllRoles:", { error: error instanceof Error ? error.message : String(error) });
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
    const supabase = getSupabaseClient();
    
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
        logger.error("Error fetching role by ID:", { error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
      
      return data;
    } catch (error) {
      logger.error("Error in getRoleById:", { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  },
  /**
   * Get roles with their access permissions from database
   */
  getRolesWithAccess: async (): Promise<RoleWithAccess[]> => {
    const supabase = getSupabaseClient();
    
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
        logger.error("Error fetching roles with access:", { error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
      
      return data || [];
    } catch (error) {
      logger.error("Error in getRolesWithAccess:", { error: error instanceof Error ? error.message : String(error) });
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
    const supabase = getSupabaseClient();
    
    try {
      const offset = (page - 1) * pageSize;
      
      // Get total count and paginated data in parallel
      const [countResult, dataResult] = await Promise.all([
        supabase.from('roles').select('*', { count: 'exact', head: true }),
        supabase
          .from('roles')
          .select('*')
          .order('name', { ascending: true })
          .range(offset, offset + pageSize - 1)
      ]);
      
      if (countResult.error) {
        logger.error("Error counting roles:", { error: countResult.error instanceof Error ? countResult.error.message : String(countResult.error) });
        throw countResult.error;
      }
      
      if (dataResult.error) {
        logger.error("Error fetching paginated roles:", { error: dataResult.error instanceof Error ? dataResult.error.message : String(dataResult.error) });
        throw dataResult.error;
      }
      





      return {
        roles: dataResult.data || [],
        total: countResult.count || 0
      };
    } catch (error) {
      logger.error("Error in getPaginatedRoles:", { error: error instanceof Error ? error.message : String(error) });
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
    const supabase = getSupabaseClient();
    
    try {
      const sanitizedSearchTerm = searchTerm.replace(/[%_]/g, '\\$&'); // Escape special characters
      
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .or(`name.ilike.%${sanitizedSearchTerm}%,description.ilike.%${sanitizedSearchTerm}%`)
        .order('name', { ascending: true });
      
      if (error) {
        logger.error("Error searching roles:", { error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
      
      return data || [];
    } catch (error) {
      logger.error("Error in searchRoles:", { error: error instanceof Error ? error.message : String(error) });
      // Fallback to client-side filtering on error
      const allRoles = await rolesService.getAllRoles();
      const searchTermLower = searchTerm.toLowerCase();
      return allRoles.filter(role => 
        role.name.toLowerCase().includes(searchTermLower) ||
        (role.description?.toLowerCase() || '').includes(searchTermLower)
      );
    }
  },
  
  /**
   * Get role ID by name from database
   */
  getRoleByName: async (roleName: string = "user"): Promise<string> => {
    const supabase = getSupabaseClient();
    
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id')
        .eq('name', roleName.toLowerCase())
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Role not found, return fallback
          logger.warn(`Role "${roleName}" not found, returning fallback`);
          return "user-role-id";
        }
        logger.error("Error fetching role by name:", { error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
      
      return data.id;
    } catch (error) {
      logger.error("Error in getRoleByName:", { error: error instanceof Error ? error.message : String(error) });
      return "user-role-id"; // Default fallback
    }
  },
  /**
   * Create a new role in database
   */
  createRole: async (roleData: Omit<Role, 'id' | 'created_at' | 'updated_at'>): Promise<Role> => {
    const supabase = getSupabaseClient();
    
    try {
      const timestamp = new Date().toISOString();
      const { data, error } = await supabase
        .from('roles')
        .insert([{
          ...roleData,
          name: roleData.name.toLowerCase(),
          created_at: timestamp,
          updated_at: timestamp
        }])
        .select('*')
        .single();
      
      if (error) {
        logger.error("Error creating role:", { error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
      
      return data;
    } catch (error) {
      logger.error("Error in createRole:", { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  },

  /**
   * Update an existing role in database
   */
  updateRole: async (id: string, updates: Partial<Omit<Role, 'id' | 'created_at'>>): Promise<Role> => {
    const supabase = getSupabaseClient();
    
    try {
      const timestamp = new Date().toISOString();
      const { data, error } = await supabase
        .from('roles')
        .update({
          ...updates,
          name: updates.name?.toLowerCase(),
          updated_at: timestamp
        })
        .eq('id', id)
        .select('*')
        .single();
      
      if (error) {
        logger.error("Error updating role:", { error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
      
      return data;
    } catch (error) {
      logger.error("Error in updateRole:", { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
};

export default rolesService;