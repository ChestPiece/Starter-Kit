"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function EmailConfirmationHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [status, setStatus] = useState<"idle" | "processing" | "error">("idle");

  useEffect(() => {
    const confirmEmail = async () => {
      setStatus("processing");
      const code = searchParams.get("code");
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      // Handle password recovery explicitly: ensure we land on reset page
      if (type === "recovery" && code) {
        try {
          const { data, error } =
            await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          // Persist cookies on server
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

          // Go to reset password screen
          setTimeout(() => {
            router.replace("/auth/reset-password");
          }, 50);
          return;
        } catch (err) {
          console.error("Recovery confirmation error:", err);
          setStatus("error");
          router.push("/auth/login?message=confirmation_failed");
          return;
        }
      }

      // Try PKCE code-based confirmation first
      if (code) {
        try {
          const { data, error } =
            await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          if (data.user) {
            // Persist session as HttpOnly cookies on server
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
            return;
          }
        } catch (err) {
          console.error("Code-based confirmation error:", err);
          // Fall through to token_hash method if present
        }
      }

      // Fallback to token_hash-based verification (older links)
      if (token_hash && type) {
        try {
          const verifyType = type === "signup" ? "signup" : "email";
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: verifyType as any,
          });
          if (error) throw error;

          if (data.user) {
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
            return;
          }
        } catch (err) {
          console.error("Email confirmation error:", err);
          setStatus("error");
          router.push("/auth/login?message=confirmation_failed");
          return;
        }
      }

      // If we reach here, link is invalid
      setStatus("error");
      router.push("/auth/login?message=invalid_link");
    };

    confirmEmail();
    // We depend only on the URL params; Supabase instance is stable enough here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Minimal, non-intrusive UI so users don't see a blank page
  if (status !== "error") {
    return (
      <div className="w-full py-10 text-center text-sm text-gray-600">
        Confirming your email...
      </div>
    );
  }
  return null;
}
