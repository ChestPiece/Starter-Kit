export interface ValidationResult {
  isValid: boolean
  error?: string
}

export const validateEmail = (email: string): ValidationResult => {
  if (!email.trim()) {
    return { isValid: false, error: "Email is required" }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Please enter a valid email address" }
  }

  return { isValid: true }
}

export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: "Password is required" }
  }

  if (password.length < 8) {
    return { isValid: false, error: "Password must be at least 8 characters long" }
  }

  return { isValid: true }
}

export const validateName = (name: string, fieldName: string): ValidationResult => {
  if (!name.trim()) {
    return { isValid: false, error: `${fieldName} is required` }
  }

  if (name.trim().length < 2) {
    return { isValid: false, error: `${fieldName} must be at least 2 characters long` }
  }

  if (!/^[a-zA-Z\s'-]+$/.test(name.trim())) {
    return { isValid: false, error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` }
  }

  return { isValid: true }
}

export const validateRequired = (value: string, fieldName: string): ValidationResult => {
  if (!value.trim()) {
    return { isValid: false, error: `${fieldName} is required` }
  }

  return { isValid: true }
}

export interface PasswordStrength {
  score: number
  feedback: string[]
  level: "very-weak" | "weak" | "fair" | "good" | "strong"
}

export const calculatePasswordStrength = (password: string): PasswordStrength => {
  let score = 0
  const feedback: string[] = []

  // Length check
  if (password.length >= 8) score += 1
  else feedback.push("At least 8 characters")

  // Lowercase check
  if (/[a-z]/.test(password)) score += 1
  else feedback.push("One lowercase letter")

  // Uppercase check
  if (/[A-Z]/.test(password)) score += 1
  else feedback.push("One uppercase letter")

  // Number check
  if (/\d/.test(password)) score += 1
  else feedback.push("One number")

  // Special character check
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1
  else feedback.push("One special character")

  let level: PasswordStrength["level"]
  if (score <= 1) level = "very-weak"
  else if (score <= 2) level = "weak"
  else if (score <= 3) level = "fair"
  else if (score <= 4) level = "good"
  else level = "strong"

  return { score, feedback, level }
}

export const getPasswordStrengthColor = (level: PasswordStrength["level"]): string => {
  switch (level) {
    case "very-weak":
      return "bg-red-500"
    case "weak":
      return "bg-orange-500"
    case "fair":
      return "bg-yellow-500"
    case "good":
      return "bg-blue-500"
    case "strong":
      return "bg-green-500"
    default:
      return "bg-gray-300"
  }
}

export const getPasswordStrengthText = (level: PasswordStrength["level"]): string => {
  switch (level) {
    case "very-weak":
      return "Very Weak"
    case "weak":
      return "Weak"
    case "fair":
      return "Fair"
    case "good":
      return "Good"
    case "strong":
      return "Strong"
    default:
      return "Unknown"
  }
}
