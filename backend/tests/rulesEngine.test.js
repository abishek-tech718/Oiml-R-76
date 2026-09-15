import assert from "node:assert/strict";
import { calculateObservation, isValidVerificationInterval, rollupVerdict } from "../services/rulesEngine.js";

const toleranceRules = [
  { id: "TR-III-01", ruleSetVersion: "R76-1:2006", accuracyClass: "III", minE: 0, maxE: 500, multiplier: 0.5 },
  { id: "TR-III-02", ruleSetVersion: "R76-1:2006", accuracyClass: "III", minE: 500, maxE: 2000, multiplier: 1.0 },
  { id: "TR-III-03", ruleSetVersion: "R76-1:2006", accuracyClass: "III", minE: 2000, maxE: 10000, multiplier: 1.5 },
];

const pass = calculateObservation({
  accuracyClass: "III",
  e: 5,
  appliedLoad: 1500,
  indicatedReading: 1501.3,
  toleranceRules,
});

assert.equal(pass.ruleId, "TR-III-01");
assert.equal(pass.mpe, 2.5);
assert.equal(pass.result, "PASS");

const fail = calculateObservation({
  accuracyClass: "III",
  e: 5,
  appliedLoad: 15000,
  indicatedReading: 15010,
  toleranceRules,
});

assert.equal(fail.ruleId, "TR-III-03");
assert.equal(fail.mpe, 7.5);
assert.equal(fail.result, "FAIL");

assert.equal(isValidVerificationInterval(5), true);
assert.equal(isValidVerificationInterval(20), true);
assert.equal(isValidVerificationInterval(3), false);

assert.deepEqual(
  rollupVerdict([
    { testType: "accuracy", result: "PASS" },
    { testType: "accuracy", result: "PASS" },
    { testType: "eccentricity", result: "FAIL" },
  ]),
  {
    testVerdicts: {
      accuracy: "PASS",
      eccentricity: "FAIL",
    },
    overallVerdict: "FAIL",
  },
);

console.log("Rules engine tests passed");
