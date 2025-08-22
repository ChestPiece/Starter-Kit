/**
 * Service Registry
 * Centralized service management and dependency injection
 * Optimized for better type safety, performance, and maintainability
 */

import { BaseService } from './base-service';
import { useState, useEffect } from 'react';
import { logger } from './logger';

// Lazy imports to avoid circular dependencies
type EnhancedUserService = any;
type LoggerService = any;

export type ServiceName = 'users' | 'roles' | 'logger';

// Service type mapping for better type safety
export interface ServiceMap {
  users: EnhancedUserService;
  roles: typeof rolesService;
  logger: LoggerService;
}

// Service configuration interface
export interface ServiceConfig {
  name: ServiceName;
  instance: BaseService;
  dependencies?: ServiceName[];
  lazy?: boolean;
}

/**
 * Service Registry Class
 * Manages all application services with dependency injection
 * Enhanced with better error handling and performance optimizations
 */
class ServiceRegistry {
  private services: Map<string, BaseService>;
  private serviceConfigs: Map<string, ServiceConfig>;
  private initializationPromises: Map<string, Promise<void>>;
  private static instance: ServiceRegistry;
  private isInitialized: boolean = false;

  private constructor() {
    this.services = new Map();
    this.serviceConfigs = new Map();
    this.initializationPromises = new Map();
    // Don't initialize services in constructor to avoid circular dependencies
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
   * Initialize all services with lazy loading
   */
  private async initializeServices(): Promise<void> {
    // Lazy load services to avoid circular dependencies
    const { logger } = await import('./logger');
    const { enhancedUserService } = await import('./enhanced-user-service');
    const { rolesService } = await import('./roles-service');

    // Register services directly
    this.services.set('logger', logger);
    this.services.set('users', enhancedUserService);
    this.services.set('roles', rolesService);

    this.isInitialized = true;
  }

  /**
   * Register service configuration
   */
  private registerServiceConfig(config: ServiceConfig): void {
    this.serviceConfigs.set(config.name, config);
  }

  /**
   * Initialize services in dependency order
   */
  private initializeInOrder(): void {
    const initialized = new Set<string>();
    const initializing = new Set<string>();

    const initService = (name: string): void => {
      if (initialized.has(name) || initializing.has(name)) {
        return;
      }

      const config = this.serviceConfigs.get(name);
      if (!config) {
        throw new Error(`Service configuration not found: ${name}`);
      }

      initializing.add(name);

      // Initialize dependencies first
      if (config.dependencies) {
        config.dependencies.forEach(dep => initService(dep));
      }

      // Register the service
      this.services.set(name, config.instance);
      initialized.add(name);
      initializing.delete(name);
    };

    // Initialize all configured services
    for (const name of this.serviceConfigs.keys()) {
      initService(name);
    }

    this.isInitialized = true;
  }

  /**
   * Register a service
   */
  public registerService<T extends BaseService>(name: string, service: T): void {
    this.services.set(name, service);
  }

  /**
   * Ensure services are initialized
   */
  public async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeServices();
    }
  }

  /**
   * Get a service by name with improved type safety
   */
  public async getService<K extends ServiceName>(name: K): Promise<ServiceMap[K]> {
    await this.ensureInitialized();

    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not found. Available services: ${Array.from(this.services.keys()).join(', ')}`);
    }
    return service as ServiceMap[K];
  }

  /**
   * Get a service safely with null return instead of throwing
   */
  public async getServiceSafe<K extends ServiceName>(name: K): Promise<ServiceMap[K] | null> {
    try {
      return await this.getService(name);
    } catch {
      return null;
    }
  }

  /**
   * Check if a service is registered
   */
  public hasService(name: ServiceName): boolean {
    return this.services.has(name);
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
 * Convenient functions to get services with improved performance and type safety
 */

// Get service registry instance
export const serviceRegistry = ServiceRegistry.getInstance();

// Service factory functions with async loading
export const getUserService = async (): Promise<EnhancedUserService> => {
  return await serviceRegistry.getService('users');
};

export const getRolesService = async (): Promise<any> => {
  return await serviceRegistry.getService('roles');
};

export const getLoggerService = async (): Promise<LoggerService> => {
  return await serviceRegistry.getService('logger');
};

// Add ensureInitialized method
export const ensureServicesInitialized = async (): Promise<void> => {
  await serviceRegistry.ensureInitialized();
};

/**
 * Service Hook for React Components
 */
export function useService<T extends keyof ServiceMap>(serviceName: T): { service: ServiceMap[T] | null; loading: boolean; error: string | null } {
  const [service, setService] = useState<ServiceMap[T] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadService = async () => {
      try {
        setLoading(true);
        await serviceRegistry.ensureInitialized();
        const serviceInstance = await serviceRegistry.getService(serviceName);
        setService(serviceInstance);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load service');
        setService(null);
      } finally {
        setLoading(false);
      }
    };

    loadService();
  }, [serviceName]);

  return { service, loading, error };
}

/**
 * Service Status Hook
 */
export function useServiceHealth() {
  const [healthStatus, setHealthStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        setLoading(true);
        await serviceRegistry.ensureInitialized();
        const status = await serviceRegistry.healthCheck();
        setHealthStatus(status);
      } catch (error) {
        console.error('Health check failed:', error);
        setHealthStatus({});
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return { healthStatus, loading };
}

/**
 * Batch Operations Utility
 */
export class BatchOperations {
  private static instance: BatchOperations;
  private operations: Array<() => Promise<any>> = [];

  public static getInstance(): BatchOperations {
    if (!BatchOperations.instance) {
      BatchOperations.instance = new BatchOperations();
    }
    return BatchOperations.instance;
  }

  add<T>(operation: () => Promise<T>): this {
    this.operations.push(operation);
    return this;
  }

  async execute(): Promise<any[]> {
    await serviceRegistry.ensureInitialized();
    return Promise.all(this.operations.map(op => op()));
  }

  async executeSequential(): Promise<any[]> {
    await serviceRegistry.ensureInitialized();
    const results = [];
    for (const operation of this.operations) {
      results.push(await operation());
    }
    return results;
  }

  clear(): this {
    this.operations = [];
    return this;
  }

  // Execute operations across multiple services
  async executeTransaction(): Promise<any[]> {
    try {
      await serviceRegistry.ensureInitialized();
      const results = await this.execute();
      return results;
    } catch (error) {
      // Clear all service caches on transaction failure
      serviceRegistry.clearAllCaches();
      throw error;
    }
  }

  /**
   * Execute multiple operations across services
   */
  public async executeBatch(operations: Array<{
    service: ServiceName;
    operation: string;
    params: any[];
  }>): Promise<Array<{ success: boolean; data: any; error: string | null }>> {
    await serviceRegistry.ensureInitialized();
    const results = await Promise.allSettled(
      operations.map(async (op) => {
        const service = await serviceRegistry.getService(op.service);
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
    await registry.ensureInitialized();
    const health = await registry.healthCheck();
    
    logger.info('Service Registry initialized:', {
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
