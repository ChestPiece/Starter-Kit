/**
 * Environment variable validation and configuration
 * This ensures all required environment variables are present and valid
 */

interface RequiredEnvVars {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
}

interface OptionalEnvVars {
  CSRF_SECRET?: string
  NEXT_PUBLIC_SITE_URL?: string
  NEXT_PUBLIC_SITE_NAME?: string
  NEXT_PUBLIC_LOGO_URL?: string
  NEXT_PUBLIC_LOGO_SETTING?: string
  ULTRAMSG_INSTANCE_ID?: string
  ULTRAMSG_TOKEN?: string
  NEXT_PUBLIC_SUPABASE_DEBUG?: string
  API_LOGGING?: string
  EXTERNAL_LOGGING_ENDPOINT?: string
  LOGGING_SERVICE_TOKEN?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

type EnvVars = RequiredEnvVars & OptionalEnvVars

class EnvironmentValidator {
  private errors: string[] = []
  private warnings: string[] = []

  validateRequired(): void {
    const requiredVars: (keyof RequiredEnvVars)[] = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ]

    for (const varName of requiredVars) {
      const value = process.env[varName]
      if (!value || value.trim() === '') {
        this.errors.push(`❌ Missing required environment variable: ${varName}`)
      } else {
        // Validate format
        if (varName === 'NEXT_PUBLIC_SUPABASE_URL') {
          if (!value.startsWith('https://') || !value.includes('.supabase.co')) {
            this.errors.push(`❌ Invalid ${varName}: Must be a valid Supabase URL (https://xxx.supabase.co)`)
          }
        }
        
        if (varName === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
          if (value.length < 100) {
            this.errors.push(`❌ Invalid ${varName}: Appears to be too short for a Supabase anon key`)
          }
        }
      }
    }
  }

  validateOptional(): void {
    // CSRF Secret validation
    const csrfSecret = process.env.CSRF_SECRET
    if (!csrfSecret || csrfSecret === 'your-csrf-secret-key-change-this') {
      this.warnings.push('⚠️  CSRF_SECRET is using default value. Set a strong random secret for production!')
    } else if (csrfSecret.length < 32) {
      this.warnings.push('⚠️  CSRF_SECRET should be at least 32 characters long for security.')
    }

    // Site URL validation
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    if (siteUrl && !siteUrl.startsWith('http')) {
      this.warnings.push('⚠️  NEXT_PUBLIC_SITE_URL should start with http:// or https://')
    }

    // Production-specific validations
    if (process.env.NODE_ENV === 'production') {
      if (!csrfSecret || csrfSecret === 'your-csrf-secret-key-change-this') {
        this.errors.push('❌ CSRF_SECRET must be set to a strong random value in production!')
      }
      
      if (!siteUrl) {
        this.warnings.push('⚠️  NEXT_PUBLIC_SITE_URL should be set in production for proper OAuth redirects')
      }
      
      if (siteUrl && siteUrl.includes('localhost')) {
        this.warnings.push('⚠️  NEXT_PUBLIC_SITE_URL appears to be localhost in production environment')
      }
    }

    // WhatsApp configuration
    const ultramsgId = process.env.ULTRAMSG_INSTANCE_ID
    const ultramsgToken = process.env.ULTRAMSG_TOKEN
    if ((ultramsgId && !ultramsgToken) || (!ultramsgId && ultramsgToken)) {
      this.warnings.push('⚠️  WhatsApp integration: Both ULTRAMSG_INSTANCE_ID and ULTRAMSG_TOKEN should be set together')
    }
  }

  validate(): { isValid: boolean; errors: string[]; warnings: string[] } {
    this.errors = []
    this.warnings = []

    this.validateRequired()
    this.validateOptional()

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    }
  }

  logResults(): void {
    const { isValid, errors, warnings } = this.validate()

    // Skip validation during build process
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.log('⏭️  Skipping environment validation during build process')
      return
    }

    if (errors.length > 0) {
      console.error('\n🚨 Environment Variable Errors:')
      errors.forEach(error => console.error(error))
      
      console.error('\n📋 To fix these errors:')
      console.error('1. Copy .env.example to .env.local')
      console.error('2. Fill in the required values')
      console.error('3. Restart the development server')
      console.error('\nSee README.md for detailed setup instructions.\n')
    }

    if (warnings.length > 0) {
      console.warn('\n⚠️  Environment Variable Warnings:')
      warnings.forEach(warning => console.warn(warning))
      console.warn('')
    }

    if (isValid && warnings.length === 0) {
      console.log('✅ All environment variables are properly configured!')
    }

    if (!isValid) {
      // Only throw error in production runtime, not during build
      if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        throw new Error('❌ Critical environment variables are missing. Cannot start in production.')
      } else if (process.env.NODE_ENV !== 'production') {
        console.error('❌ Development server may not work properly without required environment variables.')
      }
    }
  }
}

// Export validation function
export function validateEnvironment(): { isValid: boolean; errors: string[]; warnings: string[] } {
  const validator = new EnvironmentValidator()
  return validator.validate()
}

// Export logging function for startup
export function validateAndLogEnvironment(): void {
  const validator = new EnvironmentValidator()
  validator.logResults()
}

// Export typed environment variables
export const env: EnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  CSRF_SECRET: process.env.CSRF_SECRET,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
  NEXT_PUBLIC_LOGO_URL: process.env.NEXT_PUBLIC_LOGO_URL,
  NEXT_PUBLIC_LOGO_SETTING: process.env.NEXT_PUBLIC_LOGO_SETTING,
  ULTRAMSG_INSTANCE_ID: process.env.ULTRAMSG_INSTANCE_ID,
  ULTRAMSG_TOKEN: process.env.ULTRAMSG_TOKEN,
  NEXT_PUBLIC_SUPABASE_DEBUG: process.env.NEXT_PUBLIC_SUPABASE_DEBUG,
  API_LOGGING: process.env.API_LOGGING,
  EXTERNAL_LOGGING_ENDPOINT: process.env.EXTERNAL_LOGGING_ENDPOINT,
  LOGGING_SERVICE_TOKEN: process.env.LOGGING_SERVICE_TOKEN,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
}
