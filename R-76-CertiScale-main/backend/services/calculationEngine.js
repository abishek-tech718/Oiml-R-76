function number(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a finite number.`);
  return parsed;
}

function measurementValue(value) {
  return Math.round((value + Number.EPSILON) * 1e12) / 1e12;
}

function normalizeRule(rule) {
  return {
    id: rule.id,
    accuracyClass: rule.accuracyClass ?? rule.accuracy_class,
    minE: number(rule.minE ?? rule.load_band_min_e, "load_band_min_e"),
    maxE: rule.maxE ?? rule.load_band_max_e ?? null,
    multiplier: number(rule.multiplier ?? rule.mpe_multiplier_of_e, "mpe_multiplier_of_e"),
    ruleSetVersion: rule.ruleSetVersion ?? rule.rule_set_version,
  };
}

/**
 * Calculates the OIML R 76-1:2006 initial-verification result for one reading.
 * Tolerance rules are supplied by the caller after retrieval from ToleranceRules.
 */
export function calculateObservationResult({ accuracy_class, e, applied_load, indicated_reading, toleranceRules }) {
  const accuracyClass = String(accuracy_class ?? "").trim().toUpperCase();
  const verificationInterval = number(e, "e");
  const appliedLoad = number(applied_load, "applied_load");
  const indicatedReading = number(indicated_reading, "indicated_reading");
  if (verificationInterval <= 0) throw new Error("e must be greater than zero.");
  if (appliedLoad < 0) throw new Error("applied_load cannot be negative.");
  if (!Array.isArray(toleranceRules)) throw new Error("toleranceRules must be an array.");

  const loadInE = appliedLoad / verificationInterval;
  const band = toleranceRules
    .map(normalizeRule)
    .find((rule) => {
      const lowerBoundMatches = rule.minE === 0 ? loadInE >= 0 : loadInE > rule.minE;
      return rule.accuracyClass === accuracyClass && lowerBoundMatches && (rule.maxE === null || loadInE <= Number(rule.maxE));
    });

  if (!band) throw new Error(`No tolerance rule found for class ${accuracyClass} at ${loadInE}e.`);

  const mpe = measurementValue(band.multiplier * verificationInterval);
  const error = measurementValue(indicatedReading - appliedLoad);
  return {
    pass_fail: Math.abs(error) <= mpe ? "PASS" : "FAIL",
    error,
    mpe,
    band_used: {
      rule_id: band.id,
      accuracy_class: band.accuracyClass,
      load_band_min_e: band.minE,
      load_band_max_e: band.maxE === null ? null : Number(band.maxE),
      mpe_multiplier_of_e: band.multiplier,
      rule_set_version: band.ruleSetVersion,
      applied_load_in_e: loadInE,
    },
  };
}
