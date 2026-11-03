import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DOCUMENTS, getDocument, loadStandardTerms } from "./catalog";
import { TEMPLATES } from "./catalog.generated";

function readRoot(path: string) {
  return readFileSync(fileURLToPath(new URL(`../../../${path}`, import.meta.url)), "utf-8");
}

const SYNC_HINT = "run `npm run sync-templates` if this fails";

describe("catalog", () => {
  it(`bundled specs match documents.json (${SYNC_HINT})`, () => {
    expect(DOCUMENTS).toEqual(JSON.parse(readRoot("documents.json")));
  });

  it(`bundled templates match templates/ (${SYNC_HINT})`, () => {
    for (const spec of DOCUMENTS) {
      expect(TEMPLATES[spec.template], spec.template).toBe(readRoot(spec.template));
    }
  });

  it("looks documents up by id", () => {
    expect(getDocument("mutual-nda")?.name).toBe("Mutual Non-Disclosure Agreement");
    expect(getDocument("nope")).toBeUndefined();
    expect(getDocument(null)).toBeUndefined();
  });

  it("parses each document's terms once", () => {
    const spec = getDocument("service-level-agreement")!;
    expect(loadStandardTerms(spec)).toBe(loadStandardTerms(spec));
    expect(loadStandardTerms(spec)[0].label).toBe("1.");
  });
});
