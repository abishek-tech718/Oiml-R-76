# Presentation Notes

## 1. Problem Opening

"Non-Automatic Weighing Instruments are used in trade, healthcare, agriculture, and industry. Even a small weighing error can affect money, safety, and consumer trust. During model approval, labs test these instruments according to OIML R76, but report preparation is still often manual using spreadsheets and document templates."

## 2. Pain Point

"Manual preparation causes calculation mistakes, inconsistent report formats, slow approval tracking, and weak traceability."

## 3. Solution Introduction

"Our solution is R76 CertiScale, an automated NAWI model approval and test report system. It captures instrument details, imports test observations, applies OIML R76 MPE rules, gives explainable pass/fail results, and generates a standardized report."

## 4. Workflow Presentation Order

1. Show dashboard.
2. Show case setup with manufacturer, model, Max, Min, e, d, and accuracy class.
3. Show lab conditions.
4. Import test observations.
5. Show rules engine calculation.
6. Show validation flags.
7. Generate report preview.
8. Search approval repository.

## 5. Existing Solution Comparison

"Generic LIMS tools manage lab workflow and records. Calibration software manages instruments already in service. R76 CertiScale is different because it focuses on model approval of NAWI instruments and directly encodes OIML R76 calculation logic."

## 6. Technical Defense

"A LIMS can store a result, but it does not know whether a Class III weighing instrument passes OIML R76 at a specific load point. R76 CertiScale performs that technical compliance decision and explains the rule used."

## 7. Dataset Defense

"We use three data sources: OIML R76 as the rule source, raw test observations for calculation, and model approval register data for repository and dashboard. This separation matches the real laboratory workflow."

## 8. Closing Line

"Our goal is not just digital reporting. Our goal is standardized, explainable, and audit-ready model approval for weighing instruments."
