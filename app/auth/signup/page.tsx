"use client";

import { useEffect } from "react";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  // Set page title dynamically
  useEffect(() => {
    document.title = "Sign Up - Your App";
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <SignupForm />
    </div>
  );
}
