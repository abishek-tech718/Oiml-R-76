-- OIML R 76-1:2006 Table 6: maximum permissible errors on initial verification.
INSERT INTO tolerance_rules
  (id, accuracy_class, load_band_min_e, load_band_max_e, mpe_multiplier_of_e, rule_set_version)
VALUES
  ('TR-I-01', 'I', 0, 50000, 0.5, 'R76-1:2006'),
  ('TR-I-02', 'I', 50000, 200000, 1.0, 'R76-1:2006'),
  ('TR-I-03', 'I', 200000, NULL, 1.5, 'R76-1:2006'),
  ('TR-II-01', 'II', 0, 5000, 0.5, 'R76-1:2006'),
  ('TR-II-02', 'II', 5000, 20000, 1.0, 'R76-1:2006'),
  ('TR-II-03', 'II', 20000, 100000, 1.5, 'R76-1:2006'),
  ('TR-III-01', 'III', 0, 500, 0.5, 'R76-1:2006'),
  ('TR-III-02', 'III', 500, 2000, 1.0, 'R76-1:2006'),
  ('TR-III-03', 'III', 2000, 10000, 1.5, 'R76-1:2006'),
  ('TR-IIII-01', 'IIII', 0, 50, 0.5, 'R76-1:2006'),
  ('TR-IIII-02', 'IIII', 50, 200, 1.0, 'R76-1:2006'),
  ('TR-IIII-03', 'IIII', 200, 1000, 1.5, 'R76-1:2006')
ON CONFLICT (id) DO NOTHING;
