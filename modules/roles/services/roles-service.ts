// Mock roles service (authentication and GraphQL backend removed)
import { Role } from "../models/role";

// Type for role with access permissions
interface RoleWithAccess extends Role {
  role_access: Array<{
    id: string;
    resource: string;
    action: string;
  }>;
}

// Type for paginated roles response
interface PaginatedRolesResponse {
  roles: Role[];
  roles_aggregate: {
    aggregate: {
      count: number;
    };
  };
}

// Mock role data
const mockRoles: Role[] = [
  {
    id: "admin-role-id",
    name: "admin",
    description: "Administrator with full access",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "manager-role-id", 
    name: "manager",
    description: "Manager with limited admin access",
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

export const rolesService = {
  /**
   * Get all roles (mock implementation)
   */
  getAllRoles: async () => {
    return [...mockRoles];
  },

  /**
   * Get a role by ID (mock implementation)
   */
  getRoleById: async (id: string): Promise<Role | null> => {
    const role = mockRoles.find(role => role.id === id);
    return role || null;
  },

  /**
   * Get roles with their access permissions (mock implementation)
   */
  getRolesWithAccess: async (): Promise<RoleWithAccess[]> => {
    return mockRoles.map(role => ({
      ...role,
      role_access: [
        {
          id: `access-${role.id}`,
          resource: "*",
          action: role.name === "admin" ? "*" : "read"
        }
      ]
    }));
  },

  /**
   * Get paginated roles (mock implementation)
   */
  getPaginatedRoles: async (page = 1, pageSize = 10): Promise<{ roles: Role[], total: number }> => {
    const offset = (page - 1) * pageSize;
    const paginatedRoles = mockRoles.slice(offset, offset + pageSize);
    
    return {
      roles: paginatedRoles,
      total: mockRoles.length
    };
  },

  /**
   * Search roles by name (mock implementation)
   */
  searchRoles: async (searchTerm: string): Promise<Role[]> => {
    return mockRoles.filter(role => 
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  },
  
  /**
   * Get role by name (mock implementation)
   */
  getRoleByName: async (roleName: string = "user"): Promise<string> => {
    const role = mockRoles.find(role => role.name === roleName);
    return role?.id || "user-role-id"; // Default to user role
  }
}; 