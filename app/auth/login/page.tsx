"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { ForgotPassword } from "@/components/auth/forgot-password";
import { EmailConfirmation } from "@/components/auth/email-waiting-screen";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

function LoginPageInner() {
  const [currentView, setCurrentView] = useState<
    "login" | "forgot-password" | "email-sent"
  >("login");
  const [userEmail, setUserEmail] = useState("");
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

  // Set page title dynamically
  useEffect(() => {
    document.title = "Login - Your App";
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
        case "email_confirmed":
          return "Your email has been confirmed! You can now sign in.";
        case "confirmation_failed":
          return "Email confirmation failed. Please try signing in or request a new confirmation email.";
        case "invalid_link":
          return "The confirmation link is invalid or expired. Please try signing in.";
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

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="w-full max-w-7xl space-y-3">
        {reasonMessage && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{reasonMessage}</AlertDescription>
          </Alert>
        )}
        {/* Show network-related errors */}
        {networkError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Connection failed. Please check your internet connection and try
              again.
            </AlertDescription>
          </Alert>
        )}

        {currentView === "login" ? (
          <LoginForm
            onForgotPassword={() => setCurrentView("forgot-password")}
          />
        ) : currentView === "forgot-password" ? (
          <ForgotPassword
            onBack={() => setCurrentView("login")}
            onEmailSent={(email) => {
              setUserEmail(email);
              setCurrentView("email-sent");
            }}
          />
        ) : (
          <EmailConfirmation
            email={userEmail}
            onBack={() => setCurrentView("login")}
          />
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center p-8">
          <div className="w-full max-w-7xl space-y-3">
            <div className="mb-4 text-center text-sm text-gray-600">
              Loading...
            </div>
          </div>
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
