"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SimpleLoginForm } from "@/components/auth/simple-login-form";
import { SupabaseForgotPassword } from "@/components/auth/supabase-forgot-password";
import { SupabaseEmailConfirmation } from "@/components/auth/supabase-email-confirmation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, CheckCircle } from "lucide-react";

export default function LoginPage() {
  const [currentView, setCurrentView] = useState<
    "login" | "signup" | "forgot-password" | "email-sent" | "confirming-email"
  >("login");
  const [userEmail, setUserEmail] = useState("");
  const [confirmationError, setConfirmationError] = useState<string | null>(
    null
  );
  const [isConfirming, setIsConfirming] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Only show network-related error messages
  const networkError = searchParams.get("network_error") === "true";
  const confirmationCode = searchParams.get("code");

  // Handle email confirmation code
  useEffect(() => {
    const handleEmailConfirmation = async () => {
      if (confirmationCode && !isConfirming) {
        setIsConfirming(true);
        setCurrentView("confirming-email");

        try {
          const { data, error } =
            await supabase.auth.exchangeCodeForSession(confirmationCode);

          if (error) {
            console.error("Email confirmation error:", error);
            setConfirmationError(
              "Failed to confirm email. The link may have expired."
            );
            setCurrentView("login");
          } else if (data.user) {
            // Email confirmed successfully, redirect to dashboard
            router.push("/");
            return;
          }
        } catch (error) {
          console.error("Email confirmation error:", error);
          setConfirmationError("An error occurred during email confirmation.");
          setCurrentView("login");
        } finally {
          setIsConfirming(false);
        }
      }
    };

    handleEmailConfirmation();
  }, [confirmationCode, supabase, router, isConfirming]);

  // Set page title dynamically
  useEffect(() => {
    document.title = "Login - Your App";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
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

        {/* Show email confirmation errors */}
        {confirmationError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{confirmationError}</AlertDescription>
          </Alert>
        )}

        {currentView === "confirming-email" ? (
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                Confirming your email...
              </h2>
              <p className="text-gray-600 text-sm mt-2">
                Please wait while we verify your email address.
              </p>
            </div>
          </div>
        ) : currentView === "login" ? (
          <SimpleLoginForm />
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
    </div>
  );
}
