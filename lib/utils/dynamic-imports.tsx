"use client";

import dynamic from 'next/dynamic';
import { ComponentType, ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// Loading component for dynamic imports
interface LoadingProps {
  message?: string;
  showSkeleton?: boolean;
  className?: string;
}

function DynamicLoading({ 
  message = 'Loading...', 
  showSkeleton = false,
  className = '' 
}: LoadingProps) {
  if (showSkeleton) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`flex items-center justify-center min-h-[200px] ${className}`}>
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
    </div>
  );
}

// Error boundary for dynamic imports
interface ErrorFallbackProps {
  error: Error;
  retry?: () => void;
  className?: string;
}

function DynamicErrorFallback({ error, retry, className = '' }: ErrorFallbackProps) {
  return (
    <Card className={`border-destructive ${className}`}>
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <div className="text-destructive">
            <h3 className="font-semibold">Failed to load component</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {error.message || 'An unexpected error occurred'}
            </p>
          </div>
          {retry && (
            <button
              onClick={retry}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Try Again
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Utility function to create dynamic imports with consistent loading states
export function createDynamicImport<T = any>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: {
    loadingMessage?: string;
    showSkeleton?: boolean;
    loadingClassName?: string;
    errorClassName?: string;
    ssr?: boolean;
  } = {}
) {
  const {
    loadingMessage = 'Loading component...',
    showSkeleton = false,
    loadingClassName = '',
    errorClassName = '',
    ssr = false
  } = options;

  return dynamic(importFn, {
    loading: () => (
      <DynamicLoading 
        message={loadingMessage} 
        showSkeleton={showSkeleton}
        className={loadingClassName}
      />
    ),
    ssr,
  });
}

// Pre-configured dynamic imports for common component types

// For settings/configuration components
export function createSettingsImport<T = any>(
  importFn: () => Promise<{ default: ComponentType<T> }>
) {
  return createDynamicImport(importFn, {
    loadingMessage: 'Loading settings...',
    showSkeleton: true,
    ssr: false
  });
}

// For form components
export function createFormImport<T = any>(
  importFn: () => Promise<{ default: ComponentType<T> }>
) {
  return createDynamicImport(importFn, {
    loadingMessage: 'Loading form...',
    showSkeleton: true,
    ssr: false
  });
}

// For data table components
export function createTableImport<T = any>(
  importFn: () => Promise<{ default: ComponentType<T> }>
) {
  return createDynamicImport(importFn, {
    loadingMessage: 'Loading data...',
    showSkeleton: true,
    ssr: false
  });
}

// For modal/dialog components
export function createModalImport<T = any>(
  importFn: () => Promise<{ default: ComponentType<T> }>
) {
  return createDynamicImport(importFn, {
    loadingMessage: 'Loading...',
    showSkeleton: false,
    ssr: false
  });
}

// For dashboard/analytics components
export function createDashboardImport<T = any>(
  importFn: () => Promise<{ default: ComponentType<T> }>
) {
  return createDynamicImport(importFn, {
    loadingMessage: 'Loading dashboard...',
    showSkeleton: true,
    ssr: false
  });
}

// Utility for lazy loading with intersection observer
export function createLazyImport<T = any>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: {
    rootMargin?: string;
    threshold?: number;
  } = {}
) {
  const { rootMargin = '50px', threshold = 0.1 } = options;
  
  return dynamic(importFn, {
    loading: () => <DynamicLoading showSkeleton={true} />,
    ssr: false,
  });
}

// Export loading and error components for custom use
export { DynamicLoading, DynamicErrorFallback };

// Type definitions for better TypeScript support
export type DynamicComponentProps<T = any> = T & {
  fallback?: ReactNode;
  onError?: (error: Error) => void;
};

export type DynamicImportOptions = {
  loadingMessage?: string;
  showSkeleton?: boolean;
  loadingClassName?: string;
  errorClassName?: string;
  ssr?: boolean;
};