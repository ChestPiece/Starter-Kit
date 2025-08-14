"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function EmailConfirmationHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [status, setStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const confirmEmail = async () => {
      setStatus("processing");
      setMessage("Processing confirmation...");
      const code = searchParams.get("code");
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      console.log("Email confirmation params:", {
        code: !!code,
        token_hash: !!token_hash,
        type,
      });

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

      // Prefer token_hash flow for email confirmations
      if (token_hash && type) {
        try {
          const verifyType = type === "signup" ? "signup" : "email";
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: verifyType as any,
          });
          if (error) throw error;

          if (data.user) {
            setStatus("success");
            setMessage("Email confirmed! Redirecting to dashboard...");
            console.log(
              "Email confirmation successful, user:",
              data.user.email
            );

            try {
              const session = await supabase.auth.getSession();
              const access_token = session.data.session?.access_token;
              const refresh_token = session.data.session?.refresh_token;
              if (access_token && refresh_token) {
                const response = await fetch("/api/auth/confirm", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ access_token, refresh_token }),
                });
                console.log(
                  "Server session persistence:",
                  response.ok ? "success" : "failed"
                );
              }
            } catch (err) {
              console.warn("Failed to persist session on server:", err);
            }

            // Give a bit more time for the session to be fully established
            setTimeout(() => {
              console.log("Redirecting to dashboard...");
              window.location.href = "/";
            }, 1000);
            return;
          }
        } catch (err) {
          console.error("Email confirmation error:", err);
          setStatus("error");
          router.push("/auth/login?message=confirmation_failed");
          return;
        }
      }

      // Handle PKCE code-based confirmation last; if code_verifier is missing, treat as email-confirmed
      if (code) {
        try {
          const { data, error } =
            await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          if (data.user) {
            setStatus("success");
            setMessage("Confirmation successful! Redirecting to dashboard...");
            console.log("Code confirmation successful, user:", data.user.email);

            try {
              const session = await supabase.auth.getSession();
              const access_token = session.data.session?.access_token;
              const refresh_token = session.data.session?.refresh_token;
              if (access_token && refresh_token) {
                const response = await fetch("/api/auth/confirm", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ access_token, refresh_token }),
                });
                console.log(
                  "Server session persistence:",
                  response.ok ? "success" : "failed"
                );
              }
            } catch (err) {
              console.warn("Failed to persist session on server:", err);
            }

            setTimeout(() => {
              console.log("Redirecting to dashboard...");
              window.location.href = "/";
            }, 1000);
            return;
          }
        } catch (err: any) {
          const message = String(err?.message || err);
          const knownPkce =
            message.includes("code verifier") ||
            message.includes("verifier") ||
            message.includes("invalid grant") ||
            message.includes("invalid request");
          if (knownPkce) {
            // This usually means email confirmed but no PKCE verifier present (opened in a new browser context)
            router.replace("/auth/login?message=email_confirmed");
            return;
          }
          console.error("Code-based confirmation error:", err);
        }
      }

      // If we reach here, link is invalid
      console.log("No valid confirmation parameters found");
      setStatus("error");
      setMessage("Invalid confirmation link");
      setTimeout(() => {
        router.push("/auth/login?message=invalid_link");
      }, 2000);
    };

    confirmEmail();
    // Safety net: if nothing happened after a short while, send user to login with success hint
    const timeout = setTimeout(() => {
      if (status === "processing") {
        try {
          router.replace("/auth/login?message=email_confirmed");
        } catch {}
      }
    }, 4000);
    // We depend only on the URL params; Supabase instance is stable enough here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Show appropriate status message
  if (status === "processing") {
    return (
      <div className="w-full py-10 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <div className="text-sm text-gray-600">{message}</div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="w-full py-10 text-center">
        <div className="text-green-600 text-lg mb-2">✓ Success!</div>
        <div className="text-sm text-gray-600">{message}</div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="w-full py-10 text-center">
        <div className="text-red-600 text-lg mb-2">⚠ Error</div>
        <div className="text-sm text-gray-600">{message}</div>
        <div className="mt-4">
          <button
            onClick={() => router.push("/auth/login")}
            className="text-blue-600 hover:underline text-sm"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-10 text-center text-sm text-gray-600">
      Initializing...
    </div>
  );
}
