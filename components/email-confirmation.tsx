"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Mail, CheckCircle, RefreshCw } from "lucide-react"

interface EmailConfirmationProps {
  email: string
  onBack: () => void
}

export function EmailConfirmation({ email, onBack }: EmailConfirmationProps) {
  const [isResending, setIsResending] = useState(false)
  const [resent, setResent] = useState(false)

  const handleResend = async () => {
    setIsResending(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    setIsResending(false)
    setResent(true)

    // Reset the resent state after 3 seconds
    setTimeout(() => setResent(false), 3000)
  }

  return (
    <Card className="w-full shadow-xl border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
          <Mail className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Check Your Email
        </CardTitle>
        <CardDescription className="text-gray-600">We've sent a confirmation link to</CardDescription>
        <p className="text-purple-600 font-semibold">{email}</p>
      </CardHeader>

      <CardContent className="space-y-4 text-center">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <CheckCircle className="h-6 w-6 text-purple-600 mx-auto mb-2" />
          <p className="text-sm text-gray-700">
            Click the link in the email to complete your registration. The link will expire in 24 hours.
          </p>
        </div>

        <div className="text-sm text-gray-600 space-y-2">
          <p>Didn't receive the email? Check your spam folder or</p>
          <Button
            variant="outline"
            onClick={handleResend}
            disabled={isResending || resent}
            className="border-purple-200 hover:bg-purple-50 text-purple-600 bg-transparent"
          >
            {isResending ? (
              <div className="flex items-center">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Resending...
              </div>
            ) : resent ? (
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4" />
                Email Sent!
              </div>
            ) : (
              <div className="flex items-center">
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend Email
              </div>
            )}
          </Button>
        </div>
      </CardContent>

      <CardFooter className="flex justify-center">
        <button
          onClick={onBack}
          className="flex items-center text-sm text-purple-600 hover:text-purple-800 font-medium"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Sign In
        </button>
      </CardFooter>
    </Card>
  )
}
