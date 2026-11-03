import { DOCUMENTS, TEMPLATES } from "./catalog.generated";
import { parseTemplate } from "./templates";
import type { Clause, DocumentSpec } from "./types";

export { DOCUMENTS };

export function getDocument(id: string | null): DocumentSpec | undefined {
  return DOCUMENTS.find((spec) => spec.id === id);
}

const parsed = new Map<string, Clause[]>();

/** The document's Standard Terms, parsed once from the bundled template. */
export function loadStandardTerms(spec: DocumentSpec): Clause[] {
  let clauses = parsed.get(spec.id);
  if (!clauses) {
    clauses = parseTemplate(TEMPLATES[spec.template]);
    parsed.set(spec.id, clauses);
  }
  return clauses;
}
