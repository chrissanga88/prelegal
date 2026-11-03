import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { buttonClass, cardClass } from "@/components/ui/styles";

export const metadata: Metadata = { title: "Page not found" };

/** Exported as 404.html, which the backend serves for unknown paths. */
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <Link href="/" aria-label="Prelegal home" className="mb-10">
        <Logo />
      </Link>
      <div className={`${cardClass} w-full max-w-md px-8 py-12 text-center`}>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">404</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy">Page not found</h1>
        <p className="mt-2 text-sm text-navy/70">
          The page you’re looking for doesn’t exist or has moved.
        </p>
        <Link href="/documents/" className={`${buttonClass.primary} mt-8`}>
          Go to my documents
        </Link>
      </div>
    </main>
  );
}
