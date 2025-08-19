"use client";

import { useEffect } from "react";
import { useCSRFToken } from "@/lib/security/csrf-protection";

interface CSRFTokenProps {
  token: string;
}

// Component to inject CSRF token into page
export function CSRFToken({ token }: CSRFTokenProps) {
  useEffect(() => {
    // Add CSRF token to meta tag for client-side access
    let metaTag = document.querySelector(
      'meta[name="csrf-token"]'
    ) as HTMLMetaElement;

    if (!metaTag) {
      metaTag = document.createElement("meta");
      metaTag.name = "csrf-token";
      document.head.appendChild(metaTag);
    }

    metaTag.content = token;
  }, [token]);

  return null; // This component doesn't render anything
}

// Hook for components that need CSRF protection
export function useCSRFProtection() {
  const csrf = useCSRFToken();

  const protectedFetch = async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const method = options.method?.toUpperCase() || "GET";

    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      // Add CSRF token to headers
      options.headers = csrf.addTokenToHeaders(options.headers);

      // Add CSRF token to JSON body
      const contentType =
        (options.headers as any)?.["content-type"] ||
        (options.headers as any)?.["Content-Type"];

      if (contentType?.includes("application/json") && options.body) {
        options.body = csrf.addTokenToBody(options.body);
      }
    }

    const response = await fetch(url, options);

    // Handle CSRF errors
    if (response.status === 403) {
      const body = await response.clone().json();
      if (body.code === "CSRF_TOKEN_INVALID") {
        // Optionally refresh the page to get a new token
        console.warn("CSRF token invalid, page refresh may be required");
      }
    }

    return response;
  };

  const getHiddenInput = () => {
    const token = csrf.getToken();
    if (!token) return null;

    return {
      name: csrf.tokenName,
      value: token,
    };
  };

  return {
    ...csrf,
    protectedFetch,
    getHiddenInput,
  };
}

// Form component with automatic CSRF protection
interface ProtectedFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
}

export function ProtectedForm({
  children,
  onSubmit,
  ...props
}: ProtectedFormProps) {
  const { getHiddenInput } = useCSRFProtection();

  const hiddenInput = getHiddenInput();

  return (
    <form {...props} onSubmit={onSubmit}>
      {hiddenInput && (
        <input
          type="hidden"
          name={hiddenInput.name}
          value={hiddenInput.value}
        />
      )}
      {children}
    </form>
  );
}
