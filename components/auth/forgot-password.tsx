"use client";

import { ArrowLeft, Mail, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { SharedForm } from "@/components/ui/shared-form";
import { useFormState, commonValidations } from "@/hooks/use-form-state";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/services/logger";

const formSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
});

interface ForgotPasswordProps {
  onBack: () => void;
  onEmailSent: () => void;
}

export function ForgotPassword({ onBack, onEmailSent }: ForgotPasswordProps) {
  const supabase = createClient();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const { loading, setLoading } = useFormState();

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);

    try {
      // Check if Supabase is configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (
        !supabaseUrl ||
        !supabaseKey ||
        supabaseUrl.includes("your-supabase-url") ||
        supabaseKey.includes("your-supabase-anon-key")
      ) {
        form.setError("email", {
          message: "Email service not configured. Please contact support or set up your environment variables."
        });
        logger.error("Supabase environment variables not configured properly");
        return;
      }

      // Get the current origin for proper redirect URL
      const origin = window.location.origin;

      logger.info("Attempting to send password reset email", { email: values.email });
      logger.info('Redirect URL configured', { redirectUrl: `${origin}/auth/reset-password` });

      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${origin}/auth/reset-password`,
      });

      if (error) {
        logger.error("Password reset error", { error: error instanceof Error ? error : String(error) });

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
            form.setError("email", {
              message: `Too many reset requests. Please wait ${waitSeconds} seconds before trying again.`
            });
          } else {
            const waitMinutes = Math.ceil(waitSeconds / 60);
            form.setError("email", {
              message: `Too many reset requests. Please wait ${waitMinutes} minute${waitMinutes > 1 ? "s" : ""} before trying again.`
            });
          }
        } else if (
          error.message?.includes("User not found") ||
          error.message?.includes("email not found")
        ) {
          // Generic message to avoid email enumeration attacks
          form.setError("email", {
            message: "If an account with that email exists, you will receive a password reset link."
          });
          // Still call onEmailSent to show success UI (security practice)
          setTimeout(() => onEmailSent(), 1000);
        } else if (error.message?.includes("Invalid email")) {
          form.setError("email", {
            message: "Please enter a valid email address."
          });
        } else {
          // Generic error message for other failures
          form.setError("email", {
            message: "Unable to send reset email at this time. Please try again later."
          });
          logger.error("Unexpected password reset error:", { error: error instanceof Error ? error.message : String(error) });
        }
      } else {
        // Success - always show success message
        logger.info('✅ Password reset email sent successfully', { emailDomain: values.email.split('@')[1] });
        logger.info(
          "Email should arrive within a few minutes. Check your spam folder if you don't see it."
        );
        form.clearErrors();

        // Show success message and call onEmailSent
        onEmailSent();
      }
    } catch (err) {
      logger.error("Password reset request failed:", { error: err instanceof Error ? err.message : String(err) });
      form.setError("email", {
        message: "Connection failed. Please check your internet connection and try again."
      });
    } finally {
      setLoading(false);
    }
  };

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
        <SharedForm
          title="Reset Password"
          submitText="Send Reset Link"
          form={form}
          onSubmit={onSubmit}
          fields={[
            {
              name: "email",
              type: "email",
              label: "Email Address",
              placeholder: "john@example.com",
            },
          ]}
          submitButton={{
            text: "Send Reset Link",
            loadingText: "Sending...",
            icon: Send,
            className: "w-full bg-pink-700 text-white hover:bg-pink-800 font-medium border-none shadow-sm",
          }}
          isLoading={loading}
        />
      </CardContent>

      <CardFooter className="flex justify-center">
        <button
          onClick={onBack}
          className="flex items-center text-sm text-primary hover:text-primary/90 font-medium"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Sign In
        </button>
      </CardFooter>
    </Card>
  );
}

// Export as default for dynamic imports
export default ForgotPassword;
