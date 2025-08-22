"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getSupabaseClient } from "@/lib/supabase/singleton-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { logger } from '@/lib/services/logger';
import { createTabContext } from '@/lib/utils/data-sanitizer';
import {
  markAsAuthTab,
  setTabSession,
  getCurrentTabId,
} from "@/lib/auth/tab-isolation";
import { SharedForm, commonFieldConfigs } from "@/components/ui/shared-form";
import { useFormState, handleAuthError } from "@/hooks/use-form-state";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm({
  className,
  onForgotPassword,
  reasonMessage,
  networkError,
  ...props
}: React.ComponentProps<"div"> & {
  onForgotPassword?: () => void;
  reasonMessage?: string | null;
  networkError?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordStates, setShowPasswordStates] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const supabase = getSupabaseClient();
  const searchParams = useSearchParams();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const formState = useFormState({
    logContext: 'Login',
    onSuccess: () => {
      // Handle success in onSubmit
    },
    onError: (error) => {
      setError(error);
    }
  });

  // Watch all form values
  const formValues = form.watch();

  // Use state for button disabled status to prevent hydration mismatch
  const [isFormDisabled, setIsFormDisabled] = useState(false);

  // Update button disabled state after hydration - only disable when loading
  useEffect(() => {
    setIsFormDisabled(loading);
  }, [loading]);

  const handlePasswordToggle = (fieldName: string) => {
    setShowPasswordStates(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  const submitLogin = async (data: LoginFormData) => {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      throw new Error(handleAuthError(error));
    }

    if (authData?.user) {
      // Mark this tab as authenticated
      const tabId = getCurrentTabId();
      markAsAuthTab();
      setTabSession(true);

      // Initialize session tracking
      try {
        const {
          initializeSessionTracking,
          updateLastActivity,
        } = await import("@/lib/session-config");
        initializeSessionTracking();
        updateLastActivity();
      } catch (e) {
        logger.warn("Failed to initialize session tracking:", { error: e instanceof Error ? e.message : String(e) });
      }
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);

    try {
      await submitLogin(data);
      
      // Redirect after successful login
      const redirectTo = searchParams.get('redirectTo') || '/dashboard';
      router.push(redirectTo);
    } catch (error) {
      logger.error('Login error:', { error: error instanceof Error ? error.message : String(error) });
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    commonFieldConfigs.email,
    commonFieldConfigs.password,
  ];

  const footerContent = (
    <>
      <div className="text-center">
        <button
          type="button"
          className="text-sm text-primary hover:underline p-0 h-auto font-normal bg-transparent border-none cursor-pointer"
          onClick={onForgotPassword}
          disabled={formState.loading}
        >
          Forgot your password?
        </button>
      </div>

      <div className="mt-4 text-center text-sm text-gray-600">
        Don't have an account?{" "}
        <Link
          href="/auth/signup"
          className="text-primary underline underline-offset-4 hover:text-primary/90 transition-colors font-medium !opacity-100 cursor-pointer"
        >
          Sign up
        </Link>
      </div>
    </>
  );

  return (
    <SharedForm
      title="Sign In"
      description="Enter your email and password to access your account"
      form={form}
      onSubmit={onSubmit}
      fields={fields}
      submitText="Sign In"
      loading={formState.loading}
      error={reasonMessage || formState.error}
      isFormDisabled={formState.isFormDisabled}
      footerContent={footerContent}
      showPasswordStates={showPasswordStates}
      onPasswordToggle={handlePasswordToggle}
      className={className}
    />
  );
}

// Export as default for dynamic imports
export default LoginForm;
