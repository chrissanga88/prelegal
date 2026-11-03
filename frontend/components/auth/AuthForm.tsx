"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { alertClass, buttonClass, inputClass } from "@/components/ui/styles";
import { signIn, signUp, useSession } from "@/lib/session";

export const MIN_PASSWORD_LENGTH = 8;

const COPY = {
  signin: {
    submit: "Sign in",
    pending: "Signing in…",
    passwordAutocomplete: "current-password",
    switchPrompt: "New to Prelegal?",
    switchLabel: "Create an account",
    switchHref: "/signup/",
  },
  signup: {
    submit: "Create account",
    pending: "Creating account…",
    passwordAutocomplete: "new-password",
    switchPrompt: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/",
  },
} as const;

/** Sign-in or sign-up form. Signed-in users (including after submitting) go to their documents. */
export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const copy = COPY[mode];
  const router = useRouter();
  const authenticated = useSession().status === "authenticated";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (authenticated) router.replace("/documents/");
  }, [authenticated, router]);

  function validate(): string | null {
    if (!email.trim() || !password) return "Enter your email and password.";
    if (mode === "signup" && password.length < MIN_PASSWORD_LENGTH) {
      return `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`;
    }
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = validate();
    setError(problem);
    if (problem) return;

    setPending(true);
    try {
      await (mode === "signup" ? signUp : signIn)(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPending(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-navy">Email</span>
        <input
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-navy">Password</span>
        <input
          type="password"
          autoComplete={copy.passwordAutocomplete}
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === "signup" && (
          <span className="block text-xs text-navy/60">At least {MIN_PASSWORD_LENGTH} characters.</span>
        )}
      </label>
      {error && (
        <p role="alert" className={alertClass}>
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${buttonClass.submit} w-full`}>
        {pending ? copy.pending : copy.submit}
      </button>
      <p className="text-center text-sm text-navy/70">
        {copy.switchPrompt}{" "}
        <Link href={copy.switchHref} className="font-semibold text-primary hover:text-primary-hover">
          {copy.switchLabel}
        </Link>
      </p>
    </form>
  );
}
