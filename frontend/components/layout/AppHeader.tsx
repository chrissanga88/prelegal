"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { buttonClass } from "@/components/ui/styles";
import { signOut, useSession } from "@/lib/session";

const NAV = [{ href: "/documents/", label: "My documents" }];

export function AppHeader() {
  const state = useSession();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-6">
        <Link href="/documents/" aria-label="Prelegal home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          {NAV.map(({ href, label }) => {
            const active = pathname?.startsWith(href.replace(/\/$/, ""));
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  active ? "bg-surface text-navy" : "text-navy/70 hover:bg-surface hover:text-navy"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/draft/" className={buttonClass.primary}>
            New document
          </Link>
          {state.status === "authenticated" && (
            <span className="hidden text-sm text-navy/70 sm:inline">{state.session.email}</span>
          )}
          <button
            type="button"
            onClick={() => void signOut()}
            className="text-sm font-medium text-primary hover:text-primary-hover"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
