import { Metadata } from "next";
import { EmailConfirmationHandler } from "@/components/auth/email-confirmation-handler";

export const metadata: Metadata = {
  title: "Confirm Email",
  description: "Confirm your email address",
};

export default function ConfirmPage() {
  return (
    <div className="space-y-8">
      <EmailConfirmationHandler />
    </div>
  );
}
