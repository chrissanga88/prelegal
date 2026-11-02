import type { Clause, Segment } from "./types";

// A numbered list item: indentation (4 spaces per level), marker ("1" or "a"), text.
const CLAUSE_PATTERN = /^( *)(\d+|[a-z])\.\s+(.*)$/;

// Spans that only carry an anchor id (`<span id="13.29">**"Software"**</span>`
// or an empty `<span id="4.7"></span>`); only their content is kept.
const ANCHOR_PATTERN = /<span id="[^"]*">(.*?)<\/span>/g;

// Bold text, a section heading, a term reference (any *_link class), a Markdown
// link or an autolink.
const INLINE_PATTERN =
  /\*\*(.+?)\*\*|<span class="header_\d"[^>]*>(.*?)<\/span>|<span class="\w+_link"[^>]*>(.*?)<\/span>|\[([^\]]+)\]\([^)]*\)|<(https?:[^>]+)>/g;

// Any span tag, for markup nested inside bold text or headings
// (e.g. `**... <span class="keyterms_link">General Cap Amount</span>.**`).
const TAG_PATTERN = /<\/?span[^>]*>/g;

const stripTags = (text: string) => text.replace(TAG_PATTERN, "");

export function parseInline(text: string): Segment[] {
  const source = text.replace(ANCHOR_PATTERN, "$1");
  const segments: Segment[] = [];
  let lastIndex = 0;

  for (const match of source.matchAll(INLINE_PATTERN)) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", text: source.slice(lastIndex, match.index) });
    }
    const [, bold, heading, term, linkText, url] = match;
    if (bold !== undefined) segments.push({ type: "bold", text: stripTags(bold) });
    else if (heading !== undefined) segments.push({ type: "heading", text: stripTags(heading) });
    else if (term !== undefined) segments.push({ type: "term", text: term });
    else segments.push({ type: "text", text: linkText ?? url });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < source.length) {
    segments.push({ type: "text", text: source.slice(lastIndex) });
  }
  return segments;
}

/**
 * Parses a Common Paper Standard Terms template into its numbered clauses.
 * Titles, the license footer and other unnumbered lines are omitted; the app
 * renders its own title and attribution. Top-level clauses are numbered "1.",
 * the next level "1.2" and deeper levels "(a)", following the source markers.
 */
export function parseTemplate(markdown: string): Clause[] {
  const clauses: Clause[] = [];
  let section = "";

  for (const line of markdown.split("\n")) {
    const match = CLAUSE_PATTERN.exec(line.trimEnd());
    if (!match) continue;
    const [, indent, marker, text] = match;
    const depth = Math.floor(indent.length / 4);
    if (depth === 0) section = marker;
    const label = depth === 0 ? `${marker}.` : depth === 1 ? `${section}.${marker}` : `(${marker})`;
    clauses.push({ depth, label, segments: parseInline(text) });
  }
  return clauses;
}
