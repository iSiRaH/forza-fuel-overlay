import type { ForzaTelemetryData } from '../../../../packages/shared/src/types/telemetry.js';
import { formatGear } from '../../../../packages/shared/src/utils/gear.js';

let lastDebugLogTime = 0;

/**
 * Periodically logs raw and normalized telemetry metrics when debug mode is enabled.
 * Throttled to log at most once per `intervalMs` (default: 500ms).
 */
export function debugLogTelemetry(
  buffer: Buffer,
  telemetry: Partial<ForzaTelemetryData>,
  intervalMs = 500
): void {
  const isDebugEnabled = process.env.TELEMETRY_DEBUG === 'true';
  if (!isDebugEnabled) return;

  const now = Date.now();
  if (now - lastDebugLogTime < intervalMs) return;
  lastDebugLogTime = now;

  const rawGearByte = buffer.length >= 320 ? buffer.readInt8(319) : undefined;
  const rawThrottleByte = buffer.length >= 316 ? buffer.readUInt8(315) : undefined;
  const rawBrakeByte = buffer.length >= 317 ? buffer.readUInt8(316) : undefined;
  const rawSteerByte = buffer.length >= 321 ? buffer.readInt8(320) : undefined;

  console.log('🐛 [TELEMETRY DEBUG]', {
    packetLength: buffer.length,
    isRaceOn: telemetry.isRaceOn,
    speedKmh: telemetry.speed !== undefined ? (telemetry.speed * 3.6).toFixed(1) : undefined,
    rpm: telemetry.currentEngineRpm,
    gearRaw: rawGearByte,
    gearDecoded: telemetry.gear,
    gearFormatted: formatGear(telemetry.gear),
    throttleRaw: rawThrottleByte,
    throttleValue: telemetry.accel,
    brakeRaw: rawBrakeByte,
    brakeValue: telemetry.brake,
    steerRaw: rawSteerByte,
    steerValue: telemetry.steer,
    fuelRaw: buffer.length >= 292 ? buffer.readFloatLE(288).toFixed(4) : undefined,
    fuelRatio: telemetry.fuel,
  });
}
