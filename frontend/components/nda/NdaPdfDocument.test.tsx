import { renderToBuffer } from "@react-pdf/renderer";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { createDefaultNda } from "@/lib/nda/coverPage";
import { loadStandardTerms } from "@/lib/nda/loadStandardTerms";
import type { NdaData } from "@/lib/nda/types";
import { NdaPdfDocument, registerPdfFonts } from "./NdaPdfDocument";

const sections = loadStandardTerms();

function render(data: NdaData) {
  return renderToBuffer(<NdaPdfDocument data={data} sections={sections} />);
}

function pageCount(pdf: Buffer) {
  return pdf.toString("latin1").match(/\/Type \/Page\b/g)?.length ?? 0;
}

beforeAll(() => {
  registerPdfFonts(fileURLToPath(new URL("../../public/fonts", import.meta.url)));
});

describe("NdaPdfDocument", () => {
  it("renders a valid PDF for a completed NDA", async () => {
    const data = createDefaultNda("2026-10-30");
    data.governingLaw = "Delaware";
    data.parties[0].company = "Acme Inc.";

    const buffer = await render(data);

    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(5_000);
  }, 20_000);

  it("embeds Noto Serif instead of a Latin-1-only standard font", async () => {
    const data = createDefaultNda("2026-10-30");
    data.parties[0].printName = "Łukasz Żółć";
    data.parties[1].company = "ООО Ромашка";

    const pdf = (await render(data)).toString("latin1");

    expect(pdf).toMatch(/\/BaseFont \/[A-Z]{6}\+NotoSerif/);
    expect(pdf).not.toMatch(/\/BaseFont \/Times/);
  }, 20_000);

  it("flows long cover page fields onto extra pages instead of clipping them", async () => {
    const short = await render(createDefaultNda("2026-10-30"));

    const data = createDefaultNda("2026-10-30");
    data.modifications = Array.from(
      { length: 150 },
      (_, i) => `Modification ${i + 1}: the parties agree to an additional obligation.`,
    ).join("\n");
    const long = await render(data);

    // Before the fix the field couldn't break, so the page count stayed the same.
    expect(pageCount(long)).toBeGreaterThanOrEqual(pageCount(short) + 2);
  }, 20_000);
});
