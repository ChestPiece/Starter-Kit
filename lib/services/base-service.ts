/**
 * Base Service for Supabase Operations
 * Provides common functionality for all services in the application
 */

import { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/singleton-client';

export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  error: string | null;
  success: boolean;
}

export interface CacheOptions {
  useCache?: boolean;
  cacheKey?: string;
  cacheTTL?: number; // Time to live in milliseconds
}

export interface QueryOptions extends CacheOptions, PaginationOptions {
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: Record<string, any>;
  select?: string;
}

/**
 * Abstract Base Service Class
 * All service classes should extend this for consistency
 */
export abstract class BaseService {
  protected supabase: SupabaseClient;
  protected cache: Map<string, { data: any; timestamp: number; ttl: number }>;
  protected tableName: string;
  protected defaultCacheTTL: number;

  constructor(tableName: string, cacheTTL: number = 5 * 60 * 1000) { // 5 minutes default
    this.supabase = getSupabaseClient();
    this.cache = new Map();
    this.tableName = tableName;
    this.defaultCacheTTL = cacheTTL;
  }

  /**
   * Handle Supabase errors consistently
   */
  protected handleError(error: PostgrestError | Error | null, operation: string): string {
    if (!error) return '';

    const errorMessage = error.message || 'Unknown error occurred';
    
    // Log the error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${this.constructor.name}] ${operation}:`, error);
    }

    // Return user-friendly error message
    if (error.message?.includes('duplicate key')) {
      return 'This record already exists';
    }
    if (error.message?.includes('not found')) {
      return 'Record not found';
    }
    if (error.message?.includes('permission')) {
      return 'You do not have permission to perform this action';
    }
    
