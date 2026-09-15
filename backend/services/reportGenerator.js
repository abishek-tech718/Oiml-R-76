import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

const navy = rgb(0.06, 0.15, 0.3);
const teal = rgb(0.02, 0.42, 0.42);
const red = rgb(0.72, 0.1, 0.12);
const grey = rgb(0.32, 0.37, 0.43);
const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 42;

function displayTest(testType) {
  return String(testType).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function roleLabel(role) {
  return { technician: "Technician", lab_supervisor: "Lab Supervisor", reviewer: "Reviewer", director: "Director", admin: "Administrator" }[role] ?? role;
}

function dateText(value) {
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function reportVerdict(trail) {
  return trail.failureSummary.failedPointCount === 0 ? "PASS" : "FAIL";
}

export function buildReportModel({ trail, labConditions, auditLogs, actors, generatedAt = new Date().toISOString() }) {
  const conditionsByTest = Object.groupBy(labConditions, (condition) => condition.test_type);
  const actorsById = new Map(actors.filter(Boolean).map((actor) => [actor.id, actor]));
  const actions = auditLogs.map((audit) => {
    const actor = actorsById.get(audit.userId ?? audit.user_id);
    return { action: audit.action, timestamp: audit.timestamp, name: actor?.name ?? "Unknown user", role: roleLabel(actor?.role ?? "") };
  });
  return {
    title: "Non-Automatic Weighing Instrument Test Report",
    standard: "OIML R 76-2 / Legal Metrology",
    generatedAt,
    issueDate: dateText(generatedAt),
    verdict: reportVerdict(trail),
    trail,
    actions,
    tests: trail.tests.map((test) => ({ ...test, label: displayTest(test.testType), labConditions: conditionsByTest[test.testType] ?? [] })),
  };
}

async function loadImage(pdf, filePath) {
  if (!filePath) return null;
  const extension = path.extname(filePath).toLowerCase();
  const bytes = await readFile(filePath);
  if (extension === ".png") return pdf.embedPng(bytes);
  if ([".jpg", ".jpeg"].includes(extension)) return pdf.embedJpg(bytes);
  throw new Error("Report images must be PNG or JPEG files.");
}

function drawTableHeader(page, y, font) {
  const headers = [[42, "Applied load"], [112, "Indicated"], [182, "Error"], [230, "MPE"], [274, "Rule"], [348, "Load band"], [441, "Result"]];
  page.drawRectangle({ x: margin, y: y - 15, width: pageWidth - margin * 2, height: 18, color: navy });
  headers.forEach(([x, text]) => page.drawText(text, { x, y: y - 10, size: 7, font, color: rgb(1, 1, 1) }));
}

function drawPdfHeader(page, fonts, branding, model, pageNumber) {
  page.drawRectangle({ x: 0, y: pageHeight - 74, width: pageWidth, height: 74, color: navy });
  if (branding.logo) {
    const logoSize = branding.logo.scaleToFit(52, 46);
    page.drawImage(branding.logo, { x: margin, y: pageHeight - 61, width: logoSize.width, height: logoSize.height });
  }
  const titleX = branding.logo ? 108 : margin;
  page.drawText("LEGAL METROLOGY", { x: titleX, y: pageHeight - 31, size: 9, font: fonts.bold, color: rgb(1, 1, 1) });
  page.drawText("Non-Automatic Weighing Instrument Test Report", { x: titleX, y: pageHeight - 48, size: 13, font: fonts.bold, color: rgb(1, 1, 1) });
  page.drawText(`Case ${model.trail.case.id}  |  ${model.standard}`, { x: titleX, y: pageHeight - 62, size: 7.5, font: fonts.regular, color: rgb(0.85, 0.92, 0.96) });
  page.drawText(`Issue date: ${model.issueDate}  |  Page ${pageNumber}`, { x: margin, y: 20, size: 7, font: fonts.regular, color: grey });
}

function drawWatermark(page, branding) {
  if (branding.watermarkImage) {
    const size = branding.watermarkImage.scaleToFit(250, 250);
    page.drawImage(branding.watermarkImage, { x: (pageWidth - size.width) / 2, y: (pageHeight - size.height) / 2, width: size.width, height: size.height, opacity: 0.1 });
  }
  if (branding.watermarkText) {
    page.drawText(branding.watermarkText, { x: 150, y: 360, size: 42, font: branding.font, color: rgb(0.76, 0.8, 0.84), opacity: 0.22, rotate: degrees(42) });
  }
}

export async function generateReportFiles({ outputDir, logoPath, watermarkText, watermarkImagePath, model }) {
  await mkdir(outputDir, { recursive: true });
  const caseId = String(model.trail.case.id).replace(/[^A-Za-z0-9_-]/g, "_");
  const stamp = model.generatedAt.replace(/[:.]/g, "-");
  const baseName = `${caseId}-${stamp}`;
  const pdfFile = path.join(outputDir, `${baseName}.pdf`);
  const docxFile = path.join(outputDir, `${baseName}.docx`);
  const pdf = await PDFDocument.create();
  const fonts = { regular: await pdf.embedFont(StandardFonts.Helvetica), bold: await pdf.embedFont(StandardFonts.HelveticaBold) };
  const branding = { logo: await loadImage(pdf, logoPath), watermarkImage: await loadImage(pdf, watermarkImagePath), watermarkText: String(watermarkText ?? "").trim(), font: fonts.bold };
  let pageNumber = 0;
  function newPage() {
    const page = pdf.addPage([pageWidth, pageHeight]);
    pageNumber += 1;
    drawPdfHeader(page, fonts, branding, model, pageNumber);
    drawWatermark(page, branding);
    return { page, y: pageHeight - 98 };
  }
  let cursor = newPage();
  const line = (text, options = {}) => {
    if (cursor.y < 58) cursor = newPage();
    cursor.page.drawText(String(text), { x: options.x ?? margin, y: cursor.y, size: options.size ?? 8.5, font: options.bold ? fonts.bold : fonts.regular, color: options.color ?? navy, maxWidth: options.maxWidth ?? pageWidth - margin * 2 });
    cursor.y -= options.gap ?? 14;
  };
  line("Instrument and Case Details", { size: 13, bold: true, color: teal, gap: 20 });
  const instrument = model.trail.instrument;
  [["Manufacturer", instrument.manufacturer_name], ["Address", instrument.manufacturer_address || "-"], ["Model", instrument.model_number], ["Accuracy class", instrument.accuracy_class], ["Max / Min capacity", `${instrument.max_capacity ?? "-"} / ${instrument.min_capacity ?? "-"}`], ["Verification interval e", instrument.verification_scale_interval_e]].forEach(([label, value]) => line(`${label}: ${value}`, { bold: label === "Manufacturer" }));
  cursor.y -= 6;
  line(`Overall verdict: ${model.verdict}`, { size: 12, bold: true, color: model.verdict === "PASS" ? teal : red, gap: 20 });
  line("Authorised Case Activity", { size: 13, bold: true, color: teal, gap: 16 });
  model.actions.forEach((action) => line(`${action.role || "Role unavailable"}: ${action.name} - ${action.action} (${dateText(action.timestamp)})`, { size: 7.7, gap: 11 }));

  for (const test of model.tests) {
    if (cursor.y < 170) cursor = newPage();
    line(test.label, { size: 11, bold: true, color: test.testVerdict === "FAIL" ? red : teal, gap: 12 });
    const condition = test.labConditions.at(-1);
    line(condition ? `Lab conditions: ${condition.temperature} C | ${condition.humidity}% RH | ${condition.atmospheric_pressure} hPa | recorded ${dateText(condition.recorded_at)}` : "Lab conditions: no recorded condition", { size: 7.5, color: grey, gap: 13 });
    drawTableHeader(cursor.page, cursor.y, fonts.bold);
    cursor.y -= 23;
    if (!test.points.length) {
      line("No observation recorded for this applicable test type.", { size: 8, color: grey });
      continue;
    }
    for (const point of test.points) {
      if (cursor.y < 58) { cursor = newPage(); drawTableHeader(cursor.page, cursor.y, fonts.bold); cursor.y -= 23; }
      const c = point.compliance;
      const row = [point.observation.applied_load, point.observation.indicated_reading, c.error, c.mpe, c.band_used.rule_id, `${c.band_used.load_band_min_e}e-${c.band_used.load_band_max_e ?? "above"}e`, c.pass_fail];
      const positions = [42, 112, 182, 230, 274, 348, 441];
      row.forEach((value, index) => cursor.page.drawText(String(value), { x: positions[index], y: cursor.y, size: 7.2, font: index === 6 ? fonts.bold : fonts.regular, color: index === 6 && value === "FAIL" ? red : navy }));
      cursor.page.drawLine({ start: { x: margin, y: cursor.y - 4 }, end: { x: pageWidth - margin, y: cursor.y - 4 }, thickness: 0.25, color: rgb(0.8, 0.84, 0.88) });
      cursor.y -= 13;
    }
    cursor.y -= 7;
  }
  await writeFile(pdfFile, await pdf.save());

  const cell = (value, bold = false) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(value), bold, size: 18 })] })] });
  const document = new Document({ sections: [{ properties: {}, children: [
    new Paragraph({ text: "LEGAL METROLOGY", alignment: AlignmentType.CENTER, heading: HeadingLevel.HEADING_2 }),
    new Paragraph({ text: model.title, alignment: AlignmentType.CENTER, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: `${model.standard} | Case ${model.trail.case.id} | Issue date ${model.issueDate}`, alignment: AlignmentType.CENTER }),
    ...(branding.watermarkText ? [new Paragraph({ text: branding.watermarkText, alignment: AlignmentType.CENTER, spacing: { after: 180 }, children: [new TextRun({ text: branding.watermarkText, color: "B7C1CB", size: 28, bold: true })] })] : []),
    new Paragraph({ text: "Instrument and Case Details", heading: HeadingLevel.HEADING_1 }),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [["Manufacturer", instrument.manufacturer_name], ["Address", instrument.manufacturer_address || "-"], ["Model", instrument.model_number], ["Accuracy class", instrument.accuracy_class], ["Verification interval e", instrument.verification_scale_interval_e], ["Overall verdict", model.verdict]].map(([label, value]) => new TableRow({ children: [cell(label, true), cell(value)] })) }),
    new Paragraph({ text: "Authorised Case Activity", heading: HeadingLevel.HEADING_1 }),
    ...model.actions.map((action) => new Paragraph({ text: `${action.role || "Role unavailable"}: ${action.name} - ${action.action} (${dateText(action.timestamp)})` })),
    new Paragraph({ text: "Test Results", heading: HeadingLevel.HEADING_1 }),
    ...model.tests.flatMap((test) => [
      new Paragraph({ text: `${test.label} - ${test.testVerdict}`, heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: test.labConditions.at(-1) ? `Lab conditions: ${test.labConditions.at(-1).temperature} C, ${test.labConditions.at(-1).humidity}% RH, ${test.labConditions.at(-1).atmospheric_pressure} hPa` : "Lab conditions: no recorded condition" }),
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
        new TableRow({ children: ["Applied load", "Indicated", "Error", "MPE", "Rule", "Band", "Result"].map((label) => cell(label, true)) }),
        ...(test.points.length ? test.points.map((point) => new TableRow({ children: [point.observation.applied_load, point.observation.indicated_reading, point.compliance.error, point.compliance.mpe, point.compliance.band_used.rule_id, `${point.compliance.band_used.load_band_min_e}e-${point.compliance.band_used.load_band_max_e ?? "above"}e`, point.compliance.pass_fail].map((value) => cell(value)) })) : [new TableRow({ children: [new TableCell({ columnSpan: 7, children: [new Paragraph("No observation recorded for this applicable test type.")] })] })]),
      ] }),
    ]),
  ] }] });
  await writeFile(docxFile, await Packer.toBuffer(document));
  return { pdfFile, docxFile };
}
