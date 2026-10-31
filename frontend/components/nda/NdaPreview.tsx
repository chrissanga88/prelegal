import {
  ATTRIBUTION,
  COVER_PAGE_INTRO,
  SIGNING_STATEMENT,
  coverPageFields,
  partyRows,
} from "@/lib/nda/coverPage";
import type { NdaData, Section, Segment } from "@/lib/nda/types";

function Placeholder({ label }: { label: string }) {
  return (
    <span className="rounded bg-amber-100 px-1 text-amber-800">[{label}]</span>
  );
}

function SegmentText({ segment }: { segment: Segment }) {
  switch (segment.type) {
    case "bold":
      return <strong>{segment.text}</strong>;
    case "term":
      return <span className="font-semibold underline decoration-dotted">{segment.text}</span>;
    default:
      return segment.text;
  }
}

/** HTML rendering of the completed Mutual NDA, updated live as the form changes. */
export function NdaPreview({ data, sections }: { data: NdaData; sections: Section[] }) {
  return (
    <article className="space-y-6 font-serif text-[13px] leading-relaxed text-zinc-900">
      <header className="space-y-3">
        <h1 className="text-center text-xl font-bold">Mutual Non-Disclosure Agreement</h1>
        <p>{COVER_PAGE_INTRO}</p>
      </header>

      <section className="space-y-4">
        {coverPageFields(data).map((field) => (
          <div key={field.heading}>
            <h2 className="font-bold">{field.heading}</h2>
            {field.lines.map((line, i) => (
              <p key={i} className="whitespace-pre-wrap">
                {line.label && `${line.label}: `}
                {line.value ?? <Placeholder label={line.label ?? field.heading} />}
              </p>
            ))}
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <p>{SIGNING_STATEMENT}</p>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <th className="w-1/4 border border-zinc-300 p-2" />
              <th className="border border-zinc-300 p-2 text-center">PARTY 1</th>
              <th className="border border-zinc-300 p-2 text-center">PARTY 2</th>
            </tr>
          </thead>
          <tbody>
            {partyRows.map(({ label, field }) => (
              <tr key={label}>
                <th className="border border-zinc-300 p-2 font-semibold">{label}</th>
                {data.parties.map((party, i) => (
                  <td key={i} className="h-10 border border-zinc-300 p-2 align-top">
                    {field && party[field]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-3 border-t border-zinc-300 pt-6">
        <h2 className="text-center text-lg font-bold">Standard Terms</h2>
        <ol className="space-y-3">
          {sections.map((section) => (
            <li key={section.number}>
              {section.number}. <strong>{section.title}</strong>.{" "}
              {section.body.map((segment, i) => (
                <SegmentText key={i} segment={segment} />
              ))}
            </li>
          ))}
        </ol>
      </section>

      <footer className="text-xs text-zinc-500">{ATTRIBUTION}</footer>
    </article>
  );
}
