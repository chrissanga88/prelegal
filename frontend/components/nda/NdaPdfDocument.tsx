import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import {
  ATTRIBUTION,
  COVER_PAGE_INTRO,
  SIGNING_STATEMENT,
  coverPageFields,
  partyRows,
} from "@/lib/nda/coverPage";
import type { NdaData, Section } from "@/lib/nda/types";

const BLANK = "____________________";

const styles = StyleSheet.create({
  page: {
    paddingVertical: 56,
    paddingHorizontal: 64,
    fontFamily: "Times-Roman",
    fontSize: 10.5,
    lineHeight: 1.45,
  },
  title: { fontFamily: "Times-Bold", fontSize: 16, textAlign: "center", marginBottom: 12 },
  heading: { fontFamily: "Times-Bold", fontSize: 11, marginTop: 10 },
  paragraph: { marginBottom: 4 },
  bold: { fontFamily: "Times-Bold" },
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
  labelCell: { flex: 0.7, fontFamily: "Times-Bold" },
  section: { marginBottom: 6, textAlign: "justify" },
  footer: { marginTop: 16, fontSize: 8, color: "#666" },
});

/** PDF rendering of the completed Mutual NDA; mirrors NdaPreview. */
export function NdaPdfDocument({ data, sections }: { data: NdaData; sections: Section[] }) {
  return (
    <Document title="Mutual Non-Disclosure Agreement" creator="Prelegal">
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Mutual Non-Disclosure Agreement</Text>
        <Text style={styles.paragraph}>{COVER_PAGE_INTRO}</Text>

        {coverPageFields(data).map((field) => (
          <View key={field.heading} wrap={false}>
            <Text style={styles.heading}>{field.heading}</Text>
            {field.lines.map((line, i) => (
              <Text key={i} style={styles.paragraph}>
                {line.label && `${line.label}: `}
                {line.value ?? BLANK}
              </Text>
            ))}
          </View>
        ))}

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
