"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { passwordResetService } from "@/lib/services/password-reset-service";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState("");

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenValid(false);
        setError("No reset token provided. Please check your email link.");
        return;
      }

      try {
        const verification = await passwordResetService.verifyResetToken(token);
        setTokenValid(verification.valid);

        if (verification.valid && verification.email) {
          setUserEmail(verification.email);
        } else {
          setError(
            "Invalid or expired reset token. Please request a new password reset."
          );
        }
      } catch (err) {
        setTokenValid(false);
        setError("Failed to verify reset token. Please try again.");
      }
    };

    verifyToken();
  }, [token]);

  const validatePassword = (pwd: string): string | undefined => {
    if (!pwd) return "Password is required";
    if (pwd.length < 8) return "Password must be at least 8 characters long";
    if (!/(?=.*[a-z])/.test(pwd))
      return "Password must contain at least one lowercase letter";
    if (!/(?=.*[A-Z])/.test(pwd))
      return "Password must contain at least one uppercase letter";
    if (!/(?=.*\d)/.test(pwd))
      return "Password must contain at least one number";
    return undefined;
  };

  const validateConfirmPassword = (
    pwd: string,
    confirmPwd: string
  ): string | undefined => {
    if (!confirmPwd) return "Please confirm your password";
    if (pwd !== confirmPwd) return "Passwords do not match";
    return undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(
      password,
      confirmPassword
    );

    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (confirmPasswordError) {
      setError(confirmPasswordError);
      return;
    }

    if (!token) {
      setError(
        "No reset token available. Please request a new password reset."
      );
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await passwordResetService.resetPassword(token, password);

      if (result.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/auth/login?message=password_reset_success");
        }, 3000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (error) setError("");
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (error) setError("");
  };

  // Show loading state while verifying token
  if (tokenValid === null) {
    return (
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-sm text-gray-600">
              Verifying reset token...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error if token is invalid
  if (tokenValid === false) {
    return (
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-red-600">
            Invalid Reset Link
          </CardTitle>
          <CardDescription className="text-gray-600">
            The password reset link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col space-y-3">
            <Link href="/auth/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                Request New Reset Link
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show success message
  if (success) {
    return (
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold text-green-600">
            Password Reset Successful
          </CardTitle>
          <CardDescription className="text-gray-600">
            Your password has been successfully updated. You will be redirected
            to the login page shortly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/auth/login">
            <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              Continue to Login
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Main password reset form
  return (
    <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Set New Password
        </CardTitle>
        <CardDescription className="text-gray-600">
          Enter your new password for {userEmail}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your new password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className="pr-10"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Password must be at least 8 characters with uppercase, lowercase,
              and a number
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                className="pr-10"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            disabled={isLoading || !password || !confirmPassword}
          >
            {isLoading ? "Updating Password..." : "Update Password"}
          </Button>

          <div className="text-center">
            <Link href="/auth/login">
              <Button
                variant="ghost"
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Login
              </Button>
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
