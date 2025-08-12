"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Mail, CheckCircle, RefreshCw } from "lucide-react";

interface EmailConfirmationProps {
  email: string;
  onBack: () => void;
}

export function EmailConfirmation({ email, onBack }: EmailConfirmationProps) {
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  const supabase = createClient();

  const handleResend = async () => {
    if (countdown > 0) return;

    setIsResending(true);
    setError("");

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
      });

      if (error) {
        setError(error.message);
      } else {
        setResent(true);

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

        // Reset the resent state after 3 seconds
        setTimeout(() => setResent(false), 3000);
      }
    } catch (err) {
      setError("Failed to resend email. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="w-full border bg-white">
      <CardHeader className="space-y-1 text-center pb-3">
        <div className="mx-auto w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mb-3">
          <Mail className="h-6 w-6 text-pink-600" />
        </div>
        <CardTitle className="text-xl font-semibold text-gray-900">
          Check Your Email
        </CardTitle>
        <CardDescription className="text-gray-600 text-sm">
          We've sent a confirmation link to
        </CardDescription>
        <p className="text-pink-600 font-semibold break-all text-sm">{email}</p>
      </CardHeader>

      <CardContent className="space-y-3 text-center">
        <div className="bg-pink-50 border border-pink-200 rounded p-3">
          <CheckCircle className="h-5 w-5 text-pink-600 mx-auto mb-2" />
          <p className="text-sm text-gray-700">
            Click the link in the email to complete your registration. The link
            will expire in 24 hours.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="text-sm text-gray-600 space-y-2">
          <p>Didn't receive the email? Check your spam folder or</p>
          <Button
            variant="outline"
            onClick={handleResend}
            disabled={isResending || resent || countdown > 0}
            className="h-8 text-sm border-pink-200 hover:bg-pink-50 text-pink-600 bg-transparent"
          >
            {isResending ? (
              <div className="flex items-center">
                <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                Resending...
              </div>
            ) : resent ? (
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-3 w-3" />
                Email Sent!
              </div>
            ) : countdown > 0 ? (
              <div className="flex items-center">
                <RefreshCw className="mr-2 h-3 w-3" />
                Resend in {countdown}s
              </div>
            ) : (
              <div className="flex items-center">
                <RefreshCw className="mr-2 h-3 w-3" />
                Resend Email
              </div>
            )}
          </Button>
        </div>
      </CardContent>

      <CardFooter className="flex justify-center">
        <button
          onClick={onBack}
          className="flex items-center text-sm text-pink-600 hover:text-pink-700 font-medium"
        >
          <ArrowLeft className="mr-1 h-3 w-3" />
          Back to Sign In
        </button>
      </CardFooter>
    </Card>
  );
}
