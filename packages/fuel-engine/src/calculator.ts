import type { FuelCalculationParams, FuelCalculationResult } from '../../../packages/shared/src/types/fuel.js';

/**
 * Calculates fuel consumption for a given time step based on vehicle speed, gear, engine displacement, RPM, and throttle.
 */
export function calculateFuelConsumptionStep(params: FuelCalculationParams): FuelCalculationResult {
  const {
    speedMps,
    gear,
    engineDisplacementLiters,
    currentRpm,
    maxRpm,
    accelPercent,
    dtSeconds,
  } = params;

  // Normalize throttle input (support 0-255 or 0-100 or 0-1)
  const normalizedAccel = accelPercent > 100
    ? Math.min(1.0, accelPercent / 255)
    : accelPercent > 1.0
      ? Math.min(1.0, accelPercent / 100)
      : Math.max(0.0, accelPercent);

  // Normalize engine displacement (default to 3.0L if non-positive)
  const displacement = engineDisplacementLiters > 0 ? engineDisplacementLiters : 3.0;

  // Determine gear load factor
  let gearFactor = 1.0;
  if (gear === 0) {
    gearFactor = 0.3; // Idling in neutral has minimal load
  } else if (gear === -1) {
    gearFactor = 1.1; // Reverse gear
  } else if (gear === 1) {
    gearFactor = 1.35; // 1st gear high torque load
  } else if (gear === 2) {
    gearFactor = 1.2;
  } else if (gear === 3) {
    gearFactor = 1.1;
  } else if (gear >= 4 && gear <= 6) {
    gearFactor = 1.0;
  } else if (gear > 6) {
    gearFactor = 0.92; // High overdrive gear economy
  }

  const safeMaxRpm = maxRpm > 1000 ? maxRpm : 8000;
  const rpmRatio = Math.min(1.5, Math.max(0.1, currentRpm / safeMaxRpm));

  // Fuel consumption rate formula (Liters per second)
  // Base idle rate + load-proportional rate scaled by engine displacement & gear factor
  const idleRateLps = (displacement / 3.0) * 0.00015;
  const loadRateLps = (displacement / 3.0) * (currentRpm / 6000) * (0.00025 + 0.0012 * normalizedAccel) * gearFactor;

  const instantaneousBurnRateLps = Math.max(0.00005, idleRateLps + loadRateLps);
  const fuelSpentStepLiters = instantaneousBurnRateLps * Math.max(0, dtSeconds);

  // Calculate L / 100km when vehicle is moving
  const speedKmh = speedMps * 3.6;
  let consumptionLPer100Km = 0;
  if (speedKmh > 1.0) {
    consumptionLPer100Km = (instantaneousBurnRateLps * 3600 / speedKmh) * 100;
  }

  return {
    instantaneousBurnRateLps,
    fuelSpentStepLiters,
    consumptionLPer100Km: parseFloat(consumptionLPer100Km.toFixed(1)),
  };
}
