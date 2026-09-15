import assert from "node:assert/strict";
import { calculateObservationResult } from "../services/calculationEngine.js";
import { getApplicableTestTypes } from "../services/testApplicabilityEngine.js";

const toleranceRules = [
  { id: "TR-III-01", accuracy_class: "III", load_band_min_e: 0, load_band_max_e: 500, mpe_multiplier_of_e: 0.5, rule_set_version: "R76-1:2006" },
  { id: "TR-III-02", accuracy_class: "III", load_band_min_e: 500, load_band_max_e: 2000, mpe_multiplier_of_e: 1, rule_set_version: "R76-1:2006" },
  { id: "TR-III-03", accuracy_class: "III", load_band_min_e: 2000, load_band_max_e: 10000, mpe_multiplier_of_e: 1.5, rule_set_version: "R76-1:2006" },
];

const pass = calculateObservationResult({ accuracy_class: "III", e: 5, applied_load: 1500, indicated_reading: 1502.4, toleranceRules });
assert.equal(pass.pass_fail, "PASS");
assert.equal(pass.error, 2.4);
assert.equal(pass.mpe, 2.5);
assert.equal(pass.band_used.rule_id, "TR-III-01");

const fail = calculateObservationResult({ accuracy_class: "III", e: 5, applied_load: 1500, indicated_reading: 1502.51, toleranceRules });
assert.equal(fail.pass_fail, "FAIL");

const boundary = calculateObservationResult({ accuracy_class: "III", e: 5, applied_load: 1500, indicated_reading: 1502.5, toleranceRules });
assert.equal(boundary.pass_fail, "PASS");
assert.equal(boundary.error, boundary.mpe);

const zeroLoad = calculateObservationResult({ accuracy_class: "III", e: 5, applied_load: 0, indicated_reading: 0, toleranceRules });
assert.equal(zeroLoad.band_used.rule_id, "TR-III-01");

const applicabilityRules = [
  { test_type: "weighing_accuracy", always_applies: true },
  { test_type: "repeatability", always_applies: true },
  { test_type: "tare_operation", applies_if_feature: "tare", always_applies: false },
  { test_type: "voltage_variation", applies_if_electronic: true, always_applies: false },
  { test_type: "electromagnetic_immunity", applies_if_electronic: true, always_applies: false },
];

const electronicWithTare = getApplicableTestTypes({ is_electronic: true, declared_features: ["tare", "zero_tracking"] }, applicabilityRules);
const mechanicalWithoutTare = getApplicableTestTypes({ is_electronic: false, declared_features: [] }, applicabilityRules);
assert.deepEqual(electronicWithTare, ["weighing_accuracy", "repeatability", "tare_operation", "voltage_variation", "electromagnetic_immunity"]);
assert.deepEqual(mechanicalWithoutTare, ["weighing_accuracy", "repeatability"]);

console.log("Part 3 calculation and applicability engine tests passed");
