import type { Section, Segment } from "./types";

// Matches a numbered section: `1. **Title**. Body text...`
const SECTION_PATTERN = /^(\d+)\.\s+\*\*(.+?)\*\*\.\s+(.*)$/;

// Matches inline bold text or a Cover Page term reference.
const INLINE_PATTERN =
  /\*\*(.+?)\*\*|<span class="coverpage_link">(.+?)<\/span>/g;

export function parseInline(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(INLINE_PATTERN)) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }
    segments.push(
      match[1] !== undefined
        ? { type: "bold", text: match[1] }
        : { type: "term", text: match[2] },
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", text: text.slice(lastIndex) });
  }
  return segments;
}

/**
 * Parses the Common Paper Mutual NDA Standard Terms markdown into numbered
 * sections. The heading and license footer are omitted; the app renders its
 * own attribution.
 */
export function parseStandardTerms(markdown: string): Section[] {
  return markdown
    .split("\n")
    .map((line) => SECTION_PATTERN.exec(line.trim()))
    .filter((match) => match !== null)
    .map(([, number, title, body]) => ({
      number: Number(number),
      title,
      body: parseInline(body),
    }));
}
