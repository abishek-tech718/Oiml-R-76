import assert from "node:assert/strict";
import { assertCaseTransition, dashboardFilterForRole } from "../services/caseWorkflow.js";

assert.deepEqual(dashboardFilterForRole("technician"), { statuses: ["draft", "testing_in_progress"], assignedRole: "technician" });
assert.deepEqual(dashboardFilterForRole("lab_supervisor"), { statuses: ["pending_supervisor_check"], assignedRole: "lab_supervisor" });
assert.deepEqual(dashboardFilterForRole("reviewer"), { statuses: ["pending_review"], assignedRole: "reviewer" });
assert.deepEqual(dashboardFilterForRole("director"), { statuses: ["pending_director_approval"], assignedRole: "director" });
assert.deepEqual(dashboardFilterForRole("admin"), { statuses: null, assignedRole: null });

assert.deepEqual(
  assertCaseTransition({ currentStatus: "testing_in_progress", nextStatus: "pending_supervisor_check", actorRole: "technician" }),
  { status: "pending_supervisor_check", assignedRole: "lab_supervisor" },
);
assert.deepEqual(
  assertCaseTransition({ currentStatus: "pending_supervisor_check", nextStatus: "failed", actorRole: "lab_supervisor" }),
  { status: "failed", assignedRole: null },
);
assert.throws(
  () => assertCaseTransition({ currentStatus: "pending_supervisor_check", nextStatus: "pending_review", actorRole: "technician" }),
  (error) => error.code === "FORBIDDEN",
);
assert.throws(
  () => assertCaseTransition({ currentStatus: "pending_review", nextStatus: "approved", actorRole: "reviewer" }),
  /Invalid transition/,
);

console.log("Part 4 workflow policy tests passed");
