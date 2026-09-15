-- OIML R 76-1:2006 3.9.2 default temperature range is -10 C to +40 C.
-- Humidity and pressure bands are editable laboratory baseline profiles and
-- must be reviewed against each instrument's declared environmental limits.
INSERT INTO environmental_limits
  (id, test_type, min_temperature, max_temperature, min_humidity, max_humidity, min_pressure, max_pressure)
VALUES
  ('EL-01', 'weighing_accuracy_increasing_load', -10, 40, 0, 100, 800, 1100),
  ('EL-02', 'weighing_accuracy_decreasing_load', -10, 40, 0, 100, 800, 1100),
  ('EL-03', 'repeatability', -10, 40, 0, 100, 800, 1100),
  ('EL-04', 'eccentricity', -10, 40, 0, 100, 800, 1100),
  ('EL-05', 'discrimination', -10, 40, 0, 100, 800, 1100),
  ('EL-06', 'zero_setting', -10, 40, 0, 100, 800, 1100),
  ('EL-07', 'zero_tracking', -10, 40, 0, 100, 800, 1100),
  ('EL-08', 'temperature_static', -10, 40, 0, 100, 800, 1100),
  ('EL-09', 'humidity_steady_state', -10, 40, 0, 100, 800, 1100),
  ('EL-10', 'tilt', -10, 40, 0, 100, 800, 1100),
  ('EL-11', 'tare_operation', -10, 40, 0, 100, 800, 1100),
  ('EL-12', 'voltage_variation', -10, 40, 0, 100, 800, 1100),
  ('EL-13', 'power_supply_variation', -10, 40, 0, 100, 800, 1100),
  ('EL-14', 'electrostatic_discharge', -10, 40, 0, 100, 800, 1100),
  ('EL-15', 'electrical_fast_transients', -10, 40, 0, 100, 800, 1100),
  ('EL-16', 'electromagnetic_immunity', -10, 40, 0, 100, 800, 1100)
ON CONFLICT (id) DO NOTHING;
