import type { ForzaTelemetryData } from '../../../../packages/shared/src/types/telemetry.js';

/**
 * Parses a raw UDP Buffer received from Forza Motorsport / Forza Horizon 6.
 * Supports both Sled (232+ bytes) and Dash (311+ / 323+ / 331+ bytes) packet formats.
 */
export function parseForzaTelemetryPacket(buffer: Buffer): Partial<ForzaTelemetryData> {
  if (!buffer || buffer.length < 232) {
    throw new Error(`Invalid packet size: expected at least 232 bytes, got ${buffer ? buffer.length : 0}`);
  }

  const isRaceOn = buffer.readInt32LE(0) === 1;
  const timestampMS = buffer.readUInt32LE(4);
  const engineMaxRpm = buffer.readFloatLE(8);
  const engineIdleRpm = buffer.readFloatLE(12);
  const currentEngineRpm = buffer.readFloatLE(16);

  // Velocity vectors (Sled offsets 32, 36, 40)
  const velocityX = buffer.length >= 36 ? buffer.readFloatLE(32) : 0;
  const velocityY = buffer.length >= 40 ? buffer.readFloatLE(36) : 0;
  const velocityZ = buffer.length >= 44 ? buffer.readFloatLE(40) : 0;

  // Calculate speed in m/s from velocity vector magnitude (works in all modes and Sled/Dash packets)
  let speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY + velocityZ * velocityZ);

  // Fallback to Dash offset 244 if velocity magnitude is 0 and Dash offset 244 has valid speed
  if (speed === 0 && buffer.length >= 248) {
    const dashSpeed = buffer.readFloatLE(244);
    if (!isNaN(dashSpeed) && dashSpeed >= 0 && dashSpeed < 300) {
      speed = dashSpeed;
    }
  }

  // Car details (Sled offsets 212, 216, 220)
  const carOrdinal = buffer.length >= 216 ? buffer.readInt32LE(212) : 0;
  const carClass = buffer.length >= 220 ? buffer.readInt32LE(216) : 0;
  const carPerformanceIndex = buffer.length >= 224 ? buffer.readInt32LE(220) : 0;

  // Power and Torque (Dash offsets 248, 252)
  const rawPower = buffer.length >= 252 ? buffer.readFloatLE(248) : 0;
  const power = rawPower > 2000 ? rawPower / 745.7 : rawPower;
  const torque = buffer.length >= 256 ? buffer.readFloatLE(252) : 0;

  // Dash telemetry fields (offsets 276..308)
  const fuel = buffer.length >= 280 ? buffer.readFloatLE(276) : 1.0;
  const distanceTraveled = buffer.length >= 284 ? buffer.readFloatLE(280) : 0;
  const bestLap = buffer.length >= 288 ? buffer.readFloatLE(284) : 0;
  const lastLap = buffer.length >= 292 ? buffer.readFloatLE(288) : 0;
  const currentLap = buffer.length >= 296 ? buffer.readFloatLE(292) : 0;
  const currentRaceTime = buffer.length >= 300 ? buffer.readFloatLE(296) : 0;
  const lapNumber = buffer.length >= 302 ? buffer.readUInt16LE(300) : 0;
  const racePosition = buffer.length >= 303 ? buffer.readUInt8(302) : 0;
  const accel = buffer.length >= 304 ? buffer.readUInt8(303) : 0;
  const brake = buffer.length >= 305 ? buffer.readUInt8(304) : 0;
  const clutch = buffer.length >= 306 ? buffer.readUInt8(305) : 0;
  const handBrake = buffer.length >= 307 ? buffer.readUInt8(306) : 0;
  const rawGear = buffer.length >= 308 ? buffer.readUInt8(307) : 1;
  const steer = buffer.length >= 309 ? buffer.readInt8(308) : 0;

  // Convert Forza raw gear encoding (0=R, 1=N, 2=1st, 3=2nd...) to standard gear numbers
  let gear = 0;
  if (rawGear === 0) {
    gear = -1; // Reverse
  } else if (rawGear === 1) {
    gear = 0; // Neutral
  } else {
    gear = rawGear - 1; // 1st, 2nd, 3rd, etc.
  }

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

