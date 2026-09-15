export const CASE_OWNER_BY_STATUS = Object.freeze({
  draft: "technician",
  testing_in_progress: "technician",
  pending_supervisor_check: "lab_supervisor",
  pending_review: "reviewer",
  pending_director_approval: "director",
  approved: "director",
});

const NEXT_STATUS = Object.freeze({
  draft: "testing_in_progress",
  testing_in_progress: "pending_supervisor_check",
  pending_supervisor_check: "pending_review",
  pending_review: "pending_director_approval",
  pending_director_approval: "approved",
  approved: "report_issued",
});

export function assignedRoleForStatus(status) {
  return CASE_OWNER_BY_STATUS[status] ?? null;
}

export function assertCaseTransition({ currentStatus, nextStatus, actorRole }) {
  const owner = assignedRoleForStatus(currentStatus);
  if (!owner || currentStatus === "failed" || currentStatus === "report_issued") {
    throw new Error(`Cases in ${currentStatus} cannot transition.`);
  }
  if (actorRole !== owner) {
    const error = new Error(`Only the ${owner} role can move a case from ${currentStatus}.`);
    error.code = "FORBIDDEN";
    throw error;
  }
  const permitted = [NEXT_STATUS[currentStatus], "failed"].filter(Boolean);
  if (!permitted.includes(nextStatus)) {
    throw new Error(`Invalid transition from ${currentStatus} to ${nextStatus}.`);
  }
  return { status: nextStatus, assignedRole: assignedRoleForStatus(nextStatus) };
}

export function dashboardFilterForRole(role) {
  if (role === "technician") return { statuses: ["draft", "testing_in_progress"], assignedRole: "technician" };
  if (role === "lab_supervisor") return { statuses: ["pending_supervisor_check"], assignedRole: "lab_supervisor" };
  if (role === "reviewer") return { statuses: ["pending_review"], assignedRole: "reviewer" };
  if (role === "director") return { statuses: ["pending_director_approval"], assignedRole: "director" };
  if (role === "admin") return { statuses: null, assignedRole: null };
  throw new Error("Unsupported role.");
}
