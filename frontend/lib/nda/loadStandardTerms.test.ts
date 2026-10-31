import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadStandardTerms } from "./loadStandardTerms";
import { STANDARD_TERMS_MARKDOWN } from "./standardTermsSource.generated";

describe("loadStandardTerms", () => {
  it("bundled Standard Terms match templates/Mutual-NDA.md (run `npm run sync-templates` if this fails)", () => {
    const template = readFileSync(
      fileURLToPath(new URL("../../../templates/Mutual-NDA.md", import.meta.url)),
      "utf-8",
    );
    expect(STANDARD_TERMS_MARKDOWN).toBe(template);
  });

  it("parses the bundled terms into sections", () => {
    expect(loadStandardTerms().length).toBeGreaterThan(5);
  });
});
