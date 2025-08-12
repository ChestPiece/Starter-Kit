"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function EmailConfirmationHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const confirmEmail = async () => {
      const code = searchParams.get("code");
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      // Try new flow first (code-based)
      if (code) {
        try {
          const { data, error } =
            await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error("Email confirmation error:", error);
            // Redirect to login with error message
            router.push("/auth/login?message=confirmation_failed");
            return;
          }

          if (data.user) {
            console.log(
              "Email confirmed successfully for user:",
              data.user.email
            );

            // Auto-redirect to app (user is already authenticated by exchangeCodeForSession)
            router.push("/");
            return;
          }
        } catch (err) {
          console.error("Code-based confirmation error:", err);
          // Fall through to token_hash method
        }
      }

      // Fallback to old flow (token_hash-based)
      if (!token_hash || !type) {
        console.error("Invalid confirmation link");
        router.push("/auth/login?message=invalid_link");
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
          console.error("Email confirmation error:", error);
          router.push("/auth/login?message=confirmation_failed");
        } else if (data.user) {
          console.log(
            "Email confirmed successfully for user:",
            data.user.email
          );
          // After verifyOtp, the user is authenticated; send to app
          router.push("/");
        }
      } catch (err) {
        console.error("Email confirmation error:", err);
        router.push("/auth/login?message=confirmation_failed");
      }
    };

    confirmEmail();
  }, [searchParams, supabase.auth, router]);

  // Render nothing while processing; we're redirecting immediately
  return null;
}
