"use client";

import type React from "react";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface CombinedAuthFormProps {
  view: "login" | "signup";
  onViewChange: (
    view: "login" | "signup" | "forgot-password" | "email-sent"
  ) => void;
  onEmailSet: (email: string) => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
}

export function CombinedAuthForm({
  view,
  onViewChange,
  onEmailSet,
}: CombinedAuthFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: [],
  });

  const router = useRouter();
  const supabase = createClient();

  // Validation functions
  const validateEmail = (email: string): string | undefined => {
    if (!email) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) return "Password is required";
    if (password.length < 6)
      return "Password must be at least 6 characters long";
    return undefined;
  };

  const validateName = (
    name: string,
    fieldName: string
  ): string | undefined => {
    if (!name) return `${fieldName} is required`;
    if (name.length < 2)
      return `${fieldName} must be at least 2 characters long`;
    if (!/^[a-zA-Z\s'-]+$/.test(name))
      return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
    return undefined;
  };

  const validateConfirmPassword = (
    password: string,
    confirmPassword: string
  ): string | undefined => {
    if (!confirmPassword) return "Please confirm your password";
    if (password !== confirmPassword) return "Passwords do not match";
    return undefined;
  };

  const calculatePasswordStrength = (password: string): PasswordStrength => {
    let score = 0;
    const feedback: string[] = [];

    if (password.length >= 8) score += 1;
    else feedback.push("At least 8 characters");

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push("One lowercase letter");

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push("One uppercase letter");

    if (/\d/.test(password)) score += 1;
    else feedback.push("One number");

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    else feedback.push("One special character");

    return { score, feedback };
  };

  // Real-time validation
  useEffect(() => {
    if (view === "signup" && formData.password) {
      setPasswordStrength(calculatePasswordStrength(formData.password));
    }
  }, [formData.password, view]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (view === "signup") {
      const firstNameError = validateName(formData.firstName, "First name");
      if (firstNameError) newErrors.firstName = firstNameError;

      const lastNameError = validateName(formData.lastName, "Last name");
      if (lastNameError) newErrors.lastName = lastNameError;

      const confirmPasswordError = validateConfirmPassword(
        formData.password,
        formData.confirmPassword
      );
      if (confirmPasswordError)
        newErrors.confirmPassword = confirmPasswordError;
    }

    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Mark all fields as touched
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      if (view === "login") {
        // Handle login
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          console.error("Login error:", error);

          // Handle specific error cases
          let errorMessage = error.message;
          if (
            error.message.includes("email not confirmed") ||
            error.message.includes("Email not confirmed")
          ) {
            errorMessage =
              "Please verify your email before logging in. Check your inbox for a verification link.";
          } else if (error.message.includes("Invalid login credentials")) {
            errorMessage =
              "Invalid email or password. Please check your credentials.";
          } else if (error.message.includes("Email not verified")) {
            errorMessage =
              "Please verify your email before logging in. Check your inbox for a verification link.";
          }

          setErrors({ general: errorMessage });
          setIsSubmitting(false);
          return;
        }

        if (data.user) {
          // Check if user's email is verified
          if (!data.user.email_confirmed_at) {
            console.log(
              "Login blocked - user email not verified:",
              data.user.email
            );
            setErrors({
              general:
                "Please verify your email before logging in. Check your inbox for a verification link.",
            });
            setIsSubmitting(false);
            return;
          }

          console.log("Login successful - verified user:", data.user.email);
          // Initialize session tracking for successful login
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
          setErrors({ general: "Login failed - no user returned" });
          setIsSubmitting(false);
          return;
        }
      } else {
        // Handle signup
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              first_name: formData.firstName.trim(),
              last_name: formData.lastName.trim(),
              full_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
            },
          },
        });

        if (error) {
          setErrors({ general: error.message });
          setIsSubmitting(false);
          return;
        }

        if (data.user) {
          onEmailSet(formData.email);
          if (data.user.email_confirmed_at) {
            // User is immediately confirmed, redirect to dashboard
            router.push("/");
            router.refresh();
          } else {
            // User needs to confirm email
            onViewChange("email-sent");
          }
        }
      }
    } catch (error) {
      setErrors({
        general:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    // Clear general error when user makes changes
    if (errors.general) {
      setErrors((prev) => ({ ...prev, general: undefined }));
    }
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Validate field on blur
    const newErrors = { ...errors };

    if (field === "firstName" && view === "signup") {
      const error = validateName(formData.firstName, "First name");
      if (error) newErrors.firstName = error;
      else delete newErrors.firstName;
    }

    if (field === "lastName" && view === "signup") {
      const error = validateName(formData.lastName, "Last name");
      if (error) newErrors.lastName = error;
      else delete newErrors.lastName;
    }

    if (field === "email") {
      const error = validateEmail(formData.email);
      if (error) newErrors.email = error;
      else delete newErrors.email;
    }

    if (field === "password") {
      const error = validatePassword(formData.password);
      if (error) newErrors.password = error;
      else delete newErrors.password;
    }

    if (field === "confirmPassword" && view === "signup") {
      const error = validateConfirmPassword(
        formData.password,
        formData.confirmPassword
      );
      if (error) newErrors.confirmPassword = error;
      else delete newErrors.confirmPassword;
    }

    setErrors(newErrors);
  };

  const getPasswordStrengthColor = (score: number) => {
    if (score <= 1) return "bg-red-500";
    if (score <= 2) return "bg-orange-500";
    if (score <= 3) return "bg-yellow-500";
    if (score <= 4) return "bg-blue-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = (score: number) => {
    if (score <= 1) return "Very Weak";
    if (score <= 2) return "Weak";
    if (score <= 3) return "Fair";
    if (score <= 4) return "Good";
    return "Strong";
  };

  return (
    <Card className="w-full shadow-xl border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          {view === "login" ? "Welcome Back" : "Create Account"}
        </CardTitle>
        <CardDescription className="text-gray-600">
          {view === "login"
            ? "Sign in to your account to continue"
            : "Join us today and get started"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{errors.general}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {view === "signup" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="firstName"
                  className="text-gray-700 font-medium"
                >
                  First Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-purple-400" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) =>
                      handleInputChange("firstName", e.target.value)
                    }
                    onBlur={() => handleBlur("firstName")}
                    className={`pl-10 ${
                      errors.firstName && touched.firstName
                        ? "border-red-300 focus:border-red-400 focus:ring-red-400"
                        : "border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                    }`}
                    required
                  />
                  {!errors.firstName &&
                    touched.firstName &&
                    formData.firstName && (
                      <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                    )}
                </div>
                {errors.firstName && touched.firstName && (
                  <p className="text-sm text-red-600 flex items-center space-x-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{errors.firstName}</span>
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-gray-700 font-medium">
                  Last Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-purple-400" />
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) =>
                      handleInputChange("lastName", e.target.value)
                    }
                    onBlur={() => handleBlur("lastName")}
                    className={`pl-10 ${
                      errors.lastName && touched.lastName
                        ? "border-red-300 focus:border-red-400 focus:ring-red-400"
                        : "border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                    }`}
                    required
                  />
                  {!errors.lastName &&
                    touched.lastName &&
                    formData.lastName && (
                      <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                    )}
                </div>
                {errors.lastName && touched.lastName && (
                  <p className="text-sm text-red-600 flex items-center space-x-1">
                    <AlertCircle className="h-3 w-3" />
                    <span>{errors.lastName}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-700 font-medium">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-purple-400" />
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                className={`pl-10 ${
                  errors.email && touched.email
                    ? "border-red-300 focus:border-red-400 focus:ring-red-400"
                    : "border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                }`}
                required
              />
              {!errors.email && touched.email && formData.email && (
                <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-green-500" />
              )}
            </div>
            {errors.email && touched.email && (
              <p className="text-sm text-red-600 flex items-center space-x-1">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.email}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-700 font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-purple-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                onBlur={() => handleBlur("password")}
                className={`pl-10 pr-10 ${
                  errors.password && touched.password
                    ? "border-red-300 focus:border-red-400 focus:ring-red-400"
                    : "border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-purple-400 hover:text-purple-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Password strength indicator for signup */}
            {view === "signup" && formData.password && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">
                    Password strength:
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      passwordStrength.score <= 2
                        ? "text-red-600"
                        : passwordStrength.score <= 3
                          ? "text-yellow-600"
                          : passwordStrength.score <= 4
                            ? "text-blue-600"
                            : "text-green-600"
                    }`}
                  >
                    {getPasswordStrengthText(passwordStrength.score)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength.score)}`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  ></div>
                </div>
                {passwordStrength.feedback.length > 0 && (
                  <div className="text-xs text-gray-600">
                    <p>Missing: {passwordStrength.feedback.join(", ")}</p>
                  </div>
                )}
              </div>
            )}

            {errors.password && touched.password && (
              <p className="text-sm text-red-600 flex items-center space-x-1">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.password}</span>
              </p>
            )}
          </div>

          {view === "signup" && (
            <div className="space-y-2">
              <Label
                htmlFor="confirmPassword"
                className="text-gray-700 font-medium"
              >
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-purple-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  onBlur={() => handleBlur("confirmPassword")}
                  className={`pl-10 pr-10 ${
                    errors.confirmPassword && touched.confirmPassword
                      ? "border-red-300 focus:border-red-400 focus:ring-red-400"
                      : "border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-purple-400 hover:text-purple-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && touched.confirmPassword && (
                <p className="text-sm text-red-600 flex items-center space-x-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors.confirmPassword}</span>
                </p>
              )}
            </div>
          )}

          {view === "login" && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onViewChange("forgot-password")}
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                Forgot your password?
              </button>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-2.5 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {view === "login" ? "Signing In..." : "Creating Account..."}
              </div>
            ) : view === "login" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-600">
          {view === "login"
            ? "Don't have an account? "
            : "Already have an account? "}
          <button
            onClick={() => onViewChange(view === "login" ? "signup" : "login")}
            className="text-purple-600 hover:text-purple-800 font-semibold"
          >
            {view === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </CardFooter>
    </Card>
  );
}
