"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { ForgotPassword } from "@/components/auth/forgot-password";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { AuthErrorBoundary } from "@/components/error-boundary";
import { initializeAutoRedirectPrevention } from "@/lib/auth/prevent-auto-redirect";
import { initializeTabIsolation } from "@/lib/auth/tab-isolation";
import { ConfirmationErrorHelper } from "@/components/auth/confirmation-error-helper";

function LoginPageInner() {
  const [currentView, setCurrentView] = useState<"login" | "forgot-password">(
    "login"
  );
  const searchParams = useSearchParams();
  const router = useRouter();
  const [reasonMessage, setReasonMessage] = useState<string | null>(null);

  // Strip confirmation params if user somehow lands here with them
  useEffect(() => {
    const code = searchParams.get("code");
    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    if (!code && !token_hash && !type) return;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("code");
    params.delete("token_hash");
    params.delete("type");
    const next = `/auth/login${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(next, { scroll: false });
  }, [searchParams, router]);

  // Only show network-related error messages
  const networkError = searchParams.get("network_error") === "true";

  // Set page title dynamically and prevent auto-redirects
  useEffect(() => {
    document.title = "Login - Your App";
    initializeAutoRedirectPrevention();
    initializeTabIsolation();
  }, []);

  // Handle session reason messages and clear from URL to prevent sticky state
  useEffect(() => {
    const reason = searchParams.get("reason");
    const message = searchParams.get("message");
    const logoutError = searchParams.get("logout_error") === "true";

    if (!reason && !logoutError && !message) return;

    const reasonToMessage = (code: string): string => {
      switch (code) {
        case "session_expired_on_start":
        case "session_timeout":
          return "Your session expired. Please sign in again.";
        case "invalid_session_on_start":
          return "Your previous session was invalid. Please sign in again.";
        case "force_logout_on_start":
          return "You were signed out for security. Please sign in again.";
        case "app_start_logout":
        case "session_expired":
          return "You're signed out. Please sign in to continue.";
        default:
          return "Please sign in to continue.";
      }
    };

    const messageToText = (code: string): string => {
      switch (code) {
        case "confirmation_failed":
          return "Email confirmation failed. Please try signing in or request a new confirmation email.";
        case "invalid_link":
          return "The confirmation link is invalid or expired. Please try signing in.";
        case "link_expired":
          return "The confirmation link has expired. Please sign in or request a new confirmation email.";
        case "invalid_confirmation_link":
          return "The confirmation link is invalid. Please try signing in.";
        case "confirmation_timeout":
          return "Email confirmation timed out. Please try signing in.";
        case "email_confirmed":
          return "Email confirmed successfully! You can now sign in.";
        case "password_reset_success":
          return "Password updated successfully! You can now sign in with your new password.";
        case "please_login":
          return "Please sign in to continue.";
        default:
          return code;
      }
    };

    if (logoutError) {
      setReasonMessage("You were logged out. Please sign in again.");
    } else if (reason) {
      setReasonMessage(reasonToMessage(reason));
    } else if (message) {
      setReasonMessage(messageToText(message));
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("reason");
    params.delete("message");
    params.delete("logout_error");
    const next = `/auth/login${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(next, { scroll: false });
  }, [searchParams, router]);

  // Check if we should show the confirmation error helper
  const message = searchParams.get("message");
  const isConfirmationError =
    message &&
    [
      "link_expired",
      "confirmation_failed",
      "invalid_confirmation_link",
      "invalid_link",
    ].includes(message);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      {currentView === "login" ? (
        <div className="w-full max-w-md space-y-4">
          <LoginForm
            onForgotPassword={() => setCurrentView("forgot-password")}
            reasonMessage={reasonMessage}
            networkError={networkError}
          />

          {isConfirmationError && (
            <ConfirmationErrorHelper
              errorType={
                message as
                  | "link_expired"
                  | "confirmation_failed"
                  | "invalid_confirmation_link"
                  | "invalid_link"
              }
            />
          )}
        </div>
      ) : (
        <ForgotPassword
          onBack={() => setCurrentView("login")}
          onEmailSent={() => {
            setCurrentView("login");
            setReasonMessage(
              "Password reset email sent! Please check your inbox (and spam folder) for the reset link. The email may take a few minutes to arrive."
            );
          }}
        />
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="mb-4 text-center text-sm text-gray-600">
            Loading...
          </div>
        </div>
      }
    >
      <AuthErrorBoundary>
        <LoginPageInner />
      </AuthErrorBoundary>
    </Suspense>
  );
}
