/**
 * Service Initialization
 * Initialize all services when the app starts
 */

import { initializeServices, serviceRegistry } from './service-registry';
import { apiService } from './api-service';

/**
 * Initialize all application services
 */
export async function initializeAppServices(): Promise<void> {
  try {
    console.log('🚀 Initializing application services...');

    // Initialize the service registry
    await initializeServices();

    // Set up API service with base configuration
    apiService.setBaseHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    });

    // Get service statistics
    const stats = serviceRegistry.getServiceStats();
    console.log(`✅ Services initialized successfully:`, {
      totalServices: stats.totalServices,
      services: stats.serviceNames,
      timestamp: new Date().toISOString()
    });

    // Perform health check
    const health = await serviceRegistry.healthCheck();
    if (health.status !== 'healthy') {
      console.warn('⚠️ Some services may not be fully operational:', health.services);
    } else {
      console.log('✅ All services are healthy');
    }

  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    throw new Error('Service initialization failed');
  }
}

/**
 * Cleanup services (for testing or app shutdown)
 */
export function cleanupServices(): void {
  try {
    console.log('🧹 Cleaning up services...');
    
    // Clear all caches
    serviceRegistry.clearAllCaches();
    apiService.clearCache();

    console.log('✅ Services cleaned up successfully');
  } catch (error) {
    console.error('❌ Failed to cleanup services:', error);
  }
}

/**
 * Get service health status
 */
export async function getServiceHealthStatus() {
  return serviceRegistry.healthCheck();
}

/**
 * Service configuration for different environments
 */
export const SERVICE_CONFIG = {
  development: {
    cacheTTL: {
      short: 2 * 60 * 1000,    // 2 minutes
      medium: 5 * 60 * 1000,   // 5 minutes  
      long: 10 * 60 * 1000,    // 10 minutes
    },
    apiTimeout: 30000,
    enableDebugLogging: true,
  },
  production: {
    cacheTTL: {
      short: 5 * 60 * 1000,    // 5 minutes
      medium: 15 * 60 * 1000,  // 15 minutes
      long: 60 * 60 * 1000,    // 1 hour
    },
    apiTimeout: 15000,
    enableDebugLogging: false,
  },
} as const;

/**
 * Get current environment configuration
 */
export function getServiceConfig() {
  const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  return SERVICE_CONFIG[env];
}
