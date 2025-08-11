"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, EyeOff, Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ForgotPassword } from "./forgot-password";
import { ResendVerification } from "./resend-verification";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Clean URL on component mount
  useEffect(() => {
    // Clean up URL parameters without refreshing the page
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error);

        // Only show network-related errors or simple messages
        if (
          error.message.includes("Network") ||
          error.message.includes("fetch") ||
          error.message.includes("connection")
        ) {
          setError(
            "Connection failed. Please check your internet connection and try again."
          );
        } else if (error.message.includes("Invalid login credentials")) {
          setError("Invalid email or password.");
        } else if (
          error.message.includes("email not confirmed") ||
          error.message.includes("Email not confirmed")
        ) {
          setError("Please verify your email address first.");
        } else {
          setError("Please check your credentials and try again.");
        }

        setLoading(false);
        return;
      }

      if (data.user) {
        console.log("Login successful:", data.user.email);

        // Initialize session tracking
        try {
          const { initializeSessionTracking, updateLastActivity } =
            await import("@/lib/session-config");
          initializeSessionTracking();
          updateLastActivity();
        } catch (e) {
          console.warn("Could not initialize session tracking:", e);
        }

        // Set a timeout to prevent infinite loading
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
        return;
      } else {
        setError("Login failed - no user returned");
        setLoading(false);
      }
    } catch (err) {
      console.error("Login exception:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  // Show forgot password screen if needed
  if (showForgotPassword) {
    return (
      <ForgotPassword onBackToLogin={() => setShowForgotPassword(false)} />
    );
  }

  // Show resend verification screen if needed
  if (showResendVerification) {
    return (
      <ResendVerification
        onBackToLogin={() => setShowResendVerification(false)}
      />
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="space-y-1 pb-8">
        <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Welcome Back
        </CardTitle>
        <CardDescription className="text-center text-gray-600 text-base">
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-gray-700"
              >
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl transition-all duration-200"
                  placeholder="Enter your email address"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-gray-700"
              >
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl transition-all duration-200"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-red-600 text-sm text-center font-medium">
                {error}
              </p>
              {error.includes("verify your email") && (
                <div className="mt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowResendVerification(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Resend Verification Email
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full h-12 rounded-xl font-semibold text-white transition-all duration-200",
              "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
              "shadow-lg hover:shadow-xl transform hover:scale-[1.02]",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            )}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Signing in...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            )}
          </Button>

          {/* Forgot Password Link */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
            >
              Forgot your password?
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
