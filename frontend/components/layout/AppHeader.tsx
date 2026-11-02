"use client";

import Link from "next/link";
import { signOut, useSession } from "@/lib/session";

export function AppHeader() {
  const state = useSession();

  return (
    <header className="border-b-2 border-accent bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/nda/" className="text-lg font-bold tracking-tight text-navy">
          Prelegal
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {state.status === "authenticated" && (
            <span className="text-muted">{state.session.email}</span>
          )}
          <button
            type="button"
            onClick={signOut}
            className="font-medium text-primary hover:text-primary-hover"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
