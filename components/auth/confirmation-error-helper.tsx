"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Mail } from "lucide-react";
import Link from "next/link";

interface ConfirmationErrorHelperProps {
  errorType:
    | "link_expired"
    | "confirmation_failed"
    | "invalid_confirmation_link"
    | "invalid_link";
}

export function ConfirmationErrorHelper({
  errorType,
}: ConfirmationErrorHelperProps) {
  const [showResendForm, setShowResendForm] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isExpiredLink =
    errorType === "link_expired" || errorType === "confirmation_failed";

  const handleResendEmail = async () => {
    if (!email || loading) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.code === "VALIDATION_EMAIL_ALREADY_CONFIRMED") {
          setError("This email is already confirmed. You can sign in now.");
        } else if (result.code === "VALIDATION_EMAIL_NOT_FOUND") {
          setError("No account found with this email address.");
        } else if (result.code === "AUTH_RATE_LIMITED") {
          const waitTimeMatch = result.message?.match(/(\d+) seconds?/);
          const waitSeconds = waitTimeMatch ? parseInt(waitTimeMatch[1]) : 60;
          setError(
            `Too many attempts. Please wait ${waitSeconds} seconds before trying again.`
          );
        } else {
          setError(
            result.message || "Failed to resend email. Please try again."
          );
        }
      } else {
        setSuccess(true);
        setEmail(""); // Clear the email field
        setTimeout(() => {
          setSuccess(false);
          setShowResendForm(false);
        }, 5000);
      }
    } catch (error) {
      console.error("Resend email error:", error);
      setError("Connection failed. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  if (!isExpiredLink) {
    return (
      <div className="mt-4 space-y-3">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            The confirmation link appears to be invalid. This can happen if:
            <ul className="mt-2 list-disc list-inside text-sm space-y-1">
              <li>The link was corrupted during forwarding</li>
              <li>You've already confirmed your email</li>
              <li>The link is incomplete</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setShowResendForm(true)}
            className="flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Request New Confirmation Email
          </Button>

          <Link href="/auth/signup">
            <Button variant="outline" className="w-full sm:w-auto">
              Create New Account
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Your confirmation link has expired. Confirmation links are only valid
          for a limited time for security reasons.
        </AlertDescription>
      </Alert>

      {!showResendForm ? (
        <Button
          onClick={() => setShowResendForm(true)}
          className="w-full flex items-center gap-2"
          variant="outline"
        >
          <Mail className="h-4 w-4" />
          Get New Confirmation Email
        </Button>
      ) : (
        <div className="space-y-3">
          <div>
            <label
              htmlFor="resend-email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Enter your email address to receive a new confirmation link:
            </label>
            <input
              id="resend-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                New confirmation email sent successfully! Please check your
                inbox.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleResendEmail}
              disabled={!email || loading}
              className="flex-1"
            >
              {loading ? "Sending..." : "Send New Link"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowResendForm(false);
                setError(null);
                setEmail("");
              }}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
