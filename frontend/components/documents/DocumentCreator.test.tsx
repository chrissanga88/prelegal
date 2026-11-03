// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DOCUMENTS } from "@/lib/documents/catalog";
import { createEmptyDraft } from "@/lib/documents/draft";
import type { SavedDocument } from "@/lib/documents/library";
import type { DocumentDraft } from "@/lib/documents/types";
import { mockApi } from "@/lib/testing/mockApi";
import { DocumentCreator } from "./DocumentCreator";

const preview = () => screen.getByRole("region", { name: "Document preview" });

function csaDraft(fields: Record<string, string> = {}): DocumentDraft {
  const draft = { ...createEmptyDraft(), documentType: "cloud-service-agreement", fields };
  draft.parties[0].company = "Acme Cloud";
  return draft;
}

function saved(id: number, draft: DocumentDraft, messages: SavedDocument["messages"]): SavedDocument {
  const stamp = "2026-11-02T10:00:00.000Z";
  return { id, documentType: draft.documentType!, title: "t", createdAt: stamp, updatedAt: stamp, draft, messages };
}

async function say(text: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Message"), `${text}{Enter}`);
}

beforeEach(() => window.history.replaceState(null, "", "/draft/"));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DocumentCreator", () => {
  it("shows the disclaimer and lists the supported documents until one is chosen", () => {
    mockApi({});
    render(<DocumentCreator documentId={null} />);
    expect(screen.getByRole("note").textContent).toMatch(/subject to legal review/i);
    const region = preview();
    expect(within(region).getByText("Your document will appear here.")).toBeTruthy();
    for (const spec of DOCUMENTS) expect(within(region).getByText(spec.name)).toBeTruthy();
    expect(within(region).queryByRole("button", { name: "Download PDF" })).toBeNull();
  });

  it("doesn't save while no document is chosen", async () => {
    const calls = mockApi({ "POST /api/chat": { body: { reply: "Which document?", draft: createEmptyDraft() } } });
    render(<DocumentCreator documentId={null} />);
    await say("Hello");
    await screen.findByText("Which document?");
    expect(calls.map((call) => call.path)).toEqual(["/api/chat"]);
  });

  it("shows the chosen document, then creates it and updates it on later turns", async () => {
    const first = csaDraft({ governing_law: "Delaware", fees: "$50,000 per year" });
    const second = csaDraft({ governing_law: "Delaware", fees: "$60,000 per year" });
    const calls = mockApi({
      "POST /api/chat": (body) =>
        (body as { messages: unknown[] }).messages.length === 1
          ? { body: { reply: "Let's draft your CSA.", draft: first } }
          : { body: { reply: "Updated the fees.", draft: second } },
      "POST /api/documents": (body) => ({ status: 201, body: saved(7, first, (body as SavedDocument).messages) }),
      "PUT /api/documents/7": (body) => ({ body: saved(7, second, (body as SavedDocument).messages) }),
    });
    render(<DocumentCreator documentId={null} />);

    await say("A cloud service agreement");
    await screen.findByText("Let's draft your CSA.");

    const region = preview();
    expect(within(region).getByText("Preview: Cloud Service Agreement")).toBeTruthy();
    expect(within(region).getByRole("button", { name: "Download PDF" })).toBeTruthy();
    expect(within(region).getByText("$50,000 per year")).toBeTruthy();
    expect(within(region).getByText("Acme Cloud")).toBeTruthy();
    expect(within(region).getByRole("columnheader", { name: "Provider" })).toBeTruthy();
    expect(within(region).getByText("[Chosen Courts]")).toBeTruthy();
    expect(within(region).getByText(/subject to legal review/i)).toBeTruthy();

    await waitFor(() => expect(screen.getByText("All changes saved")).toBeTruthy());
    expect(calls[1]).toEqual({
      method: "POST",
      path: "/api/documents",
      body: {
        draft: first,
        messages: [
          { role: "user", content: "A cloud service agreement" },
          { role: "assistant", content: "Let's draft your CSA." },
        ],
      },
    });
    expect(window.location.search).toBe("?id=7");

    await say("Make it $60k");
    await screen.findByText("Updated the fees.");
    await waitFor(() => expect(calls.at(-1)?.method).toBe("PUT"));
    expect(calls.at(-1)?.path).toBe("/api/documents/7");
    expect((calls.at(-1)?.body as SavedDocument).messages).toHaveLength(4);
    expect(calls.filter((call) => call.method === "POST" && call.path === "/api/documents")).toHaveLength(1);
  });

  it("keeps the conversation when the URL gains the new document's id", async () => {
    const draft = csaDraft();
    const calls = mockApi({
      "POST /api/chat": { body: { reply: "Drafting your CSA.", draft } },
      "POST /api/documents": { status: 201, body: saved(7, draft, []) },
    });
    const { rerender } = render(<DocumentCreator documentId={null} />);
    await say("A CSA");
    await waitFor(() => expect(screen.getByText("All changes saved")).toBeTruthy());

    rerender(<DocumentCreator documentId={7} />); // what the router does after replaceState

    expect(screen.getByText("Drafting your CSA.")).toBeTruthy();
    expect(calls.some((call) => call.path === "/api/documents/7")).toBe(false);
  });

  it("says when saving fails", async () => {
    mockApi({
      "POST /api/chat": { body: { reply: "Here it is.", draft: csaDraft() } },
      "POST /api/documents": { status: 500 },
    });
    render(<DocumentCreator documentId={null} />);
    await say("A CSA");
    expect(await screen.findByText(/Couldn’t save/)).toBeTruthy();
  });

  it("reopens a saved document with its conversation", async () => {
    const draft = csaDraft({ governing_law: "Delaware" });
    mockApi({
      "GET /api/documents/3": {
        body: saved(3, draft, [
          { role: "user", content: "A CSA for Acme" },
          { role: "assistant", content: "Sure, who is the customer?" },
        ]),
      },
    });
    render(<DocumentCreator documentId={3} />);

    expect(screen.getByRole("status").textContent).toMatch(/Opening your document/);
    expect(await screen.findByText("Sure, who is the customer?")).toBeTruthy();
    expect(screen.getByText("A CSA for Acme")).toBeTruthy();
    expect(within(preview()).getByText("Delaware")).toBeTruthy();
    expect(screen.getByText("All changes saved")).toBeTruthy();
  });

  it("explains when a document can't be opened", async () => {
    mockApi({ "GET /api/documents/99": { status: 404, body: { detail: "Document not found." } } });
    render(<DocumentCreator documentId={99} />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/Document not found/);
    expect(screen.getByRole("link", { name: "Back to my documents" }).getAttribute("href")).toMatch(/^\/documents\/?$/);
  });

  it("starts afresh when switching to a new document", async () => {
    mockApi({
      "GET /api/documents/3": { body: saved(3, csaDraft(), [{ role: "user", content: "Old chat" }, { role: "assistant", content: "Old reply" }]) },
    });
    const { rerender } = render(<DocumentCreator documentId={3} />);
    await screen.findByText("Old reply");

    rerender(<DocumentCreator documentId={null} />);

    expect(screen.queryByText("Old reply")).toBeNull();
    expect(within(preview()).getByText("Your document will appear here.")).toBeTruthy();
  });
});
