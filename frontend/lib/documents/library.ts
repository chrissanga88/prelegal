import { apiRequest } from "@/lib/api";
import type { ChatMessage } from "./chat";
import type { DocumentDraft } from "./types";

/** A saved document as listed on the dashboard; mirrors DocumentSummary in backend/app/library.py. */
export type DocumentSummary = {
  id: number;
  documentType: string;
  title: string;
  /** ISO timestamps (UTC). */
  createdAt: string;
  updatedAt: string;
};

export type SavedDocument = DocumentSummary & { draft: DocumentDraft; messages: ChatMessage[] };

export function listDocuments(): Promise<DocumentSummary[]> {
  return apiRequest("/api/documents");
}

export function getSavedDocument(id: number): Promise<SavedDocument> {
  return apiRequest(`/api/documents/${id}`);
}

/** Creates the document when `id` is null, otherwise updates it. */
export function saveDocument(
  id: number | null,
  draft: DocumentDraft,
  messages: ChatMessage[],
): Promise<SavedDocument> {
  return apiRequest(id === null ? "/api/documents" : `/api/documents/${id}`, {
    method: id === null ? "POST" : "PUT",
    body: { draft, messages },
  });
}

export function deleteDocument(id: number): Promise<void> {
  return apiRequest(`/api/documents/${id}`, { method: "DELETE" });
}
