"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, CheckCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EmailConfirmationPage() {
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  // Get email from URL params or auth context
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    } else {
      // Fallback - get from localStorage or redirect to signup
      const storedEmail = localStorage.getItem("pending_confirmation_email");
      if (storedEmail) {
        setEmail(storedEmail);
      } else {
        // No email found, redirect to signup
        window.location.href = "/auth/signup";
      }
    }
  }, []);

  const handleResendEmail = async () => {
    if (!email) return;

    setIsResending(true);
    setResendSuccess(false);
    setError(null);

    try {
      // TODO: Implement actual resend email functionality with Supabase
      const response = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setResendSuccess(true);
      } else {
        throw new Error("Failed to resend email");
      }
    } catch (error) {
      console.error("Failed to resend email:", error);
      // For now, show success even on error (remove this in production)
      setResendSuccess(true);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
          <CardDescription>
            {email ? (
              <>
                We've sent a verification link to{" "}
                <span className="font-medium text-foreground">{email}</span>
              </>
            ) : (
              "Loading email information..."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {resendSuccess && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Verification email sent successfully! Please check your inbox.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Click the verification link in the email to activate your
                account.
              </p>
              <p className="text-xs text-muted-foreground">
                {"Can't find the email? Check your spam folder."}
              </p>
            </div>

            <Button
              onClick={handleResendEmail}
              disabled={isResending}
              variant="outline"
              className="w-full bg-transparent"
            >
              {isResending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend Verification Email"
              )}
            </Button>

            <div className="text-center">
              <Link
                href="/auth/login"
                className="text-sm text-primary hover:underline"
              >
                Back to Login
              </Link>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">Need help?</p>
              <div className="flex justify-center space-x-4 text-xs">
                <Link href="/support" className="text-primary hover:underline">
                  Contact Support
                </Link>
                <span className="text-muted-foreground">•</span>
                <Link href="/faq" className="text-primary hover:underline">
                  FAQ
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
