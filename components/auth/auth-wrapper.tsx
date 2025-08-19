"use client";

import { useUser } from "@/components/auth/user-context";
import { useEffect, useState } from "react";

interface AuthWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthWrapper({ children, fallback }: AuthWrapperProps) {
  const { user, loading } = useUser();
  const [showFallback, setShowFallback] = useState(false);

  // Show fallback after extended loading
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setShowFallback(true);
      }, 8000); // Show fallback if loading takes more than 8 seconds

      return () => clearTimeout(timer);
    } else {
      setShowFallback(false);
    }
  }, [loading]);

  // Show clean loading state without skeletons
  if (loading) {
    if (showFallback) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-700 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">
              Authentication is taking longer than expected...
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 text-sm bg-pink-700 text-white rounded hover:bg-pink-800"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-700 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading...</p>
          </div>
        </div>
      )
    );
  }

  if (!user) {
    // User will be redirected by middleware
    return null;
  }

  return <>{children}</>;
}
