"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, Clock, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailConfirmationProps {
  email: string;
  onBackToSignup: () => void;
}

export function EmailConfirmation({
  email,
  onBackToSignup,
}: EmailConfirmationProps) {
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const supabase = createClient();

  const handleResendEmail = async () => {
    if (countdown > 0) return;

    setResending(true);
    setResendMessage(null);
    setResendError(null);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });

      if (error) {
        setResendError(error.message);
      } else {
        setResendMessage("Confirmation email sent successfully!");
        // Start countdown
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err) {
      setResendError("Failed to resend email. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="space-y-1 pb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <Mail className="h-8 w-8 text-blue-600" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900">
          Check Your Email
        </CardTitle>
        <CardDescription className="text-gray-600">
          We've sent a confirmation link to
        </CardDescription>
        <p className="text-sm font-medium text-blue-600 break-all">{email}</p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Instructions */}
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
                1
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Click the confirmation link in your email to verify your account
            </p>
          </div>

          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600">
                2
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Once verified, you'll be able to sign in to your account
            </p>
          </div>
        </div>

        {/* Messages */}
        {resendMessage && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              <p className="text-green-600 text-sm font-medium">
                {resendMessage}
              </p>
            </div>
          </div>
        )}

        {resendError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <p className="text-red-600 text-sm font-medium">{resendError}</p>
            </div>
          </div>
        )}

        {/* Resend Email Button */}
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">
              Didn't receive the email? Check your spam folder or
            </p>
            <Button
              onClick={handleResendEmail}
              disabled={resending || countdown > 0}
              variant="outline"
              className={cn(
                "w-full h-11 font-medium transition-all duration-200",
                countdown > 0 && "cursor-not-allowed"
              )}
            >
              {resending ? (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Sending...</span>
                </div>
              ) : countdown > 0 ? (
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Resend in {countdown}s</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4" />
                  <span>Resend Email</span>
                </div>
              )}
            </Button>
          </div>

          {/* Back to Signup */}
          <div className="text-center">
            <button
              onClick={onBackToSignup}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Back to Sign Up
            </button>
          </div>
        </div>

        {/* Help Text */}
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Still having trouble? Contact our support team for assistance.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
