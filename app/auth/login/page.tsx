"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { ForgotPassword } from "@/components/auth/forgot-password";
import { EmailConfirmation } from "@/components/auth/email-waiting-screen";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [currentView, setCurrentView] = useState<
    "login" | "forgot-password" | "email-sent"
  >("login");
  const [userEmail, setUserEmail] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const [reasonMessage, setReasonMessage] = useState<string | null>(null);
  const [isExchangingCode, setIsExchangingCode] = useState(false);

  // Handle magic link / email confirmation code on this page as well
  useEffect(() => {
    const run = async () => {
      const code = searchParams.get("code");
      if (!code) return;
      setIsExchangingCode(true);
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data, error } =
          await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("exchangeCodeForSession error on /auth/login:", error);
          router.replace("/auth/login?message=confirmation_failed");
          return;
        }
        if (data.user) {
          // Persist HttpOnly cookies via server to avoid needing a hard refresh
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const access_token = sessionData.session?.access_token;
            const refresh_token = sessionData.session?.refresh_token;
            if (access_token && refresh_token) {
              await fetch("/api/auth/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ access_token, refresh_token }),
              });
            }
          } catch {}
          // Navigate to app
          setTimeout(() => {
            router.replace("/");
          }, 100);
          return;
        }
      } catch (e) {
        console.error("Error handling code on /auth/login:", e);
      } finally {
        setIsExchangingCode(false);
      }
    };
    run();
    // We purposely depend only on searchParams to run when code changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Only show network-related error messages
  const networkError = searchParams.get("network_error") === "true";

  // Set page title dynamically
  useEffect(() => {
    document.title = "Login - Your App";
  }, []);

  // Handle session reason messages and clear from URL to prevent sticky state
  useEffect(() => {
    const reason = searchParams.get("reason");
    const logoutError = searchParams.get("logout_error") === "true";

    if (!reason && !logoutError) return;

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

    if (logoutError) {
      setReasonMessage("You were logged out. Please sign in again.");
    } else if (reason) {
      setReasonMessage(reasonToMessage(reason));
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("reason");
    params.delete("logout_error");
    const next = `/auth/login${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(next, { scroll: false });
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="w-full max-w-7xl space-y-3">
        {isExchangingCode && (
          <div className="mb-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Completing sign-in...</p>
          </div>
        )}
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
          <LoginForm />
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
