"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff, Mail, Lock, User, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const passwordRequirements = [
    { regex: /.{8,}/, text: "At least 8 characters" },
    { regex: /[A-Z]/, text: "One uppercase letter" },
    { regex: /[a-z]/, text: "One lowercase letter" },
    { regex: /\d/, text: "One number" },
    { regex: /[^A-Za-z0-9]/, text: "One special character" },
  ]

  const getPasswordStrength = () => {
    const score = passwordRequirements.filter((req) => req.regex.test(formData.password)).length
    return (score / passwordRequirements.length) * 100
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    // Simulate API call
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      // Redirect to email confirmation
      window.location.href = "/email-confirmation"
    } catch (err) {
      setError("Failed to create account. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader className="space-y-2 pb-6">
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Create Account</CardTitle>
          <CardDescription className="text-center text-gray-600 text-base">Enter your information to create a new account</CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-blue-500" />
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="pl-10 h-12 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-blue-500" />
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="pl-10 h-12 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-blue-500" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-10 h-12 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-blue-500" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="pl-10 pr-10 h-12 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-500 hover:text-blue-500 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-500 hover:text-blue-500 transition-colors" />
                  )}
                </Button>
              </div>

              {formData.password && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Progress 
                      value={getPasswordStrength()} 
                      className="flex-1 h-2" 
                      style={{
                        background: 'rgba(0,0,0,0.1)',
                        '--progress-background': getPasswordStrength() < 40 ? 'linear-gradient(to right, #f87171, #ef4444)' : 
                                                getPasswordStrength() < 80 ? 'linear-gradient(to right, #fbbf24, #f59e0b)' : 
                                                'linear-gradient(to right, #34d399, #10b981)'
                      } as any}
                    />
                    <span className={`text-xs font-medium ${getPasswordStrength() < 40 ? 'text-red-500' : getPasswordStrength() < 80 ? 'text-amber-500' : 'text-green-500'}`}>
                      {getPasswordStrength() < 40 ? "Weak" : getPasswordStrength() < 80 ? "Medium" : "Strong"}
                    </span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center space-x-2 text-xs">
                        {req.regex.test(formData.password) ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-red-500" />
                        )}
                        <span
                          className={req.regex.test(formData.password) ? "text-green-600 font-medium" : "text-gray-500"}
                        >
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-blue-500" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="pl-10 pr-10 h-12 rounded-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-all duration-200"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-500 hover:text-blue-500 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-500 hover:text-blue-500 transition-colors" />
                  )}
                </Button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-500 font-medium flex items-center mt-1"><X className="h-3.5 w-3.5 mr-1" /> Passwords do not match</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 mt-2"
              variant="default"
              disabled={isLoading || formData.password !== formData.confirmPassword}
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Already have an account?{" "}
            <Link href="/login" className="text-blue-600 font-medium hover:text-blue-800 transition-colors">
                Sign in here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
