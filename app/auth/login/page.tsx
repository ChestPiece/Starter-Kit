"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SupabaseAuthForm } from "@/components/auth/supabase-auth-form";
import { SupabaseForgotPassword } from "@/components/auth/supabase-forgot-password";
import { SupabaseEmailConfirmation } from "@/components/auth/supabase-email-confirmation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function LoginPage() {
  const [currentView, setCurrentView] = useState<
    "login" | "signup" | "forgot-password" | "email-sent"
  >("login");
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for session expiration and logout reasons
  const sessionExpired = searchParams.get("session_expired") === "true";
  const logoutReason = searchParams.get("reason");
  const sessionInvalid = searchParams.get("session_invalid") === "true";
  const sessionError = searchParams.get("session_error") === "true";
  const logoutError = searchParams.get("logout_error") === "true";
  
  // Check if there are any error conditions that should show messages
  const hasError = sessionExpired || logoutReason || sessionInvalid || sessionError || logoutError;

  // Set page title dynamically
  useEffect(() => {
    document.title = "Login - Your App";
  }, []);

  return (
    <div className="space-y-8">
      {/* Show error messages only when there's an actual error */}
      {hasError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {logoutReason === "force_logout_on_start" &&
              "For security, you need to log in again when starting the application."}
            {logoutReason === "session_timeout" &&
              "Your session expired due to inactivity. Please log in again to continue."}
            {logoutReason === "inactivity_timeout" &&
              "Your session expired due to 30 minutes of inactivity. Please log in again."}
            {logoutReason === "max_duration_exceeded" &&
              "Your session expired after 24 hours for security. Please log in again."}
            {logoutReason === "supabase_session_expired" &&
              "Your session has expired. Please log in again to continue."}
            {logoutReason === "app_start_logout" &&
              "For enhanced security, please verify your credentials to continue."}
            {logoutReason === "invalid_session_on_start" &&
              "Invalid session detected. Please log in again."}
            {logoutReason === "session_expired_on_start" &&
              "Your previous session has expired. Please log in again."}
            {logoutReason === "user_initiated_logout" &&
              "You have been logged out. Please log in again to continue."}
            {sessionExpired &&
              !logoutReason &&
              "Your session has expired. Please log in again to continue."}
            {sessionInvalid && "Your session is invalid. Please log in again."}
            {sessionError && "There was a session error. Please log in again."}
            {logoutError &&
              "There was an issue with your session. Please log in again."}
          </AlertDescription>
        </Alert>
      )}

      {currentView === "login" ? (
        <SupabaseAuthForm
          view="login"
          onViewChange={(view) => {
            if (view === "signup") {
              router.push("/auth/signup");
            } else {
              setCurrentView(view);
            }
          }}
          onEmailSet={setUserEmail}
        />
      ) : currentView === "forgot-password" ? (
        <SupabaseForgotPassword
          onBack={() => setCurrentView("login")}
          onEmailSent={(email) => {
            setUserEmail(email);
            setCurrentView("email-sent");
          }}
        />
      ) : (
        <SupabaseEmailConfirmation
          email={userEmail}
          onBack={() => setCurrentView("login")}
        />
      )}
    </div>
  );
}
