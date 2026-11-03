"use client";

import { useSearchParams } from "next/navigation";
import { DocumentCreator } from "./DocumentCreator";

/** `?id=12` reopens a saved document; without it, a new one is started. */
export function parseDocumentId(value: string | null): number | null {
  const id = Number(value);
  return value && Number.isInteger(id) && id > 0 ? id : null;
}

/** The creator for the document named in the URL. Needs a Suspense boundary (static export). */
export function CreatorFromUrl() {
  return <DocumentCreator documentId={parseDocumentId(useSearchParams().get("id"))} />;
}
