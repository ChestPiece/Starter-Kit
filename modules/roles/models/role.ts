export interface Role {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RoleWithAccess extends Role {
  role_access: {
    id: string;
    resource: string;
    action: string;
  }[];
}