import type { ForzaTelemetryData } from '../../../../packages/shared/src/types/telemetry.js';
import { getCarPiClass } from '../../../../packages/shared/src/utils/carDatabase.js';
import { decodeGear } from '../../../../packages/shared/src/utils/gear.js';
import { FuelTracker } from '../../../../packages/fuel-engine/src/index.js';
import { DamageTracker } from '../../../../packages/shared/src/damage/damageTracker.js';
import { FH6_OFFSETS, FH5_OFFSETS, FM2023_OFFSETS } from './offsets.js';
import { debugLogTelemetry } from './debug.js';

export const globalFuelTracker = new FuelTracker();
export const globalDamageTracker = new DamageTracker();

/**
 * Converts temperatures natively output in Fahrenheit by Forza UDP Data Out to Celsius.
 */
export function fahrenheitToCelsius(f: number): number {
  return Math.round(((f - 32) * (5 / 9)) * 10) / 10;
}

/**
 * Parses a raw UDP Buffer received from Forza Horizon 6 / Forza Motorsport.
 * Primary target format: FH6 Car Dash packet (324 bytes).
 * Supports backwards compatibility for FM2023 (331 bytes), FH5 Car Dash (323 bytes), FM7 (311 bytes) and Sled (232+ bytes) packets.
 */
