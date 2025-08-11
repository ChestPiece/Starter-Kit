import { Metadata } from "next";
import { EmailConfirmationHandler } from "@/components/auth/email-confirmation-handler";

export const metadata: Metadata = {
  title: "Confirm Email",
  description: "Confirm your email address",
};

export default function ConfirmPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <EmailConfirmationHandler />
      </div>
    </div>
  );
}
