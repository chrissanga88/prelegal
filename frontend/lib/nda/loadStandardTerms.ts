import { parseStandardTerms } from "./standardTerms";
import { STANDARD_TERMS_MARKDOWN } from "./standardTermsSource.generated";

/**
 * Parses the Mutual NDA Standard Terms. The markdown is bundled from
 * standardTermsSource.generated.ts (see scripts/sync-standard-terms.mjs),
 * so this works regardless of the working directory or deploy layout.
 */
export function loadStandardTerms() {
  return parseStandardTerms(STANDARD_TERMS_MARKDOWN);
}
