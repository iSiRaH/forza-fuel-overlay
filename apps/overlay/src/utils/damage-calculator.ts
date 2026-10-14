import type { ForzaTelemetryData } from '../../../../packages/shared/src/types/telemetry.js';
import type {
  ComponentId,
  ComponentDamageState,
  DamageSeverity,
  DamageThresholds,
  VehicleDamageSummary,
} from '../../../../packages/shared/src/types/damage.js';

import { DamageTracker } from '../../../../packages/shared/src/damage/damageTracker.js';

export const DEFAULT_DAMAGE_THRESHOLDS: DamageThresholds = {
  minorMax: 19,
  moderateMax: 49,
  severeMax: 79,
  criticalMax: 100,
};

export interface DamageCalculatorOptions {
  thresholds?: DamageThresholds;
  staleTimeoutMs?: number;
  now?: number;
  enableClientFallback?: boolean;
}

export const fallbackDamageTracker = new DamageTracker();

/**
 * Normalizes tire temperatures to Celsius.
 * In Forza UDP Data Out, raw temperatures are output in Fahrenheit (typically 70°F - 300°F).
 * If the value is > 130, it is guaranteed to be in Fahrenheit and is converted to Celsius.
 */
export function normalizeTireTemp(val: number | null | undefined): number | null {
  if (val === null || val === undefined || isNaN(val)) return null;
  if (val > 130) {
    return Math.round(((val - 32) * (5 / 9)) * 10) / 10;
  }
  return Math.round(val * 10) / 10;
}

/**
 * Validates and clamps a damage ratio (0.0 to 1.0) or percentage (0 to 100) to a clean 0-100 number.
 * Returns null if input is missing, NaN, or non-finite.
 */
export function normalizeDamagePercent(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num) || !isFinite(num)) return null;

  // If value is between 0.0 and 1.0 (excluding exactly 0 or 1 when ambiguous, but standard telemetry normalized values are <= 1.0)
  // Check if it represents a 0.0-1.0 fraction
  if (num > 0 && num <= 1.0) {
    return Math.round(num * 100 * 10) / 10;
  }

  // If already 0 to 100
  return Math.min(100, Math.max(0, Math.round(num * 10) / 10));
}

/**
 * Maps a numeric damage percentage to a semantic severity level using configurable thresholds.
 */
export function mapDamageSeverity(
  damagePct: number | null,
  thresholds: DamageThresholds = DEFAULT_DAMAGE_THRESHOLDS
): DamageSeverity {
  if (damagePct === null || isNaN(damagePct)) return 'unavailable';
  if (damagePct <= 0.001) return 'healthy';
  if (damagePct <= thresholds.minorMax) return 'minor';
  if (damagePct <= thresholds.moderateMax) return 'moderate';
  if (damagePct <= thresholds.severeMax) return 'severe';
  return 'critical';
}

/**
 * Returns a human-friendly status label for a given severity level.
 */
export function getSeverityLabel(severity: DamageSeverity): string {
  switch (severity) {
    case 'healthy':
      return 'Healthy';
    case 'minor':
      return 'Minor Damage';
    case 'moderate':
      return 'Moderate Damage';
    case 'severe':
      return 'Severe Damage';
    case 'critical':
      return 'Critical';
    case 'unavailable':
    default:
      return 'Unavailable';
  }
}

/**
 * Formats a damage or condition percentage into a display string.
 */
export function formatDamagePercent(val: number | null): string {
  if (val === null || isNaN(val)) return 'N/A';
  return `${Math.round(val)}%`;
}

/**
 * Pure damage interpretation module.
 * Converts verified telemetry fields into a validated, normalized VehicleDamageSummary.
 * Strictly avoids fabricating percentages when underlying telemetry fields are not present.
 */
