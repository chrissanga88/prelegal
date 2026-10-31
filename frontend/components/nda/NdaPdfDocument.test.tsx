import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import { createDefaultNda } from "@/lib/nda/coverPage";
import { loadStandardTerms } from "@/lib/nda/loadStandardTerms";
import { NdaPdfDocument } from "./NdaPdfDocument";

describe("NdaPdfDocument", () => {
  it("renders a valid PDF for a completed NDA", async () => {
    const data = createDefaultNda("2026-10-30");
    data.governingLaw = "Delaware";
    data.parties[0].company = "Acme Inc.";

    const buffer = await renderToBuffer(
      <NdaPdfDocument data={data} sections={loadStandardTerms()} />,
    );

    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(5_000);
  }, 20_000);
});
