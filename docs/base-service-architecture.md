# Base Service Architecture Documentation

## Overview

The Base Service Architecture provides a comprehensive, scalable foundation for all Supabase operations in your application. It includes built-in error handling, caching, pagination, batch operations, and consistent patterns across all services.

## Architecture Components

### 1. BaseService (`lib/services/base-service.ts`)

The foundation class that all services extend from.

**Features:**

- Built-in error handling and logging
- Automatic caching with TTL
- Generic CRUD operations
- Pagination support
- Batch operations
- Query optimization
- Consistent response formats

### 2. Service Registry (`lib/services/service-registry.ts`)

Centralized service management with dependency injection.

**Features:**

- Singleton service instances
- Service health monitoring
- Cache management across services
- Batch operations across multiple services
- Service statistics

### 3. Enhanced Services

Specialized services that extend BaseService:

- `EnhancedUserService` - User management with roles
- `RolesService` - Role and permission management
- `ApiService` - HTTP operations with retry logic

## Quick Start

### Creating a New Service

```typescript
// lib/services/posts-service.ts
import { BaseService, ServiceResponse, QueryOptions } from "./base-service";

export interface Post {
  id: string;
  title: string;
  content: string;
  author_id: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

class PostsService extends BaseService {
  constructor() {
    super("posts", 5 * 60 * 1000); // 5 minutes cache
  }

  // Custom methods
  public async getPublishedPosts(options: QueryOptions = {}) {
    const queryOptions = {
      ...options,
      filters: { is_published: true },
      orderBy: "created_at",
      orderDirection: "desc" as const,
    };

    return this.findAll<Post>(queryOptions);
  }

  public async getPostsByAuthor(authorId: string) {
    return this.findAll<Post>({
      filters: { author_id: authorId },
      orderBy: "created_at",
      orderDirection: "desc",
    });
  }
}

export const postsService = new PostsService();
```

### Register the Service

```typescript
// Add to lib/services/service-registry.ts
import { postsService } from "./posts-service";

// In the initializeServices method:
this.registerService("posts", postsService);

// Add to ServiceName type:
export type ServiceName = "users" | "roles" | "posts";

// Add convenience getter:
export const getPostsService = () => serviceRegistry.getService("posts");
```

## Usage Examples

### Basic CRUD Operations

```typescript
import { getUserService } from "@/lib/services/service-registry";

const userService = getUserService();

// Create user
const result = await userService.createUser({
  first_name: "John",
  last_name: "Doe",
  email: "john@example.com",
});

if (result.success) {
  console.log("User created:", result.data);
} else {
  console.error("Error:", result.error);
}

// Get user with caching
const user = await userService.getUserWithRole("123", { useCache: true });

// Update user
const updated = await userService.updateUser("123", {
  first_name: "Jane",
});

// Delete user
const deleted = await userService.delete("123");
```

### Pagination

```typescript
const users = await userService.getUsersWithRoles({
  page: 1,
  limit: 10,
  orderBy: "created_at",
  orderDirection: "desc",
  filters: { is_active: true },
});

console.log("Users:", users.data);
console.log("Total:", users.total);
console.log("Has more:", users.hasMore);
```

### Caching

```typescript
// Use cache (default behavior)
const cached = await userService.findById("123", { useCache: true });

// Skip cache
const fresh = await userService.findById("123", { useCache: false });

// Custom cache TTL (10 minutes)
const custom = await userService.findById("123", {
  useCache: true,
  cacheTTL: 10 * 60 * 1000,
});

// Clear specific cache
userService.clearCache("findById:123");

// Clear all cache
userService.clearCache();
```

### Search and Filtering

```typescript
// Search users
const searchResults = await userService.searchUsers("john", {
  limit: 5,
});

// Get users by role
const adminUsers = await userService.getUsersByRole("admin");

// Custom filtering
const activeUsers = await userService.findAll({
  filters: {
    is_active: true,
    role_id: "admin-role-id",
  },
  orderBy: "last_login",
  orderDirection: "desc",
});
```

### Batch Operations

