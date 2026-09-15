import { calculateObservationResult } from "./calculationEngine.js";

/** Builds a uniform calculation trail for approved and failed cases alike. */
export function buildRepositoryTrail({ caseRecord, instrument, observations, toleranceRules }) {
  const observationsByTest = observations.reduce((groups, observation) => {
    groups[observation.test_type] ??= [];
    groups[observation.test_type].push(observation);
    return groups;
  }, {});

  const tests = caseRecord.applicableTestTypes.map((testType) => {
    const points = (observationsByTest[testType] ?? []).map((observation) => {
      const compliance = calculateObservationResult({
        accuracy_class: instrument.accuracy_class,
        e: instrument.verification_scale_interval_e,
        applied_load: observation.applied_load,
        indicated_reading: observation.indicated_reading,
        toleranceRules,
      });
      return { observation, compliance, isFailure: compliance.pass_fail === "FAIL" };
    });
    return {
      testType,
      points,
      observationCount: points.length,
      testVerdict: points.length === 0 ? "NOT_RECORDED" : points.every((point) => point.compliance.pass_fail === "PASS") ? "PASS" : "FAIL",
      failedPoints: points.filter((point) => point.isFailure),
    };
  });

  const failedTests = tests.filter((test) => test.testVerdict === "FAIL");
  return {
    case: caseRecord,
    instrument,
    tests,
    failureSummary: {
      failedTestTypes: failedTests.map((test) => test.testType),
      failedPointCount: failedTests.reduce((total, test) => total + test.failedPoints.length, 0),
    },
  };
}