    return 'An error occurred while processing your request';
  }

  /**
   * Cache management
   */
  protected getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now > cached.timestamp + cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  protected setCachedData<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultCacheTTL
    });
  }

  protected generateCacheKey(operation: string, params: any = {}): string {
    const paramsString = JSON.stringify(params);
    return `${this.tableName}:${operation}:${paramsString}`;
  }

  /**
   * Clear cache for specific keys or all cache
   */
  public clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Generic find by ID
   */
  public async findById<T>(
    id: string,
    options: QueryOptions = {}
  ): Promise<ServiceResponse<T>> {
    try {
      const cacheKey = this.generateCacheKey('findById', { id, ...options });
      
      // Check cache first
      if (options.useCache !== false) {
        const cached = this.getCachedData<T>(cacheKey);
        if (cached) {
          return { data: cached, error: null, success: true };
        }
      }

      let query = this.supabase
        .from(this.tableName)
        .select(options.select || '*')
        .eq('id', id)
        .single();

      const { data, error } = await query;

      if (error) {
        return {
          data: null,
          error: this.handleError(error, 'findById'),
          success: false
        };
      }

      // Cache the result
      if (options.useCache !== false && data) {
        this.setCachedData(cacheKey, data, options.cacheTTL);
      }

      return { data: data as T, error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error as Error, 'findById'),
        success: false
      };
    }
  }

  /**
   * Generic find all with pagination
   */
  public async findAll<T>(
    options: QueryOptions = {}
  ): Promise<PaginatedResponse<T>> {
    try {
      const {
        page = 1,
        limit = 10,
        orderBy = 'created_at',
        orderDirection = 'desc',
        filters = {},
        select = '*'
      } = options;

      const offset = (page - 1) * limit;
      const cacheKey = this.generateCacheKey('findAll', options);

      // Check cache first
      if (options.useCache !== false) {
        const cached = this.getCachedData<PaginatedResponse<T>>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Build query
      let query = this.supabase
        .from(this.tableName)
        .select(select, { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order(orderBy, { ascending: orderDirection === 'asc' });

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      const { data, error, count } = await query;

      if (error) {
        return {
          data: [],
          total: 0,
          page,
          limit,
          hasMore: false,
          error: this.handleError(error, 'findAll'),
          success: false
        };
      }

      const total = count || 0;
      const hasMore = offset + limit < total;

      const result: PaginatedResponse<T> = {
        data: (data as T[]) || [],
        total,
        page,
        limit,
        hasMore,
        error: null,
        success: true
      };

      // Cache the result
      if (options.useCache !== false) {
        this.setCachedData(cacheKey, result, options.cacheTTL);
      }

      return result;
    } catch (error) {
      return {
        data: [],
        total: 0,
        page: options.page || 1,
        limit: options.limit || 10,
        hasMore: false,
        error: this.handleError(error as Error, 'findAll'),
        success: false
      };
    }
  }

  /**
   * Generic create
   */
  public async create<T>(
    data: Omit<T, 'id' | 'created_at' | 'updated_at'>
  ): Promise<ServiceResponse<T>> {
    try {
      const { data: result, error } = await this.supabase
        .from(this.tableName)
        .insert(data)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: this.handleError(error, 'create'),
          success: false
        };
      }

      // Clear relevant cache
      this.clearCache('findAll');
      
      return { data: result, error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error as Error, 'create'),
        success: false
      };
    }
  }

  /**
   * Generic update
   */
  public async update<T>(
    id: string,
    data: Partial<Omit<T, 'id' | 'created_at'>>
  ): Promise<ServiceResponse<T>> {
    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString()
      };

      const { data: result, error } = await this.supabase
        .from(this.tableName)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: this.handleError(error, 'update'),
          success: false
        };
      }

      // Clear relevant cache
      this.clearCache(`findById:${id}`);
      this.clearCache('findAll');

      return { data: result, error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error as Error, 'update'),
        success: false
      };
    }
  }

  /**
   * Generic delete
   */
  public async delete(id: string): Promise<ServiceResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        return {
          data: false,
          error: this.handleError(error, 'delete'),
          success: false
        };
      }

      // Clear relevant cache
      this.clearCache(`findById:${id}`);
      this.clearCache('findAll');

      return { data: true, error: null, success: true };
    } catch (error) {
      return {
        data: false,
        error: this.handleError(error as Error, 'delete'),
        success: false
      };
    }
  }

  /**
   * Execute custom query with error handling
   */
  protected async executeQuery<T>(
    query: any,
    operation: string,
    cacheKey?: string,
    cacheTTL?: number
  ): Promise<ServiceResponse<T>> {
    try {
      // Check cache first
      if (cacheKey) {
        const cached = this.getCachedData<T>(cacheKey);
        if (cached) {
          return { data: cached, error: null, success: true };
        }
      }

      const { data, error } = await query;

      if (error) {
        return {
          data: null,
          error: this.handleError(error, operation),
          success: false
        };
      }

      // Cache the result
      if (cacheKey && data) {
        this.setCachedData(cacheKey, data, cacheTTL);
      }

      return { data, error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error as Error, operation),
        success: false
      };
    }
  }

  /**
   * Batch operations
   */
  public async batchCreate<T>(
    records: Omit<T, 'id' | 'created_at' | 'updated_at'>[]
  ): Promise<ServiceResponse<T[]>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert(records)
        .select();

      if (error) {
        return {
          data: null,
          error: this.handleError(error, 'batchCreate'),
          success: false
        };
      }

      // Clear relevant cache
      this.clearCache('findAll');

      return { data: data || [], error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error as Error, 'batchCreate'),
        success: false
      };
    }
  }

  /**
   * Count records
   */
  public async count(filters: Record<string, any> = {}): Promise<ServiceResponse<number>> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      const { count, error } = await query;

      if (error) {
        return {
          data: 0,
          error: this.handleError(error, 'count'),
          success: false
        };
      }

      return { data: count || 0, error: null, success: true };
    } catch (error) {
      return {
        data: 0,
        error: this.handleError(error as Error, 'count'),
        success: false
      };
    }
  }

  /**
   * Check if record exists
   */
  public async exists(id: string): Promise<ServiceResponse<boolean>> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('id')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        return {
          data: false,
          error: this.handleError(error, 'exists'),
          success: false
        };
      }

      return { data: !!data, error: null, success: true };
    } catch (error) {
      return {
        data: false,
        error: this.handleError(error as Error, 'exists'),
        success: false
      };
    }
  }
}
