import type { FuelCalculationParams, FuelCalculationResult } from '../../../packages/shared/src/types/fuel.js';
import { FUEL_CONFIG } from './config.js';

/**
 * Clamps a number between min and max inclusive.
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Calculates normalized engine displacement factor relative to reference displacement (2.0 L).
 * Clamped between 0.50 and 4.00.
 */
export function calculateDisplacementFactor(engineDisplacementLiters?: number): number {
  const disp = (engineDisplacementLiters && engineDisplacementLiters > 0)
    ? engineDisplacementLiters
    : FUEL_CONFIG.DEFAULT_ENGINE_DISPLACEMENT;
  const factor = disp / FUEL_CONFIG.REFERENCE_DISPLACEMENT;
  return clamp(factor, FUEL_CONFIG.MIN_DISPLACEMENT_FACTOR, FUEL_CONFIG.MAX_DISPLACEMENT_FACTOR);
}

/**
 * Normalizes current RPM against redline RPM.
 * Clamped between 0.0 and 1.0.
 */
export function calculateRpmRatio(currentRpm: number, redlineRpm?: number): number {
  const safeRedline = (redlineRpm && redlineRpm > 0)
    ? redlineRpm
    : FUEL_CONFIG.DEFAULT_REDLINE_RPM;
  return clamp(currentRpm / safeRedline, 0, 1.0);
}

/**
 * Calculates non-linear RPM factor based on normalized RPM ratio.
 * Formula: 0.20 + (rpmRatio ^ 2.2) * 2.80
 * Clamped between 0.20 and 3.00.
 */
export function calculateRpmFactor(rpmRatio: number): number {
  const factor = FUEL_CONFIG.RPM_FACTOR_MIN + Math.pow(rpmRatio, FUEL_CONFIG.RPM_EXPONENT) * 2.80;
  return clamp(factor, FUEL_CONFIG.RPM_FACTOR_MIN, FUEL_CONFIG.RPM_FACTOR_MAX);
}

/**
 * Calculates throttle factor including coasting / engine braking reduction.
 * 0% throttle -> 0.65 (or 0.15 during coasting)
 * 50% throttle -> 1.075
 * 100% throttle -> 1.50
 */
export function calculateThrottleFactor(accelPercent: number, currentRpm: number): number {
  const throttleRatio = accelPercent > 100
    ? clamp(accelPercent / 255, 0, 1)
    : accelPercent > 1.0
      ? clamp(accelPercent / 100, 0, 1)
      : clamp(accelPercent, 0, 1);

  if (currentRpm > 0 && throttleRatio < FUEL_CONFIG.COASTING_THROTTLE_THRESHOLD) {
    return FUEL_CONFIG.COASTING_FUEL_FACTOR; // 0.15 for coasting / engine braking
  }

  return FUEL_CONFIG.THROTTLE_FACTOR_MIN + throttleRatio * (FUEL_CONFIG.THROTTLE_FACTOR_MAX - FUEL_CONFIG.THROTTLE_FACTOR_MIN);
}

/**
 * Calculates fuel rate in Liters / hour (L/h).
 * Formula: BASE_FUEL_RATE * displacementFactor * rpmFactor * throttleFactor
 */
export function calculateFuelRateLPerHour(
  displacementFactor: number,
  rpmFactor: number,
  throttleFactor: number,
  currentRpm: number
): number {
  if (currentRpm <= 0) {
    return 0; // Engine is off
  }
  return FUEL_CONFIG.BASE_FUEL_RATE * displacementFactor * rpmFactor * throttleFactor;
}

/**
 * Calculates estimated remaining driving time formatted as "Xh Ym" or "--".
 */
export function calculateRemainingTime(currentFuelLiters: number, fuelRateLPerHour: number): {
  hours: number;
  formatted: string;
} {
  if (fuelRateLPerHour <= 0.01 || currentFuelLiters <= 0) {
    return { hours: 0, formatted: '--' };
  }
  const hours = currentFuelLiters / fuelRateLPerHour;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);

  if (h === 0) {
    return { hours, formatted: `${m}m` };
  }
  return { hours, formatted: `${h}h ${m < 10 ? '0' : ''}${m}m` };
}

/**
 * Calculates estimated remaining driving distance in km formatted as "X km" or "--".
 */
export function calculateRemainingDistance(remainingTimeHours: number, speedKmH: number): {
  distanceKm: number | null;
  formatted: string;
} {
  if (speedKmH < 1.0 || remainingTimeHours <= 0) {
    return { distanceKm: null, formatted: '--' };
  }
  const distanceKm = remainingTimeHours * speedKmH;
  return { distanceKm, formatted: `${Math.round(distanceKm)} km` };
}

/**
 * Primary fuel calculation function step for a telemetry frame interval.
 */
export function calculateFuelConsumptionStep(params: FuelCalculationParams): FuelCalculationResult {
  const {
    speedMps,
    engineDisplacementLiters,
    currentRpm,
    maxRpm,
    accelPercent,
    dtSeconds,
  } = params;

  const currentRpmSafe = Math.max(0, currentRpm);
  const displacementFactor = calculateDisplacementFactor(engineDisplacementLiters);
  const rpmRatio = calculateRpmRatio(currentRpmSafe, maxRpm);
  const rpmFactor = calculateRpmFactor(rpmRatio);
  const throttleFactor = calculateThrottleFactor(accelPercent, currentRpmSafe);

  const fuelRateLPerHour = calculateFuelRateLPerHour(displacementFactor, rpmFactor, throttleFactor, currentRpmSafe);
  const fuelRateLPerSecond = fuelRateLPerHour / 3600;

  // Protect against telemetry gaps > 2 seconds or negative dt
  const safeDt = (dtSeconds > 0 && dtSeconds <= FUEL_CONFIG.MAX_TELEMETRY_GAP_SECONDS) ? dtSeconds : 0;
  const fuelSpentStepLiters = fuelRateLPerSecond * safeDt;

  // Calculate L / 100km when vehicle is moving
  const speedKmH = speedMps * 3.6;
  let consumptionLPer100Km = 0;
  if (speedKmH > 1.0 && fuelRateLPerHour > 0) {
    consumptionLPer100Km = (fuelRateLPerHour / speedKmH) * 100;
  }

  return {
    displacementFactor: parseFloat(displacementFactor.toFixed(3)),
    rpmRatio: parseFloat(rpmRatio.toFixed(3)),
    rpmFactor: parseFloat(rpmFactor.toFixed(3)),
    throttleFactor: parseFloat(throttleFactor.toFixed(3)),
    fuelRateLPerHour: parseFloat(fuelRateLPerHour.toFixed(2)),
    fuelRateLPerSecond,
    instantaneousBurnRateLps: fuelRateLPerSecond,
    fuelSpentStepLiters,
    consumptionLPer100Km: parseFloat(consumptionLPer100Km.toFixed(1)),
  };
}
