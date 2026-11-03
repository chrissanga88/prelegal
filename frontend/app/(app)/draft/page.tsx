import type { Metadata } from "next";
import { Suspense } from "react";
import { CreatorFromUrl } from "@/components/documents/CreatorFromUrl";

export const metadata: Metadata = { title: "Draft an agreement" };

export default function DraftPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-navy">Draft an agreement</h1>
        <p className="mt-1 text-sm text-navy/70">
          Chat with the AI assistant to choose a Common Paper agreement and fill it in. Your
          document saves automatically.
        </p>
      </div>
      {/* The search params are only known in the browser of a static export. */}
      <Suspense>
        <CreatorFromUrl />
      </Suspense>
    </>
  );
}
