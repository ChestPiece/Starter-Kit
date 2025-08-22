"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getSupabaseClient } from "@/lib/supabase/singleton-client";
import { SharedForm, commonFieldConfigs } from "@/components/ui/shared-form";
import { useFormState, handleAuthError, commonValidations } from "@/hooks/use-form-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { logger } from '@/lib/services/logger';

const signupSchema = z
  .object({
    firstName: z.string().min(1, "First name is required").max(50, "Name is too long (maximum 50 characters)"),
    lastName: z.string().min(1, "Last name is required").max(50, "Name is too long (maximum 50 characters)"),
    email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export function SignupForm() {
  const [showPasswordStates, setShowPasswordStates] = useState<Record<string, boolean>>({});
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);
  const router = useRouter();
  const supabase = getSupabaseClient();

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const formState = useFormState({
    logContext: 'Signup',
    onSuccess: () => {
      setSuccess(true);
      logger.info("✅ Signup successful - check email for confirmation");
    },
    onError: (error) => {
      logger.error("Signup error:", { error });
    }
  });

  const handlePasswordToggle = (fieldName: string) => {
    setShowPasswordStates(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  const submitSignup = async (data: SignupFormData) => {
    // Get the current origin for proper redirect URL
    const origin = window.location.origin;

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${origin}/api/auth/confirm`,
        data: {
          first_name: data.firstName.trim(),
          last_name: data.lastName.trim(),
          full_name: `${data.firstName.trim()} ${data.lastName.trim()}`,
        },
      },
    });

    if (error) {
      throw new Error(handleAuthError(error));
    }
  };

  const onSubmit = formState.handleSubmit(form, submitSignup);

  const handleResendEmail = async () => {
    if (resendLoading) return; // Prevent double-clicks

    setResendLoading(true);
    setResendError(null);
    setResendSuccess(false);

    try {
      const email = form.getValues("email");

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
          setResendError(
            "This email is already confirmed. You can sign in now."
          );
        } else if (result.code === "VALIDATION_EMAIL_NOT_FOUND") {
          setResendError(
            "No account found with this email address. Please check your email or create a new account."
          );
        } else if (result.code === "AUTH_RATE_LIMITED") {
          // Extract wait time from the message if available
          const waitTimeMatch = result.message?.match(/(\d+) seconds?/);
          const waitSeconds = waitTimeMatch ? parseInt(waitTimeMatch[1]) : 60;

          if (waitSeconds < 60) {
            setResendError(
              `Too many attempts. Please wait ${waitSeconds} seconds before trying again.`
            );
          } else {
            const waitMinutes = Math.ceil(waitSeconds / 60);
            setResendError(
              `Too many attempts. Please wait ${waitMinutes} minute${waitMinutes > 1 ? "s" : ""} before trying again.`
            );
          }
        } else if (
          result.message?.includes("rate limit") ||
          result.message?.includes("security purposes")
        ) {
          // Handle Supabase native rate limiting
          setResendError(
            "Too many confirmation emails sent recently. Please wait 60 seconds before trying again."
          );
        } else {
          setResendError(
            result.message ||
              "Failed to resend email. Please try again in a moment."
          );
        }
      } else {
        setResendSuccess(true);
        // Clear success message after 5 seconds
        setTimeout(() => setResendSuccess(false), 5000);
      }
    } catch (error) {
      logger.error("Resend email error:", { error });
      setResendError(
        "Connection failed. Please check your internet connection and try again."
      );
    } finally {
      setResendLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-3">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Account Created!
          </CardTitle>
          <CardDescription className="text-gray-600 text-sm">
            Please check your email to verify your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="border-primary/20 bg-primary/5">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-primary/90 text-sm">
              Account created successfully! We've sent a verification email to{" "}
              <strong>{form.getValues("email")}</strong>. Please click the link
              in the email to verify your account, then return here to sign in.
            </AlertDescription>
          </Alert>

          {resendError && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800 text-sm">
                {resendError}
              </AlertDescription>
            </Alert>
          )}

          {resendSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 text-sm">
                Verification email sent successfully! Please check your inbox.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Button
              onClick={handleResendEmail}
              disabled={resendLoading}
              variant="outline"
              className="w-full border-primary/20 text-primary hover:bg-primary/5"
            >
              {resendLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                  Resending...
                </>
              ) : (
                "Resend Verification Email"
              )}
            </Button>

            <Link href="/auth/login">
              <Button className="w-full bg-pink-700 text-white hover:bg-pink-800 font-medium border-none shadow-sm">
                Go to Sign In
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const fields = [
    { ...commonFieldConfigs.firstName, placeholder: "First name" },
    { ...commonFieldConfigs.lastName, placeholder: "Last name" },
    { ...commonFieldConfigs.email, placeholder: "Enter your email address" },
    { ...commonFieldConfigs.password, placeholder: "Create a password" },
    { ...commonFieldConfigs.password, name: "confirmPassword", label: "Confirm Password", placeholder: "Confirm your password" },
  ];

  const footerContent = (
    <div className="text-center">
      <p className="text-gray-600 text-sm">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="text-primary underline underline-offset-4 hover:text-primary/90 transition-colors font-medium !opacity-100 cursor-pointer"
        >
          Sign in here
        </Link>
      </p>
    </div>
  );

  return (
    <SharedForm
      title="Create Account"
      description="Enter your information to get started"
      form={form}
      onSubmit={onSubmit}
      fields={fields}
      submitText="Create Account"
      loading={formState.loading}
      error={formState.error}
      isFormDisabled={formState.isFormDisabled}
      footerContent={footerContent}
      showPasswordStates={showPasswordStates}
      onPasswordToggle={handlePasswordToggle}
      className="w-full max-w-md"
    />
  );
}

// Export as default for dynamic imports
export default SignupForm;
