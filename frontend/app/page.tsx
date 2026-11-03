import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";

// The layout's title template only applies to child segments, so spell out the full title here.
export const metadata: Metadata = { title: { absolute: "Sign in | Prelegal" } };

export default function SignInPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue drafting your agreements.">
      <AuthForm mode="signin" />
    </AuthShell>
  );
}
