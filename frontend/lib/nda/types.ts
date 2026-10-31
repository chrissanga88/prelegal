export type Party = {
  printName: string;
  title: string;
  company: string;
  noticeAddress: string;
};

export type NdaData = {
  purpose: string;
  /** ISO date (YYYY-MM-DD). */
  effectiveDate: string;
  mndaTerm: { kind: "expires"; years: number } | { kind: "untilTerminated" };
  confidentialityTerm: { kind: "years"; years: number } | { kind: "perpetual" };
  governingLaw: string;
  jurisdiction: string;
  modifications: string;
  parties: [Party, Party];
};

/** A run of inline text within a Standard Terms section. */
export type Segment =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  /** A reference to a term defined on the Cover Page, e.g. "Purpose". */
  | { type: "term"; text: string };

export type Section = {
  number: number;
  title: string;
  body: Segment[];
};
