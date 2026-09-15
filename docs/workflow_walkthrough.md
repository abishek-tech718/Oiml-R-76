# Workflow Walkthrough

## Walkthrough Order

1. Login as Reviewer.
2. Open Workflow and explain the 9-stage pipeline.
3. Open Dashboard and show real dataset counts.
4. Open Case Setup and explain Max, Min, e, d, and accuracy class.
5. Open Test Observations and show imported readings.
6. Open Compliance and explain `error <= mpe`.
7. Open Rules Engine and show OIML R76 Table 6 rule trace.
8. Open Review and show mandatory-test gating.
9. Open Report Preview and explain PDF/DOCX export.
10. Open Repository and search approval history.
11. Open Admin and show versioned tolerance rules.

## One-Minute Explanation

"The workflow starts when a technician creates a case for a NAWI model. The lab records environment conditions and test observations. The rules engine calculates the error and maximum permissible error using OIML R76 tolerance rules stored as data. The reviewer can approve the report only when all mandatory tests are present and validation flags are cleared. After approval, the system generates report outputs and stores them in the repository."

## Defendable Technical Point

The most important technical point is that tolerance rules are not hidden inside UI code. They are stored separately in `data/tolerance_rules_r76_2006.csv` and represented in the database by the `tolerance_rules` table. This supports future OIML revisions.
