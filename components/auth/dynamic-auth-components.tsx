"use client";

import { createFormImport, createModalImport } from '@/lib/utils/dynamic-imports';

// Dynamic import for LoginForm component
const LoginForm = createFormImport(
  () => import('../login-form')
);

// Dynamic import for SignupForm component
const SignupForm = createFormImport(
  () => import('./signup-form')
);

// Dynamic import for ForgotPassword component
const ForgotPassword = createFormImport(
  () => import('./forgot-password')
);

// Dynamic import for SessionTimeout component
const SessionTimeout = createModalImport(
  () => import('./session-timeout')
);

// Dynamic import for ConfirmationErrorHelper component
const ConfirmationErrorHelper = createModalImport(
  () => import('./confirmation-error-helper')
);

// Re-export components
export { 
  LoginForm, 
  SignupForm, 
  ForgotPassword, 
  SessionTimeout, 
  ConfirmationErrorHelper 
};