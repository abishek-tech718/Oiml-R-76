-- Baseline applicability catalogue. Electrical immunity and supply tests are
-- limited to electronic instruments; tare operation is feature-dependent.
INSERT INTO test_applicability_rules
  (id, test_type, applies_if_electronic, applies_if_feature, always_applies)
VALUES
  ('TA-01', 'weighing_accuracy_increasing_load', NULL, NULL, TRUE),
  ('TA-02', 'weighing_accuracy_decreasing_load', NULL, NULL, TRUE),
  ('TA-03', 'repeatability', NULL, NULL, TRUE),
  ('TA-04', 'eccentricity', NULL, NULL, TRUE),
  ('TA-05', 'discrimination', NULL, NULL, TRUE),
  ('TA-06', 'zero_setting', NULL, NULL, TRUE),
  ('TA-07', 'zero_tracking', NULL, NULL, TRUE),
  ('TA-08', 'temperature_static', NULL, NULL, TRUE),
  ('TA-09', 'humidity_steady_state', NULL, NULL, TRUE),
  ('TA-10', 'tilt', NULL, NULL, TRUE),
  ('TA-11', 'tare_operation', NULL, 'tare', FALSE),
  ('TA-12', 'voltage_variation', TRUE, NULL, FALSE),
  ('TA-13', 'power_supply_variation', TRUE, NULL, FALSE),
  ('TA-14', 'electrostatic_discharge', TRUE, NULL, FALSE),
  ('TA-15', 'electrical_fast_transients', TRUE, NULL, FALSE),
  ('TA-16', 'electromagnetic_immunity', TRUE, NULL, FALSE)
ON CONFLICT (id) DO NOTHING;
