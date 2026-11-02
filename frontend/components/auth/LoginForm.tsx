"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { signIn, useSession } from "@/lib/session";
import { inputClass } from "@/components/ui/styles";


/** Fake login for V1: any non-empty email and password brings the user into the platform. */
export function LoginForm() {
  const router = useRouter();
  const authenticated = useSession().status === "authenticated";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Covers both a fresh sign-in and a user who is already signed in.
  useEffect(() => {
    if (authenticated) router.replace("/nda/");
  }, [authenticated, router]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signIn(email, password)) setError("Enter your email and password.");
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-navy">Email</span>
        <input
          type="email"
          autoComplete="email"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium text-navy">Password</span>
        <input
          type="password"
          autoComplete="current-password"
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="w-full rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-secondary-hover"
      >
        Sign in
      </button>
      <p className="text-center text-xs text-muted">Demo sign-in: any email and password works.</p>
    </form>
  );
}
