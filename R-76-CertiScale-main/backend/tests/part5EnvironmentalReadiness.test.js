import assert from "node:assert/strict";
import { assessEnvironmentalReadiness } from "../services/environmentalReadiness.js";

const limits = { min_temperature: -10, max_temperature: 40, min_humidity: 0, max_humidity: 100, min_pressure: 800, max_pressure: 1100 };

const green = assessEnvironmentalReadiness({ temperature: 22, humidity: 55, atmospheric_pressure: 1013 }, limits);
assert.equal(green.verdict, "GREEN");
assert.equal(green.ready, true);

const red = assessEnvironmentalReadiness({ temperature: 42, humidity: 55, atmospheric_pressure: 760 }, limits);
assert.equal(red.verdict, "RED");
assert.equal(red.ready, false);
assert.match(red.message, /Temperature is 2 C above/);
assert.match(red.message, /Atmospheric pressure is 40 hPa below/);

console.log("Part 5 environmental readiness tests passed");
