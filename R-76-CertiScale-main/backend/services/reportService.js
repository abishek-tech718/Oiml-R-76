export function buildReportSummary({ caseRecord, instrument, labConditions, observations, verdict }) {
  return {
    title: "Non-Automatic Weighing Instrument Type Evaluation Report",
    standard: caseRecord.ruleSetVersion,
    caseId: caseRecord.id,
    instrument,
    labConditions,
    observationCount: observations.length,
    verdict,
    generatedAt: new Date().toISOString(),
    exports: {
      pdf: `reports/${caseRecord.id}.pdf`,
      docx: `reports/${caseRecord.id}.docx`,
    },
  };
}
