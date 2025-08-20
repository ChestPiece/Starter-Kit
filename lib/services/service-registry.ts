/**
 * Service Registry
 * Centralized service management and dependency injection
 */

import { enhancedUserService } from './enhanced-user-service';
import { rolesService } from './roles-service';
import { BaseService } from './base-service';

export type ServiceName = 'users' | 'roles';

/**
 * Service Registry Class
 * Manages all application services with dependency injection
 */
class ServiceRegistry {
  private services: Map<string, BaseService>;
  private static instance: ServiceRegistry;

  private constructor() {
    this.services = new Map();
    this.initializeServices();
  }

  /**
   * Singleton instance
   */
  public static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  /**
   * Initialize all services
   */
  private initializeServices(): void {
    this.registerService('users', enhancedUserService);
    this.registerService('roles', rolesService);
  }

  /**
   * Register a service
   */
  public registerService<T extends BaseService>(name: string, service: T): void {
    this.services.set(name, service);
  }

  /**
   * Get a service by name
   */
  public getService<T extends BaseService>(name: ServiceName): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not found. Available services: ${Array.from(this.services.keys()).join(', ')}`);
    }
    return service as T;
  }

  /**
   * Get all service names
   */
  public getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Clear all service caches
   */
  public clearAllCaches(): void {
    this.services.forEach((service) => {
      service.clearCache();
    });
  }

  /**
   * Clear cache for specific service
   */
  public clearServiceCache(name: ServiceName, pattern?: string): void {
    const service = this.getService(name);
    service.clearCache(pattern);
  }

  /**
   * Health check for all services
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, 'up' | 'down'>;
    timestamp: string;
  }> {
    const serviceStatuses: Record<string, 'up' | 'down'> = {};
    
    for (const [name, service] of this.services) {
      try {
        // Simple health check - try to count records
        const result = await (service as any).count();
        serviceStatuses[name] = result.success ? 'up' : 'down';
      } catch (error) {
        serviceStatuses[name] = 'down';
      }
    }

    const downServices = Object.values(serviceStatuses).filter(status => status === 'down').length;
    const totalServices = Object.keys(serviceStatuses).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (downServices === 0) {
      status = 'healthy';
    } else if (downServices < totalServices) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      services: serviceStatuses,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get service statistics
   */
  public getServiceStats(): {
    totalServices: number;
    serviceNames: string[];
    cacheStats: Record<string, { size: number }>;
  } {
    const cacheStats: Record<string, { size: number }> = {};
    
    this.services.forEach((service, name) => {
      cacheStats[name] = {
        size: (service as any).cache?.size || 0
      };
    });

    return {
      totalServices: this.services.size,
      serviceNames: this.getServiceNames(),
      cacheStats
    };
  }
}

/**
 * Service Factory Functions
 * Convenient functions to get services
 */

// Get service registry instance
export const serviceRegistry = ServiceRegistry.getInstance();

// Convenient service getters with proper typing
export const getUserService = () => enhancedUserService;
export const getRolesService = () => rolesService;

/**
 * Service Hook for React Components
 */
export function useService<T extends BaseService>(name: ServiceName): T {
  return serviceRegistry.getService<T>(name);
}

/**
 * Service Status Hook
 */
export function useServiceHealth() {
  return serviceRegistry.healthCheck();
}

/**
 * Batch Operations Utility
 */
export class BatchOperations {
  private static instance: BatchOperations;

  public static getInstance(): BatchOperations {
    if (!BatchOperations.instance) {
      BatchOperations.instance = new BatchOperations();
    }
    return BatchOperations.instance;
  }

  /**
   * Execute multiple operations across services
   */
  public async executeBatch(operations: Array<{
    service: ServiceName;
    operation: string;
    params: any[];
  }>): Promise<Array<{ success: boolean; data: any; error: string | null }>> {
    const results = await Promise.allSettled(
      operations.map(async (op) => {
        const service = serviceRegistry.getService(op.service);
        const method = (service as any)[op.operation];
        
        if (typeof method !== 'function') {
          throw new Error(`Method '${op.operation}' not found on service '${op.service}'`);
        }
        
        return method.apply(service, op.params);
      })
    );

    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          data: null,
          error: result.reason?.message || 'Unknown error'
        };
      }
    });
  }

  /**
   * Transaction-like operations (all or nothing)
   */
  public async executeTransaction(operations: Array<{
    service: ServiceName;
    operation: string;
    params: any[];
  }>): Promise<{ success: boolean; results: any[]; error: string | null }> {
    try {
      const results = await this.executeBatch(operations);
      
      // Check if all operations succeeded
      const failed = results.filter(result => !result.success);
      
      if (failed.length > 0) {
        // If any operation failed, clear caches and return error
        serviceRegistry.clearAllCaches();
        return {
          success: false,
          results: [],
          error: `Transaction failed: ${failed.map(f => f.error).join(', ')}`
        };
      }

      return {
        success: true,
        results: results.map(r => r.data),
        error: null
      };
    } catch (error) {
      return {
        success: false,
        results: [],
        error: (error as Error).message
      };
    }
  }
}

// Export batch operations instance
export const batchOperations = BatchOperations.getInstance();

/**
 * Service decorator for automatic caching
 * Note: This is a simplified version - for full functionality, 
 * implement caching directly in your service methods
 */
export function Cacheable(ttl?: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    // For now, just return the original descriptor
    // In a real implementation, you'd need proper type handling
    return descriptor;
  };
}

/**
 * Service initialization utility
 */
export async function initializeServices(): Promise<void> {
  try {
    const registry = ServiceRegistry.getInstance();
    const health = await registry.healthCheck();
    
    console.log('Service Registry initialized:', {
      status: health.status,
      services: Object.keys(health.services).length,
      timestamp: health.timestamp
    });

    if (health.status === 'unhealthy') {
      console.warn('Some services are unhealthy:', health.services);
    }
  } catch (error) {
    console.error('Failed to initialize services:', error);
    throw error;
  }
}
