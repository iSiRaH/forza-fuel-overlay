import type { ForzaTelemetryData } from '../../../../packages/shared/src/types/telemetry.js';

/**
 * Parses a raw UDP Buffer received from Forza Motorsport / Forza Horizon 6.
 * Supports both Sled (311 bytes) and Dash (323/331 bytes) packet formats.
 */
export function parseForzaTelemetryPacket(buffer: Buffer): Partial<ForzaTelemetryData> {
  if (!buffer || buffer.length < 311) {
    throw new Error(`Invalid packet size: expected at least 311 bytes, got ${buffer ? buffer.length : 0}`);
  }

  const isRaceOn = buffer.readInt32LE(0) === 1;
  const timestampMS = buffer.readUInt32LE(4);
  const engineMaxRpm = buffer.readFloatLE(8);
  const engineIdleRpm = buffer.readFloatLE(12);
  const currentEngineRpm = buffer.readFloatLE(16);

  // Speed in m/s (Offset 244)
  const speed = buffer.readFloatLE(244);
  const power = buffer.readFloatLE(248);
  const torque = buffer.readFloatLE(252);

  // Dash specific fields (available when packet length >= 323 bytes)
  const fuel = buffer.length >= 284 ? buffer.readFloatLE(280) : 1.0;
  const distanceTraveled = buffer.length >= 288 ? buffer.readFloatLE(284) : 0;
  const bestLap = buffer.length >= 292 ? buffer.readFloatLE(288) : 0;
  const lastLap = buffer.length >= 296 ? buffer.readFloatLE(292) : 0;
  const currentLap = buffer.length >= 300 ? buffer.readFloatLE(296) : 0;
  const currentRaceTime = buffer.length >= 304 ? buffer.readFloatLE(300) : 0;
  const lapNumber = buffer.length >= 306 ? buffer.readUInt16LE(304) : 0;
  const racePosition = buffer.length >= 307 ? buffer.readUInt8(306) : 0;
  const accel = buffer.length >= 308 ? buffer.readUInt8(307) : 0;
  const brake = buffer.length >= 309 ? buffer.readUInt8(308) : 0;
  const clutch = buffer.length >= 310 ? buffer.readUInt8(309) : 0;
  const handBrake = buffer.length >= 311 ? buffer.readUInt8(310) : 0;
  const gear = buffer.length >= 312 ? buffer.readUInt8(311) : 0;
  const steer = buffer.length >= 313 ? buffer.readInt8(312) : 0;

  const carOrdinal = buffer.length >= 319 ? buffer.readInt32LE(315) : 0;
  const carClass = buffer.length >= 323 ? buffer.readInt32LE(319) : 0;
  const carPerformanceIndex = buffer.length >= 327 ? buffer.readInt32LE(323) : 0;

  return {
    isRaceOn,
    timestampMS,
    engineMaxRpm,
    engineIdleRpm,
    currentEngineRpm,
    speed,
    power,
    torque,
    fuel,
    distanceTraveled,
    bestLap,
    lastLap,
    currentLap,
    currentRaceTime,
    lapNumber,
    racePosition,
    accel,
    brake,
    clutch,
    handBrake,
    gear,
    steer,
    carOrdinal,
    carClass,
    carPerformanceIndex,
  };
}
