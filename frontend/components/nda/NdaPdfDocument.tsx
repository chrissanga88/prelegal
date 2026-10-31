import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  ATTRIBUTION,
  COVER_PAGE_INTRO,
  SIGNING_STATEMENT,
  coverPageFields,
  partyRows,
} from "@/lib/nda/coverPage";
import type { NdaData, Section } from "@/lib/nda/types";

const BLANK = "____________________";

/**
 * Noto Serif covers Latin (including accented and extended Latin), Greek and
 * Cyrillic; the PDF standard fonts such as Times-Roman only cover Latin-1.
 * The font files live in public/fonts (SIL Open Font License, see OFL.txt).
 */
const FONT_FAMILY = "Noto Serif";
let registeredFontBase: string | null = null;

/**
 * Registers the PDF fonts. `fontBase` is where NotoSerif-*.ttf are served from:
 * a URL path such as "/fonts" in the browser, or a directory path in Node.
 */
export function registerPdfFonts(fontBase: string) {
  if (registeredFontBase === fontBase) return;
  Font.register({
    family: FONT_FAMILY,
    fonts: [
      { src: `${fontBase}/NotoSerif-Regular.ttf` },
      { src: `${fontBase}/NotoSerif-Bold.ttf`, fontWeight: "bold" },
    ],
  });
  // Legal text shouldn't be hyphenated at arbitrary points.
  Font.registerHyphenationCallback((word) => [word]);
  registeredFontBase = fontBase;
}

const styles = StyleSheet.create({
  page: {
    paddingVertical: 56,
    paddingHorizontal: 64,
    fontFamily: FONT_FAMILY,
    fontSize: 10.5,
    lineHeight: 1.45,
  },
  title: { fontWeight: "bold", fontSize: 16, textAlign: "center", marginBottom: 12 },
  heading: { fontWeight: "bold", fontSize: 11, marginTop: 10 },
  paragraph: { marginBottom: 4 },
  bold: { fontWeight: "bold" },
  table: { marginTop: 8, borderTopWidth: 1, borderLeftWidth: 1, borderColor: "#999" },
  row: { flexDirection: "row" },
  cell: {
    flex: 1,
    minHeight: 26,
    padding: 4,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#999",
  },
  labelCell: { flex: 0.7, fontWeight: "bold" },
  section: { marginBottom: 6, textAlign: "justify" },
  footer: { marginTop: 16, fontSize: 8, color: "#666" },
});

/**
 * PDF rendering of the completed Mutual NDA; mirrors NdaPreview.
 * Call registerPdfFonts before rendering.
 */
export function NdaPdfDocument({ data, sections }: { data: NdaData; sections: Section[] }) {
  return (
    <Document title="Mutual Non-Disclosure Agreement" creator="Prelegal">
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Mutual Non-Disclosure Agreement</Text>
        <Text style={styles.paragraph}>{COVER_PAGE_INTRO}</Text>

        {coverPageFields(data).map((field) => (
          // Fields may be long (e.g. MNDA Modifications), so they must be able to
          // break across pages; minPresenceAhead keeps a heading with its text.
          <View key={field.heading}>
            <Text style={styles.heading} minPresenceAhead={30}>
              {field.heading}
            </Text>
            {field.lines.map((line, i) => (
              <Text key={i} style={styles.paragraph}>
                {line.label && `${line.label}: `}
                {line.value ?? BLANK}
              </Text>
            ))}
          </View>
        ))}

        {/* Kept on one page; its height is bounded because party inputs have a maxLength. */}
        <View wrap={false}>
          <Text style={[styles.paragraph, { marginTop: 12 }]}>{SIGNING_STATEMENT}</Text>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.cell, styles.labelCell]} />
              <Text style={[styles.cell, styles.bold, { textAlign: "center" }]}>PARTY 1</Text>
              <Text style={[styles.cell, styles.bold, { textAlign: "center" }]}>PARTY 2</Text>
            </View>
            {partyRows.map(({ label, field }) => (
              <View key={label} style={styles.row}>
                <Text style={[styles.cell, styles.labelCell]}>{label}</Text>
                {data.parties.map((party, i) => (
                  <Text key={i} style={styles.cell}>
                    {field ? party[field] : ""}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </View>
      </Page>

      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Standard Terms</Text>
        {sections.map((section) => (
          <Text key={section.number} style={styles.section}>
            {section.number}. <Text style={styles.bold}>{section.title}</Text>.{" "}
            {section.body.map((segment, i) => (
              <Text key={i} style={segment.type === "text" ? undefined : styles.bold}>
                {segment.text}
              </Text>
            ))}
          </Text>
        ))}
        <Text style={styles.footer}>{ATTRIBUTION}</Text>
      </Page>
    </Document>
  );
}
