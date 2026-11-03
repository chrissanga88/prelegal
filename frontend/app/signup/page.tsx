import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata: Metadata = { title: "Create an account" };

export default function SignUpPage() {
  return (
    <AuthShell title="Create your account" subtitle="Start drafting agreements with AI in minutes.">
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
