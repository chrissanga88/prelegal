import { renderToBuffer } from "@react-pdf/renderer";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { DOCUMENTS, getDocument } from "@/lib/documents/catalog";
import { createEmptyDraft } from "@/lib/documents/draft";
import type { DocumentDraft, DocumentSpec } from "@/lib/documents/types";
import { DocumentPdf, registerPdfFonts } from "./DocumentPdf";

const nda = getDocument("mutual-nda")!;

function draftFor(spec: DocumentSpec, fields: Record<string, string> = {}): DocumentDraft {
  return { ...createEmptyDraft(), documentType: spec.id, fields };
}

function render(spec: DocumentSpec, draft: DocumentDraft) {
  return renderToBuffer(<DocumentPdf spec={spec} draft={draft} />);
}

function pageCount(pdf: Buffer) {
  return pdf.toString("latin1").match(/\/Type \/Page\b/g)?.length ?? 0;
}

beforeAll(() => {
  registerPdfFonts(fileURLToPath(new URL("../../public/fonts", import.meta.url)));
});

describe("DocumentPdf", () => {
  it.each(DOCUMENTS.map((spec) => [spec.id, spec] as const))(
    "renders a valid PDF for %s",
    async (_, spec) => {
      const draft = draftFor(spec, { governing_law: "Delaware" });
      draft.parties[0].company = "Acme Inc.";

      const buffer = await render(spec, draft);

      expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
      expect(buffer.length).toBeGreaterThan(5_000);
    },
    30_000,
  );

  it("embeds Noto Serif instead of a Latin-1-only standard font", async () => {
    const draft = draftFor(nda);
    draft.parties[0].printName = "Łukasz Żółć";
    draft.parties[1].company = "ООО Ромашка";

    const pdf = (await render(nda, draft)).toString("latin1");

    expect(pdf).toMatch(/\/BaseFont \/[A-Z]{6}\+NotoSerif/);
    expect(pdf).not.toMatch(/\/BaseFont \/Times/);
  }, 20_000);

  it("flows long cover page fields onto extra pages instead of clipping them", async () => {
    const short = await render(nda, draftFor(nda));

    const modifications = Array.from(
      { length: 150 },
      (_, i) => `Modification ${i + 1}: the parties agree to an additional obligation.`,
    ).join("\n");
    const long = await render(nda, draftFor(nda, { modifications }));

    expect(pageCount(long)).toBeGreaterThanOrEqual(pageCount(short) + 2);
  }, 20_000);
});
