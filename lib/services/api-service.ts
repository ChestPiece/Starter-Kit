/**
 * API Service for HTTP operations
 * Handles external API calls with consistent error handling and caching
 */

import { errorLogger } from './error-logger';

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
  status?: number;
  headers?: Headers;
}

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTTL?: number;
}

/**
 * API Service Class
 */
class ApiService {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }>;
  private defaultTimeout: number;
  private defaultRetries: number;
  private baseHeaders: Record<string, string>;

  constructor() {
    this.cache = new Map();
    this.defaultTimeout = 30000; // 30 seconds
    this.defaultRetries = 3;
    this.baseHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Set base headers for all requests
   */
  public setBaseHeaders(headers: Record<string, string>): void {
    this.baseHeaders = { ...this.baseHeaders, ...headers };
  }

  /**
   * Set authorization header
   */
  public setAuthToken(token: string): void {
    this.baseHeaders['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Remove authorization header
   */
  public clearAuthToken(): void {
    delete this.baseHeaders['Authorization'];
  }

  /**
   * Cache management
   */
  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now > cached.timestamp + cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCachedData<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private generateCacheKey(url: string, options: any = {}): string {
    return `api:${url}:${JSON.stringify(options)}`;
  }

  /**
   * Clear cache
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
   * Handle API errors
   */
  private handleError(error: any, operation: string, url: string): string {
    const errorMessage = error.message || 'Unknown error occurred';
    const context = {
      operation,
      url,
      error: errorMessage,
      timestamp: new Date().toISOString()
    };

    errorLogger.error(`API ${operation} failed for ${url}`, context);

    // Return user-friendly error messages
    if (error.name === 'AbortError') {
      return 'Request timeout. Please try again.';
    }
    if (error.message?.includes('fetch')) {
      return 'Network error. Please check your connection.';
    }
    if (error.message?.includes('JSON')) {
      return 'Invalid response format received.';
    }

    return 'An error occurred while processing your request';
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest<T>(
    url: string,
    options: RequestInit & { retries?: number; timeout?: number }
  ): Promise<Response> {
    const { retries = this.defaultRetries, timeout = this.defaultTimeout, ...fetchOptions } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          ...this.baseHeaders,
          ...fetchOptions.headers
        }
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      // Retry logic
      if (retries > 0 && !controller.signal.aborted) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        return this.makeRequest(url, { ...options, retries: retries - 1 });
      }

      throw error;
    }
  }

  /**
   * Process API response
   */
  private async processResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      let data: T | null = null;

      if (response.status === 204) {
        // No content
        data = null;
      } else {
        const text = await response.text();
        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            // If not JSON, return as string
            data = text as unknown as T;
          }
        }
      }

      return {
        data,
        error: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`,
        success: response.ok,
        status: response.status,
        headers: response.headers
      };
    } catch (error) {
      return {
        data: null,
        error: (error as Error).message,
        success: false,
        status: response.status
      };
    }
  }

  /**
   * GET request
   */
  public async get<T>(
    url: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    try {
      // Check cache first
      if (options.cache !== false) {
        const cacheKey = this.generateCacheKey(url, options);
        const cached = this.getCachedData<T>(cacheKey);
        if (cached) {
          return { data: cached, error: null, success: true };
        }
      }

      const response = await this.makeRequest(url, {
        method: 'GET',
        headers: options.headers,
        timeout: options.timeout,
        retries: options.retries
      });

      const result = await this.processResponse<T>(response);

      // Cache successful responses
      if (result.success && options.cache !== false && result.data) {
        const cacheKey = this.generateCacheKey(url, options);
        this.setCachedData(cacheKey, result.data, options.cacheTTL || 5 * 60 * 1000);
      }

      return result;
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, 'GET', url),
        success: false
      };
    }
  }

  /**
   * POST request
   */
  public async post<T>(
    url: string,
    body?: any,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.makeRequest(url, {
        method: 'POST',
        headers: options.headers,
        body: body ? JSON.stringify(body) : undefined,
        timeout: options.timeout,
        retries: options.retries
      });

      const result = await this.processResponse<T>(response);

      // Clear related cache on successful POST
      if (result.success) {
        this.clearCache(url.split('/')[0]); // Clear cache for the base path
      }

      return result;
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, 'POST', url),
        success: false
      };
    }
  }

  /**
   * PUT request
   */
  public async put<T>(
    url: string,
    body?: any,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.makeRequest(url, {
        method: 'PUT',
        headers: options.headers,
        body: body ? JSON.stringify(body) : undefined,
        timeout: options.timeout,
        retries: options.retries
      });

      const result = await this.processResponse<T>(response);

      // Clear related cache on successful PUT
      if (result.success) {
        this.clearCache(url.split('/')[0]);
      }

      return result;
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, 'PUT', url),
        success: false
      };
    }
  }

  /**
   * DELETE request
   */
  public async delete<T>(
    url: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.makeRequest(url, {
        method: 'DELETE',
        headers: options.headers,
        timeout: options.timeout,
        retries: options.retries
      });

      const result = await this.processResponse<T>(response);

      // Clear related cache on successful DELETE
      if (result.success) {
        this.clearCache(url.split('/')[0]);
      }

      return result;
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, 'DELETE', url),
        success: false
      };
    }
  }

  /**
   * Upload file
   */
  public async upload<T>(
    url: string,
    file: File,
    options: Omit<ApiRequestOptions, 'headers'> & { 
      fieldName?: string;
      additionalData?: Record<string, string>;
    } = {}
  ): Promise<ApiResponse<T>> {
    try {
      const formData = new FormData();
      formData.append(options.fieldName || 'file', file);

      // Add additional form data
      if (options.additionalData) {
        Object.entries(options.additionalData).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }

      // Remove Content-Type header for FormData (browser sets it automatically)
      const { 'Content-Type': _, ...headersWithoutContentType } = this.baseHeaders;

      const response = await this.makeRequest(url, {
        method: 'POST',
        body: formData,
        headers: headersWithoutContentType,
        timeout: options.timeout || 60000, // 1 minute for uploads
        retries: options.retries || 1 // Less retries for uploads
      });

      return this.processResponse<T>(response);
    } catch (error) {
      return {
        data: null,
        error: this.handleError(error, 'UPLOAD', url),
        success: false
      };
    }
  }

  /**
   * Health check endpoint
   */
  public async healthCheck(url: string): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.get<{ status: string; timestamp: string }>(url, { 
      cache: false,
      timeout: 5000,
      retries: 1
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();
