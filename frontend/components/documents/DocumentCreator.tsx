"use client";

import { useState } from "react";
import { DOCUMENTS, getDocument } from "@/lib/documents/catalog";
import { createEmptyDraft } from "@/lib/documents/draft";
import { DocumentChat } from "./DocumentChat";
import { DocumentPreview } from "./DocumentPreview";
import { DownloadPdfButton } from "./DownloadPdfButton";

/** Shown in place of the preview until the AI has picked a document. */
function NoDocumentYet() {
  return (
    <div className="space-y-3 text-sm text-navy">
      <p className="font-semibold">Your document will appear here.</p>
      <p>Tell the assistant what you need. It can draft:</p>
      <ul className="list-disc space-y-1 pl-5">
        {DOCUMENTS.map((spec) => (
          <li key={spec.id}>{spec.name}</li>
        ))}
      </ul>
    </div>
  );
}

export function DocumentCreator() {
  const [draft, setDraft] = useState(createEmptyDraft);
  const spec = getDocument(draft.documentType);

  return (
    <div className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <section aria-label="Chat with the AI assistant">
        <DocumentChat draft={draft} onChange={setDraft} />
      </section>

      <section aria-label="Document preview" className="lg:sticky lg:top-6 lg:self-start">
        <div className="mb-3 flex min-h-10 items-center justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {spec ? `Preview: ${spec.name}` : "Preview"}
          </h2>
          {spec && <DownloadPdfButton spec={spec} draft={draft} />}
        </div>
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto rounded-lg border border-line bg-white p-10 shadow-sm">
          {spec ? <DocumentPreview spec={spec} draft={draft} /> : <NoDocumentYet />}
        </div>
      </section>
    </div>
  );
}
