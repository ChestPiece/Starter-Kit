"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";

const signupSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .max(50, "First name is too long"),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .max(50, "Last name is too long"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters long"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export function SignupForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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

  const onSubmit = async (data: SignupFormData) => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/api/auth/confirm`,
          data: {
            first_name: data.firstName.trim(),
            last_name: data.lastName.trim(),
            full_name: `${data.firstName.trim()} ${data.lastName.trim()}`,
          },
        },
      });

      if (error) {
        // Only show network-related errors or simple messages
        if (
          error.message.includes("Network") ||
          error.message.includes("fetch") ||
          error.message.includes("connection")
        ) {
          setError("Connection failed. Please check your internet connection.");
        } else if (error.message.includes("User already registered")) {
          setError("Account already exists. Please try logging in.");
        } else {
          setError("Unable to create account. Please try again.");
        }
        setLoading(false);
        return;
      }

      // Always show success message instead of email waiting screen
      setSuccess(true);
    } catch (error) {
      console.error("Signup error:", error);
      setError("Connection failed. Please check your internet connection.");
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setResendLoading(true);
    setResendError(null);
    setResendSuccess(false);

    try {
      const email = form.getValues("email");
      const firstName = form.getValues("firstName");
      const lastName = form.getValues("lastName");

      const { error } = await supabase.auth.signUp({
        email: email,
        password: form.getValues("password"),
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/api/auth/confirm`,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          setResendError("Account already exists. Please try logging in.");
        } else {
          setResendError("Failed to resend email. Please try again.");
        }
      } else {
        setResendSuccess(true);
        // Clear success message after 3 seconds
        setTimeout(() => setResendSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Resend email error:", error);
      setResendError("Failed to resend email. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-3">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-pink-100">
            <CheckCircle className="h-5 w-5 text-pink-700" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Account Created!
          </CardTitle>
          <CardDescription className="text-gray-600 text-sm">
            Please check your email to verify your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="border-pink-200 bg-pink-50">
            <CheckCircle className="h-4 w-4 text-pink-700" />
            <AlertDescription className="text-pink-800 text-sm">
              Account created successfully! We've sent a verification email to{" "}
              <strong>{form.getValues("email")}</strong>. Please click the link
              in the email to activate your account and you'll be redirected to
              the dashboard.
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
              className="w-full border-pink-200 text-pink-700 hover:bg-pink-50"
            >
              {resendLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-pink-700" />
                  Resending...
                </>
              ) : (
                "Resend Verification Email"
              )}
            </Button>

            <Link href="/auth/login">
              <Button className="w-full bg-pink-700 text-white hover:bg-pink-800 font-medium border-none shadow-sm">
                Continue to Sign In
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Enter your information to get started</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      First Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="First name"
                        className="h-8 border-gray-200 focus:border-pink-700 focus:ring-1 focus:ring-pink-700/20"
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Last Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Last name"
                        className="h-8 border-gray-200 focus:border-pink-700 focus:ring-1 focus:ring-pink-700/20"
                        disabled={loading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Email Address
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="Enter your email address"
                      className="h-8 border-gray-200 focus:border-pink-600 focus:ring-1 focus:ring-pink-600/20"
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Password
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        className="h-8 pr-8 border-gray-200 focus:border-pink-700 focus:ring-1 focus:ring-pink-700/20"
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-2 hover:bg-gray-100"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Confirm Password
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        className="h-8 pr-8 border-gray-200 focus:border-pink-700 focus:ring-1 focus:ring-pink-700/20"
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-2 hover:bg-gray-100"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        disabled={loading}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                        ) : (
                          <Eye className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  {form.watch("confirmPassword") &&
                    form.watch("password") !==
                      form.watch("confirmPassword") && (
                      <p className="text-xs text-red-500">
                        Passwords do not match
                      </p>
                    )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-pink-700 text-white hover:bg-pink-800 font-medium border-none shadow-sm"
              disabled={
                loading ||
                form.watch("password") !== form.watch("confirmPassword")
              }
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin text-white" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </Form>

        <div className="text-center">
          <p className="text-gray-600 text-sm">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-pink-700 underline underline-offset-4 hover:text-pink-800 transition-colors font-medium !opacity-100"
              style={{ color: "#be185d" }}
            >
              Sign in here
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
