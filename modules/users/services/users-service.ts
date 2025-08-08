// Mock users service (authentication and GraphQL backend removed)

// Mock user data
const mockUsers = [
  {
    id: "mock-user-1",
    email: "demo@example.com",
    first_name: "Demo",
    last_name: "User",
    role_id: "admin",
    roles: { name: "admin" },
    is_active: true,
    profile: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "mock-user-2", 
    email: "jane@example.com",
    first_name: "Jane",
    last_name: "Smith",
    role_id: "user",
    roles: { name: "user" },
    is_active: true,
    profile: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "mock-user-3",
    email: "john@example.com", 
    first_name: "John",
    last_name: "Doe",
    role_id: "manager",
    roles: { name: "manager" },
    is_active: true,
    profile: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const usersService = {
  /**
   * Insert a user (mock implementation)
   */
  insertUser: async (data: any) => {
    console.log("Mock user insert:", data);
    const newUser = {
      id: `mock-user-${mockUsers.length + 1}`,
          email: data.email,
          role_id: data.role_id,
          first_name: data.first_name || null,
          last_name: data.last_name || null,
          is_active: true,
          profile: data.profile || null,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockUsers.push(newUser);
    return newUser;
  },
  /**
   * Create a user - wrapper for insertUser
   */
  createUser: async (data: any) => {
    return await usersService.insertUser(data);
  },
  /**
   * Get all users (mock implementation)
   */
  getUsers: async () => {
    return [...mockUsers];
  },
  getUsersPagination: async (search: string, limit: number, offset: number) => {
    let filteredUsers = [...mockUsers];
    
    // Simple search filter
    if (search) {
      filteredUsers = mockUsers.filter(user => 
        user.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    const users = filteredUsers.slice(offset, offset + limit);
    return {
      users,
      totalCount: filteredUsers.length
    };
  },
  /**
   * Update a user (mock implementation)
   */
  updateUser: async (data: any): Promise<void> => {
    console.log("Mock user update:", data);
    const userIndex = mockUsers.findIndex(user => user.id === data.id);
    if (userIndex !== -1) {
      mockUsers[userIndex] = { ...mockUsers[userIndex], ...data, updated_at: new Date().toISOString() };
    }
  },
  /**
   * Delete a user (mock implementation)
   */
  deleteUser: async (id: string): Promise<void> => {
    console.log("Mock user delete:", id);
    const userIndex = mockUsers.findIndex(user => user.id === id);
    if (userIndex !== -1) {
      mockUsers.splice(userIndex, 1);
    }
  },
  /**
   * Get a user by id (mock implementation)
   */
  getUserById: async (id: string) => {
    const user = mockUsers.find(user => user.id === id);
    if (!user) {
      // Return the default demo user if ID not found
      return mockUsers[0];
    }
    return user;
  }
}; 