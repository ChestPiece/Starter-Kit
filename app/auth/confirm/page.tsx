import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Confirm Email",
  description: "Confirm your email address",
};

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const typeParam = Array.isArray(params.type) ? params.type[0] : params.type;

  // If this is a password recovery link, send the user to reset-password
  if (typeParam === "recovery") {
    const qs = new URLSearchParams();
    const codeParam = Array.isArray(params.code)
      ? params.code[0]
      : (params.code as string | undefined);
    if (codeParam) qs.set("code", codeParam);
    qs.set("type", "recovery");
    redirect(`/auth/reset-password${qs.toString() ? `?${qs.toString()}` : ""}`);
  }

  // For regular email confirmation, just send user to login with a success message
  redirect("/auth/login?message=email_confirmed");
}
