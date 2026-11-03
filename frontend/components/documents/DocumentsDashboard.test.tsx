// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DocumentSummary } from "@/lib/documents/library";
import { mockApi } from "@/lib/testing/mockApi";
import { DocumentsDashboard, formatUpdated } from "./DocumentsDashboard";

const DOCS: DocumentSummary[] = [
  {
    id: 2,
    documentType: "cloud-service-agreement",
    title: "Cloud Service Agreement - Acme",
    createdAt: "2026-10-01T09:00:00.000Z",
    updatedAt: "2026-10-02T09:00:00.000Z",
  },
  {
    id: 1,
    documentType: "mutual-nda",
    title: "Mutual Non-Disclosure Agreement",
    createdAt: "2026-09-01T09:00:00.000Z",
    updatedAt: "2026-09-01T09:00:00.000Z",
  },
];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DocumentsDashboard", () => {
  it("lists documents with links to reopen them", async () => {
    mockApi({ "GET /api/documents": { body: DOCS } });
    render(<DocumentsDashboard />);

    const link = await screen.findByRole("link", { name: "Cloud Service Agreement - Acme" });
    expect(screen.getByRole("link", { name: "Open Cloud Service Agreement - Acme" })).toBeTruthy();
    expect(link.getAttribute("href")).toMatch(/^\/draft\/?\?id=2$/);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Cloud Service Agreement")).toBeTruthy();
    expect(within(rows[1]).getByText("Mutual Non-Disclosure Agreement", { selector: "td" })).toBeTruthy();
  });

  it("shows an empty state that starts a new document", async () => {
    mockApi({ "GET /api/documents": { body: [] } });
    render(<DocumentsDashboard />);
    expect(await screen.findByText("No documents yet")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Draft your first document" }).getAttribute("href")).toMatch(/^\/draft\/?$/);
  });

  it("shows an error when the list can't load", async () => {
    mockApi({ "GET /api/documents": { status: 500 } });
    render(<DocumentsDashboard />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/Couldn’t load your documents/);
  });

  it("deletes a document after confirmation", async () => {
    const calls = mockApi({ "GET /api/documents": { body: DOCS }, "DELETE /api/documents/2": { status: 204 } });
    const user = userEvent.setup();
    render(<DocumentsDashboard />);

    await user.click(await screen.findByRole("button", { name: "Delete Cloud Service Agreement - Acme" }));
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
    // Focus moves to the confirmation for keyboard users.
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Confirm delete Cloud Service Agreement - Acme" }),
    );

    await user.click(screen.getByRole("button", { name: "Confirm delete Cloud Service Agreement - Acme" }));

    expect(await screen.findByRole("link", { name: "Mutual Non-Disclosure Agreement" })).toBeTruthy();
    expect(screen.queryByText("Cloud Service Agreement - Acme")).toBeNull();
    expect(calls.at(-1)).toMatchObject({ method: "DELETE", path: "/api/documents/2" });
  });

  it("can cancel a delete, and keeps the row if deleting fails", async () => {
    mockApi({
      "GET /api/documents": { body: DOCS },
      "DELETE /api/documents/2": { status: 500, body: { detail: "Server error." } },
    });
    const user = userEvent.setup();
    render(<DocumentsDashboard />);

    await user.click(await screen.findByRole("button", { name: "Delete Cloud Service Agreement - Acme" }));
    await user.click(screen.getByRole("button", { name: "Cancel deleting Cloud Service Agreement - Acme" }));
    expect(screen.queryByRole("button", { name: "Confirm delete Cloud Service Agreement - Acme" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Delete Cloud Service Agreement - Acme" }));
    await user.click(screen.getByRole("button", { name: "Confirm delete Cloud Service Agreement - Acme" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Server error.");
    expect(screen.getByText("Cloud Service Agreement - Acme")).toBeTruthy();
  });
});

describe("formatUpdated", () => {
  const now = new Date(2026, 10, 2, 15, 0);

  it("shows the time for today and the date otherwise", () => {
    expect(formatUpdated(new Date(2026, 10, 2, 9, 5).toISOString(), now)).toBe("Today, 9:05 AM");
    expect(formatUpdated(new Date(2026, 9, 30, 9, 5).toISOString(), now)).toBe("Oct 30, 2026");
    expect(formatUpdated("nonsense", now)).toBe("");
  });
});
