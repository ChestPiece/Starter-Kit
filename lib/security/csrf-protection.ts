import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

export interface CSRFConfig {
  secret: string;
  tokenName: string;
  cookieName: string;
  headerName: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number; // in seconds
  excludeRoutes: string[];
  methods: string[];
}

const defaultConfig: CSRFConfig = {
  secret: process.env.CSRF_SECRET || 'your-csrf-secret-key-change-this',
  tokenName: 'csrfToken',
  cookieName: '__csrf-token',
  headerName: 'x-csrf-token',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 3600, // 1 hour
  excludeRoutes: ['/api/health', '/api/status', '/api/auth/confirm'],
  methods: ['POST', 'PUT', 'PATCH', 'DELETE']
};

class CSRFProtection {
  private config: CSRFConfig;
  private encoder = new TextEncoder();

  constructor(config: Partial<CSRFConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    
    if (this.config.secret === 'your-csrf-secret-key-change-this') {
      console.warn('⚠️  CSRF Protection: Using default secret key. Please set CSRF_SECRET environment variable.');
    }
  }

  private get secretKey() {
    return this.encoder.encode(this.config.secret);
  }

  async generateToken(): Promise<string> {
    const payload = {
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.config.maxAge,
      type: 'csrf',
      nonce: this.generateNonce()
    };

    return await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .sign(this.secretKey);
  }

  async verifyToken(token: string): Promise<boolean> {
    try {
      const { payload } = await jwtVerify(token, this.secretKey);
      
      // Verify payload structure
      if (payload.type !== 'csrf') {
        return false;
      }

      // Verify expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async setCSRFCookie(response: NextResponse): Promise<string> {
    const token = await this.generateToken();
    
    response.cookies.set(this.config.cookieName, token, {
      httpOnly: this.config.httpOnly,
      secure: this.config.secure,
      sameSite: this.config.sameSite,
      maxAge: this.config.maxAge,
      path: '/'
    });

    return token;
  }

  getCSRFCookie(request: NextRequest): string | null {
    return request.cookies.get(this.config.cookieName)?.value || null;
  }

  getCSRFHeader(request: NextRequest): string | null {
    return request.headers.get(this.config.headerName);
  }

  shouldProtect(request: NextRequest): boolean {
    const method = request.method.toUpperCase();
    const pathname = request.nextUrl.pathname;

    // Check if method should be protected
    if (!this.config.methods.includes(method)) {
      return false;
    }

    // Check excluded routes
    if (this.config.excludeRoutes.some(route => pathname.startsWith(route))) {
      return false;
    }

    return true;
  }

  async validateRequest(request: NextRequest): Promise<{
    isValid: boolean;
    error?: string;
    regenerateToken?: boolean;
  }> {
    if (!this.shouldProtect(request)) {
      return { isValid: true };
    }

    // Get CSRF token from cookie
    const cookieToken = this.getCSRFCookie(request);
    if (!cookieToken) {
      return { 
        isValid: false, 
        error: 'CSRF token missing from cookie',
        regenerateToken: true 
      };
    }

    // Verify cookie token
    if (!await this.verifyToken(cookieToken)) {
      return { 
        isValid: false, 
        error: 'Invalid CSRF token in cookie',
        regenerateToken: true 
      };
    }

    // Get CSRF token from header or body
    const headerToken = this.getCSRFHeader(request);
    let bodyToken: string | null = null;

    // Try to extract token from form data if no header token
    if (!headerToken) {
      const contentType = request.headers.get('content-type') || '';
      
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.clone().formData();
        bodyToken = formData.get(this.config.tokenName) as string;
      } else if (contentType.includes('application/json')) {
        try {
          const body = await request.clone().json();
          bodyToken = body[this.config.tokenName];
        } catch {
          // Ignore JSON parse errors
        }
      }
    }

    const submittedToken = headerToken || bodyToken;
    if (!submittedToken) {
      return { 
        isValid: false, 
        error: 'CSRF token missing from request' 
      };
    }

    // Verify that submitted token matches cookie token
    if (submittedToken !== cookieToken) {
      return { 
        isValid: false, 
        error: 'CSRF token mismatch' 
      };
    }

    return { isValid: true };
  }

