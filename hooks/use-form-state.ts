"use client";

import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { logger } from '@/lib/services/logger';

export interface FormStateOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  logContext?: string;
}

export interface FormState {
  loading: boolean;
  error: string | null;
  success: boolean;
  isFormDisabled: boolean;
}

export interface FormActions {
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSuccess: (success: boolean) => void;
  clearError: () => void;
  handleSubmit: <T>(form: UseFormReturn<T>, submitFn: (data: T) => Promise<void>) => (data: T) => Promise<void>;
}

/**
 * Shared hook for managing form state across authentication and user management forms
 * Consolidates common patterns like loading states, error handling, and form validation
 */
export function useFormState(options: FormStateOptions = {}): FormState & FormActions {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isFormDisabled, setIsFormDisabled] = useState(false);

  const { onSuccess, onError, logContext = 'Form' } = options;

  // Update button disabled state after hydration - only disable when loading
  useEffect(() => {
    setIsFormDisabled(loading);
  }, [loading]);

  const clearError = () => setError(null);

  const handleSubmit = <T>(form: UseFormReturn<T>, submitFn: (data: T) => Promise<void>) => {
    return async (data: T) => {
      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        logger.info(`${logContext} submission started`);
        await submitFn(data);
        
        setSuccess(true);
        logger.info(`${logContext} submission successful`);
        
        if (onSuccess) {
          onSuccess();
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        logger.error(`${logContext} submission failed:`, { error: err });
        
        setError(errorMessage);
        
        if (onError) {
          onError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };
  };

  return {
    loading,
    error,
    success,
    isFormDisabled,
    setLoading,
    setError,
    setSuccess,
    clearError,
    handleSubmit,
  };
}

/**
 * Common error handling patterns for authentication forms
 */
export const handleAuthError = (error: any): string => {
  if (!error) return 'An unexpected error occurred';

  const message = error.message || error.toString();

  // Network-related errors
  if (
    message.includes('Network') ||
    message.includes('fetch') ||
    message.includes('connection')
  ) {
    return 'Connection failed. Please check your internet connection.';
  }

  // Rate limiting errors
  if (
    message.includes('rate limit') ||
    message.includes('security purposes') ||
    message.includes('send rate limit')
  ) {
    const waitTimeMatch = message.match(/(\d+)\s*seconds?/);
    const waitSeconds = waitTimeMatch ? parseInt(waitTimeMatch[1]) : 60;

    if (waitSeconds < 60) {
      return `Too many requests. Please wait ${waitSeconds} seconds before trying again.`;
    } else {
      const waitMinutes = Math.ceil(waitSeconds / 60);
      return `Too many requests. Please wait ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''} before trying again.`;
    }
  }

  // Authentication-specific errors
  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }

  if (message.includes('Email not confirmed')) {
    return 'Please check your email and click the confirmation link before signing in.';
  }

  if (message.includes('User already registered')) {
    return 'An account with this email already exists. Please sign in instead.';
  }

  // Default fallback
  return message;
};

/**
 * Common validation patterns for forms
 */
export const commonValidations = {
  email: {
    required: 'Email is required',
    pattern: {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please enter a valid email address'
    }
  },
  password: {
    required: 'Password is required',
    minLength: {
      value: 6,
      message: 'Password must be at least 6 characters long'
    }
  },
  name: {
    required: 'This field is required',
    maxLength: {
      value: 50,
      message: 'Name is too long (maximum 50 characters)'
    }
  }
};