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
  maxFuelCapacityLiters?: number | undefined; // full fuel tank capacity based on car model
  currentFuelLiters?: number | undefined; // current fuel in liters
  fuelSpentLiters?: number | undefined; // fuel spent so far in liters
  engineDisplacementLiters?: number | undefined; // engine displacement capacity in liters
  fuelConsumptionRate?: number | undefined; // consumption rate in L/100km or L/h
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
  carName?: string | undefined;
  piClassName?: string | undefined;
  piRating?: number | undefined;
  piBadgeColor?: string | undefined;
  piBadgeBg?: string | undefined;
}
