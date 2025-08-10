import { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create a new account",
};

export default function SignupPage() {
  return (
    <div>
      <div className="text-center">
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Already have an account?{" "}
          <a
            href="/auth/login"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Sign in here
          </a>
        </p>
      </div>
      <SignupForm />
    </div>
  );
}
