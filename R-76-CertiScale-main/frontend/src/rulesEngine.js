import { numberValue } from "./dataLoader.js";

export function normalizeRules(rows) {
  return rows.map((row) => ({
    id: row.id,
    ruleSetVersion: row.rule_set_version,
    accuracyClass: row.accuracy_class,
    minE: numberValue(row.load_band_min_e),
    maxE: row.load_band_max_e === "" ? Infinity : numberValue(row.load_band_max_e),
    multiplier: numberValue(row.mpe_multiplier_of_e),
    source: row.source,
  }));
}

export function calculateMpe(row, rules = []) {
  const accuracyClass = row.accuracy_class;
  const e = numberValue(row.scale_interval_e);
  const nIntervals = numberValue(row.n_intervals);
  const bands = rules.filter((item) => item.accuracyClass === accuracyClass);
  const band = bands.find((item) => nIntervals > item.minE && nIntervals <= item.maxE) ?? bands[0];
  if (!band) return 0;
  return band.multiplier * e;
}

export function findAppliedRule(row, rules = []) {
  const accuracyClass = row.accuracy_class;
  const nIntervals = numberValue(row.n_intervals);
  const bands = rules.filter((item) => item.accuracyClass === accuracyClass);
  return bands.find((item) => nIntervals > item.minE && nIntervals <= item.maxE) ?? bands[0] ?? null;
}

export function evaluateObservation(row, rules = []) {
  const reference = numberValue(row.reference_mass);
  const indicated = numberValue(row.indicated_value);
  const recordedError = numberValue(row.error);
  const calculatedError = indicated - reference;
  const appliedRule = findAppliedRule(row, rules);
  const allowedMpe = numberValue(row.mpe_allowed) || calculateMpe(row, rules);
  const computedResult = Math.abs(recordedError) <= allowedMpe ? "PASS" : "FAIL";
  const recalculatedResult = Math.abs(calculatedError) <= allowedMpe ? "PASS" : "FAIL";

  return {
    calculatedError,
    allowedMpe,
    computedResult,
    recalculatedResult,
    appliedRule,
    errorMismatch: Math.abs(calculatedError - recordedError) > 0.02,
    resultMismatch: computedResult !== String(row.result).trim().toUpperCase(),
  };
}

export function summarizeObservations(rows, rules = []) {
  const results = rows.map((row) => ({ row, check: evaluateObservation(row, rules) }));
  const failCount = rows.filter((row) => String(row.result).trim().toUpperCase() === "FAIL").length;
  const instruments = new Set(rows.map((row) => row.instrument_id)).size;
  const testTypes = new Set(rows.map((row) => row.test_type)).size;
  const dataIssues = results.filter(({ check }) => check.errorMismatch || check.resultMismatch);

  return {
    total: rows.length,
    pass: rows.length - failCount,
    fail: failCount,
    instruments,
    testTypes,
    dataIssues,
    verdict: failCount === 0 ? "PASS" : "REVIEW REQUIRED",
  };
}

export function groupBy(rows, key) {
  return rows.reduce((groups, row) => {
    const label = row[key] || "Unknown";
    groups[label] = groups[label] ?? [];
    groups[label].push(row);
    return groups;
  }, {});
}