export function parseForzaTelemetryPacket(
  buffer: Buffer,
  fuelTracker: FuelTracker = globalFuelTracker,
  damageTracker: DamageTracker = globalDamageTracker
): Partial<ForzaTelemetryData> {
  if (!buffer || buffer.length < 232) {
    throw new Error(`Invalid packet size: expected at least 232 bytes, got ${buffer ? buffer.length : 0}`);
  }

  const isRaceOn = buffer.readInt32LE(0) === 1;
  const timestampMS = buffer.readUInt32LE(4);
  const engineMaxRpm = buffer.readFloatLE(8);
  const engineIdleRpm = buffer.readFloatLE(12);
  const currentEngineRpm = buffer.readFloatLE(16);

  // Acceleration vectors (offsets 20, 24, 28)
  const accelerationX = buffer.length >= 24 ? buffer.readFloatLE(20) : 0;
  const accelerationY = buffer.length >= 28 ? buffer.readFloatLE(24) : 0;
  const accelerationZ = buffer.length >= 32 ? buffer.readFloatLE(28) : 0;

  // Normalized suspension travel (offsets 68, 72, 76, 80)
  const suspensionTravelFL = buffer.length >= 72 ? buffer.readFloatLE(FH6_OFFSETS.normSuspensionTravelFL) : undefined;
  const suspensionTravelFR = buffer.length >= 76 ? buffer.readFloatLE(FH6_OFFSETS.normSuspensionTravelFR) : undefined;
  const suspensionTravelRL = buffer.length >= 80 ? buffer.readFloatLE(FH6_OFFSETS.normSuspensionTravelRL) : undefined;
  const suspensionTravelRR = buffer.length >= 84 ? buffer.readFloatLE(FH6_OFFSETS.normSuspensionTravelRR) : undefined;

  // Wheel slip ratios (offsets 84, 88, 92, 96)
  const wheelSlipFL = buffer.length >= 88 ? buffer.readFloatLE(FH6_OFFSETS.wheelSlipRatioFL) : undefined;
  const wheelSlipFR = buffer.length >= 92 ? buffer.readFloatLE(FH6_OFFSETS.wheelSlipRatioFR) : undefined;
  const wheelSlipRL = buffer.length >= 96 ? buffer.readFloatLE(FH6_OFFSETS.wheelSlipRatioRL) : undefined;
  const wheelSlipRR = buffer.length >= 100 ? buffer.readFloatLE(FH6_OFFSETS.wheelSlipRatioRR) : undefined;

  let tireTempFL: number | undefined;
  let tireTempFR: number | undefined;
  let tireTempRL: number | undefined;
  let tireTempRR: number | undefined;

  let tireWearFL: number | undefined;
  let tireWearFR: number | undefined;
  let tireWearRL: number | undefined;
  let tireWearRR: number | undefined;

  let directEngineDamage: number | undefined;
  let directTransDamage: number | undefined;
  let directSuspDamage: number | undefined;
  let directBrakesDamage: number | undefined;
  let directSteeringDamage: number | undefined;
  let directChassisDamage: number | undefined;

  // Orientation vectors (offsets 56, 60, 64)
  const yaw = buffer.length >= 60 ? buffer.readFloatLE(56) : 0;
  const pitch = buffer.length >= 64 ? buffer.readFloatLE(60) : 0;
  const roll = buffer.length >= 68 ? buffer.readFloatLE(64) : 0;

  let positionX: number | undefined;
  let positionY: number | undefined;
  let positionZ: number | undefined;

  // Velocity vectors (offsets 32, 36, 40)
  const velocityX = buffer.length >= 36 ? buffer.readFloatLE(32) : 0;
  const velocityY = buffer.length >= 40 ? buffer.readFloatLE(36) : 0;
  const velocityZ = buffer.length >= 44 ? buffer.readFloatLE(40) : 0;

  // Calculate speed in m/s from velocity vector magnitude
  let speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY + velocityZ * velocityZ);

  // Car details (offsets 212, 216, 220)
  const carOrdinal = buffer.length >= 216 ? buffer.readInt32LE(212) : 0;
  const carClass = buffer.length >= 220 ? buffer.readInt32LE(216) : 0;
  const carPerformanceIndex = buffer.length >= 224 ? buffer.readInt32LE(220) : 0;

  let power = 0;
  let torque = 0;
  let rawFuelRatio = 1.0;
  let distanceTraveled = 0;
  let bestLap = 0;
  let lastLap = 0;
  let currentLap = 0;
  let currentRaceTime = 0;
  let lapNumber = 0;
  let racePosition = 0;
  let accel = 0;
  let brake = 0;
  let clutch = 0;
  let handBrake = 0;
  let gear = 0; // 0=Reverse, -1=Neutral, 1=1st, 2=2nd, etc.
  let steer = 0;

  if (buffer.length >= 331) {
    // ------------------------------------------------------------------------
    // Forza Motorsport (2023) Car Dash Packet Layout (331 bytes)
    // ------------------------------------------------------------------------
    const dashSpeed = buffer.readFloatLE(FM2023_OFFSETS.speed);
    if (speed === 0 && !isNaN(dashSpeed) && dashSpeed >= 0 && dashSpeed < 300) {
      speed = dashSpeed;
    }

    const rawPower = buffer.readFloatLE(FM2023_OFFSETS.power);
    power = Math.max(0, rawPower / 745.7);
    torque = Math.max(0, buffer.readFloatLE(FM2023_OFFSETS.torque));

    positionX = buffer.readFloatLE(FM2023_OFFSETS.positionX);
    positionY = buffer.readFloatLE(FM2023_OFFSETS.positionY);
    positionZ = buffer.readFloatLE(FM2023_OFFSETS.positionZ);

    rawFuelRatio = Math.max(0, Math.min(1.0, buffer.readFloatLE(FM2023_OFFSETS.fuel)));
    distanceTraveled = buffer.readFloatLE(FM2023_OFFSETS.distanceTraveled);
    bestLap = buffer.readFloatLE(FM2023_OFFSETS.bestLap);
    lastLap = buffer.readFloatLE(FM2023_OFFSETS.lastLap);
    currentLap = buffer.readFloatLE(FM2023_OFFSETS.currentLap);
    currentRaceTime = buffer.readFloatLE(FM2023_OFFSETS.currentRaceTime);
    lapNumber = buffer.readUInt16LE(FM2023_OFFSETS.lapNumber);
    racePosition = buffer.readUInt8(FM2023_OFFSETS.racePosition);

    accel = buffer.readUInt8(FM2023_OFFSETS.throttle);
    brake = buffer.readUInt8(FM2023_OFFSETS.brake);
    clutch = buffer.readUInt8(FM2023_OFFSETS.clutch);
    handBrake = buffer.readUInt8(FM2023_OFFSETS.handbrake);

    const legacyRawGear = buffer.readUInt8(FM2023_OFFSETS.gear);
    if (legacyRawGear === 0) gear = 0; // Reverse
    else if (legacyRawGear === 1) gear = -1; // Neutral
    else gear = legacyRawGear - 1; // 1st, 2nd, etc.

    steer = buffer.readInt8(FM2023_OFFSETS.steering);

    const rawTempFL = buffer.readFloatLE(FM2023_OFFSETS.tireTempFL);
    const rawTempFR = buffer.readFloatLE(FM2023_OFFSETS.tireTempFR);
    const rawTempRL = buffer.readFloatLE(FM2023_OFFSETS.tireTempRL);
    const rawTempRR = buffer.readFloatLE(FM2023_OFFSETS.tireTempRR);

    tireTempFL = fahrenheitToCelsius(rawTempFL);
    tireTempFR = fahrenheitToCelsius(rawTempFR);
    tireTempRL = fahrenheitToCelsius(rawTempRL);
    tireTempRR = fahrenheitToCelsius(rawTempRR);

    // Read native 4-corner tire wear from FM2023 trailing bytes (offsets 311 to 326)
    const rawWearFL = buffer.readFloatLE(FM2023_OFFSETS.tireWearFL);
    const rawWearFR = buffer.readFloatLE(FM2023_OFFSETS.tireWearFR);
    const rawWearRL = buffer.readFloatLE(FM2023_OFFSETS.tireWearRL);
    const rawWearRR = buffer.readFloatLE(FM2023_OFFSETS.tireWearRR);

    if (!isNaN(rawWearFL) && rawWearFL >= 0 && rawWearFL <= 1) tireWearFL = rawWearFL;
    if (!isNaN(rawWearFR) && rawWearFR >= 0 && rawWearFR <= 1) tireWearFR = rawWearFR;
    if (!isNaN(rawWearRL) && rawWearRL >= 0 && rawWearRL <= 1) tireWearRL = rawWearRL;
    if (!isNaN(rawWearRR) && rawWearRR >= 0 && rawWearRR <= 1) tireWearRR = rawWearRR;

    // Support custom injector / extended packet if damage bytes are appended past byte 331
    if (buffer.length >= 355) {
      const eDmg = buffer.readFloatLE(331);
      const tDmg = buffer.readFloatLE(335);
      const sDmg = buffer.readFloatLE(339);
      const bDmg = buffer.readFloatLE(343);
      const stDmg = buffer.readFloatLE(347);
      const cDmg = buffer.readFloatLE(351);
      if (!isNaN(eDmg) && eDmg >= 0 && eDmg <= 100) directEngineDamage = eDmg;
      if (!isNaN(tDmg) && tDmg >= 0 && tDmg <= 100) directTransDamage = tDmg;
      if (!isNaN(sDmg) && sDmg >= 0 && sDmg <= 100) directSuspDamage = sDmg;
      if (!isNaN(bDmg) && bDmg >= 0 && bDmg <= 100) directBrakesDamage = bDmg;
      if (!isNaN(stDmg) && stDmg >= 0 && stDmg <= 100) directSteeringDamage = stDmg;
      if (!isNaN(cDmg) && cDmg >= 0 && cDmg <= 100) directChassisDamage = cDmg;
    }
  } else if (buffer.length === 324) {
    // ------------------------------------------------------------------------
    // Official FH6 Car Dash Packet Layout (324 bytes)
    // ------------------------------------------------------------------------
    const dashSpeed = buffer.readFloatLE(FH6_OFFSETS.speed);
    if (speed === 0 && !isNaN(dashSpeed) && dashSpeed >= 0 && dashSpeed < 300) {
      speed = dashSpeed;
    }

    // Power in Watts -> HP
    const rawPower = buffer.readFloatLE(FH6_OFFSETS.power);
    power = Math.max(0, rawPower / 745.7);

    // Car world coordinates
    positionX = buffer.readFloatLE(FH6_OFFSETS.positionX);
    positionY = buffer.readFloatLE(FH6_OFFSETS.positionY);
    positionZ = buffer.readFloatLE(FH6_OFFSETS.positionZ);

    // Torque in N-m
    const rawTorque = buffer.readFloatLE(FH6_OFFSETS.torque);
    torque = Math.max(0, rawTorque);

    // Fuel ratio (0.0 to 1.0)
    const fuelVal = buffer.readFloatLE(FH6_OFFSETS.fuel);
    rawFuelRatio = Math.max(0, Math.min(1.0, fuelVal));

    distanceTraveled = buffer.readFloatLE(FH6_OFFSETS.distanceTraveled);
    bestLap = buffer.readFloatLE(FH6_OFFSETS.bestLap);
    lastLap = buffer.readFloatLE(FH6_OFFSETS.lastLap);
    currentLap = buffer.readFloatLE(FH6_OFFSETS.currentLap);
    currentRaceTime = buffer.readFloatLE(FH6_OFFSETS.currentRaceTime);
    lapNumber = buffer.readUInt16LE(FH6_OFFSETS.lapNumber);
    racePosition = buffer.readUInt8(FH6_OFFSETS.racePosition);

    accel = buffer.readUInt8(FH6_OFFSETS.throttle);
    brake = buffer.readUInt8(FH6_OFFSETS.brake);
    clutch = buffer.readUInt8(FH6_OFFSETS.clutch);
    handBrake = buffer.readUInt8(FH6_OFFSETS.handbrake);

    const rawGear = buffer.readInt8(FH6_OFFSETS.gear);
    gear = decodeGear(rawGear);

    steer = buffer.readInt8(FH6_OFFSETS.steering);

    const rawTempFL = buffer.readFloatLE(FH6_OFFSETS.tireTempFL);
    const rawTempFR = buffer.readFloatLE(FH6_OFFSETS.tireTempFR);
    const rawTempRL = buffer.readFloatLE(FH6_OFFSETS.tireTempRL);
    const rawTempRR = buffer.readFloatLE(FH6_OFFSETS.tireTempRR);

    // Forza UDP Data Out outputs tire temperatures in Fahrenheit. Convert to Celsius.
    tireTempFL = fahrenheitToCelsius(rawTempFL);
    tireTempFR = fahrenheitToCelsius(rawTempFR);
    tireTempRL = fahrenheitToCelsius(rawTempRL);
    tireTempRR = fahrenheitToCelsius(rawTempRR);
  } else if (buffer.length === 323) {
    // ------------------------------------------------------------------------
    // Legacy FH5 Car Dash Packet Layout (323 bytes)
    // ------------------------------------------------------------------------
    const dashSpeed = buffer.readFloatLE(FH5_OFFSETS.speed);
    if (speed === 0 && !isNaN(dashSpeed) && dashSpeed >= 0 && dashSpeed < 300) {
      speed = dashSpeed;
    }

    const rawPower = buffer.readFloatLE(FH5_OFFSETS.power);
    power = Math.max(0, rawPower / 745.7);
    torque = Math.max(0, buffer.readFloatLE(FH5_OFFSETS.torque));

    positionX = buffer.readFloatLE(FH5_OFFSETS.positionX);
    positionY = buffer.readFloatLE(FH5_OFFSETS.positionY);
    positionZ = buffer.readFloatLE(FH5_OFFSETS.positionZ);

    rawFuelRatio = Math.max(0, Math.min(1.0, buffer.readFloatLE(FH5_OFFSETS.fuel)));
    distanceTraveled = buffer.readFloatLE(FH5_OFFSETS.distanceTraveled);
    bestLap = buffer.readFloatLE(FH5_OFFSETS.bestLap);
    lastLap = buffer.readFloatLE(FH5_OFFSETS.lastLap);
    currentLap = buffer.readFloatLE(FH5_OFFSETS.currentLap);
    currentRaceTime = buffer.readFloatLE(FH5_OFFSETS.currentRaceTime);
    lapNumber = buffer.readUInt16LE(FH5_OFFSETS.lapNumber);
    racePosition = buffer.readUInt8(FH5_OFFSETS.racePosition);

    accel = buffer.readUInt8(FH5_OFFSETS.throttle);
    brake = buffer.readUInt8(FH5_OFFSETS.brake);
    clutch = buffer.readUInt8(FH5_OFFSETS.clutch);
    handBrake = buffer.readUInt8(FH5_OFFSETS.handbrake);

    const legacyRawGear = buffer.readUInt8(FH5_OFFSETS.gear);
    if (legacyRawGear === 0) gear = 0; // Reverse
    else if (legacyRawGear === 1) gear = -1; // Neutral
    else gear = legacyRawGear - 1; // 1st, 2nd, etc.

    steer = buffer.readInt8(FH5_OFFSETS.steering);

    const rawTempFL = buffer.readFloatLE(FH5_OFFSETS.tireTempFL);
    const rawTempFR = buffer.readFloatLE(FH5_OFFSETS.tireTempFR);
    const rawTempRL = buffer.readFloatLE(FH5_OFFSETS.tireTempRL);
    const rawTempRR = buffer.readFloatLE(FH5_OFFSETS.tireTempRR);

    tireTempFL = fahrenheitToCelsius(rawTempFL);
    tireTempFR = fahrenheitToCelsius(rawTempFR);
    tireTempRL = fahrenheitToCelsius(rawTempRL);
    tireTempRR = fahrenheitToCelsius(rawTempRR);
  } else if (buffer.length >= 232) {
    // ------------------------------------------------------------------------
    // Sled Mode Fallback (232-byte packet)
    // ------------------------------------------------------------------------
    const accelZ = buffer.readFloatLE(28);
    if (accelZ > 0.2) {
      accel = Math.min(255, Math.round((accelZ / 7.0) * 255));
    } else if (accelZ < -0.5) {
      brake = Math.min(255, Math.round((Math.abs(accelZ) / 10.0) * 255));
    }

    if (currentEngineRpm > 500) {
      const speedKmH = speed * 3.6;
      if (speedKmH > 2) {
        const ratio = currentEngineRpm / speedKmH;
        if (ratio > 75) gear = 1;
        else if (ratio > 48) gear = 2;
        else if (ratio > 34) gear = 3;
        else if (ratio > 24) gear = 4;
        else if (ratio > 17) gear = 5;
        else if (ratio > 12) gear = 6;
        else gear = 7;
      } else {
        gear = 1;
      }
    }
  }

  // Calculate advanced fuel metrics using FuelTracker
  const fuelState = fuelTracker.processTelemetry({
    timestampMS,
    carOrdinal,
    carClass,
    power,
    speed,
    gear,
    currentEngineRpm,
    engineMaxRpm,
    accel,
    fuel: rawFuelRatio,
  });

  // Calculate live simulation damage and tire wear using DamageTracker
  const damageState = damageTracker.processTelemetry({
    timestampMS,
    isRaceOn,
    carOrdinal,
    speed,
    accelerationX,
    accelerationY,
    accelerationZ,
    yaw,
    pitch,
    roll,
    positionX,
    positionY,
    positionZ,
    suspensionTravelFL,
    suspensionTravelFR,
    suspensionTravelRL,
    suspensionTravelRR,
    wheelSlipFL,
    wheelSlipFR,
    wheelSlipRL,
    wheelSlipRR,
    tireTempFL,
    tireTempFR,
    tireTempRL,
    tireTempRR,
    brake,
    accel,
    clutch,
    gear,
    steer,
    currentEngineRpm,
    engineMaxRpm,
    distanceTraveled,
    nativeWearFL: tireWearFL,
    nativeWearFR: tireWearFR,
    nativeWearRL: tireWearRL,
    nativeWearRR: tireWearRR,
    engineDamagePct: directEngineDamage,
    transmissionDamagePct: directTransDamage,
    suspensionDamagePct: directSuspDamage,
    brakesDamagePct: directBrakesDamage,
    steeringDamagePct: directSteeringDamage,
    chassisDamagePct: directChassisDamage,
  });

  // Resolve Forza PI class designation & badge styling
  const piInfo = getCarPiClass(carClass, carPerformanceIndex);

  const parsedData: Partial<ForzaTelemetryData> = {
    isRaceOn,
    timestampMS,
    engineMaxRpm,
    engineIdleRpm,
    currentEngineRpm,
    speed,
    power,
    torque,
    fuel: fuelState.fuelRatio,
    maxFuelCapacityLiters: fuelState.maxFuelCapacityLiters,
    currentFuelLiters: fuelState.currentFuelLiters,
    fuelSpentLiters: fuelState.fuelSpentLiters,
    engineDisplacementLiters: fuelState.engineDisplacementLiters,
    fuelConsumptionRate: fuelState.fuelConsumptionRate,
    fuelRateLPerHour: fuelState.fuelRateLPerHour,
    remainingTimeFormatted: fuelState.remainingTimeFormatted,
    remainingDistanceKm: fuelState.remainingDistanceKm,
    remainingDistanceFormatted: fuelState.remainingDistanceFormatted,
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
    carName: fuelState.carName,
    piClassName: piInfo.className,
    piRating: piInfo.piRating,
    piBadgeColor: piInfo.badgeColor,
    piBadgeBg: piInfo.badgeBg,
    accelerationX,
    accelerationY,
    accelerationZ,
    yaw,
    pitch,
    roll,
    positionX,
    positionY,
    positionZ,
    suspensionTravelFL,
    suspensionTravelFR,
    suspensionTravelRL,
    suspensionTravelRR,
    wheelSlipFL,
    wheelSlipFR,
    wheelSlipRL,
    wheelSlipRR,
    tireTempFL,
    tireTempFR,
    tireTempRL,
    tireTempRR,
    tireWearFL: damageState.tireWearFL,
    tireWearFR: damageState.tireWearFR,
    tireWearRL: damageState.tireWearRL,
    tireWearRR: damageState.tireWearRR,
    tiresDamagePct: damageState.tiresDamagePct,
    engineDamagePct: damageState.engineDamagePct,
    transmissionDamagePct: damageState.transmissionDamagePct,
    suspensionDamagePct: damageState.suspensionDamagePct,
    brakesDamagePct: damageState.brakesDamagePct,
    steeringDamagePct: damageState.steeringDamagePct,
    chassisDamagePct: damageState.chassisDamagePct,
  };

  debugLogTelemetry(buffer, parsedData);

  return parsedData;
}
