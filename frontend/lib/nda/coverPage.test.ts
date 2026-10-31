import { describe, expect, it } from "vitest";
import {
  coverPageFields,
  createDefaultNda,
  describeConfidentialityTerm,
  describeMndaTerm,
  formatDate,
  parseTermYears,
  pdfFileName,
  todayIso,
} from "./coverPage";

describe("formatDate", () => {
  it("formats an ISO date without time zone drift", () => {
    expect(formatDate("2026-01-01")).toBe("January 1, 2026");
  });

  it("returns an empty string for a missing date", () => {
    expect(formatDate("")).toBe("");
  });

  it("does not map years below 1000 into the 1900s", () => {
    // Chrome reports partial years like this while the user is typing.
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

describe("parseTermYears", () => {
  it("accepts whole numbers from 1 to 99", () => {
    expect(parseTermYears("1")).toBe(1);
    expect(parseTermYears("3")).toBe(3);
    expect(parseTermYears("99")).toBe(99);
  });

  it("rejects empty, zero, fractional, exponent and out-of-range values", () => {
    for (const text of ["", "0", "2.5", "1e3", "100", "-1", "abc"]) {
      expect(parseTermYears(text)).toBeNull();
    }
  });
});

describe("todayIso", () => {
  it("pads month and day", () => {
    expect(todayIso(new Date(2026, 2, 5))).toBe("2026-03-05");
  });
});

describe("term descriptions", () => {
  it("pluralizes years", () => {
    expect(describeMndaTerm({ kind: "expires", years: 1 })).toBe(
      "Expires 1 year from Effective Date.",
    );
    expect(describeMndaTerm({ kind: "expires", years: 3 })).toBe(
      "Expires 3 years from Effective Date.",
    );
  });

  it("describes open-ended terms", () => {
    expect(describeMndaTerm({ kind: "untilTerminated" })).toMatch(
      /until terminated/,
    );
    expect(describeConfidentialityTerm({ kind: "perpetual" })).toBe(
      "In perpetuity.",
    );
  });
});

describe("coverPageFields", () => {
  it("marks unfilled values as null and defaults modifications", () => {
    const fields = coverPageFields(createDefaultNda("2026-10-30"));
    const byHeading = Object.fromEntries(fields.map((f) => [f.heading, f]));

    expect(byHeading["Effective Date"].lines[0].value).toBe("October 30, 2026");
    expect(byHeading["Governing Law & Jurisdiction"].lines).toEqual([
      { label: "Governing Law", value: null },
      { label: "Jurisdiction", value: null },
    ]);
    expect(byHeading["MNDA Modifications"].lines[0].value).toBe("None.");
  });
});

describe("pdfFileName", () => {
  it("uses company names when present and strips unsafe characters", () => {
    const data = createDefaultNda("2026-10-30");
    data.parties[0].company = "Acme/Inc";
    data.parties[1].company = "Globex";
    expect(pdfFileName(data)).toBe("Mutual NDA - AcmeInc - Globex.pdf");
  });

  it("falls back to a generic name", () => {
    expect(pdfFileName(createDefaultNda("2026-10-30"))).toBe("Mutual NDA.pdf");
  });
});
