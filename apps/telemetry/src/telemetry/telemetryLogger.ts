import type { ForzaTelemetryData } from '../../../../packages/shared/src/types/telemetry.js';
import { formatGear } from '../../../../packages/shared/src/utils/gear.js';

export interface LoggerOptions {
  prefix?: string;
  formatted?: boolean;
  logger?: (message: string, ...args: any[]) => void;
}

/**
 * Formats and logs telemetry data to console.log (or custom logger function).
 */
export function logTelemetryData(
  data: Partial<ForzaTelemetryData>,
  options: LoggerOptions = {}
): string {
  const logFn = options.logger || console.log;
  const prefix = options.prefix ? `[${options.prefix}] ` : '[TELEMETRY] ';

  const speedKmH = data.speed !== undefined ? (data.speed * 3.6).toFixed(1) : '0.0';
  const rpm = data.currentEngineRpm !== undefined ? Math.round(data.currentEngineRpm) : 0;
  const maxRpm = data.engineMaxRpm !== undefined ? Math.round(data.engineMaxRpm) : 0;
  const gearFormatted = formatGear(data.gear);
  const fuelPct = data.fuel !== undefined ? (data.fuel * 100).toFixed(1) : '0.0';
  const lap = data.lapNumber !== undefined ? data.lapNumber : 0;
  const raceTime = data.currentRaceTime !== undefined ? data.currentRaceTime.toFixed(2) : '0.00';

  let outputMessage: string;

  if (options.formatted) {
    outputMessage = `${prefix}Lap: ${lap} | Time: ${raceTime}s | Speed: ${speedKmH} km/h | RPM: ${rpm}/${maxRpm} | Gear: ${gearFormatted} | Fuel: ${fuelPct}%`;

  } else {
    outputMessage = `${prefix}${JSON.stringify({
      isRaceOn: data.isRaceOn ?? false,
      timestampMS: data.timestampMS ?? 0,
      lapNumber: lap,
      currentRaceTime: data.currentRaceTime ?? 0,
      speedKmH: parseFloat(speedKmH),
      currentEngineRpm: rpm,
      gear: data.gear ?? 0,
      fuelPct: parseFloat(fuelPct),
      accel: data.accel ?? 0,
      brake: data.brake ?? 0,
    })}`;
  }

  logFn(outputMessage);
  return outputMessage;
}
