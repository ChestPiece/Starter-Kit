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

      try {
        // Handle password recovery
        if (type === "recovery" && code) {
          const { data, error } =
            await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          // Persist session on server
          if (data.session) {
            await fetch("/api/auth/confirm", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
              }),
            });
          }

          // Redirect to reset password immediately
          window.location.href = "/auth/reset-password";
          return;
        }

        // Handle email confirmation with token_hash
        if (token_hash && type) {
          const verifyType = type === "signup" ? "signup" : "email";
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: verifyType as any,
          });
          if (error) throw error;

          if (data.user) {
            // Persist session on server
            const session = await supabase.auth.getSession();
            if (session.data.session) {
              await fetch("/api/auth/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  access_token: session.data.session.access_token,
                  refresh_token: session.data.session.refresh_token,
                }),
              });
            }

            // Redirect to dashboard immediately
            window.location.href = "/";
            return;
          }
        }

        // Handle PKCE code-based confirmation
        if (code) {
          const { data, error } =
            await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            // Check if it's a known PKCE error (email confirmed but no verifier)
            const message = String(error.message || error);
            if (
              message.includes("code verifier") ||
              message.includes("invalid grant")
            ) {
              // Email already confirmed, redirect to login
              window.location.href = "/auth/login?message=email_confirmed";
              return;
            }
            throw error;
          }

          if (data.user) {
            // Persist session on server
            if (data.session) {
              await fetch("/api/auth/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  access_token: data.session.access_token,
                  refresh_token: data.session.refresh_token,
                }),
              });
            }

            // Redirect to dashboard immediately
            window.location.href = "/";
            return;
          }
        }

        // If we reach here, no valid confirmation method found
        throw new Error("Invalid confirmation link");
      } catch (error: any) {
        console.error("Email confirmation error:", error);
        // Redirect to login with error message
        window.location.href = "/auth/login?message=confirmation_failed";
      }
    };

    confirmEmail();
  }, [searchParams, supabase, router]);

  // Show minimal loading while processing
  return (
    <div className="w-full py-10 text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
    </div>
  );
}
