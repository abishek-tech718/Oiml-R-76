import assert from "node:assert/strict";
import { buildRepositoryTrail } from "../services/repositoryTrail.js";

const toleranceRules = [{ id: "TR-III-01", accuracy_class: "III", load_band_min_e: 0, load_band_max_e: 500, mpe_multiplier_of_e: 0.5, rule_set_version: "R76-1:2006" }];
const instrument = { manufacturer_name: "Chennai Precision", model_number: "CP-150", accuracy_class: "III", verification_scale_interval_e: 5 };
const baseCase = { id: "CASE-TRACE", status: "approved", applicableTestTypes: ["weighing_accuracy", "repeatability"] };

const passed = buildRepositoryTrail({ caseRecord: baseCase, instrument, observations: [{ id: "OBS-PASS", test_type: "weighing_accuracy", applied_load: 1000, indicated_reading: 1002 }], toleranceRules });
assert.equal(passed.tests.length, 2);
assert.equal(passed.tests[0].points[0].compliance.pass_fail, "PASS");
assert.equal(passed.tests[1].testVerdict, "NOT_RECORDED");
assert.equal(passed.failureSummary.failedPointCount, 0);

const failed = buildRepositoryTrail({ caseRecord: { ...baseCase, status: "failed" }, instrument, observations: [{ id: "OBS-FAIL", test_type: "weighing_accuracy", applied_load: 1000, indicated_reading: 1003 }], toleranceRules });
assert.equal(failed.tests.length, 2);
assert.equal(failed.tests[0].testVerdict, "FAIL");
assert.equal(failed.tests[0].failedPoints[0].observation.id, "OBS-FAIL");
assert.deepEqual(failed.failureSummary.failedTestTypes, ["weighing_accuracy"]);
assert.equal(failed.failureSummary.failedPointCount, 1);

console.log("Part 6 repository calculation trail tests passed");
