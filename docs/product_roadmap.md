# Product Roadmap

## Phase 1 - Foundation

- Study OIML R76-1 requirements.
- Identify required NAWI tests.
- Prepare structured test observation dataset.
- Prepare approval-register dataset.
- Design database schema.

## Phase 2 - Case Setup

- Manufacturer details.
- Model details.
- Instrument specifications.
- Accuracy class.
- Max capacity.
- Min capacity.
- Verification scale interval e.
- Actual scale interval d.
- Laboratory and environmental conditions.

## Phase 3 - Test Observation Entry

- Weighing test increasing load.
- Weighing test decreasing load.
- Repeatability test.
- Eccentricity test.
- Discrimination test.
- Future support for temperature, creep, damp heat, power supply, and other applicable tests.

## Phase 4 - Rules Engine

- Calculate n = Max / e.
- Select correct OIML R76 MPE band.
- Compare actual error with allowed MPE.
- Mark every observation as PASS or FAIL.
- Show the reason behind the decision.
- Flag inconsistent rows before report generation.

## Phase 5 - Report Generation

- Auto-fill report with case details.
- Add test summaries.
- Add pass/fail results.
- Add reviewer section.
- Export to PDF and editable format in a full implementation.

## Phase 6 - Repository And Dashboard

- Store completed reports.
- Search by manufacturer, model, certificate, or equipment type.
- Show dashboard statistics.
- Track completed, pending, pass, fail, and review-required cases.

## Phase 7 - Future Enhancements

- Digital signature.
- QR verification.
- Role-based login.
- Offline data entry.
- Regulation versioning.
- API connection with Legal Metrology systems.
- Optional serial/USB weighing instrument integration.
