"use client"

import { useState } from "react"
import Link from "next/link"
import { Mail, CheckCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function EmailConfirmationPage() {
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [email] = useState("user@example.com") // This would come from your auth state

  const handleResendEmail = async () => {
    setIsResending(true)
    setResendSuccess(false)

    // Simulate API call
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setResendSuccess(true)
    } catch (error) {
      console.error("Failed to resend email")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
          <CardDescription>
            We've sent a verification link to <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {resendSuccess && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Verification email sent successfully! Please check your inbox.</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Click the verification link in the email to activate your account.
              </p>
              <p className="text-xs text-muted-foreground">{"Can't find the email? Check your spam folder."}</p>
            </div>

            <Button
              onClick={handleResendEmail}
              disabled={isResending}
              variant="outline"
              className="w-full bg-transparent"
            >
              {isResending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend Verification Email"
              )}
            </Button>

            <div className="text-center">
              <Link href="/login" className="text-sm text-primary hover:underline">
                Back to Login
              </Link>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">Need help?</p>
              <div className="flex justify-center space-x-4 text-xs">
                <Link href="/support" className="text-primary hover:underline">
                  Contact Support
                </Link>
                <span className="text-muted-foreground">•</span>
                <Link href="/faq" className="text-primary hover:underline">
                  FAQ
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
