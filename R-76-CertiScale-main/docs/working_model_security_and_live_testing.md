# Working Model Security And Live Testing

## Working Model Capabilities

The application now supports a real operational workflow:

- User signs in through backend API login.
- Backend returns a JWT token.
- Reviewer/Admin-only finalization route is protected.
- Instrument details are used as live calculation context.
- Temperature, humidity, pressure, operator, lab, and test time are captured with the observation.
- A technician can enter actual weighing-machine readings during judging.
- The system calculates error, MPE, pass/fail, and the reason immediately.
- The report includes environment traceability.
- PDF export uses browser print-to-PDF.
- Word-compatible export downloads an editable report file.
- QR verification creates a report hash.

## Live Weighing Machine Test Flow

1. Open `http://127.0.0.1:3000/`.
2. Go to Login and sign in as reviewer:
   - Email: `reviewer@legalmetrology.gov.in`
   - Password: `R76Secure@2026`
3. Go to Case Setup.
4. Enter or confirm:
   - Manufacturer
   - Model
   - Accuracy class
   - Max capacity
   - Min capacity
   - Verification scale interval `e`
   - Actual scale interval `d`
5. Enter test-time environment:
   - Temperature
   - Humidity
   - Atmospheric pressure
   - Operator
   - Lab
6. Click `Capture Test-Time Environment`.
7. Go to Test Observations.
8. Select the test type.
9. Place a known reference mass on the weighing machine.
10. Enter the reference mass and the machine's indicated reading.
11. Click `Calculate Pass/Fail`.
12. Explain:
   - `error = indicated reading - reference mass`
   - `n = applied load / e`
   - the system selects the OIML R76 MPE band
   - `PASS` if `abs(error) <= MPE`
   - `FAIL` if `abs(error) > MPE`
13. Click `Save Observation` to add it to the case.
14. Open Compliance and show the saved reading.
15. Open Report Preview and export the report.

## Security Talking Points

- JWT token is issued by the backend after login.
- Report finalization is protected by role-based access.
- Technician can enter observations but cannot finalize legal-consequence reports.
- Reviewer/Admin is required for final approval.
- Tolerance rules are versioned and managed separately from UI code.
- API uses request body limits and basic security headers.

## Production Notes

For actual public deployment, replace seeded users with database-backed accounts, store password hashes using bcrypt, use HTTPS, rotate JWT secrets, and connect the PostgreSQL schema in `server/db/schema.sql`.