```typescript
import { batchOperations } from "@/lib/services/service-registry";

// Execute multiple operations
const results = await batchOperations.executeBatch([
  {
    service: "users",
    operation: "createUser",
    params: [
      { first_name: "User1", last_name: "Test", email: "user1@test.com" },
    ],
  },
  {
    service: "users",
    operation: "createUser",
    params: [
      { first_name: "User2", last_name: "Test", email: "user2@test.com" },
    ],
  },
]);

// Transaction-like operations (all or nothing)
const transaction = await batchOperations.executeTransaction([
  {
    service: "users",
    operation: "updateUser",
    params: ["user1", { is_active: false }],
  },
  {
    service: "roles",
    operation: "updateRole",
    params: ["role1", { is_active: false }],
  },
]);
```

### Real-time Subscriptions

```typescript
// Subscribe to user changes
const subscription = userService.subscribeToUserChanges((payload) => {
  console.log("User changed:", payload);
  // Handle real-time updates
});

// Cleanup subscription
subscription.unsubscribe();
```

### Service Health Monitoring

```typescript
import { serviceRegistry } from "@/lib/services/service-registry";

// Check all services health
const health = await serviceRegistry.healthCheck();
console.log("Service status:", health.status);
console.log("Service details:", health.services);

// Get service statistics
const stats = serviceRegistry.getServiceStats();
console.log("Total services:", stats.totalServices);
console.log("Cache sizes:", stats.cacheStats);
```

### API Service Usage

```typescript
import { apiService } from "@/lib/services/api-service";

// Set authentication
apiService.setAuthToken("your-jwt-token");

// GET request with caching
const data = await apiService.get<User[]>("/api/users", {
  cache: true,
  cacheTTL: 10 * 60 * 1000, // 10 minutes
});

// POST request
const newUser = await apiService.post<User>("/api/users", {
  name: "John Doe",
  email: "john@example.com",
});

// File upload
const uploadResult = await apiService.upload<{ url: string }>(
  "/api/upload",
  file,
  {
    fieldName: "avatar",
    additionalData: { userId: "123" },
  }
);
```

## React Integration

### Using Services in Components

```typescript
import { useEffect, useState } from 'react';
import { getUserService } from '@/lib/services/service-registry';

function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const userService = getUserService();

  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      const result = await userService.getUsersWithRoles({
        page: 1,
        limit: 10
      });

      if (result.success) {
        setUsers(result.data);
      }
      setLoading(false);
    }

    loadUsers();
  }, [userService]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {users.map(user => (
        <div key={user.id}>{user.first_name} {user.last_name}</div>
      ))}
    </div>
  );
}
```

### Custom Hook for Service

```typescript
// hooks/use-users.ts
import { useState, useEffect } from "react";
import { getUserService } from "@/lib/services/service-registry";

export function useUsers(options = {}) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const userService = getUserService();

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      const result = await userService.getUsersWithRoles(options);

      if (result.success) {
        setUsers(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }

    fetchUsers();
  }, [JSON.stringify(options)]);

  return { users, loading, error, refetch: fetchUsers };
}
```

## Error Handling

All services use consistent error handling:

```typescript
const result = await userService.createUser(userData);

if (result.success) {
  // Success - use result.data
  console.log("User created:", result.data);
} else {
  // Error - use result.error
  console.error("Failed to create user:", result.error);
  // Show user-friendly error message
  toast.error(result.error);
}
```

## Performance Optimization

### Caching Strategy

1. **Short-term cache** (5 minutes) for frequently changing data
2. **Medium-term cache** (15 minutes) for reference data (roles, settings)
3. **Long-term cache** (1 hour) for static data

### Best Practices

1. Use pagination for large datasets
2. Implement proper cache invalidation
3. Use batch operations for multiple related operations
4. Monitor service health regularly
5. Clear caches after mutations

## Testing

```typescript
// Example test
import { enhancedUserService } from "@/lib/services/enhanced-user-service";

describe("EnhancedUserService", () => {
  beforeEach(() => {
    enhancedUserService.clearCache();
  });

  it("should create a user", async () => {
    const userData = {
      first_name: "Test",
      last_name: "User",
      email: "test@example.com",
    };

    const result = await enhancedUserService.createUser(userData);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty("id");
    expect(result.data.email).toBe(userData.email);
  });
});
```

## Migration from Existing Services

To migrate existing services to use the base service:

1. Extend `BaseService` instead of creating from scratch
2. Replace direct Supabase calls with base service methods
3. Update error handling to use consistent response format
4. Add caching where appropriate
5. Register service in the service registry

This architecture provides a solid foundation for scalable, maintainable Supabase operations with built-in best practices.
