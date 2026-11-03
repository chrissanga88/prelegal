"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buttonClass, cardClass } from "@/components/ui/styles";
import { DOCUMENTS, getDocument } from "@/lib/documents/catalog";
import type { ChatMessage } from "@/lib/documents/chat";
import { DRAFT_NOTICE, DRAFT_NOTICE_TITLE, createEmptyDraft } from "@/lib/documents/draft";
import { getSavedDocument, saveDocument } from "@/lib/documents/library";
import type { DocumentDraft } from "@/lib/documents/types";
import { DocumentChat } from "./DocumentChat";
import { DocumentPreview } from "./DocumentPreview";
import { DownloadPdfButton } from "./DownloadPdfButton";

type SaveStatus = "idle" | "saving" | "saved" | "error";

const SAVE_LABELS: Record<SaveStatus, string> = {
  idle: "",
  saving: "Saving…",
  saved: "All changes saved",
  error: "Couldn’t save. Your next message will try again.",
};

/** Shown in place of the preview until the AI has picked a document. */
function NoDocumentYet() {
  return (
    <div className="space-y-3 text-sm text-navy">
      <p className="font-semibold">Your document will appear here.</p>
      <p>Tell the assistant what you need. It can draft:</p>
      <ul className="grid gap-x-6 gap-y-1 pl-5 sm:grid-cols-2 list-disc">
        {DOCUMENTS.map((spec) => (
          <li key={spec.id}>{spec.name}</li>
        ))}
      </ul>
    </div>
  );
}

function DraftDisclaimer() {
  return (
    <div role="note" className="mb-6 flex gap-3 rounded-xl border border-accent/60 bg-accent/10 px-4 py-3 text-sm text-navy">
      <span aria-hidden="true" className="font-bold text-accent">!</span>
      <p>
        <strong>{DRAFT_NOTICE_TITLE}.</strong> {DRAFT_NOTICE}
      </p>
    </div>
  );
}

type View = {
  /** The `documentId` this view was opened for. */
  openedAs: number | null;
  /** The saved document on screen: null for a new one that hasn't been saved yet. */
  id: number | null;
  /** Increases each time another document is opened; stale saves and loads check it. */
  instance: number;
  status: "loading" | "ready" | "error";
  loadError?: string;
  draft: DocumentDraft;
  messages: ChatMessage[];
  saveStatus: SaveStatus;
};

function openView(id: number | null, instance: number): View {
  return {
    openedAs: id,
    id,
    instance,
    status: id === null ? "ready" : "loading",
    draft: createEmptyDraft(),
    messages: [],
    saveStatus: "idle",
  };
}

/**
 * The chat and live preview. The document is saved after every AI reply once a
 * document type is chosen: created on the first save, updated afterwards. With
 * a `documentId` it first loads that saved document, chat included.
 */
export function DocumentCreator({ documentId }: { documentId: number | null }) {
  const [view, setView] = useState(() => openView(documentId, 0));
  if (documentId !== view.openedAs) {
    // After a new document's first save the URL gains its id: same document.
    // Anything else (another document, or New document) starts over.
    setView(
      documentId !== null && documentId === view.id
        ? { ...view, openedAs: documentId }
        : openView(documentId, view.instance + 1),
    );
  }

  // Mirrors of view.id/instance for the save queue, which runs outside render.
  const current = useRef({ id: view.id, instance: view.instance });
  // Saves run one after another, so a slow first save can't create a duplicate.
  const saveQueue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    current.current = { id: view.id, instance: view.instance };
  }, [view.id, view.instance]);

  useEffect(() => {
    if (view.status !== "loading" || view.id === null) return;
    let cancelled = false;
    getSavedDocument(view.id).then(
      (saved) => {
        if (cancelled) return;
        setView((v) => ({ ...v, status: "ready", draft: saved.draft, messages: saved.messages, saveStatus: "saved" }));
      },
      (error: Error) => {
        if (!cancelled) setView((v) => ({ ...v, status: "error", loadError: error.message }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [view.id, view.status, view.instance]);

  function save(draft: DocumentDraft, messages: ChatMessage[]) {
    const instance = view.instance;
    const setSaveStatus = (saveStatus: SaveStatus) =>
      setView((v) => (v.instance === instance ? { ...v, saveStatus } : v));

    saveQueue.current = saveQueue.current.then(async () => {
      if (current.current.instance !== instance) return; // another document was opened
      setSaveStatus("saving");
      try {
        const saved = await saveDocument(current.current.id, draft, messages);
        if (current.current.instance !== instance) return;
        if (current.current.id === null) {
          current.current = { id: saved.id, instance };
          setView((v) => (v.instance === instance ? { ...v, id: saved.id } : v));
          // Keep the URL pointing at the document, so a reload reopens it.
          window.history.replaceState(null, "", `/draft/?id=${saved.id}`);
        }
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    });
  }

  function handleTurn(messages: ChatMessage[], draft: DocumentDraft) {
    setView((v) => ({ ...v, messages, draft }));
    if (draft.documentType) save(draft, messages);
  }

  const { draft, messages, saveStatus } = view;

  if (view.status === "loading") {
    return (
      <p role="status" className="text-sm text-muted">
        Opening your document…
      </p>
    );
  }
  if (view.status === "error") {
    return (
      <div className={`${cardClass} px-6 py-12 text-center`}>
        <p role="alert" className="font-semibold text-navy">
          Couldn’t open this document. {view.loadError}
        </p>
        <Link href="/documents/" className={`${buttonClass.outline} mt-6`}>
          Back to my documents
        </Link>
      </div>
    );
  }

  const spec = getDocument(draft.documentType);

  return (
    <>
      <DraftDisclaimer />
      <div className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section aria-label="Chat with the AI assistant">
          <DocumentChat messages={messages} draft={draft} onTurn={handleTurn} />
        </section>

        <section aria-label="Document preview" className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-3 flex min-h-10 items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-navy/60">
                {spec ? `Preview: ${spec.name}` : "Preview"}
              </h2>
              <p role="status" className={`text-xs ${saveStatus === "error" ? "text-danger" : "text-navy/60"}`}>
                {SAVE_LABELS[saveStatus]}
              </p>
            </div>
            {spec && <DownloadPdfButton spec={spec} draft={draft} />}
          </div>
          <div className={`${cardClass} max-h-[calc(100vh-22rem)] min-h-[22rem] overflow-y-auto p-10`}>
            {spec ? <DocumentPreview spec={spec} draft={draft} /> : <NoDocumentYet />}
          </div>
        </section>
      </div>
    </>
  );
}
