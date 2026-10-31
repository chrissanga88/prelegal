import { readFileSync } from "node:fs";
import path from "node:path";
import { parseStandardTerms } from "./standardTerms";

/** Path to the repository's shared templates directory. */
const TEMPLATES_DIR = path.join(process.cwd(), "..", "templates");

/** Reads and parses the Mutual NDA Standard Terms. Server-only. */
export function loadStandardTerms() {
  const markdown = readFileSync(
    path.join(TEMPLATES_DIR, "Mutual-NDA.md"),
    "utf-8",
  );
  return parseStandardTerms(markdown);
}
