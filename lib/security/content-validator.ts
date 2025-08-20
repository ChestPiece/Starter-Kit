/**
 * Content security validator for proxy endpoints
 * Helps prevent injection attacks and malicious content
 */

interface ContentValidationResult {
  isValid: boolean;
  reason?: string;
  contentType?: string;
}

interface ValidationOptions {
  allowedDomains?: string[];
  allowedContentTypes?: string[];
  maxFileSize?: number; // in bytes
  allowExecutableContent?: boolean;
}

const DEFAULT_OPTIONS: ValidationOptions = {
  allowedDomains: [], // Empty means allow all domains
  allowedContentTypes: [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'text/plain',
    'text/html',
    'text/css',
    'application/json',
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg'
  ],
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowExecutableContent: false
};

const DANGEROUS_CONTENT_TYPES = [
  'application/javascript',
  'application/x-javascript',
  'text/javascript',
  'application/x-executable',
  'application/x-msdownload',
  'application/x-sh',
  'application/x-csh',
  'text/x-script',
  'application/octet-stream' // Can be dangerous
];

const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar', '.app', '.deb', '.pkg', '.dmg'
];

export class ContentValidator {
  private options: ValidationOptions;

  constructor(options: Partial<ValidationOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Validate URL before making the request
   */
  validateUrl(url: string): ContentValidationResult {
    try {
      const parsedUrl = new URL(url);
      
      // Check protocol
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return {
          isValid: false,
          reason: 'Invalid protocol. Only HTTP and HTTPS are allowed.'
        };
      }

      // Check for dangerous characters in URL
      const dangerousPatterns = [
        /\.\./,  // Directory traversal
        /@/,     // Potential credential injection
        /[<>]/,  // HTML injection
        /javascript:/i, // JavaScript protocol
        /data:/i,       // Data URLs
        /file:/i        // File protocol
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(url)) {
          return {
            isValid: false,
            reason: 'URL contains potentially dangerous characters or patterns.'
          };
        }
      }

      // Check allowed domains if specified
      if (this.options.allowedDomains && this.options.allowedDomains.length > 0) {
        const isAllowedDomain = this.options.allowedDomains.some(domain => 
          parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
        );
        
        if (!isAllowedDomain) {
          return {
            isValid: false,
            reason: `Domain '${parsedUrl.hostname}' is not in the allowed domains list.`
          };
        }
      }

      // Check file extension
      const pathname = parsedUrl.pathname.toLowerCase();
      const hasDangerousExtension = DANGEROUS_EXTENSIONS.some(ext => 
        pathname.endsWith(ext)
      );

      if (hasDangerousExtension && !this.options.allowExecutableContent) {
        return {
          isValid: false,
          reason: 'File extension is not allowed for security reasons.'
        };
      }

      return { isValid: true };

    } catch (error) {
      return {
        isValid: false,
        reason: 'Invalid URL format.'
      };
    }
  }

  /**
   * Validate response headers and content type
   */
  validateResponse(response: Response): ContentValidationResult {
    const contentType = response.headers.get('content-type') || '';
    const contentLength = response.headers.get('content-length');
    
    // Check content type
    if (this.options.allowedContentTypes && this.options.allowedContentTypes.length > 0) {
      const isAllowedType = this.options.allowedContentTypes.some(type => 
        contentType.toLowerCase().includes(type.toLowerCase())
      );
      
      if (!isAllowedType) {
        return {
          isValid: false,
          reason: `Content type '${contentType}' is not allowed.`,
          contentType
        };
      }
    }

    // Check for dangerous content types
    const isDangerous = DANGEROUS_CONTENT_TYPES.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );

    if (isDangerous && !this.options.allowExecutableContent) {
      return {
        isValid: false,
        reason: `Content type '${contentType}' is considered dangerous.`,
        contentType
      };
    }

    // Check file size
    if (contentLength && this.options.maxFileSize) {
      const size = parseInt(contentLength);
      if (size > this.options.maxFileSize) {
        return {
          isValid: false,
          reason: `File size (${size} bytes) exceeds maximum allowed size (${this.options.maxFileSize} bytes).`,
          contentType
        };
      }
    }

    return { isValid: true, contentType };
  }

  /**
   * Validate content buffer for additional security checks
   */
  validateContent(buffer: ArrayBuffer, contentType: string): ContentValidationResult {
    const uint8Array = new Uint8Array(buffer);
    
    // Check for magic bytes of dangerous file types
    const magicBytes = Array.from(uint8Array.slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Known dangerous magic bytes
    const dangerousSignatures = [
      '4d5a',     // Windows PE executable
      '7f454c46', // ELF executable
      'cafebabe', // Java class file
      'feedface', // Mach-O executable
      '504b0304', // ZIP file (could contain dangerous content)
    ];

    if (!this.options.allowExecutableContent) {
      for (const signature of dangerousSignatures) {
        if (magicBytes.startsWith(signature)) {
          return {
            isValid: false,
            reason: 'File appears to be an executable or dangerous file type.',
            contentType
          };
        }
      }
    }

    // Additional checks for specific content types
    if (contentType.includes('text/html')) {
      const htmlContent = new TextDecoder().decode(buffer);
      
      // Check for dangerous HTML patterns
      const dangerousPatterns = [
        /<script[^>]*>/i,
        /<iframe[^>]*>/i,
        /<object[^>]*>/i,
        /<embed[^>]*>/i,
        /javascript:/i,
        /vbscript:/i,
        /on\w+\s*=/i // Event handlers like onclick, onload, etc.
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(htmlContent)) {
          return {
            isValid: false,
            reason: 'HTML content contains potentially dangerous scripts or elements.',
            contentType
          };
        }
      }
    }

    return { isValid: true, contentType };
  }
}

// Default validator instance
export const defaultContentValidator = new ContentValidator();

// Strict validator for sensitive environments
export const strictContentValidator = new ContentValidator({
  allowedContentTypes: [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'text/plain',
    'application/json',
    'application/pdf'
  ],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowExecutableContent: false
});

