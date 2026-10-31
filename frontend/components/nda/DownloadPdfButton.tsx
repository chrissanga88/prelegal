"use client";

import { useState } from "react";
import { pdfFileName } from "@/lib/nda/coverPage";
import type { NdaData, Section } from "@/lib/nda/types";

const BLOB_URL_LIFETIME_MS = 60_000;

export function DownloadPdfButton({ data, sections }: { data: NdaData; sections: Section[] }) {
  const [status, setStatus] = useState<"idle" | "generating" | "error">("idle");

  async function handleDownload() {
    setStatus("generating");
    try {
      // Load the PDF renderer on demand; it's large and only needed here.
      const [{ pdf }, { NdaPdfDocument, registerPdfFonts }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./NdaPdfDocument"),
      ]);
      registerPdfFonts("/fonts");
      const blob = await pdf(<NdaPdfDocument data={data} sections={sections} />).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = pdfFileName(data);
      // Some browsers (e.g. Firefox) only download from links in the document.
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Safari and Firefox may read the blob after click() returns, so revoking
      // immediately can cancel the download. Wait well past that before freeing it.
      setTimeout(() => URL.revokeObjectURL(url), BLOB_URL_LIFETIME_MS);
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
