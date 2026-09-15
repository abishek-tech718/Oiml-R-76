# Problem And Solution

## Problem Statement

Non-Automatic Weighing Instruments (NAWIs), such as electronic weighing scales, platform scales, and weighbridges, are used in trade, healthcare, agriculture, transport, and industry. Because wrong weighing directly affects money, safety, and consumer protection, these instruments require model approval under Legal Metrology.

During model approval, designated laboratories test NAWI models according to OIML R76. The current report preparation process is often manual, using spreadsheets and document templates. This creates four major problems:

- Manual calculations can cause error.
- Different labs or staff may prepare reports in different formats.
- Pass/fail decisions may not be easily explainable.
- Searching old reports and approval records is slow.

## Proposed Solution

R76 CertiScale is a software application that automates the NAWI type-evaluation report workflow.

The system captures instrument details, laboratory conditions, and test observations. It then applies OIML R76 rules to calculate error, maximum permissible error, and pass/fail results. Finally, it prepares a standardized report and stores it in a searchable repository.

## Why This Is Different From Generic LIMS

Generic LIMS tools manage lab workflows. They can log samples, assign tests, store records, route approvals, and generate template-based reports. But they do not automatically understand OIML R76.

R76 CertiScale is domain-specific. It is built around:

- NAWI model approval workflow.
- OIML R76 test structure.
- MPE calculation.
- Accuracy class and verification interval logic.
- Explainable pass/fail output.
- Legal Metrology-style report generation.

## Technical Defense Line

"A generic LIMS manages laboratory records. Our system adds the missing technical compliance layer for OIML R76, so the software does not just store test data; it understands whether a weighing instrument passes or fails."
