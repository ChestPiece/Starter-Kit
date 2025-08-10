import { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to your account",
};

export default function LoginPage() {
  return (
    <div>
      <div className="text-center">
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Don't have an account?{" "}
          <a
            href="/auth/signup"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Sign up here
          </a>
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
