import type { DocumentDraft, DocumentSpec, Party } from "./types";

export const emptyParty: Party = {
  printName: "",
  title: "",
  company: "",
  noticeAddress: "",
};

/** The starting draft: no document chosen yet. The backend fills in fields once one is. */
export function createEmptyDraft(): DocumentDraft {
  return { documentType: null, fields: {}, parties: [{ ...emptyParty }, { ...emptyParty }] };
}

/**
 * Formats a YYYY-MM-DD date as e.g. "October 30, 2026". Returns "" for
 * anything that isn't a complete, real calendar date with a four-digit year.
 */
export function formatDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return "";
  const [year, month, day] = match.slice(1).map(Number);
  if (year < 1000) return "";

  // setFullYear avoids the Date constructor mapping years 0–99 to 1900–1999.
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return ""; // e.g. February 30
  }
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function coverPageIntro(spec: DocumentSpec): string {
  return `This ${spec.name} consists of: (1) this Cover Page (“Cover Page”) and (2) the Common Paper ${spec.name} Standard Terms (“Standard Terms”). Any modifications of the Standard Terms should be made on the Cover Page, which will control over conflicts with the Standard Terms.`;
}

export function signingStatement(spec: DocumentSpec): string {
  return `By signing this Cover Page, each party agrees to enter into this ${spec.name}.`;
}

export function attribution(spec: DocumentSpec): string {
  return `Based on the Common Paper ${spec.name} Standard Terms, free to use under CC BY 4.0.`;
}

/** A cover page value; `null` means it hasn't been filled in yet. */
export type CoverPageLine = { label: string; value: string | null };

/** The cover page fields in document order, shared by the preview and PDF. */
export function coverPageLines(spec: DocumentSpec, draft: DocumentDraft): CoverPageLine[] {
  return spec.fields.map((field) => {
    const raw = (draft.fields[field.key] ?? "").trim();
    const value = field.kind === "date" ? formatDate(raw) : raw;
    return { label: field.label, value: value || null };
  });
}

/** Signature table rows; Signature and Date are left blank for signing. */
export const partyRows: { label: string; field?: keyof Party }[] = [
  { label: "Signature" },
  { label: "Print Name", field: "printName" },
  { label: "Title", field: "title" },
  { label: "Company", field: "company" },
  { label: "Notice Address", field: "noticeAddress" },
  { label: "Date" },
];

export function pdfFileName(spec: DocumentSpec, draft: DocumentDraft): string {
  const companies = draft.parties
    .map((party) => party.company.trim())
    .filter(Boolean)
    .join(" - ");
  const base = companies ? `${spec.name} - ${companies}` : spec.name;
  return `${base.replace(/[\\/:*?"<>|]/g, "")}.pdf`;
}
