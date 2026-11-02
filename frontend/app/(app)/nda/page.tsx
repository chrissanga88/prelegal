import type { Metadata } from "next";
import { ClientNdaCreator } from "@/components/nda/ClientNdaCreator";
import { loadStandardTerms } from "@/lib/nda/loadStandardTerms";

export const metadata: Metadata = { title: "Mutual NDA Creator" };

const sections = loadStandardTerms();

export default function NdaPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-navy">Mutual NDA Creator</h1>
        <p className="mt-1 text-sm text-navy/70">
          Fill in the key details and download a completed Common Paper Mutual Non-Disclosure
          Agreement.
        </p>
      </div>
      <ClientNdaCreator sections={sections} />
    </>
  );
}
