import type { NdaData, Party } from "./types";

export const emptyParty: Party = {
  printName: "",
  title: "",
  company: "",
  noticeAddress: "",
};

export function createDefaultNda(effectiveDate: string): NdaData {
  return {
    purpose:
      "Evaluating whether to enter into a business relationship with the other party.",
    effectiveDate,
    mndaTerm: { kind: "expires", years: 1 },
    confidentialityTerm: { kind: "years", years: 1 },
    governingLaw: "",
    jurisdiction: "",
    modifications: "",
    parties: [{ ...emptyParty }, { ...emptyParty }],
  };
}

/** Today's date in the user's local time zone, as YYYY-MM-DD. */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Formats a YYYY-MM-DD date as e.g. "October 30, 2026". Returns "" for
 * anything that isn't a complete, real calendar date with a four-digit year
 * (such as the partial years a date input reports while the user is typing).
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

export const MIN_TERM_YEARS = 1;
export const MAX_TERM_YEARS = 99;

/** Parses a term length typed by the user; null unless a whole number from 1 to 99. */
export function parseTermYears(text: string): number | null {
  if (!/^\d{1,2}$/.test(text.trim())) return null;
  const years = Number(text);
  return years >= MIN_TERM_YEARS && years <= MAX_TERM_YEARS ? years : null;
}

function pluralizeYears(years: number): string {
  return `${years} ${years === 1 ? "year" : "years"}`;
}

export function describeMndaTerm(term: NdaData["mndaTerm"]): string {
  return term.kind === "expires"
    ? `Expires ${pluralizeYears(term.years)} from Effective Date.`
    : "Continues until terminated in accordance with the terms of the MNDA.";
}

export function describeConfidentialityTerm(
  term: NdaData["confidentialityTerm"],
): string {
  return term.kind === "years"
    ? `${pluralizeYears(term.years)} from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.`
    : "In perpetuity.";
}

export const COVER_PAGE_INTRO =
  "This Mutual Non-Disclosure Agreement (the “MNDA”) consists of: (1) this Cover Page (“Cover Page”) and (2) the Common Paper Mutual NDA Standard Terms Version 1.0 (“Standard Terms”) identical to those posted at commonpaper.com/standards/mutual-nda/1.0. Any modifications of the Standard Terms should be made on the Cover Page, which will control over conflicts with the Standard Terms.";

export const SIGNING_STATEMENT =
  "By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.";

export const ATTRIBUTION =
  "Common Paper Mutual Non-Disclosure Agreement (Version 1.0) free to use under CC BY 4.0.";

/** A cover page value; `null` means the user hasn't filled it in yet. */
export type CoverPageLine = { label?: string; value: string | null };

export type CoverPageField = { heading: string; lines: CoverPageLine[] };

function valueOrNull(value: string): string | null {
  return value.trim() || null;
}

/** The cover page fields in document order, shared by the preview and PDF. */
export function coverPageFields(data: NdaData): CoverPageField[] {
  return [
    { heading: "Purpose", lines: [{ value: valueOrNull(data.purpose) }] },
    {
      heading: "Effective Date",
      lines: [{ value: valueOrNull(formatDate(data.effectiveDate)) }],
    },
    {
      heading: "MNDA Term",
      lines: [{ value: describeMndaTerm(data.mndaTerm) }],
    },
    {
      heading: "Term of Confidentiality",
      lines: [{ value: describeConfidentialityTerm(data.confidentialityTerm) }],
    },
    {
      heading: "Governing Law & Jurisdiction",
      lines: [
        { label: "Governing Law", value: valueOrNull(data.governingLaw) },
        { label: "Jurisdiction", value: valueOrNull(data.jurisdiction) },
      ],
    },
    {
      heading: "MNDA Modifications",
      lines: [{ value: valueOrNull(data.modifications) ?? "None." }],
    },
  ];
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

export function pdfFileName(data: NdaData): string {
  const companies = data.parties
    .map((party) => party.company.trim())
    .filter(Boolean)
    .join(" - ");
  const base = companies ? `Mutual NDA - ${companies}` : "Mutual NDA";
  return `${base.replace(/[\\/:*?"<>|]/g, "")}.pdf`;
}
