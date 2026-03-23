import jsPDF from "jspdf";
import logoUrl from "../assets/logo.png";

const FALLBACK_REPLACEMENTS = [
  [/•/g, "-"],
  [/–|—/g, "-"],
  [/→/g, "->"],
  [/×/g, "x"],
  [/Ã¢â‚¬Â¢/g, "-"],
  [/Ã¢â‚¬â€œ|Ã¢â‚¬â€/g, "-"],
  [/Ã¢â€ â€™/g, "->"],
  [/Ãƒâ€”/g, "x"],
];

const COLORS = {
  ink: [27, 38, 59],
  subtext: [82, 94, 114],
  blue: [37, 78, 138],
  gold: [158, 127, 69],
  border: [188, 198, 214],
  panel: [244, 247, 251],
  paper: [252, 252, 249],
};

const PAGE = {
  margin: 34,
  innerMargin: 14,
  headerHeight: 92,
  footerGap: 24,
};

let logoDataUrlPromise = null;

const sanitizePdfText = (value) => {
  let text = String(value ?? "");
  for (const [pattern, replacement] of FALLBACK_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  return text.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
};

const splitField = (line) => {
  const cleaned = sanitizePdfText(line).trim();
  const idx = cleaned.indexOf(":");
  if (idx === -1) return { label: "", value: cleaned };
  return {
    label: cleaned.slice(0, idx).trim(),
    value: cleaned.slice(idx + 1).trim(),
  };
};

const isLongField = (field) => /summary|notes|reason|guidance|remarks/i.test(field?.label || "");

const parseDocument = (lines) => {
  const cleaned = (Array.isArray(lines) ? lines : []).map(sanitizePdfText);
  const title = cleaned[0] || "Consultation Record";
  const body = cleaned.slice(1);
  const meta = [];
  const records = [];
  let currentRecord = null;
  let inMeta = true;

  for (const raw of body) {
    const line = raw.trim();
    if (!line) {
      inMeta = false;
      if (currentRecord) {
        records.push(currentRecord);
        currentRecord = null;
      }
      continue;
    }

    if (/^consultation\s+\d+/i.test(line)) {
      if (currentRecord) records.push(currentRecord);
      currentRecord = { heading: line, fields: [] };
      continue;
    }

    if (currentRecord) {
      currentRecord.fields.push(splitField(line));
      continue;
    }

    if (inMeta) {
      meta.push(splitField(line));
    }
  }

  if (currentRecord) records.push(currentRecord);
  return { title, meta, records };
};

const toDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const getLogoDataUrl = async () => {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = fetch(logoUrl)
      .then((response) => response.blob())
      .then((blob) => toDataUrl(blob))
      .catch(() => null);
  }
  return logoDataUrlPromise;
};

const drawPageFrame = (doc, pageNumber) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(...COLORS.paper);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setDrawColor(...COLORS.blue);
  doc.setLineWidth(1.1);
  doc.rect(22, 22, pageWidth - 44, pageHeight - 44);

  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.45);
  doc.rect(28, 28, pageWidth - 56, pageHeight - 56);

  doc.setFillColor(...COLORS.blue);
  doc.rect(22, 22, pageWidth - 44, 6, "F");

  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.5);
  doc.line(PAGE.margin, pageHeight - 62, pageWidth - PAGE.margin, pageHeight - 62);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.subtext);
  doc.text("System-generated consultation record", PAGE.margin, pageHeight - 22);
  doc.text(`Page ${pageNumber}`, pageWidth - PAGE.margin, pageHeight - 22, { align: "right" });
};

