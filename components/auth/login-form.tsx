"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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

  // Handle messages from email confirmation
  useEffect(() => {
    const message = searchParams.get("message");
    if (message === "email_confirmed") {
      setSuccess(
        "Email confirmed successfully! You can now sign in to your account."
      );
      setError(null);
    } else if (message === "confirmation_failed") {
      setError(
        "Email confirmation failed. Please try again or contact support."
      );
      setSuccess(null);
    } else if (message === "invalid_link") {
      setError(
        "Invalid confirmation link. Please check your email for the correct link."
      );
      setSuccess(null);
    }
  }, [searchParams]);

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
        router.push("/");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Connection failed. Please check your internet connection.");
      setLoading(false);
    }
  };

  return (
    <Card className="w-full border bg-white">
      <CardHeader className="text-center pb-3">
        <CardTitle className="text-xl font-semibold text-gray-900">
          Welcome Back
        </CardTitle>
        <CardDescription className="text-gray-600 text-sm">
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
          </Alert>
        )}

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
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Password
                    </FormLabel>
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs text-pink-600 hover:text-pink-700 font-medium"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="h-8 pr-8 border-gray-200 focus:border-pink-600 focus:ring-1 focus:ring-pink-600/20"
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
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

            <Button
              type="submit"
              className="w-full h-8 text-sm font-medium bg-pink-600 hover:bg-pink-700 focus:ring-1 focus:ring-pink-600/20"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </Form>

        <div className="text-center">
          <p className="text-gray-600 text-sm">
            Don't have an account?{" "}
            <Link
              href="/auth/signup"
              className="text-pink-600 hover:text-pink-700 font-medium transition-colors"
            >
              Create one here
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
