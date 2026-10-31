"use client";

import { useState } from "react";
import { pdfFileName } from "@/lib/nda/coverPage";
import type { NdaData, Section } from "@/lib/nda/types";

export function DownloadPdfButton({ data, sections }: { data: NdaData; sections: Section[] }) {
  const [status, setStatus] = useState<"idle" | "generating" | "error">("idle");

  async function handleDownload() {
    setStatus("generating");
    try {
      // Load the PDF renderer on demand; it's large and only needed here.
      const [{ pdf }, { NdaPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./NdaPdfDocument"),
      ]);
      const blob = await pdf(<NdaPdfDocument data={data} sections={sections} />).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = pdfFileName(data);
      link.click();
      // Revoke after the click has been handled so the download isn't cancelled.
      setTimeout(() => URL.revokeObjectURL(url), 0);
      setStatus("idle");
    } catch (error) {
      console.error("Failed to generate PDF", error);
      setStatus("error");
    }
  }

  return (
    <div className="flex items-center gap-3">
      {status === "error" && (
        <span className="text-sm text-red-600">Couldn’t generate the PDF. Please try again.</span>
      )}
      <button
        type="button"
        onClick={handleDownload}
        disabled={status === "generating"}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-wait disabled:opacity-60"
      >
        {status === "generating" ? "Generating…" : "Download PDF"}
      </button>
    </div>
  );
}
