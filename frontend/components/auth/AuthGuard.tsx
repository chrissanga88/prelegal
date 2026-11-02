"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession } from "@/lib/session";

/** Renders children only for a signed-in user; otherwise sends them to the login page. */
export function AuthGuard({ children }: { children: ReactNode }) {
  const state = useSession();
  const router = useRouter();
  const anonymous = state.status === "anonymous";

  useEffect(() => {
    if (anonymous) router.replace("/");
  }, [anonymous, router]);

  if (state.status !== "authenticated") {
    return (
      <p role="status" className="p-6 text-sm text-muted">
        Loading…
      </p>
    );
  }
  return children;
}
