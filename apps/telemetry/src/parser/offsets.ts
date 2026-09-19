/**
 * Single source of truth for Forza Horizon 6 (2026) Car Dash telemetry offsets.
 * FH6 packet size: 324 bytes (little-endian).
 * Includes 12-byte Horizon-specific block at 232-243.
 */
export const FH6_OFFSETS = {
  isRaceOn: 0, // int32
  timestampMS: 4, // uint32
  engineMaxRpm: 8, // float32
  engineIdleRpm: 12, // float32
  currentEngineRpm: 16, // float32
  accelerationX: 20, // float32
  accelerationY: 24, // float32
  accelerationZ: 28, // float32
  velocityX: 32, // float32
  velocityY: 36, // float32
  velocityZ: 40, // float32
  angularVelocityX: 44, // float32
  angularVelocityY: 48, // float32
  angularVelocityZ: 52, // float32
  yaw: 56, // float32
  pitch: 60, // float32
  roll: 64, // float32

  carOrdinal: 212, // int32
  carClass: 216, // int32
  carPerformanceIndex: 220, // int32

  // 232-243: 12-byte FH6 Horizon-specific block

  positionX: 244, // float32
  positionY: 248, // float32
  positionZ: 252, // float32

  speed: 256, // float32 (m/s)
  power: 260, // float32 (Watts)
  torque: 264, // float32 (N-m)

  tireTempFL: 268, // float32
  tireTempFR: 272, // float32
  tireTempRL: 276, // float32
  tireTempRR: 280, // float32

  boost: 284, // float32
  fuel: 288, // float32 (normalized 0.0 - 1.0)
  distanceTraveled: 292, // float32 (meters)

  bestLap: 296, // float32 (seconds)
  lastLap: 300, // float32 (seconds)
  currentLap: 304, // float32 (seconds)
  currentRaceTime: 308, // float32 (seconds)

  lapNumber: 312, // uint16
  racePosition: 314, // uint8

  throttle: 315, // uint8 (0-255)
  brake: 316, // uint8 (0-255)
  clutch: 317, // uint8 (0-255)
  handbrake: 318, // uint8 (0-255)

  gear: 319, // int8 (0=R, -1=N, 1=1st, 2=2nd...)
  steering: 320, // int8 (-127 to +127)

  normalizedDrivingLine: 321, // int8/uint8
  normalizedAIBrakeDifference: 322, // int8/uint8
} as const;

/**
 * Legacy FH5 Car Dash format offsets (323 bytes).
 */
export const FH5_OFFSETS = {
  isRaceOn: 0,
  timestampMS: 4,
  engineMaxRpm: 8,
  engineIdleRpm: 12,
  currentEngineRpm: 16,
  velocityX: 32,
  velocityY: 36,
  velocityZ: 40,
  carOrdinal: 212,
  carClass: 216,
  carPerformanceIndex: 220,
  positionX: 232,
  positionY: 236,
  positionZ: 240,
  speed: 244,
  power: 248,
  torque: 252,
  fuel: 276,
  distanceTraveled: 280,
  bestLap: 284,
  lastLap: 288,
  currentLap: 292,
  currentRaceTime: 296,
  lapNumber: 300,
  racePosition: 302,
  throttle: 303,
  brake: 304,
  clutch: 305,
  handbrake: 306,
  gear: 307,
  steering: 308,
} as const;

/**
 * Minimal Sled format offsets (232 bytes).
 */
export const SLED_OFFSETS = {
  isRaceOn: 0,
  timestampMS: 4,
  engineMaxRpm: 8,
  engineIdleRpm: 12,
  currentEngineRpm: 16,
  accelerationZ: 28,
  velocityX: 32,
  velocityY: 36,
  velocityZ: 40,
  carOrdinal: 212,
  carClass: 216,
  carPerformanceIndex: 220,
} as const;