const drawWatermark = async (doc) => {
  const dataUrl = await getLogoDataUrl();
  if (!dataUrl) return;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const size = 240;
  const x = (pageWidth - size) / 2;
  const y = (pageHeight - size) / 2 - 20;

  try {
    if (typeof doc.GState === "function" && typeof doc.setGState === "function") {
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.08 }));
      doc.addImage(dataUrl, "PNG", x, y, size, size, undefined, "FAST");
      doc.restoreGraphicsState();
    } else {
      doc.addImage(dataUrl, "PNG", x, y, size, size, undefined, "FAST");
    }
  } catch (_) {
    try {
      doc.addImage(dataUrl, "PNG", x, y, size, size, undefined, "FAST");
    } catch {
      // ignore watermark failures
    }
  }
};

const drawHeader = async (doc, title) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const rightEdge = pageWidth - PAGE.margin;
  const logoDataUrl = await getLogoDataUrl();

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", PAGE.margin, 38, 44, 44, undefined, "FAST");
    } catch {
      // ignore header logo failures
    }
  }

  doc.setFont("times", "bold");
  doc.setFontSize(13.5);
  doc.setTextColor(...COLORS.blue);
  doc.text("KING'S COLLEGE OF THE PHILIPPINES", pageWidth / 2, 46, { align: "center" });

  doc.setFont("times", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...COLORS.ink);
  doc.text("College of Information Technology", pageWidth / 2, 61, { align: "center" });

  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.55);
  doc.line(PAGE.margin + 54, 74, rightEdge, 74);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...COLORS.ink);
  doc.text(title, pageWidth / 2, 96, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.subtext);
  doc.text("Academic Advising System Record Export", pageWidth / 2, 110, { align: "center" });
};

const drawMetaTable = (doc, meta, y) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const width = pageWidth - PAGE.margin * 2;
  const entries = [
    ...meta,
    {
      label: "Prepared On",
      value: new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }),
    },
  ].filter((entry) => entry?.value);

  const rows = [];
  for (let i = 0; i < entries.length; i += 2) rows.push(entries.slice(i, i + 2));
  const rowHeight = 28;
  const totalHeight = 22 + rows.length * rowHeight;
  const half = width / 2;

  doc.setFillColor(...COLORS.panel);
  doc.rect(PAGE.margin, y, width, totalHeight, "F");
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.55);
  doc.rect(PAGE.margin, y, width, totalHeight);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLORS.blue);
  doc.text("DOCUMENT PARTICULARS", PAGE.margin + 12, y + 15);

  let rowY = y + 28;
  rows.forEach((row, rowIndex) => {
    if (rowIndex > 0) {
      doc.line(PAGE.margin, rowY - 8, PAGE.margin + width, rowY - 8);
    }

    row.forEach((entry, columnIndex) => {
      const baseX = PAGE.margin + 12 + columnIndex * half;
      if (columnIndex === 1) {
        doc.line(PAGE.margin + half, rowY - 8, PAGE.margin + half, rowY + rowHeight - 8);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.6);
      doc.setTextColor(...COLORS.subtext);
      doc.text((entry.label || "Field").toUpperCase(), baseX, rowY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.ink);
      const wrapped = doc.splitTextToSize(entry.value || "--", half - 22);
      doc.text(wrapped, baseX, rowY + 11);
    });

    rowY += rowHeight;
  });

  return y + totalHeight + 10;
};

const buildFieldRows = (fields) => {
  const rows = [];
  const shortBuffer = [];

  const flushShortBuffer = () => {
    while (shortBuffer.length > 0) {
      const first = shortBuffer.shift();
      const second = shortBuffer.shift();
      rows.push([first, second].filter(Boolean));
    }
  };

  fields.forEach((field) => {
    if (isLongField(field)) {
      flushShortBuffer();
      rows.push([field]);
      return;
    }
    shortBuffer.push(field);
  });

  flushShortBuffer();
  return rows;
};

const estimateRowHeight = (doc, row, width) => {
  if (row.length === 1) {
    const field = row[0];
    const wrapped = doc.splitTextToSize(field.value || "--", width - 24);
    return 20 + wrapped.length * 12;
  }

  const columnWidth = (width - 18) / 2;
  const maxLines = Math.max(
    ...row.map((field) => doc.splitTextToSize(field.value || "--", columnWidth - 18).length)
  );
  return 20 + maxLines * 12;
};

