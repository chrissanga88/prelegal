import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseInline, parseStandardTerms } from "./standardTerms";

describe("parseInline", () => {
  it("splits bold text and cover page term references", () => {
    expect(
      parseInline(
        'Each party (“**Disclosing Party**”) for the <span class="coverpage_link">Purpose</span>.',
      ),
    ).toEqual([
      { type: "text", text: "Each party (“" },
      { type: "bold", text: "Disclosing Party" },
      { type: "text", text: "”) for the " },
      { type: "term", text: "Purpose" },
      { type: "text", text: "." },
    ]);
  });
});

describe("parseStandardTerms", () => {
  const markdown = readFileSync(
    path.join(__dirname, "../../../templates/Mutual-NDA.md"),
    "utf-8",
  );
  const sections = parseStandardTerms(markdown);

  it("parses all eleven sections of the real template in order", () => {
    expect(sections.map((s) => s.number)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ]);
    expect(sections[0].title).toBe("Introduction");
    expect(sections[10].title).toBe("General");
  });

  it("leaves no raw markup in the parsed text", () => {
    const allText = sections
      .flatMap((s) => s.body.map((segment) => segment.text))
      .join("");
    expect(allText).not.toMatch(/\*\*|<span|<\/span>/);
  });
});
