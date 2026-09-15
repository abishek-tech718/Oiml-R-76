function normalizeFeature(value) {
  return String(value ?? "").trim().toLowerCase();
}

/**
 * Filters TestApplicabilityRules for a single instrument. Rule order is retained
 * so a database query ordered by test_type remains deterministic.
 */
export function getApplicableTestTypes({ is_electronic, declared_features = [] }, applicabilityRules) {
  if (!Array.isArray(applicabilityRules)) throw new Error("applicabilityRules must be an array.");
  if (!Array.isArray(declared_features)) throw new Error("declared_features must be an array.");

  const isElectronic = Boolean(is_electronic);
  const features = new Set(declared_features.map(normalizeFeature).filter(Boolean));
  return applicabilityRules
    .filter((rule) => {
      const alwaysApplies = Boolean(rule.always_applies ?? rule.alwaysApplies);
      const electronicCondition = rule.applies_if_electronic ?? rule.appliesIfElectronic;
      const featureCondition = normalizeFeature(rule.applies_if_feature ?? rule.appliesIfFeature);
      return alwaysApplies || electronicCondition === isElectronic || (featureCondition && features.has(featureCondition));
    })
    .map((rule) => rule.test_type ?? rule.testType);
}
