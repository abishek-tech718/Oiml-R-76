# Dataset Analysis

## Dataset 1 - OIML R76 Test Observations

File:

`data/oiml_r76_test_observations_dataset.csv`

Purpose:

This is the main calculation dataset. It supports the rules engine, pass/fail logic, validation, and report generation.

Important fields:

- `instrument_id`
- `model`
- `manufacturer`
- `accuracy_class`
- `max_capacity`
- `min_capacity`
- `scale_interval_e`
- `test_type`
- `reference_mass`
- `indicated_value`
- `error`
- `mpe_allowed`
- `n_intervals`
- `result`
- `ambient_temp_C`
- `ambient_humidity_pct`
- `operator`
- `lab`

Current coverage:

- 124 observation rows.
- 4 instrument cases.
- Accuracy classes II, III, and IIII.
- Test types include weighing test, eccentricity test, repeatability test, and discrimination test.

Use in application:

Import the dataset, select an instrument, show the observation table, calculate MPE, show pass/fail, and generate a report preview.

## Dataset 2 - Model Approval Register

File:

`data/model_approval_register_2026.csv`

Purpose:

This dataset supports repository, search, dashboard, certificate history, and real-world approval-register context.

Important fields:

- `issue_date`
- `file_number`
- `company_name`
- `equipment`
- `certificate_no`
- `online_application_no`
- `pdf_url`

Use in application:

Connect test report generation with searchable model approval history.

## Is The Data Enough?

Yes. Together, the datasets are enough for a professional working application:

- OIML R76 PDF gives the rule source.
- Test observation CSV gives raw readings for calculations.
- Approval register CSV gives dashboard and repository data.

## Data Cleaning Note

Some discrimination-test rows should be reviewed because a few recorded `error` values do not exactly match `indicated_value - reference_mass`. This is useful because the system can show validation flags instead of silently trusting inconsistent data.
