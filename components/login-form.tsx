"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
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
import {
  markAsAuthTab,
  setTabSession,
  getCurrentTabId,
} from "@/lib/auth/tab-isolation";

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
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Watch all form values
  const formValues = form.watch();

  // Use state for button disabled status to prevent hydration mismatch
  const [isFormDisabled, setIsFormDisabled] = useState(false);

  // Update button disabled state after hydration - only disable when loading
  useEffect(() => {
    setIsFormDisabled(loading);
  }, [loading]);

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        // Only show network-related errors or simple messages
        if (
          error.message.includes("Network") ||
          error.message.includes("fetch") ||
          error.message.includes("connection")
        ) {
          setError("Connection failed. Please check your internet connection.");
        } else if (error.message.includes("Invalid login credentials")) {
          setError("Invalid email or password.");
        } else if (error.message.includes("email not confirmed")) {
          setError("Please verify your email first.");
        } else {
          setError("Please check your credentials and try again.");
        }
        setLoading(false);
        return;
      }

      if (authData.user) {
        console.log("✅ Login successful, processing authentication...");

        // Mark this tab as the authentication tab for isolation
        markAsAuthTab();
        setTabSession(true);
        console.log(`🏷️ Tab ${getCurrentTabId()} marked as authenticated`);

        // Session is already handled by Supabase auth - no need for additional confirmation

        try {
          const { initializeSessionTracking, updateLastActivity } =
            await import("@/lib/session-config");
          initializeSessionTracking();
          updateLastActivity();
        } catch (e) {
          console.warn("Failed to initialize session tracking:", e);
        }

        // Login successful - redirect directly to dashboard
        console.log("✅ Login successful - redirecting to dashboard");

        // Redirect immediately without showing success message
        router.push("/");

        setLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Connection failed. Please check your internet connection.");
      setLoading(false);
    }
  };

  return (
    <Card className={cn("w-full max-w-md", className)} {...props}>
      <CardHeader>
        <CardTitle>Welcome Back</CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <CardContent>
        {reasonMessage && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{reasonMessage}</AlertDescription>
          </Alert>
        )}

        {networkError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Connection failed. Please check your internet connection and try
              again.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert
            variant="destructive"
            className="mb-4 border-red-200 bg-red-50"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid gap-3">
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="m@example.com"
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid gap-3">
                      <div className="flex items-center">
                        <FormLabel>Password</FormLabel>
                        <button
                          type="button"
                          onClick={() => onForgotPassword?.()}
                          className="ml-auto inline-block text-sm underline-offset-4 hover:underline text-primary hover:text-primary/90"
                        >
                          Forgot your password?
                        </button>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="pr-10"
                            disabled={loading}
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={loading}
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full !opacity-100 !visible !block"
                disabled={isFormDisabled}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-current" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
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
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
