import { describe, expect, it } from "vitest";
import { getDocument } from "./catalog";
import { coverPageLines, createEmptyDraft, formatDate, pdfFileName } from "./draft";
import type { DocumentDraft } from "./types";

const nda = getDocument("mutual-nda")!;

function ndaDraft(fields: Record<string, string> = {}): DocumentDraft {
  return { ...createEmptyDraft(), documentType: "mutual-nda", fields };
}

describe("formatDate", () => {
  it("formats an ISO date without time zone drift", () => {
    expect(formatDate("2026-01-01")).toBe("January 1, 2026");
  });

  it("returns an empty string for a missing date", () => {
    expect(formatDate("")).toBe("");
  });

  it("does not map years below 1000 into the 1900s", () => {
    expect(formatDate("0020-10-30")).toBe("");
    expect(formatDate("0099-01-01")).toBe("");
  });

  it("rejects malformed and impossible dates", () => {
    expect(formatDate("26-10-30")).toBe("");
    expect(formatDate("2026-02-30")).toBe("");
    expect(formatDate("2026-13-01")).toBe("");
  });

  it("handles leap days", () => {
    expect(formatDate("2028-02-29")).toBe("February 29, 2028");
  });
});

describe("createEmptyDraft", () => {
  it("starts with no document and blank parties that aren't shared", () => {
    const draft = createEmptyDraft();
    expect(draft.documentType).toBeNull();
    expect(draft.fields).toEqual({});
    expect(draft.parties[0]).not.toBe(draft.parties[1]);
  });
});

describe("coverPageLines", () => {
  it("lists every field in order, formatting dates and marking blanks as null", () => {
    const lines = coverPageLines(
      nda,
      ndaDraft({ effective_date: "2026-10-30", governing_law: " Delaware ", jurisdiction: "  " }),
    );
    expect(lines.map((line) => line.label)).toEqual(nda.fields.map((field) => field.label));
    const byLabel = Object.fromEntries(lines.map((line) => [line.label, line.value]));
    expect(byLabel["Effective Date"]).toBe("October 30, 2026");
    expect(byLabel["Governing Law"]).toBe("Delaware");
    expect(byLabel["Jurisdiction"]).toBeNull();
    expect(byLabel["Purpose"]).toBeNull();
  });

  it("treats an invalid date as unfilled", () => {
    const [, effectiveDate] = coverPageLines(nda, ndaDraft({ effective_date: "soon" }));
    expect(effectiveDate).toEqual({ label: "Effective Date", value: null });
  });
});

describe("pdfFileName", () => {
  it("uses the document name and company names, stripping unsafe characters", () => {
    const draft = ndaDraft();
    draft.parties[0].company = "Acme/Inc";
    draft.parties[1].company = "Globex";
    expect(pdfFileName(nda, draft)).toBe("Mutual Non-Disclosure Agreement - AcmeInc - Globex.pdf");
  });

  it("falls back to the document name", () => {
    expect(pdfFileName(getDocument("ai-addendum")!, ndaDraft())).toBe("AI Addendum.pdf");
  });
});
