"use client";

import type React from "react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Mail, Send, AlertCircle, CheckCircle } from "lucide-react";

interface ForgotPasswordProps {
  onBack: () => void;
  onEmailSent: () => void;
}

export function ForgotPassword({ onBack, onEmailSent }: ForgotPasswordProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const supabase = createClient();

  const validateEmail = (email: string): string | undefined => {
    if (!email) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    return undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Get the current origin for proper redirect URL
      const origin = window.location.origin;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/reset-password`,
      });

      if (error) {
        console.error("Password reset error:", error);

        // Handle specific error types
        if (
          error.message?.includes("rate limit") ||
          error.message?.includes("security purposes") ||
          error.message?.includes("send rate limit")
        ) {
          // Extract wait time from error message if available
          const waitTimeMatch = error.message?.match(/(\d+)\s*seconds?/);
          const waitSeconds = waitTimeMatch ? parseInt(waitTimeMatch[1]) : 60;

          if (waitSeconds < 60) {
            setError(
              `Too many reset requests. Please wait ${waitSeconds} seconds before trying again.`
            );
          } else {
            const waitMinutes = Math.ceil(waitSeconds / 60);
            setError(
              `Too many reset requests. Please wait ${waitMinutes} minute${waitMinutes > 1 ? "s" : ""} before trying again.`
            );
          }
        } else if (
          error.message?.includes("User not found") ||
          error.message?.includes("email not found")
        ) {
          // Generic message to avoid email enumeration attacks
          setError(
            "If an account with that email exists, you will receive a password reset link."
          );
          // Still call onEmailSent to show success UI (security practice)
          setTimeout(() => onEmailSent(), 1000);
        } else if (error.message?.includes("Invalid email")) {
          setError("Please enter a valid email address.");
        } else {
          // Generic error message for other failures
          setError(
            "Unable to send reset email at this time. Please try again later."
          );
          console.error("Unexpected password reset error:", error);
        }
      } else {
        // Success - always show success message
        console.log(`✅ Password reset email sent to ${email}`);
        setError("");
        onEmailSent();
      }
    } catch (err) {
      console.error("Password reset request failed:", err);
      setError(
        "Connection failed. Please check your internet connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (error) {
      setError("");
    }
  };

  const handleBlur = () => {
    setTouched(true);
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
    }
  };

  const isValid = !validateEmail(email);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>
          Enter your email address and we'll send you a link to reset your
          password
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email" className="text-gray-700 font-medium">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="reset-email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={handleBlur}
                className={`pl-10 ${
                  error && touched
                    ? "border-red-300 focus:border-red-400 focus:ring-red-400"
                    : "border-gray-200 focus:border-pink-700 focus:ring-1 focus:ring-pink-700/20"
                }`}
                required
              />
              {!error && touched && email && isValid && (
                <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-green-500" />
              )}
            </div>
            {error && touched && (
              <p className="text-sm text-red-600 flex items-center space-x-1">
                <AlertCircle className="h-3 w-3" />
                <span>{error}</span>
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading || !isValid}
            className="w-full bg-pink-700 text-white hover:bg-pink-800 font-medium border-none shadow-sm disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </div>
            ) : (
              <div className="flex items-center">
                <Send className="mr-2 h-4 w-4" />
                Send Reset Link
              </div>
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center">
        <button
          onClick={onBack}
          className="flex items-center text-sm text-pink-700 hover:text-pink-800 font-medium"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Sign In
        </button>
      </CardFooter>
    </Card>
  );
}
