function numeric(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a finite number.`);
  return parsed;
}

function outside(value, min, max, label, unit) {
  if (min !== null && min !== undefined && value < Number(min)) return `${label} is ${Number(min) - value}${unit} below the minimum of ${min}${unit}`;
  if (max !== null && max !== undefined && value > Number(max)) return `${label} is ${value - Number(max)}${unit} above the maximum of ${max}${unit}`;
  return null;
}

export function assessEnvironmentalReadiness({ temperature, humidity, atmospheric_pressure }, limits) {
  if (!limits) throw new Error("No environmental limit profile is configured for this test type.");
  const findings = [
    outside(numeric(temperature, "temperature"), limits.min_temperature, limits.max_temperature, "Temperature", " C"),
    outside(numeric(humidity, "humidity"), limits.min_humidity, limits.max_humidity, "Humidity", " %RH"),
    outside(numeric(atmospheric_pressure, "atmospheric_pressure"), limits.min_pressure, limits.max_pressure, "Atmospheric pressure", " hPa"),
  ].filter(Boolean);
  return {
    ready: findings.length === 0,
    verdict: findings.length ? "RED" : "GREEN",
    message: findings.length
      ? `Outside the allowed range - ${findings.join("; ")} - do not proceed.`
      : "Within the configured OIML R76 range for this test - safe to proceed.",
    findings,
  };
}