const estimateRecordHeight = (doc, record, width) => {
  const rows = buildFieldRows(record.fields || []);
  return 26 + rows.reduce((sum, row) => sum + estimateRowHeight(doc, row, width) + 4, 0) + 8;
};

const drawFieldCell = (doc, field, x, y, width) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(...COLORS.subtext);
  doc.text((field.label || "Field").toUpperCase(), x, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.ink);
  const wrapped = doc.splitTextToSize(field.value || "--", width);
  doc.text(wrapped, x, y + 11);
  return wrapped.length * 12 + 11;
};

const drawRecord = (doc, record, y) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const width = pageWidth - PAGE.margin * 2;
  const rows = buildFieldRows(record.fields || []);
  const totalHeight = estimateRecordHeight(doc, record, width);

  doc.setFillColor(255, 255, 255);
  doc.rect(PAGE.margin, y, width, totalHeight, "F");
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.55);
  doc.rect(PAGE.margin, y, width, totalHeight);

  doc.setFillColor(...COLORS.blue);
  doc.rect(PAGE.margin, y, width, 20, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text(record.heading || "Consultation Record", PAGE.margin + 12, y + 13);

  let cursorY = y + 32;
  rows.forEach((row, index) => {
    const rowHeight = estimateRowHeight(doc, row, width);
    if (index > 0) {
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.4);
      doc.line(PAGE.margin + 10, cursorY - 6, PAGE.margin + width - 10, cursorY - 6);
    }

    if (row.length === 1) {
      drawFieldCell(doc, row[0], PAGE.margin + 12, cursorY, width - 24);
    } else {
      const columnWidth = (width - 36) / 2;
      drawFieldCell(doc, row[0], PAGE.margin + 12, cursorY, columnWidth);
      doc.line(PAGE.margin + width / 2, cursorY - 6, PAGE.margin + width / 2, cursorY + rowHeight - 8);
      drawFieldCell(doc, row[1], PAGE.margin + width / 2 + 8, cursorY, columnWidth);
    }

    cursorY += rowHeight + 4;
  });

  return y + totalHeight + 10;
};

export async function downloadLinesAsPdf(lines, fileName = "export.pdf") {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const parsed = parseDocument(lines);
  const pageHeight = doc.internal.pageSize.getHeight();
  const pages = [1];
  let y = PAGE.margin + PAGE.headerHeight;

  drawPageFrame(doc, 1);
  await drawWatermark(doc);
  await drawHeader(doc, parsed.title);
  y = drawMetaTable(doc, parsed.meta, y);

  const nextPage = async () => {
    doc.addPage();
    const pageNumber = doc.getNumberOfPages();
    pages.push(pageNumber);
    drawPageFrame(doc, pageNumber);
    await drawWatermark(doc);
    await drawHeader(doc, parsed.title);
    y = PAGE.margin + PAGE.headerHeight;
  };

  if (!parsed.records.length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10.5);
    doc.setTextColor(...COLORS.subtext);
    doc.text("No consultation records are available for the selected filters.", PAGE.margin, y + 12);
  } else {
    for (const record of parsed.records) {
      const width = doc.internal.pageSize.getWidth() - PAGE.margin * 2;
      const recordHeight = estimateRecordHeight(doc, record, width);
      const bottomLimit = pageHeight - PAGE.margin - PAGE.footerGap - 26;

      if (y + recordHeight > bottomLimit) {
        await nextPage();
      }

      y = drawRecord(doc, record, y);
    }
  }

  const safeFileName = String(fileName || "export.pdf").replace(/\.txt$/i, ".pdf");
  doc.save(safeFileName.endsWith(".pdf") ? safeFileName : `${safeFileName}.pdf`);
}
