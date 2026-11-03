import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";
import { DOCUMENTS } from "@/lib/documents/catalog";

const HIGHLIGHTS = [
  "Describe what you need in plain English",
  "The AI fills in every field and asks about the rest",
  "Live preview and a PDF ready for review",
];

/** Split-screen layout for the sign-in and sign-up pages. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="grid flex-1 lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-navy p-12 text-white lg:flex">
        <div aria-hidden="true" className="absolute -right-24 -top-24 size-96 rounded-full bg-primary/20 blur-3xl" />
        <Logo inverted />
        <div className="relative space-y-8">
          <h2 className="max-w-md text-4xl font-bold leading-tight tracking-tight">
            Draft legal agreements in minutes, not days.
          </h2>
          <ul className="space-y-3 text-white/80">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/60">
          {DOCUMENTS.length} Common Paper standard agreements, from NDAs to data processing agreements.
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">{title}</h1>
          <p className="mt-1 mb-8 text-sm text-navy/70">{subtitle}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
