import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DOCUMENTS } from "./catalog";
import { parseInline, parseTemplate } from "./templates";

function readTemplate(path: string) {
  return readFileSync(fileURLToPath(new URL(`../../../${path}`, import.meta.url)), "utf-8");
}

describe("parseInline", () => {
  it("splits bold text and term references", () => {
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

  it("recognises headings and every kind of variable link", () => {
    expect(
      parseInline(
        '<span class="header_3" id="1.1">Access and Use.</span>  During the <span class="orderform_link">Subscription Period</span> under <span class="keyterms_link">Governing Law</span>, <span class="coverpage_link" id="5.5.a">Customer</span>',
      ),
    ).toEqual([
      { type: "heading", text: "Access and Use." },
      { type: "text", text: "  During the " },
      { type: "term", text: "Subscription Period" },
      { type: "text", text: " under " },
      { type: "term", text: "Governing Law" },
      { type: "text", text: ", " },
      { type: "term", text: "Customer" },
    ]);
  });

  it("keeps term references nested in bold text as bold text", () => {
    expect(
      parseInline('**Liability will not exceed the <span class="keyterms_link">General Cap Amount</span>.**'),
    ).toEqual([{ type: "bold", text: "Liability will not exceed the General Cap Amount." }]);
  });

  it("unwraps anchor spans and links", () => {
    expect(
      parseInline(
        '<span id="13.29">**"Software"**</span> means it.<span id="4.7"></span> See <https://commonpaper.com/x/> and [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).',
      ),
    ).toEqual([
      { type: "bold", text: '"Software"' },
      { type: "text", text: " means it. See " },
      { type: "text", text: "https://commonpaper.com/x/" },
      { type: "text", text: " and " },
      { type: "text", text: "CC BY 4.0" },
      { type: "text", text: "." },
    ]);
  });
});

describe("parseTemplate", () => {
  it("numbers nested clauses from their indentation", () => {
    const clauses = parseTemplate(
      [
        "# Title",
        "",
        "1. First",
        "    1. Sub one",
        "    2. Sub two",
        "        a. Deep",
        "2. Second",
        "    1. Sub",
        "Footer line",
      ].join("\n"),
    );
    expect(clauses.map(({ depth, label }) => [depth, label])).toEqual([
      [0, "1."],
      [1, "1.1"],
      [1, "1.2"],
      [2, "(a)"],
      [0, "2."],
      [1, "2.1"],
    ]);
    expect(clauses[1].segments).toEqual([{ type: "text", text: "Sub one" }]);
  });

  it("parses all eleven sections of the Mutual NDA", () => {
    const clauses = parseTemplate(readTemplate("templates/Mutual-NDA.md"));
    expect(clauses.map((c) => c.label)).toEqual(
      Array.from({ length: 11 }, (_, i) => `${i + 1}.`),
    );
    expect(clauses[0].segments[0]).toEqual({ type: "bold", text: "Introduction" });
  });

  it.each(DOCUMENTS.map((spec) => [spec.id, spec.template]))(
    "parses %s with no raw markup left",
    (_, template) => {
      const clauses = parseTemplate(readTemplate(template));
      expect(clauses.length).toBeGreaterThan(5);
      const text = clauses.flatMap((c) => c.segments.map((s) => s.text)).join("");
      expect(text).not.toMatch(/\*\*|<span|<\/span>|\]\(/);
    },
  );
});
