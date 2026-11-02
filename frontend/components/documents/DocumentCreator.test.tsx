// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DOCUMENTS } from "@/lib/documents/catalog";
import { createEmptyDraft } from "@/lib/documents/draft";
import { DocumentCreator } from "./DocumentCreator";

let fetchMock: ReturnType<typeof vi.fn>;

function reply(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const preview = () => screen.getByRole("region", { name: "Document preview" });

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DocumentCreator", () => {
  it("lists the supported documents until one is chosen", () => {
    render(<DocumentCreator />);
    const region = preview();
    expect(within(region).getByText("Your document will appear here.")).toBeTruthy();
    for (const spec of DOCUMENTS) expect(within(region).getByText(spec.name)).toBeTruthy();
    expect(within(region).queryByRole("button", { name: "Download PDF" })).toBeNull();
  });

  it("shows the chosen document, filled in from the chat", async () => {
    const draft = {
      ...createEmptyDraft(),
      documentType: "cloud-service-agreement",
      fields: { governing_law: "Delaware", fees: "$50,000 per year" },
    };
    draft.parties[0].company = "Acme Cloud";
    fetchMock.mockResolvedValueOnce(reply({ reply: "Let's draft your CSA.", draft }));
    const user = userEvent.setup();
    render(<DocumentCreator />);

    await user.type(screen.getByLabelText("Message"), "A cloud service agreement{Enter}");
    await screen.findByText("Let's draft your CSA.");

    const region = preview();
    expect(within(region).getByText("Preview: Cloud Service Agreement")).toBeTruthy();
    expect(within(region).getByRole("button", { name: "Download PDF" })).toBeTruthy();
    expect(within(region).getByText("Delaware")).toBeTruthy();
    expect(within(region).getByText("$50,000 per year")).toBeTruthy();
    expect(within(region).getByText("Acme Cloud")).toBeTruthy();
    // Role headers in the signature table, unfilled fields as placeholders, and the terms.
    expect(within(region).getByRole("columnheader", { name: "Provider" })).toBeTruthy();
    expect(within(region).getByText("[Chosen Courts]")).toBeTruthy();
    expect(within(region).getByText("Standard Terms")).toBeTruthy();
    expect(within(region).getAllByText("Access and Use.").length).toBeGreaterThan(0);
  });
});
