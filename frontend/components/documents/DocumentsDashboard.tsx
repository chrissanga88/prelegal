"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClass, cardClass } from "@/components/ui/styles";
import { getDocument } from "@/lib/documents/catalog";
import { deleteDocument, listDocuments, type DocumentSummary } from "@/lib/documents/library";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; documents: DocumentSummary[] };

export function formatUpdated(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? `Today, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
    : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function EmptyState() {
  return (
    <div className={`${cardClass} flex flex-col items-center px-6 py-16 text-center`}>
      <div aria-hidden="true" className="mb-4 grid size-12 place-items-center rounded-full bg-accent/20 text-2xl">
        ✎
      </div>
      <h2 className="text-lg font-semibold text-navy">No documents yet</h2>
      <p className="mt-1 max-w-sm text-sm text-navy/70">
        Tell the AI assistant what you need, and it will draft the agreement with you. Your documents
        are saved here automatically.
      </p>
      <Link href="/draft/" className={`${buttonClass.primary} mt-6`}>
        Draft your first document
      </Link>
    </div>
  );
}

/** Deletes after a second click, so a slip of the mouse can't lose a document. */
function DeleteButton({ title, onDelete }: { title: string; onDelete: () => Promise<void> }) {
  const [step, setStep] = useState<"idle" | "confirm" | "deleting">("idle");

  if (step === "idle") {
    return (
      <button
        type="button"
        onClick={() => setStep("confirm")}
        aria-label={`Delete ${title}`}
        className="text-sm font-medium text-navy/60 hover:text-danger"
      >
        Delete
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={step === "deleting"}
        onClick={async () => {
          setStep("deleting");
          try {
            await onDelete();
          } catch {
            setStep("confirm");
          }
        }}
        className="text-sm font-semibold text-danger hover:underline"
      >
        {step === "deleting" ? "Deleting…" : "Confirm delete"}
      </button>
      <button type="button" onClick={() => setStep("idle")} className="text-sm text-navy/60 hover:text-navy">
        Cancel
      </button>
    </span>
  );
}

/** The signed-in user's saved documents, most recently updated first. */
export function DocumentsDashboard() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    listDocuments().then(
      (documents) => setState({ status: "ready", documents }),
      (error: Error) => setState({ status: "error", message: error.message }),
    );
  }, []);

  async function remove(id: number) {
    setDeleteError(null);
    try {
      await deleteDocument(id);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : String(error));
      throw error;
    }
    setState((current) =>
      current.status === "ready"
        ? { status: "ready", documents: current.documents.filter((doc) => doc.id !== id) }
        : current,
    );
  }

  if (state.status === "loading") {
    return (
      <p role="status" className="text-sm text-muted">
        Loading your documents…
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <p role="alert" className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
        Couldn’t load your documents. {state.message}
      </p>
    );
  }
  if (state.documents.length === 0) return <EmptyState />;

  return (
    <div className="space-y-3">
      {deleteError && (
        <p role="alert" className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
          {deleteError}
        </p>
      )}
      <div className={`${cardClass} overflow-hidden`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-navy/60">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">Document</th>
              <th scope="col" className="hidden px-5 py-3 font-semibold md:table-cell">Type</th>
              <th scope="col" className="px-5 py-3 font-semibold">Last updated</th>
              <th scope="col" className="px-5 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {state.documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-surface/60">
                <td className="px-5 py-4">
                  <Link href={`/draft/?id=${doc.id}`} className="font-semibold text-navy hover:text-primary">
                    {doc.title}
                  </Link>
                </td>
                <td className="hidden px-5 py-4 text-navy/70 md:table-cell">
                  {getDocument(doc.documentType)?.name ?? doc.documentType}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-navy/70">{formatUpdated(doc.updatedAt)}</td>
                <td className="whitespace-nowrap px-5 py-4 text-right">
                  <span className="inline-flex items-center gap-4">
                    <Link href={`/draft/?id=${doc.id}`} className="text-sm font-semibold text-primary hover:text-primary-hover">
                      Open
                    </Link>
                    <DeleteButton title={doc.title} onDelete={() => remove(doc.id)} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
