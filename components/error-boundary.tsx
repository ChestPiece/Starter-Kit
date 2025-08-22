"use client";

import React from "react";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { errorLogger } from "@/lib/services/logger";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  showErrorDetails?: boolean;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  className?: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to error logger service
    errorLogger.error(error, {
      component: "ErrorBoundary",
      errorInfo: errorInfo.componentStack,
      props: this.props,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      const {
        fallbackTitle = "Something went wrong",
        fallbackDescription = "We're sorry, but something unexpected happened. Please try refreshing the page or contact support if the problem continues.",
        showErrorDetails = process.env.NODE_ENV === "development",
        className = "",
      } = this.props;

      return (
        <div
          className={`min-h-[400px] flex items-center justify-center p-4 ${className}`}
        >
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {fallbackTitle}
              </CardTitle>
              <CardDescription className="text-sm text-gray-600">
                {fallbackDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2"
                  variant="default"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button
                  onClick={() => (window.location.href = "/")}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>
              </div>

              {showErrorDetails && this.state.error && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="font-mono text-xs">
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium">
                        Error Details (Development)
                      </summary>
                      <div className="mt-2 space-y-1 text-xs">
                        <div>
                          <strong>Error:</strong> {this.state.error.message}
                        </div>
                        {this.state.error.stack && (
                          <div>
                            <strong>Stack:</strong>
                            <pre className="mt-1 whitespace-pre-wrap break-all">
                              {this.state.error.stack}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Specific error boundaries for common use cases
export function AuthErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallbackTitle="Authentication Error"
      fallbackDescription="There was a problem with the authentication system. Please try logging in again."
      onError={(error, errorInfo) => {
        errorLogger.error(error, { context: "authentication", errorInfo });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export function DashboardErrorBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary
      fallbackTitle="Dashboard Error"
      fallbackDescription="There was a problem loading your dashboard. Please refresh the page to try again."
      onError={(error, errorInfo) => {
        errorLogger.error(error, { context: "dashboard", errorInfo });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

export function FormErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallbackTitle="Form Error"
      fallbackDescription="There was a problem with this form. Please refresh the page and try again."
      className="min-h-[200px]"
      onError={(error, errorInfo) => {
        errorLogger.error(error, { context: "form", errorInfo });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
