import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Confirm Email",
  description: "Confirm your email address",
};

type SearchParams = { [key: string]: string | string[] | undefined };

export default function ConfirmPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const typeParam = Array.isArray(searchParams.type)
    ? searchParams.type[0]
    : searchParams.type;

  // If this is a password recovery link, send the user to reset-password
  if (typeParam === "recovery") {
    const qs = new URLSearchParams();
    const codeParam = Array.isArray(searchParams.code)
      ? searchParams.code[0]
      : (searchParams.code as string | undefined);
    if (codeParam) qs.set("code", codeParam);
    qs.set("type", "recovery");
    redirect(`/auth/reset-password${qs.toString() ? `?${qs.toString()}` : ""}`);
  }

  // For regular email confirmation, just send user to login with a success message
  redirect("/auth/login?message=email_confirmed");
}
