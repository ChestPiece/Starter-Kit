"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { EmailConfirmation } from "@/components/auth/email-waiting-screen";

export default function SignupPage() {
  const [currentView, setCurrentView] = useState<"signup" | "email-sent">(
    "signup"
  );
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();

  // Set page title dynamically
  useEffect(() => {
    document.title = "Sign Up - Your App";
  }, []);

  const handleSignupSuccess = (email: string) => {
    setUserEmail(email);
    setCurrentView("email-sent");
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="w-full max-w-7xl space-y-3">
        {currentView === "signup" ? (
          <SignupForm onSignupSuccess={handleSignupSuccess} />
        ) : (
          <EmailConfirmation
            email={userEmail}
            onBack={() => router.push("/auth/login")}
          />
        )}
      </div>
    </div>
  );
}