export function calculateDamage(
  telemetry: Partial<ForzaTelemetryData> | null | undefined,
  isConnected: boolean,
  options: DamageCalculatorOptions = {}
): VehicleDamageSummary {
  const thresholds = options.thresholds || DEFAULT_DAMAGE_THRESHOLDS;
  const now = options.now ?? Date.now();

  const emptyComponent = (id: ComponentId, name: string): ComponentDamageState => ({
    id,
    name,
    isAvailable: false,
    damagePercent: null,
    conditionPercent: null,
    severity: 'unavailable',
    statusLabel: 'Unavailable',
  });

  // Disconnected / Missing Telemetry State
  if (!isConnected || !telemetry) {
    return {
      overallConditionPct: null,
      overallDamagePct: null,
      overallSeverity: 'unavailable',
      vehicleStatus: 'Offline',
      isStale: true,
      components: {
        engine: emptyComponent('engine', 'Engine'),
        transmission: emptyComponent('transmission', 'Transmission'),
        suspension: emptyComponent('suspension', 'Suspension'),
        brakes: emptyComponent('brakes', 'Brakes'),
        tires: emptyComponent('tires', 'Tires'),
        steering: emptyComponent('steering', 'Steering'),
        chassis: emptyComponent('chassis', 'Chassis / Body'),
      },
      lastUpdatedMs: now,
    };
  }

  // Check staleness (if timestamp has not been provided or is 0)
  const isStale = telemetry.isRaceOn === false && (telemetry.speed ?? 0) === 0;

  let activeTelemetry: Partial<ForzaTelemetryData> = telemetry;

  const enableClientFallback = options.enableClientFallback ?? true;

  // If enabled and any damage fields are not present in the incoming packet, run client fallback tracker
  if (
    enableClientFallback &&
    (telemetry.engineDamagePct === undefined ||
     telemetry.tiresDamagePct === undefined ||
     telemetry.transmissionDamagePct === undefined ||
     telemetry.suspensionDamagePct === undefined ||
     telemetry.brakesDamagePct === undefined)
  ) {
    const tracked = fallbackDamageTracker.processTelemetry(telemetry as any);
    activeTelemetry = {
      ...telemetry,
      engineDamagePct: telemetry.engineDamagePct ?? tracked.engineDamagePct,
      transmissionDamagePct: telemetry.transmissionDamagePct ?? tracked.transmissionDamagePct,
      suspensionDamagePct: telemetry.suspensionDamagePct ?? tracked.suspensionDamagePct,
      brakesDamagePct: telemetry.brakesDamagePct ?? tracked.brakesDamagePct,
      tiresDamagePct: telemetry.tiresDamagePct ?? tracked.tiresDamagePct,
      tireWearFL: telemetry.tireWearFL ?? tracked.tireWearFL,
      tireWearFR: telemetry.tireWearFR ?? tracked.tireWearFR,
      tireWearRL: telemetry.tireWearRL ?? tracked.tireWearRL,
      tireWearRR: telemetry.tireWearRR ?? tracked.tireWearRR,
      steeringDamagePct: telemetry.steeringDamagePct ?? tracked.steeringDamagePct,
      chassisDamagePct: telemetry.chassisDamagePct ?? tracked.chassisDamagePct,
    };
  }

  // 1. ENGINE DAMAGE
  const rawEngineDamage = normalizeDamagePercent(activeTelemetry.engineDamagePct);
  let engineSeverity: DamageSeverity = 'unavailable';
  let engineDamagePct: number | null = null;
  let isEngineAvailable = false;
  let engineStatus = 'Unavailable';
  let engineInfo: string | undefined;

  const currentRpm = telemetry.currentEngineRpm ?? 0;
  const maxRpm = telemetry.engineMaxRpm ?? 0;
  const isOverRev = maxRpm > 0 && currentRpm > maxRpm * 1.02;

  if (rawEngineDamage !== null) {
    isEngineAvailable = true;
    engineDamagePct = rawEngineDamage;
    engineSeverity = mapDamageSeverity(engineDamagePct, thresholds);
    engineStatus = getSeverityLabel(engineSeverity);
  } else if (isOverRev) {
    // Game does not supply engine damage %, but over-rev is physically detected
    engineInfo = 'RPM Redline Stress';
  }

  const engineState: ComponentDamageState = {
    id: 'engine',
    name: 'Engine',
    isAvailable: isEngineAvailable,
    damagePercent: engineDamagePct,
    conditionPercent: engineDamagePct !== null ? Math.max(0, 100 - engineDamagePct) : null,
    severity: engineSeverity,
    statusLabel: engineStatus,
    details: {
      info: engineInfo,
    },
  };

  // 2. TRANSMISSION DAMAGE
  const rawTransDamage = normalizeDamagePercent(activeTelemetry.transmissionDamagePct);
  const isTransAvailable = rawTransDamage !== null;
  const transDamagePct = isTransAvailable ? rawTransDamage : null;
  const transSeverity = mapDamageSeverity(transDamagePct, thresholds);

  const transmissionState: ComponentDamageState = {
    id: 'transmission',
    name: 'Transmission',
    isAvailable: isTransAvailable,
    damagePercent: transDamagePct,
    conditionPercent: transDamagePct !== null ? Math.max(0, 100 - transDamagePct) : null,
    severity: transSeverity,
    statusLabel: isTransAvailable ? getSeverityLabel(transSeverity) : 'Unavailable',
  };

  // 3. SUSPENSION DAMAGE
  const rawSuspDamage = normalizeDamagePercent(activeTelemetry.suspensionDamagePct);
  let isSuspAvailable = false;
  let suspDamagePct: number | null = null;
  let suspSeverity: DamageSeverity = 'unavailable';
  let suspInfo: string | undefined;

  const suspTravel = {
    fl: telemetry.suspensionTravelFL,
    fr: telemetry.suspensionTravelFR,
    rl: telemetry.suspensionTravelRL,
    rr: telemetry.suspensionTravelRR,
  };

  const hasSuspTravel =
    suspTravel.fl !== undefined ||
    suspTravel.fr !== undefined ||
    suspTravel.rl !== undefined ||
    suspTravel.rr !== undefined;

  const isBottomedOut =
    (suspTravel.fl ?? 0) >= 0.98 ||
    (suspTravel.fr ?? 0) >= 0.98 ||
    (suspTravel.rl ?? 0) >= 0.98 ||
    (suspTravel.rr ?? 0) >= 0.98;

  if (rawSuspDamage !== null) {
    isSuspAvailable = true;
    suspDamagePct = rawSuspDamage;
    suspSeverity = mapDamageSeverity(suspDamagePct, thresholds);
  } else if (isBottomedOut) {
    suspInfo = 'Bottomed Out (Travel Maxed)';
  }

  const suspensionState: ComponentDamageState = {
    id: 'suspension',
    name: 'Suspension',
    isAvailable: isSuspAvailable,
    damagePercent: suspDamagePct,
    conditionPercent: suspDamagePct !== null ? Math.max(0, 100 - suspDamagePct) : null,
    severity: suspSeverity,
    statusLabel: isSuspAvailable ? getSeverityLabel(suspSeverity) : 'Unavailable',
    details: {
      suspensionTravel: hasSuspTravel ? (suspTravel as Record<string, number>) : undefined,
      info: suspInfo,
    },
  };

  // 4. BRAKES DAMAGE
  const rawBrakesDamage = normalizeDamagePercent(activeTelemetry.brakesDamagePct);
  const isBrakesAvailable = rawBrakesDamage !== null;
  const brakesDamagePct = isBrakesAvailable ? rawBrakesDamage : null;
  const brakesSeverity = mapDamageSeverity(brakesDamagePct, thresholds);

  const brakesState: ComponentDamageState = {
    id: 'brakes',
    name: 'Brakes',
    isAvailable: isBrakesAvailable,
    damagePercent: brakesDamagePct,
    conditionPercent: brakesDamagePct !== null ? Math.max(0, 100 - brakesDamagePct) : null,
    severity: brakesSeverity,
    statusLabel: isBrakesAvailable ? getSeverityLabel(brakesSeverity) : 'Unavailable',
  };

  // 5. TIRES DAMAGE
  // Check 4-corner tire wear or overall tire damage
  const rawWearCorners = {
    fl: normalizeDamagePercent(activeTelemetry.tireWearFL),
    fr: normalizeDamagePercent(activeTelemetry.tireWearFR),
    rl: normalizeDamagePercent(activeTelemetry.tireWearRL),
    rr: normalizeDamagePercent(activeTelemetry.tireWearRR),
  };

  const hasCornerWear =
    rawWearCorners.fl !== null ||
    rawWearCorners.fr !== null ||
    rawWearCorners.rl !== null ||
    rawWearCorners.rr !== null;

  const rawOverallTireDamage = normalizeDamagePercent(activeTelemetry.tiresDamagePct);

  let tiresDamagePct: number | null = null;
  let isTiresAvailable = false;
  let tiresSeverity: DamageSeverity = 'unavailable';

  if (hasCornerWear) {
    isTiresAvailable = true;
    const validWears = [
      rawWearCorners.fl,
      rawWearCorners.fr,
      rawWearCorners.rl,
      rawWearCorners.rr,
    ].filter((w): w is number => w !== null);

    // Use maximum corner wear to highlight weakest tire
    tiresDamagePct = validWears.length > 0 ? Math.max(...validWears) : 0;
    tiresSeverity = mapDamageSeverity(tiresDamagePct, thresholds);
  } else if (rawOverallTireDamage !== null) {
    isTiresAvailable = true;
    tiresDamagePct = rawOverallTireDamage;
    tiresSeverity = mapDamageSeverity(tiresDamagePct, thresholds);
  }

  const tireTemps = {
    fl: telemetry.tireTempFL,
    fr: telemetry.tireTempFR,
    rl: telemetry.tireTempRL,
    rr: telemetry.tireTempRR,
  };

  const hasTireTemps =
    tireTemps.fl !== undefined ||
    tireTemps.fr !== undefined ||
    tireTemps.rl !== undefined ||
    tireTemps.rr !== undefined;

  const tiresState: ComponentDamageState = {
    id: 'tires',
    name: 'Tires',
    isAvailable: isTiresAvailable,
    damagePercent: tiresDamagePct,
    conditionPercent: tiresDamagePct !== null ? Math.max(0, 100 - tiresDamagePct) : null,
    severity: tiresSeverity,
    statusLabel: isTiresAvailable ? getSeverityLabel(tiresSeverity) : 'Unavailable',
    details: {
      wearCorners: hasCornerWear ? rawWearCorners : undefined,
      temps: hasTireTemps ? (tireTemps as Record<string, number>) : undefined,
    },
  };

  // 6. STEERING DAMAGE
  const rawSteeringDamage = normalizeDamagePercent(activeTelemetry.steeringDamagePct);
  const isSteeringAvailable = rawSteeringDamage !== null;
  const steeringDamagePct = isSteeringAvailable ? rawSteeringDamage : null;
  const steeringSeverity = mapDamageSeverity(steeringDamagePct, thresholds);

  const steeringState: ComponentDamageState = {
    id: 'steering',
    name: 'Steering',
    isAvailable: isSteeringAvailable,
    damagePercent: steeringDamagePct,
    conditionPercent: steeringDamagePct !== null ? Math.max(0, 100 - steeringDamagePct) : null,
    severity: steeringSeverity,
    statusLabel: isSteeringAvailable ? getSeverityLabel(steeringSeverity) : 'Unavailable',
  };

  // 7. CHASSIS / BODY DAMAGE
  const rawChassisDamage = normalizeDamagePercent(activeTelemetry.chassisDamagePct);
  const isChassisAvailable = rawChassisDamage !== null;
  const chassisDamagePct = isChassisAvailable ? rawChassisDamage : null;
  const chassisSeverity = mapDamageSeverity(chassisDamagePct, thresholds);

  const chassisState: ComponentDamageState = {
    id: 'chassis',
    name: 'Chassis / Body',
    isAvailable: isChassisAvailable,
    damagePercent: chassisDamagePct,
    conditionPercent: chassisDamagePct !== null ? Math.max(0, 100 - chassisDamagePct) : null,
    severity: chassisSeverity,
    statusLabel: isChassisAvailable ? getSeverityLabel(chassisSeverity) : 'Unavailable',
  };

  // 8. OVERALL VEHICLE CONDITION CALCULATION
  const componentsRecord: Record<ComponentId, ComponentDamageState> = {
    engine: engineState,
    transmission: transmissionState,
    suspension: suspensionState,
    brakes: brakesState,
    tires: tiresState,
    steering: steeringState,
    chassis: chassisState,
  };

  const availableDamageValues = Object.values(componentsRecord)
    .filter((c) => c.isAvailable && c.damagePercent !== null)
    .map((c) => c.damagePercent as number);

  let overallDamagePct: number | null = null;
  let overallConditionPct: number | null = null;
  let overallSeverity: DamageSeverity = 'unavailable';
  let vehicleStatus: 'Healthy' | 'Minor Damage' | 'Damaged' | 'Critical' | 'Unavailable' | 'Offline' =
    'Unavailable';

  if (availableDamageValues.length > 0) {
    // The vehicle condition is limited by its most severely damaged component
    overallDamagePct = Math.round(Math.max(...availableDamageValues) * 10) / 10;
    overallConditionPct = Math.max(0, Math.round((100 - overallDamagePct) * 10) / 10);
    overallSeverity = mapDamageSeverity(overallDamagePct, thresholds);

    if (overallDamagePct <= 0.001) {
      vehicleStatus = 'Healthy';
    } else if (overallDamagePct <= thresholds.minorMax) {
      vehicleStatus = 'Minor Damage';
    } else if (overallDamagePct <= thresholds.severeMax) {
      vehicleStatus = 'Damaged';
    } else {
      vehicleStatus = 'Critical';
    }
  }

  // Build corner detail for tires with normalized Celsius temperatures
  const tiresCornerDetail = {
    fl: {
      wear: rawWearCorners.fl,
      temp: normalizeTireTemp(tireTemps.fl),
      severity: mapDamageSeverity(rawWearCorners.fl, thresholds),
    },
    fr: {
      wear: rawWearCorners.fr,
      temp: normalizeTireTemp(tireTemps.fr),
      severity: mapDamageSeverity(rawWearCorners.fr, thresholds),
    },
    rl: {
      wear: rawWearCorners.rl,
      temp: normalizeTireTemp(tireTemps.rl),
      severity: mapDamageSeverity(rawWearCorners.rl, thresholds),
    },
    rr: {
      wear: rawWearCorners.rr,
      temp: normalizeTireTemp(tireTemps.rr),
      severity: mapDamageSeverity(rawWearCorners.rr, thresholds),
    },
  };

  return {
    overallConditionPct,
    overallDamagePct,
    overallSeverity,
    vehicleStatus,
    isStale,
    components: componentsRecord,
    tiresCornerDetail: hasCornerWear || hasTireTemps ? tiresCornerDetail : undefined,
    lastUpdatedMs: now,
  };
}
