"use client";

import { useEffect } from "react";
import { SignupForm } from "@/components/auth/signup-form";
import { AuthErrorBoundary } from "@/components/error-boundary";
import { initializeAutoRedirectPrevention } from "@/lib/auth/prevent-auto-redirect";
import { initializeTabIsolation } from "@/lib/auth/tab-isolation";

export default function SignupPage() {
  // Set page title dynamically and prevent auto-redirects
  useEffect(() => {
    document.title = "Sign Up - Your App";
    initializeAutoRedirectPrevention();
    initializeTabIsolation();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <AuthErrorBoundary>
        <SignupForm />
      </AuthErrorBoundary>
    </div>
  );
}