  createMiddleware() {
    return async (request: NextRequest) => {
      const validation = await this.validateRequest(request);
      
      if (!validation.isValid) {
        const response = NextResponse.json(
          { 
            error: 'CSRF Protection Failed',
            message: validation.error,
            code: 'CSRF_TOKEN_INVALID'
          },
          { status: 403 }
        );

        // If token should be regenerated, set a new one
        if (validation.regenerateToken) {
          await this.setCSRFCookie(response);
        }

        return response;
      }

      return NextResponse.next();
    };
  }
}

// Default CSRF protection instance
export const csrfProtection = new CSRFProtection();

// Server-side helpers
export async function getCSRFToken(): Promise<string> {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(defaultConfig.cookieName)?.value;

  if (existingToken && await csrfProtection.verifyToken(existingToken)) {
    return existingToken;
  }

  // Generate new token
  return await csrfProtection.generateToken();
}

export async function setCSRFToken(): Promise<string> {
  const token = await getCSRFToken();
  const cookieStore = await cookies();
  
  cookieStore.set(defaultConfig.cookieName, token, {
    httpOnly: defaultConfig.httpOnly,
    secure: defaultConfig.secure,
    sameSite: defaultConfig.sameSite,
    maxAge: defaultConfig.maxAge,
    path: '/'
  });

  return token;
}

// Client-side helpers
export function getCSRFTokenFromMeta(): string | null {
  if (typeof window === 'undefined') return null;
  
  const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement;
  return metaTag?.content || null;
}

export function getCSRFTokenFromCookie(): string | null {
  if (typeof window === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find(cookie => 
    cookie.trim().startsWith(`${defaultConfig.cookieName}=`)
  );
  
  return csrfCookie ? csrfCookie.split('=')[1] : null;
}

// React hook for CSRF protection
export function useCSRFToken() {
  const getToken = (): string | null => {
    return getCSRFTokenFromMeta() || getCSRFTokenFromCookie();
  };

  const addTokenToHeaders = (headers: HeadersInit = {}): HeadersInit => {
    const token = getToken();
    if (!token) {
      console.warn('CSRF token not found');
      return headers;
    }

    return {
      ...headers,
      [defaultConfig.headerName]: token
    };
  };

  const addTokenToFormData = (formData: FormData): FormData => {
    const token = getToken();
    if (token) {
      formData.append(defaultConfig.tokenName, token);
    }
    return formData;
  };

  const addTokenToBody = (body: any): any => {
    const token = getToken();
    if (!token) {
      console.warn('CSRF token not found');
      return body;
    }

    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body);
        parsed[defaultConfig.tokenName] = token;
        return JSON.stringify(parsed);
      } catch {
        return body;
      }
    }

    if (typeof body === 'object' && body !== null) {
      return {
        ...body,
        [defaultConfig.tokenName]: token
      };
    }

    return body;
  };

  return {
    getToken,
    addTokenToHeaders,
    addTokenToFormData,
    addTokenToBody,
    tokenName: defaultConfig.tokenName,
    headerName: defaultConfig.headerName
  };
}

// Enhanced fetch with automatic CSRF protection
export function createProtectedFetch() {
  return async (url: string, options: RequestInit = {}): Promise<Response> => {
    const { addTokenToHeaders, addTokenToBody } = useCSRFToken();
    
    const method = options.method?.toUpperCase() || 'GET';
    
    if (defaultConfig.methods.includes(method)) {
      // Add CSRF token to headers
      options.headers = addTokenToHeaders(options.headers);
      
      // Add CSRF token to body if it's JSON
      const contentType = (options.headers as any)?.['content-type'] || 
                         (options.headers as any)?.['Content-Type'];
      
      if (contentType?.includes('application/json') && options.body) {
        options.body = addTokenToBody(options.body);
      }
    }

    return fetch(url, options);
  };
}

// Middleware factory for API routes
export function withCSRFProtection(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: Partial<CSRFConfig>
) {
  const protection = new CSRFProtection(config);
  
  return async (request: NextRequest): Promise<NextResponse> => {
    // Check CSRF protection
    const validation = await protection.validateRequest(request);
    
    if (!validation.isValid) {
      const response = NextResponse.json(
        { 
          error: 'CSRF Protection Failed',
          message: validation.error,
          code: 'CSRF_TOKEN_INVALID'
        },
        { status: 403 }
      );

      if (validation.regenerateToken) {
        await protection.setCSRFCookie(response);
      }

      return response;
    }

    // Call original handler
    const response = await handler(request);
    
    // Optionally refresh CSRF token in response
    if (response.status === 200 && validation.regenerateToken) {
      await protection.setCSRFCookie(response);
    }

    return response;
  };
}

export { CSRFProtection };
