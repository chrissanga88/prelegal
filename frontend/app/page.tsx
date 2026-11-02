import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

// The layout's title template only applies to child segments, so spell out the full title here.
export const metadata: Metadata = { title: { absolute: "Sign in | Prelegal" } };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Prelegal</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy">Sign in</h1>
          <p className="mt-1 text-sm text-navy/70">Draft common legal agreements in minutes.</p>
        </div>
        <div className="rounded-lg border border-t-4 border-line border-t-accent bg-white p-8 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
