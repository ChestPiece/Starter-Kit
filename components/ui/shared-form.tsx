"use client";

import React from "react";
import { UseFormReturn } from "react-hook-form";
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
import { cn } from "@/lib/utils";

export interface FormFieldConfig {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password';
  placeholder?: string;
  autoComplete?: string;
  showPasswordToggle?: boolean;
}

export interface SubmitButtonConfig {
  text: string;
  loadingText?: string;
  icon?: React.ComponentType<any>;
  className?: string;
}

export interface SharedFormProps {
  title: string;
  description?: string;
  form: UseFormReturn<any>;
  onSubmit: (data: any) => void;
  fields: FormFieldConfig[];
  submitText: string;
  submitButton?: SubmitButtonConfig;
  loading?: boolean;
  isLoading?: boolean;
  error?: string | null;
  success?: boolean;
  successMessage?: string;
  isFormDisabled?: boolean;
  footerContent?: React.ReactNode;
  className?: string;
  showPasswordStates?: Record<string, boolean>;
  onPasswordToggle?: (fieldName: string) => void;
}

/**
 * Shared form component that consolidates common patterns across authentication and user management forms
 * Reduces code duplication and ensures consistent UI/UX
 */
export function SharedForm({
  title,
  description,
  form,
  onSubmit,
  fields,
  submitText,
  submitButton,
  loading = false,
  isLoading = false,
  error,
  success = false,
  successMessage,
  isFormDisabled = false,
  footerContent,
  className,
  showPasswordStates = {},
  onPasswordToggle,
}: SharedFormProps) {
  const isSubmitLoading = loading || isLoading;
  const renderField = (field: FormFieldConfig) => {
    const isPassword = field.type === 'password';
    const showPassword = showPasswordStates[field.name] || false;
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : field.type || 'text';

    return (
      <FormField
        key={field.name}
        control={form.control}
        name={field.name}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel>{field.label}</FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  {...formField}
                  type={inputType}
                  placeholder={field.placeholder}
                  autoComplete={field.autoComplete}
                  disabled={loading}
                  className={isPassword && field.showPasswordToggle ? "pr-10" : ""}
                />
                {isPassword && field.showPasswordToggle && onPasswordToggle && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => onPasswordToggle(field.name)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {showPassword ? "Hide password" : "Show password"}
                    </span>
                  </Button>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">{title}</CardTitle>
        {description && (
          <CardDescription className="text-center">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && successMessage && (
          <Alert className="mb-4 border-green-200 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {fields.map(renderField)}

            <Button
              type="submit"
              className={cn("w-full", submitButton?.className)}
              disabled={isFormDisabled || isSubmitLoading}
            >
              {isSubmitLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {submitButton?.loadingText || "Loading..."}
                </>
              ) : (
                <>
                  {submitButton?.icon && <submitButton.icon className="mr-2 h-4 w-4" />}
                  {submitButton?.text || submitText}
                </>
              )}
            </Button>

            {footerContent}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/**
 * Pre-configured field configurations for common form types
 */
export const commonFieldConfigs = {
  email: {
    name: 'email',
    label: 'Email',
    type: 'email' as const,
    placeholder: 'Enter your email',
    autoComplete: 'email',
  },
  password: {
    name: 'password',
    label: 'Password',
    type: 'password' as const,
    placeholder: 'Enter your password',
    autoComplete: 'current-password',
    showPasswordToggle: true,
  },
  newPassword: {
    name: 'password',
    label: 'Password',
    type: 'password' as const,
    placeholder: 'Create a password',
    autoComplete: 'new-password',
    showPasswordToggle: true,
  },
  confirmPassword: {
    name: 'confirmPassword',
    label: 'Confirm Password',
    type: 'password' as const,
    placeholder: 'Confirm your password',
    autoComplete: 'new-password',
    showPasswordToggle: true,
  },
  firstName: {
    name: 'firstName',
    label: 'First Name',
    type: 'text' as const,
    placeholder: 'Enter your first name',
    autoComplete: 'given-name',
  },
  lastName: {
    name: 'lastName',
    label: 'Last Name',
    type: 'text' as const,
    placeholder: 'Enter your last name',
    autoComplete: 'family-name',
  },
};