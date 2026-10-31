"use client";

import { useState } from "react";
import { createDefaultNda, todayIso } from "@/lib/nda/coverPage";
import type { Section } from "@/lib/nda/types";
import { DownloadPdfButton } from "./DownloadPdfButton";
import { NdaForm } from "./NdaForm";
import { NdaPreview } from "./NdaPreview";

export function NdaCreator({ sections }: { sections: Section[] }) {
  const [data, setData] = useState(() => createDefaultNda(todayIso()));

  return (
    <div className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <section aria-label="Agreement details">
        <NdaForm data={data} onChange={setData} />
      </section>

      <section aria-label="Document preview" className="lg:sticky lg:top-6 lg:self-start">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Preview
          </h2>
          <DownloadPdfButton data={data} sections={sections} />
        </div>
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto rounded-lg border border-zinc-200 bg-white p-10 shadow-sm">
          <NdaPreview data={data} sections={sections} />
        </div>
      </section>
    </div>
  );
}
