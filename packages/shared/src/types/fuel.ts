export interface FuelCalculationParams {
  speedMps: number;
  gear: number;
  engineDisplacementLiters: number;
  currentRpm: number;
  maxRpm: number;
  accelPercent: number; // 0 to 100 or 0 to 255
  dtSeconds: number;
}

export interface FuelCalculationResult {
  instantaneousBurnRateLps: number; // Liters per second
  fuelSpentStepLiters: number; // Liters spent during dt
  consumptionLPer100Km: number; // L / 100km
}

export interface TelemetryControlMessage {
  type: 'REFILL_FUEL' | 'RESET_SESSION';
  payload?: Record<string, unknown>;
}
