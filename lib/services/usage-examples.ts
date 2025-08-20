/**
 * Usage Examples for Base Service Architecture
 * These examples show how to use the services in real application scenarios
 */

import { 
  getUserService, 
  getRolesService, 
  serviceRegistry,
  batchOperations 
} from './service-registry';
import { enhancedUserService } from './enhanced-user-service';
import { rolesService } from './roles-service';
import { apiService } from './api-service';

/**
 * Example 1: User Management Operations
 */
export async function userManagementExamples() {
  const userService = getUserService();

  // Create a new user
  const newUser = await userService.createUser({
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com'
  });

  if (newUser.success) {
    console.log('User created:', newUser.data?.id);

    // Get user with role information
    const userWithRole = await userService.getUserWithRole(newUser.data!.id);
    console.log('User role:', userWithRole.data?.roles?.name);

    // Update user
    const updatedUser = await userService.updateUser(newUser.data!.id, {
      first_name: 'Jane'
    });
    console.log('User updated:', updatedUser.success);

    // Search users
    const searchResults = await userService.searchUsers('jane', { limit: 5 });
    console.log('Search results:', searchResults.data?.length);
  }
}

/**
 * Example 2: Pagination and Filtering
 */
export async function paginationExample() {
  const userService = getUserService();

  // Get paginated users with filtering
  let currentPage = 1;
  const pageSize = 10;

  do {
    const users = await userService.getUsersWithRoles({
      page: currentPage,
      limit: pageSize,
      filters: { is_active: true },
      orderBy: 'created_at',
      orderDirection: 'desc'
    });

    if (users.success) {
      console.log(`Page ${currentPage}:`, users.data.length, 'users');
      console.log(`Total: ${users.total}, Has more: ${users.hasMore}`);
      
      // Process users
      users.data.forEach(user => {
        console.log(`- ${user.first_name} ${user.last_name} (${user.roles?.name})`);
      });

      if (!users.hasMore) break;
      currentPage++;
    } else {
      console.error('Failed to fetch users:', users.error);
      break;
    }
  } while (true);
}

/**
 * Example 3: Role-based Operations
 */
export async function roleBasedExample() {
  const userService = getUserService();
  const rolesSvc = getRolesService();

  // Get all active roles
  const roles = await rolesSvc.getActiveRoles();
  if (roles.success && roles.data) {
    console.log('Available roles:', roles.data.map(r => r.name));
  }

  // Get users by role
  const adminUsers = await userService.getUsersByRole('admin');
  if (adminUsers.success) {
    console.log('Admin users:', adminUsers.data?.length);
  }

  // Check permissions
  const adminRole = await rolesSvc.getRoleByName('admin');
  if (adminRole.success && adminRole.data) {
    const hasPermission = await rolesSvc.hasPermission(
      adminRole.data.id, 
      'users.manage'
    );
    console.log('Admin has users.manage permission:', hasPermission.data);
  }
}

/**
 * Example 4: Batch Operations
 */
export async function batchOperationsExample() {
  // Create multiple users at once
  const batchCreateResults = await batchOperations.executeBatch([
    {
      service: 'users',
      operation: 'createUser',
      params: [{
        first_name: 'User1',
        last_name: 'Test',
        email: 'user1@example.com'
      }]
    },
    {
      service: 'users', 
      operation: 'createUser',
      params: [{
        first_name: 'User2',
        last_name: 'Test',
        email: 'user2@example.com'
      }]
    }
  ]);

  console.log('Batch create results:', batchCreateResults.map(r => r.success));

  // Transaction-like operation
  const userIds = batchCreateResults
    .filter(r => r.success)
    .map(r => r.data.id);

  if (userIds.length > 0) {
    const transaction = await batchOperations.executeTransaction([
      {
        service: 'users',
        operation: 'setUserStatus',
        params: [userIds[0], false]
      },
      {
        service: 'users',
        operation: 'updateUser', 
        params: [userIds[0], { first_name: 'Deactivated User' }]
      }
    ]);

    console.log('Transaction result:', transaction.success);
  }
}

/**
 * Example 5: Caching and Performance
 */
export async function cachingExample() {
  const userService = getUserService();

  // First call - will hit database
  console.time('First call');
  const user1 = await userService.getUserWithRole('some-id', { useCache: true });
  console.timeEnd('First call');

  // Second call - will use cache
  console.time('Cached call');  
  const user2 = await userService.getUserWithRole('some-id', { useCache: true });
  console.timeEnd('Cached call');

  // Fresh call - bypasses cache
  console.time('Fresh call');
  const user3 = await userService.getUserWithRole('some-id', { useCache: false });
  console.timeEnd('Fresh call');

  // Clear specific cache
  userService.clearCache('getUserWithRole');
  
  // Clear all cache for user service
  userService.clearCache();

  // Clear all service caches
  serviceRegistry.clearAllCaches();
}

