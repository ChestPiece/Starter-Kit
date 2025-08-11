"use client"

import type React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle } from "lucide-react"

interface FormFieldProps {
  id: string
  label: string
  type?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
  touched?: boolean
  required?: boolean
  icon?: React.ReactNode
  className?: string
  showSuccess?: boolean
}

export function FormField({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  touched,
  required,
  icon,
  className = "",
  showSuccess = true,
}: FormFieldProps) {
  const hasError = error && touched
  const isValid = !error && touched && value && showSuccess

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-gray-700 font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-3 h-4 w-4 text-purple-400">{icon}</div>}
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={`${icon ? "pl-10" : ""} ${
            hasError
              ? "border-red-300 focus:border-red-400 focus:ring-red-400"
              : "border-purple-200 focus:border-purple-400 focus:ring-purple-400"
          } ${className}`}
          required={required}
        />
        {isValid && <CheckCircle className="absolute right-3 top-3 h-4 w-4 text-green-500" />}
      </div>
      {hasError && (
        <p className="text-sm text-red-600 flex items-center space-x-1">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
