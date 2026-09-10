export interface ForzaTelemetryData {
  isRaceOn: boolean;
  timestampMS: number;
  engineMaxRpm: number;
  engineIdleRpm: number;
  currentEngineRpm: number;
  speed: number; // in meters per second
  power: number; // in watts or hp
  torque: number; // in N-m
  gear: number;
  accel: number; // 0-255 or 0-100%
  brake: number; // 0-255 or 0-100%
  clutch: number;
  handBrake: number;
  steer: number;
  fuel: number; // fuel remaining ratio (0.0 to 1.0)
  maxFuelCapacityLiters?: number; // full fuel tank capacity based on car model
  currentFuelLiters?: number; // current fuel in liters
  fuelSpentLiters?: number; // fuel spent so far in liters
  engineDisplacementLiters?: number; // engine displacement capacity in liters
  fuelConsumptionRate?: number; // consumption rate in L/100km or L/h
  distanceTraveled: number;
  bestLap: number;
  lastLap: number;
  currentLap: number;
  currentRaceTime: number;
  lapNumber: number;
  racePosition: number;
  carOrdinal: number;
  carClass: number;
  carPerformanceIndex: number;
}
