import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { loadStandardTerms } from "@/lib/documents/catalog";
import {
  DRAFT_NOTICE,
  DRAFT_NOTICE_TITLE,
  attribution,
  coverPageIntro,
  coverPageLines,
  partyRows,
  signingStatement,
} from "@/lib/documents/draft";
import type { DocumentDraft, DocumentSpec } from "@/lib/documents/types";

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
  notice: { marginBottom: 14, padding: 6, fontSize: 8.5, borderWidth: 1, borderColor: "#ecad0a" },
});

/** Left indentation (points) per clause depth. */
const DEPTH_INDENT = 18;

/**
 * PDF rendering of the document being drafted; mirrors DocumentPreview.
 * Call registerPdfFonts before rendering.
 */
export function DocumentPdf({ spec, draft }: { spec: DocumentSpec; draft: DocumentDraft }) {
  return (
    <Document title={spec.name} creator="Prelegal">
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.notice}>
          <Text style={styles.bold}>{DRAFT_NOTICE_TITLE.toUpperCase()}. </Text>
          {DRAFT_NOTICE}
        </Text>
        <Text style={styles.title}>{spec.name}</Text>
        <Text style={styles.paragraph}>{coverPageIntro(spec)}</Text>

        {coverPageLines(spec, draft).map((line) => (
          // Fields may be long (e.g. Modifications), so they must be able to
          // break across pages; minPresenceAhead keeps a heading with its text.
          <View key={line.label}>
            <Text style={styles.heading} minPresenceAhead={30}>
              {line.label}
            </Text>
            <Text style={styles.paragraph}>{line.value ?? BLANK}</Text>
          </View>
        ))}

        {/* Kept on one page; its height is bounded because party fields are capped at 200 characters. */}
        <View wrap={false}>
          <Text style={[styles.paragraph, { marginTop: 12 }]}>{signingStatement(spec)}</Text>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.cell, styles.labelCell]} />
              {spec.partyRoles.map((role) => (
                <Text key={role} style={[styles.cell, styles.bold, { textAlign: "center" }]}>
                  {role.toUpperCase()}
                </Text>
              ))}
            </View>
            {partyRows.map(({ label, field }) => (
              <View key={label} style={styles.row}>
                <Text style={[styles.cell, styles.labelCell]}>{label}</Text>
                {draft.parties.map((party, i) => (
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
        {loadStandardTerms(spec).map((clause, i) => (
          <Text key={i} style={[styles.section, { marginLeft: clause.depth * DEPTH_INDENT }]}>
            {clause.label}{" "}
            {clause.segments.map((segment, j) => (
              <Text key={j} style={segment.type === "text" ? undefined : styles.bold}>
                {segment.text}
              </Text>
            ))}
          </Text>
        ))}
        <Text style={styles.footer}>{attribution(spec)}</Text>
      </Page>
    </Document>
  );
}
