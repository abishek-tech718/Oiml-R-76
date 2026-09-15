import { isValidVerificationInterval } from "./rulesEngine.js";

export function validateLabConditions({ temperature, humidity }) {
  const errors = [];
  if (temperature < 10 || temperature > 40) {
    errors.push("Temperature must stay inside the configured lab range.");
  }
  if (humidity < 30 || humidity > 75) {
    errors.push("Humidity must stay inside the configured lab range.");
  }
  return errors;
}

export function validateInstrument({ accuracyClass, e, maxCapacity, minCapacity }) {
  const errors = [];
  if (!["I", "II", "III", "IIII"].includes(accuracyClass)) {
    errors.push("Accuracy class must be I, II, III, or IIII.");
  }
  if (!isValidVerificationInterval(Number(e))) {
    errors.push("Verification scale interval e must follow 1, 2, or 5 x 10^n.");
  }
  if (Number(minCapacity) >= Number(maxCapacity)) {
    errors.push("Minimum capacity must be below maximum capacity.");
  }
  return errors;
}

export function validateAscendingLoads(observations) {
  const loads = observations.map((item) => Number(item.appliedLoad));
  const isAscending = loads.every((load, index) => index === 0 || load >= loads[index - 1]);
  return isAscending ? [] : ["Applied loads are not in ascending order for this test sequence."];
}