/**
 * Example 6: Real-time Subscriptions
 */
export async function realTimeExample() {
  const userService = getUserService();

  // Subscribe to user changes
  const subscription = userService.subscribeToUserChanges((payload) => {
    console.log('User change detected:', payload);
    
    switch (payload.eventType) {
      case 'INSERT':
        console.log('New user created:', payload.new);
        break;
      case 'UPDATE':
        console.log('User updated:', payload.new);
        break;
      case 'DELETE':
        console.log('User deleted:', payload.old);
        break;
    }
  });

  // Later, cleanup subscription
  // subscription.unsubscribe();
}

/**
 * Example 7: API Service Usage
 */
export async function apiServiceExample() {
  // Set authentication
  const token = 'your-jwt-token';
  apiService.setAuthToken(token);

  // GET with caching
  const users = await apiService.get<any[]>('/api/users', {
    cache: true,
    cacheTTL: 5 * 60 * 1000 // 5 minutes
  });

  if (users.success) {
    console.log('API Users:', users.data?.length);
  }

  // POST request
  const newUser = await apiService.post('/api/users', {
    name: 'New User',
    email: 'new@example.com'
  });

  if (newUser.success) {
    console.log('User created via API:', newUser.data);
  }

  // File upload
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  if (fileInput?.files?.[0]) {
    const uploadResult = await apiService.upload(
      '/api/upload',
      fileInput.files[0],
      {
        fieldName: 'avatar',
        additionalData: { userId: '123' }
      }
    );

    if (uploadResult.success) {
      console.log('File uploaded:', uploadResult.data);
    }
  }
}

/**
 * Example 8: Error Handling Patterns
 */
export async function errorHandlingExample() {
  const userService = getUserService();

  // Standard error handling
  const result = await userService.getUserWithRole('invalid-id');
  
  if (result.success) {
    // Success path
    console.log('User found:', result.data);
  } else {
    // Error path - result.error contains user-friendly message
    console.error('Error:', result.error);
    // You can show this to the user in a toast/alert
  }

  // Batch error handling
  const batchResults = await batchOperations.executeBatch([
    { service: 'users', operation: 'getUserWithRole', params: ['id1'] },
    { service: 'users', operation: 'getUserWithRole', params: ['invalid-id'] },
    { service: 'users', operation: 'getUserWithRole', params: ['id3'] }
  ]);

  batchResults.forEach((result, index) => {
    if (result.success) {
      console.log(`Operation ${index + 1} succeeded:`, result.data);
    } else {
      console.error(`Operation ${index + 1} failed:`, result.error);
    }
  });
}

/**
 * Example 9: Service Health Monitoring
 */
export async function healthMonitoringExample() {
  // Check service health
  const health = await serviceRegistry.healthCheck();
  console.log('Service Health:', health);

  // Get service statistics
  const stats = serviceRegistry.getServiceStats();
  console.log('Service Stats:', stats);

  // Monitor specific service
  const userService = getUserService();
  const userStats = await userService.getUserStats();
  if (userStats.success) {
    console.log('User Statistics:', userStats.data);
  }
}

/**
 * Example 10: React Hook Integration
 */
export function createUserHook() {
  return `
// Custom hook example
import { useState, useEffect } from 'react';
import { getUserService } from '@/lib/services/service-registry';

export function useUsers(filters = {}) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const userService = getUserService();

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      const result = await userService.getUsersWithRoles({
        ...filters,
        useCache: true
      });
      
      if (result.success) {
        setUsers(result.data);
        setError(null);
      } else {
        setError(result.error);
        setUsers([]);
      }
      setLoading(false);
    }

    fetchUsers();
  }, [JSON.stringify(filters)]);

  const refetch = async () => {
    userService.clearCache('getUsersWithRoles');
    // Will trigger useEffect
    setLoading(true);
  };

  return { users, loading, error, refetch };
}

// Usage in component:
function UsersComponent() {
  const { users, loading, error, refetch } = useUsers({ 
    filters: { is_active: true } 
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      {users.map(user => (
        <div key={user.id}>{user.first_name} {user.last_name}</div>
      ))}
    </div>
  );
}
`;
}
