import type { Metadata } from "next";
import { DocumentsDashboard } from "@/components/documents/DocumentsDashboard";

export const metadata: Metadata = { title: "My documents" };

export default function DocumentsPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-navy">My documents</h1>
        <p className="mt-1 text-sm text-navy/70">
          Agreements you’ve drafted. Open one to keep editing or download it again.
        </p>
      </div>
      <DocumentsDashboard />
    </>
  );
}
