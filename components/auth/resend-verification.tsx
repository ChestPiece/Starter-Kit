"use client";

import { useState } from "react";
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
import { Mail, CheckCircle, AlertCircle } from "lucide-react";

interface ResendVerificationProps {
  onBackToLogin: () => void;
}

export function ResendVerification({ onBackToLogin }: ResendVerificationProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const supabase = createClient();

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
      });

      if (error) {
        setMessage({
          type: "error",
          text: error.message,
        });
      } else {
        setMessage({
          type: "success",
          text: "Verification email sent! Please check your inbox and click the verification link.",
        });
        setEmail("");
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="space-y-1 pb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <Mail className="h-8 w-8 text-blue-600" />
        </div>
        <CardTitle className="text-2xl font-bold text-gray-900">
          Resend Verification
        </CardTitle>
        <CardDescription className="text-gray-600">
          Enter your email to receive a new verification link
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {message && (
          <div
            className={`p-4 rounded-lg border ${
              message.type === "success"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center space-x-2">
              {message.type === "success" ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              )}
              <p className="text-sm">{message.text}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleResend} className="space-y-4">
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

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl font-semibold text-white transition-all duration-200 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Sending...</span>
              </div>
            ) : (
              "Resend Verification Email"
            )}
          </Button>
        </form>

        <div className="text-center pt-4 border-t border-gray-200">
          <button
            onClick={onBackToLogin}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
          >
            ← Back to Login
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
