/**
 * Roles Service using Base Service
 */

import { BaseService, ServiceResponse, QueryOptions } from './base-service';

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRoleData {
  name: string;
  description: string;
  permissions?: string[];
  is_active?: boolean;
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  permissions?: string[];
  is_active?: boolean;
}

/**
 * Roles Service
 */
class RolesService extends BaseService {
  constructor() {
    super('roles', 15 * 60 * 1000); // 15 minutes cache (roles change less frequently)
  }

  /**
   * Get all active roles
   */
  public async getActiveRoles(options: QueryOptions = {}): Promise<ServiceResponse<Role[]>> {
    const queryOptions = {
      ...options,
      filters: { is_active: true },
      orderBy: 'name',
      orderDirection: 'asc' as const
    };

    const result = await this.findAll<Role>(queryOptions);
    return {
      data: result.data,
      error: result.error,
      success: result.success
    };
  }

  /**
   * Get role by name
   */
  public async getRoleByName(name: string): Promise<ServiceResponse<Role>> {
    try {
      const cacheKey = this.generateCacheKey('getRoleByName', { name });
      
      // Check cache first
      const cached = this.getCachedData<Role>(cacheKey);
      if (cached) {
        return { data: cached, error: null, success: true };
      }

      const query = this.supabase
        .from(this.tableName)
        .select('*')
        .eq('name', name)
        .eq('is_active', true)
        .single();

      return this.executeQuery<Role>(query, 'getRoleByName', cacheKey);
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error as Error, 'getRoleByName'),
        success: false
      };
    }
  }

  /**
   * Create role
   */
  public async createRole(roleData: CreateRoleData): Promise<ServiceResponse<Role>> {
    const roleToCreate = {
      ...roleData,
      is_active: roleData.is_active ?? true,
      permissions: roleData.permissions || []
    };

    return this.create<Role>(roleToCreate);
  }

  /**
   * Update role
   */
  public async updateRole(id: string, roleData: UpdateRoleData): Promise<ServiceResponse<Role>> {
    return this.update<Role>(id, roleData);
  }

  /**
   * Check if user has permission
   */
  public async hasPermission(
    roleId: string,
    permission: string
  ): Promise<ServiceResponse<boolean>> {
    try {
      const roleResult = await this.findById<Role>(roleId);
      
      if (!roleResult.success || !roleResult.data) {
        return { data: false, error: roleResult.error, success: false };
      }

      const hasPermission = roleResult.data.permissions.includes(permission);
      return { data: hasPermission, error: null, success: true };
    } catch (error) {
      return {
        data: false,
        error: this.handleError(error as Error, 'hasPermission'),
        success: false
      };
    }
  }

  /**
   * Get role permissions
   */
  public async getRolePermissions(roleId: string): Promise<ServiceResponse<string[]>> {
    try {
      const roleResult = await this.findById<Role>(roleId);
      
      if (!roleResult.success || !roleResult.data) {
        return { data: [], error: roleResult.error, success: false };
      }

      return { 
        data: roleResult.data.permissions, 
        error: null, 
        success: true 
      };
    } catch (error) {
      return {
        data: [],
        error: this.handleError(error as Error, 'getRolePermissions'),
        success: false
      };
    }
  }
}

// Export singleton instance
export const rolesService = new RolesService();
