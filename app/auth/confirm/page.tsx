"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Force dynamic rendering to ensure client runs on first-load
export const dynamic = "force-dynamic";

export default function ConfirmPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "confirmed" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const confirmed = searchParams.get("confirmed");

    // If already confirmed by the API route, show success
    if (confirmed === "true") {
      setStatus("confirmed");
      return;
    }

    // Otherwise, handle client-side confirmation for fallback cases
    const supabase = createClient();

    const run = async () => {
      try {
        const code = searchParams.get("code");
        const token_hash = searchParams.get("token_hash");
        const type = searchParams.get("type");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setStatus("confirmed");
          return;
        }

        if (token_hash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
          });
          if (error) throw error;
          setStatus("confirmed");
          return;
        }

        // Fallback – no valid params
        setError("Invalid confirmation link");
        setStatus("error");
      } catch (e: any) {
        console.error("Confirmation error (client):", e);
        setError(e?.message || "Confirmation failed");
        setStatus("error");
      }
    };

    run();
  }, [searchParams]);

  if (status === "confirmed") {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-center">
              Email verified successfully
            </CardTitle>
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
