import type { Metadata } from "next";
import { DocumentCreator } from "@/components/documents/DocumentCreator";

export const metadata: Metadata = { title: "Draft an Agreement" };

export default function DraftPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-navy">Draft an Agreement</h1>
        <p className="mt-1 text-sm text-navy/70">
          Chat with the AI assistant to choose a Common Paper agreement and fill it in, then
          download the completed document.
        </p>
      </div>
      <DocumentCreator />
    </>
  );
}
