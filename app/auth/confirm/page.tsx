"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/singleton-client";
import { initializeAutoRedirectPrevention } from "@/lib/auth/prevent-auto-redirect";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { logger } from '@/lib/services/logger';

// Force dynamic rendering to ensure client runs on first-load
export const dynamic = "force-dynamic";

export default function ConfirmPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "confirmed" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Prevent automatic redirects on this page
    initializeAutoRedirectPrevention();

    const confirmed = searchParams.get("confirmed");

    // If already confirmed by the API route, show success
    if (confirmed === "true") {
      setStatus("confirmed");
      return;
    }

    // Otherwise, handle client-side confirmation for fallback cases
    const supabase = getSupabaseClient();

    const run = async () => {
      try {
        const code = searchParams.get("code");
        const token_hash = searchParams.get("token_hash");
        const type = searchParams.get("type");

        logger.info("Client-side confirmation attempt:", {
          hasCode: !!code,
          hasTokenHash: !!token_hash,
          type,
          confirmed,
        });

        if (code) {
          logger.info("Attempting code confirmation...");
          const { error, data } =
            await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            logger.error("Code confirmation failed:", error);
            throw error;
          }

          // Email confirmed - now sign out to prevent auto-login
          await supabase.auth.signOut();

          logger.info(
            "Code confirmation successful:",
            { email: data?.user?.email, status: "user signed out" }
          );

          // Redirect to login instead of showing confirmed status
          router.push("/auth/login?message=email_confirmed");
          return;
        }

        if (token_hash && type) {
          logger.info("Attempting token confirmation...");
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
          });
          if (error) {
            logger.error("Token confirmation failed:", error);
            throw error;
          }

          // Token verified - sign out to prevent auto-login
          await supabase.auth.signOut();

          logger.info("Token confirmation successful (user signed out)");

          // Redirect to login instead of showing confirmed status
          router.push("/auth/login?message=email_confirmed");
          return;
        }

        // Fallback – no valid params
        logger.info("No valid confirmation parameters found");
        setError(
          "Invalid confirmation link. Please try requesting a new confirmation email."
        );
        setStatus("error");
      } catch (e: any) {
        logger.error("Confirmation error (client):", e);
        let errorMessage = "Confirmation failed";

        if (
          e?.message?.includes("invalid") ||
          e?.message?.includes("expired")
        ) {
          errorMessage =
            "This confirmation link has expired. Please request a new confirmation email.";
        } else if (e?.message?.includes("already")) {
          errorMessage =
            "This email is already confirmed. You can sign in now.";
        } else if (e?.message) {
          errorMessage = e.message;
        }

        setError(errorMessage);
        setStatus("error");
      }
    };

    run();
  }, [searchParams, router]);

  if (status === "confirmed") {
    // Email confirmed - redirect to login with success message
    router.push("/auth/login?message=email_confirmed");
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-pink-100">
              <Loader2 className="h-6 w-6 text-pink-700 animate-spin" />
            </div>
            <CardTitle className="text-center">
              Redirecting to Sign In
            </CardTitle>
            <CardDescription className="text-center">
              Email verified successfully. Taking you to sign in...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-center">Confirmation Failed</CardTitle>
            <CardDescription className="text-center">
              {error || "Unable to confirm your email."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => router.push("/auth/signup")}
              className="w-full bg-pink-700 text-white hover:bg-pink-800 font-medium border-none shadow-sm"
            >
              Try Again with New Email
            </Button>
            <Button
              onClick={() => router.push("/auth/login")}
              variant="outline"
              className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-pink-100">
            <Loader2 className="h-6 w-6 text-pink-700 animate-spin" />
          </div>
          <CardTitle className="text-center">Confirming Email</CardTitle>
          <CardDescription className="text-center">
            Please wait while we verify your email address.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
