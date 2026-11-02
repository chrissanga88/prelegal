import { loadStandardTerms } from "@/lib/documents/catalog";
import {
  attribution,
  coverPageIntro,
  coverPageLines,
  partyRows,
  signingStatement,
} from "@/lib/documents/draft";
import type { DocumentDraft, DocumentSpec, Segment } from "@/lib/documents/types";

/** Indentation per clause depth (Tailwind needs literal class names). */
const DEPTH_INDENT = ["", "pl-6", "pl-12", "pl-16"];

function Placeholder({ label }: { label: string }) {
  return <span className="rounded bg-accent/20 px-1 text-navy">[{label}]</span>;
}

function SegmentText({ segment }: { segment: Segment }) {
  switch (segment.type) {
    case "bold":
    case "heading":
      return <strong>{segment.text}</strong>;
    case "term":
      return <span className="font-semibold underline decoration-dotted">{segment.text}</span>;
    default:
      return segment.text;
  }
}

/** HTML rendering of the document being drafted, updated live as the chat fills it in. */
export function DocumentPreview({ spec, draft }: { spec: DocumentSpec; draft: DocumentDraft }) {
  const [role1, role2] = spec.partyRoles;

  return (
    <article className="space-y-6 font-serif text-[13px] leading-relaxed text-navy">
      <header className="space-y-3">
        <h1 className="text-center text-xl font-bold">{spec.name}</h1>
        <p>{coverPageIntro(spec)}</p>
      </header>

      <section className="space-y-4">
        {coverPageLines(spec, draft).map((line) => (
          <div key={line.label}>
            <h2 className="font-bold">{line.label}</h2>
            <p className="whitespace-pre-wrap">{line.value ?? <Placeholder label={line.label} />}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <p>{signingStatement(spec)}</p>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <th className="w-1/4 border border-line p-2" />
              <th className="border border-line p-2 text-center uppercase">{role1}</th>
              <th className="border border-line p-2 text-center uppercase">{role2}</th>
            </tr>
          </thead>
          <tbody>
            {partyRows.map(({ label, field }) => (
              <tr key={label}>
                <th className="border border-line p-2 font-semibold">{label}</th>
                {draft.parties.map((party, i) => (
                  <td key={i} className="h-10 border border-line p-2 align-top">
                    {field && party[field]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-2 border-t border-line pt-6">
        <h2 className="text-center text-lg font-bold">Standard Terms</h2>
        {loadStandardTerms(spec).map((clause, i) => (
          <p key={i} className={DEPTH_INDENT[Math.min(clause.depth, DEPTH_INDENT.length - 1)]}>
            {clause.label}{" "}
            {clause.segments.map((segment, j) => (
              <SegmentText key={j} segment={segment} />
            ))}
          </p>
        ))}
      </section>

      <footer className="text-xs text-muted">{attribution(spec)}</footer>
    </article>
  );
}
