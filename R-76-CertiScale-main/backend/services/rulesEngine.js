export function calculateObservation({ accuracyClass, e, appliedLoad, indicatedReading, toleranceRules }) {
  const nIntervals = appliedLoad / e;
  const rule = toleranceRules.find((item) => {
    return item.accuracyClass === accuracyClass && nIntervals > item.minE && nIntervals <= item.maxE;
  });

  if (!rule) {
    throw new Error(`No tolerance rule for class ${accuracyClass} at ${nIntervals}e`);
  }

  const mpe = rule.multiplier * e;
  const error = indicatedReading - appliedLoad;

  return {
    error,
    mpe,
    nIntervals,
    ruleId: rule.id,
    ruleSetVersion: rule.ruleSetVersion,
    result: Math.abs(error) <= mpe ? "PASS" : "FAIL",
  };
}

export function rollupVerdict(observations) {
  const byTest = observations.reduce((groups, item) => {
    groups[item.testType] = groups[item.testType] ?? [];
    groups[item.testType].push(item);
    return groups;
  }, {});

  const testVerdicts = Object.fromEntries(
    Object.entries(byTest).map(([testType, rows]) => [
      testType,
      rows.every((row) => row.result === "PASS") ? "PASS" : "FAIL",
    ]),
  );

  return {
    testVerdicts,
    overallVerdict: Object.values(testVerdicts).every((verdict) => verdict === "PASS") ? "PASS" : "FAIL",
  };
}

export function isValidVerificationInterval(e) {
  if (!Number.isFinite(e) || e <= 0) return false;
  const exponent = Math.floor(Math.log10(e));
  const normalized = e / 10 ** exponent;
  return [1, 2, 5].some((allowed) => Math.abs(normalized - allowed) < 1e-9);
}
