"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export function EmailConfirmationHandler() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const confirmEmail = async () => {
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      if (!token_hash || !type) {
        setStatus("error");
        setMessage(
          "Invalid confirmation link. Please check your email for the correct link."
        );
        return;
      }

      try {
        // Handle both signup and email change confirmations
        const verifyType = type === "signup" ? "signup" : "email";
        
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: verifyType as any,
        });

        if (error) {
          setStatus("error");
          setMessage(
            error.message ||
              "Failed to confirm email. The link may have expired."
          );
        } else if (data.user) {
          setStatus("success");
          
          // Check if user is now authenticated
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session && session.user) {
            // User is authenticated after confirmation - redirect to dashboard
            setMessage(
              "Email confirmed successfully! Redirecting to your dashboard..."
            );
            
            // Initialize session tracking
            try {
              const { initializeSessionTracking, updateLastActivity } = await import("@/lib/session-config");
              initializeSessionTracking();
              updateLastActivity();
            } catch (e) {
              console.warn("Could not initialize session tracking:", e);
            }
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
              window.location.href = "/"; // Use window.location for hard refresh
            }, 2000);
          } else {
            // User needs to login manually
            setMessage(
              "Email confirmed successfully! Please sign in to your account."
            );
            
            // Redirect to login after a short delay
            setTimeout(() => {
              router.push("/auth/login");
            }, 3000);
          }
        }
      } catch (err) {
        console.error("Email confirmation error:", err);
        setStatus("error");
        setMessage("An unexpected error occurred during email confirmation.");
      }
    };

    confirmEmail();
  }, [searchParams, supabase.auth, router]);

  const handleContinue = () => {
    if (status === "success") {
      if (message.includes("dashboard")) {
        window.location.href = "/";
      } else {
        router.push("/auth/login");
      }
    } else {
      router.push("/auth/signup");
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="space-y-1 pb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          {status === "loading" && (
            <div className="bg-blue-100 rounded-full p-4">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
          )}
          {status === "success" && (
            <div className="bg-green-100 rounded-full p-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          )}
          {status === "error" && (
            <div className="bg-red-100 rounded-full p-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          )}
        </div>

        <CardTitle className="text-2xl font-bold text-gray-900">
          {status === "loading" && "Confirming Email..."}
          {status === "success" && "Email Confirmed!"}
          {status === "error" && "Confirmation Failed"}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 text-center">
        <p className="text-gray-600">{message}</p>

        {status === "success" && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <p className="text-green-800 text-sm">
                Your account is now active. {message.includes("dashboard") ? "You will be redirected to your dashboard automatically." : "You will be redirected to the login page automatically."}
              </p>
            </div>
            <Button
              onClick={handleContinue}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {message.includes("dashboard") ? "Continue to Dashboard" : "Continue to Login"}
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-red-800 text-sm">
                If you continue to have issues, please contact support or try
                signing up again.
              </p>
            </div>
            <Button
              onClick={handleContinue}
              variant="outline"
              className="w-full"
            >
              Back to Sign Up
            </Button>
          </div>
        )}

        {status === "loading" && (
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-blue-800 text-sm">
              Please wait while we verify your email address...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
