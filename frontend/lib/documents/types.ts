/** One cover page field of a document, from documents.json. */
export type FieldSpec = {
  /** snake_case key, used in DocumentDraft.fields. */
  key: string;
  label: string;
  /** Explains the field to the AI. */
  description: string;
  /** Defaults to "text". Dates are stored as YYYY-MM-DD. */
  kind?: "text" | "longtext" | "date";
  default?: string;
};

/** A document Prelegal can draft, from documents.json. */
export type DocumentSpec = {
  id: string;
  name: string;
  description: string;
  /** Path of its Common Paper Standard Terms, relative to the repository root. */
  template: string;
  partyRoles: [string, string];
  fields: FieldSpec[];
};

export type Party = {
  printName: string;
  title: string;
  company: string;
  noticeAddress: string;
};

/** The document being drafted; mirrors DocumentDraft in backend/app/chat.py. */
export type DocumentDraft = {
  /** A DocumentSpec id, or null until the user has chosen a document. */
  documentType: string | null;
  /** Cover page values keyed by FieldSpec.key. */
  fields: Record<string, string>;
  parties: [Party, Party];
};

/** A run of inline text within the Standard Terms. */
export type Segment =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  /** A section heading, e.g. "Access and Use." */
  | { type: "heading"; text: string }
  /** A reference to a term defined on the Cover Page, e.g. "Governing Law". */
  | { type: "term"; text: string };

/** A numbered clause of the Standard Terms. */
export type Clause = {
  /** Nesting level: 0 for top-level sections. */
  depth: number;
  /** Display number, e.g. "1.", "1.2" or "(a)". */
  label: string;
  segments: Segment[];
};
