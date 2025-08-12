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
            // Ensure session cookies are persisted by pinging a server route
            try {
              const session = await supabase.auth.getSession();
              const access_token = session.data.session?.access_token;
              const refresh_token = session.data.session?.refresh_token;
              if (access_token && refresh_token) {
                await fetch("/api/auth/confirm", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ access_token, refresh_token }),
                });
              }
            } catch {}

            // Give middleware a brief moment to sync cookies, then navigate
            setTimeout(() => {
              window.location.replace("/");
            }, 50);
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
          try {
            const session = await supabase.auth.getSession();
            const access_token = session.data.session?.access_token;
            const refresh_token = session.data.session?.refresh_token;
            if (access_token && refresh_token) {
              await fetch("/api/auth/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ access_token, refresh_token }),
              });
            }
          } catch {}
          setTimeout(() => {
            window.location.replace("/");
          }, 50);
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
