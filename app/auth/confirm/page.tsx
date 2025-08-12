import { Metadata } from "next";
import { EmailConfirmationHandler } from "@/components/auth/confirmation-handler";

export const metadata: Metadata = {
  title: "Confirm Email",
  description: "Confirm your email address",
};

export default function ConfirmPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="w-full max-w-7xl">
        <EmailConfirmationHandler />
      </div>
    </div>
  );
}
