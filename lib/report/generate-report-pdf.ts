import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import type { QuestionCategory } from "@/lib/mock-data";
import { reportMock } from "@/lib/mock-data";
import type { ReportViewModel } from "@/lib/report/from-session";

export type ReportPdfModel = {
  grade: string;
  overallScore: number;
  subtext: string;
  metrics: { category: string; scoreLabel: string }[];
  strengths: string[];
  improvements: string[];
  studyPlan: string[];
  rows: { id: number; category: string; score: number | null; feedback: string }[];
};

const MARGIN = 16;
const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];
const LINE: [number, number, number] = [226, 232, 240];
const HEAD_FILL: [number, number, number] = [30, 41, 59];
const STRIPE: [number, number, number] = [248, 250, 252];

function pageHeight(doc: jsPDF) {
  return doc.internal.pageSize.getHeight();
}

function pageWidth(doc: jsPDF) {
  return doc.internal.pageSize.getWidth();
}

function contentWidth(doc: jsPDF) {
  return pageWidth(doc) - MARGIN * 2;
}

function ensureVerticalSpace(doc: jsPDF, y: number, needMm: number): number {
  const ph = pageHeight(doc);
  if (y + needMm > ph - MARGIN) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function drawWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function drawBulletList(
  doc: jsPDF,
  items: string[],
  startY: number,
  maxWidth: number
): number {
  let y = startY;
  const lineHeight = 4.2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...INK);

  for (const item of items) {
    const bullet = `\u2022  ${item}`;
    const lines = doc.splitTextToSize(bullet, maxWidth - 4);
    const blockH = lines.length * lineHeight + 1.5;
    y = ensureVerticalSpace(doc, y, blockH + 2);
    doc.text(lines, MARGIN + 2, y);
    y += blockH;
  }
  return y;
}

export function buildReportPdfModel(
  display: ReportViewModel | null,
  questionRows: ReportPdfModel["rows"],
  metricOrder: QuestionCategory[]
): ReportPdfModel {
  return {
    grade: display?.grade ?? reportMock.grade,
    overallScore: display?.overallScore ?? reportMock.overallScore,
    subtext: display?.subtext ?? reportMock.subtext,
    metrics: metricOrder.map((k) => {
      if (display) {
        const v = display.metrics[k];
        return {
          category: k,
          scoreLabel: v == null ? "—" : `${v.toFixed(1)}/10`,
        };
      }
      const v = reportMock.metrics[k as keyof typeof reportMock.metrics];
      return { category: k, scoreLabel: `${Number(v).toFixed(1)}/10` };
    }),
    strengths: display?.strengths ?? [...reportMock.strengths],
    improvements: display?.improvements ?? [...reportMock.improvements],
    studyPlan: display?.studyPlan ?? [...reportMock.studyPlan],
    rows: questionRows,
  };
}

/**
 * Vector PDF (crisp text, wrapped cells) from structured report data.
 */
export function downloadReportPdf(model: ReportPdfModel, fileName: string): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const w = contentWidth(doc);
  let y = MARGIN;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...INK);
  doc.text("Interview report", MARGIN, y);
  y += 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.text(new Date().toLocaleString(), MARGIN, y);
  y += 6;

  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.35);
  doc.line(MARGIN, y, pageWidth(doc) - MARGIN, y);
  y += 10;

  doc.setTextColor(...INK);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("OVERALL GRADE", MARGIN, y);
  // jsPDF uses baselines: 26pt grade extends far above its baseline, so we need a
  // clear gap below the label line (5mm was too tight and overlapped the heading).
  y += 12;

  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text(model.grade, MARGIN, y);
  const gradeW = doc.getTextWidth(model.grade);
  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text(`${model.overallScore.toFixed(1)} / 10`, MARGIN + gradeW + 6, y);
  y += 10;

  doc.setFontSize(10.5);
  doc.setTextColor(...MUTED);
  y = drawWrappedText(doc, model.subtext, MARGIN, y, w, 4.8) + 6;
  doc.setTextColor(...INK);

  y = ensureVerticalSpace(doc, y, 40);
  autoTable(doc, {
    startY: y,
    head: [["Category", "Average score"]],
    body: model.metrics.map((m) => [m.category, m.scoreLabel]),
    theme: "plain",
    styles: {
      fontSize: 10,
      cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
      textColor: INK,
      lineColor: LINE,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: HEAD_FILL,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 75 },
      1: { cellWidth: 40, halign: "right", fontStyle: "bold" },
    },
    margin: { left: MARGIN, right: MARGIN },
    tableLineColor: LINE,
    tableLineWidth: 0.2,
  });

  const docWithTable = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  y = (docWithTable.lastAutoTable?.finalY ?? y) + 14;

  y = ensureVerticalSpace(doc, y, 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text("Strengths", MARGIN, y);
  y += 6;
  y = drawBulletList(doc, model.strengths, y, w) + 8;

  y = ensureVerticalSpace(doc, y, 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Areas to improve", MARGIN, y);
  y += 6;
  y = drawBulletList(doc, model.improvements, y, w) + 8;

  y = ensureVerticalSpace(doc, y, 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Study plan", MARGIN, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let n = 1;
  for (const line of model.studyPlan) {
    const lines = doc.splitTextToSize(`${n}. ${line}`, w - 4);
    const h = lines.length * 4.3 + 2;
    y = ensureVerticalSpace(doc, y, h);
    doc.setTextColor(...INK);
    doc.text(lines, MARGIN + 2, y);
    y += h;
    n += 1;
  }
  y += 6;

  y = ensureVerticalSpace(doc, y, 30);
  autoTable(doc, {
    startY: y,
    head: [["Q#", "Category", "Score", "Feedback"]],
    body: model.rows.map((r) => [
      String(r.id),
      r.category,
      r.score == null ? "—" : `${r.score.toFixed(1)}/10`,
      r.score == null ? "No answer submitted for this question." : r.feedback || "—",
    ]),
    theme: "striped",
    styles: {
      fontSize: 9,
      cellPadding: { top: 3, right: 2.5, bottom: 3, left: 2.5 },
      valign: "top",
      overflow: "linebreak",
      textColor: INK,
      lineColor: LINE,
    },
    headStyles: {
      fillColor: HEAD_FILL,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: STRIPE },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 28 },
      2: { cellWidth: 22, halign: "center" },
      3: { cellWidth: "auto" },
    },
    margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: 14 },
    showHead: "everyPage",
    tableWidth: "auto",
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      `PrepAI mock interview report · Page ${i} of ${pageCount}`,
      MARGIN,
      pageHeight(doc) - 8
    );
  }

  doc.save(fileName);
}
