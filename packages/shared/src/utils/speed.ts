/**
 * Speed conversion factors
 * 1 m/s = 3.6 km/h
 * 1 m/s = 2.23693629 mph
 */
export const MPS_TO_KMH_FACTOR = 3.6;
export const MPS_TO_MPH_FACTOR = 2.23693629;

/**
 * Converts meters per second (m/s) to kilometers per hour (km/h).
 */
export function mpsToKmh(mps: number): number {
  if (typeof mps !== 'number' || isNaN(mps) || mps < 0) return 0;
  return mps * MPS_TO_KMH_FACTOR;
}

/**
 * Converts meters per second (m/s) to miles per hour (mph).
 */
export function mpsToMph(mps: number): number {
  if (typeof mps !== 'number' || isNaN(mps) || mps < 0) return 0;
  return mps * MPS_TO_MPH_FACTOR;
}

/**
 * Converts kilometers per hour (km/h) to meters per second (m/s).
 */
export function kmhToMps(kmh: number): number {
  if (typeof kmh !== 'number' || isNaN(kmh) || kmh < 0) return 0;
  return kmh / MPS_TO_KMH_FACTOR;
}

/**
 * Converts miles per hour (mph) to meters per second (m/s).
 */
export function mphToMps(mph: number): number {
  if (typeof mph !== 'number' || isNaN(mph) || mph < 0) return 0;
  return mph / MPS_TO_MPH_FACTOR;
}

export type SpeedUnit = 'kmh' | 'mph' | 'mps';

export interface FormattedSpeed {
  value: number;
  formatted: string;
  unit: SpeedUnit;
  unitLabel: string;
}

/**
 * Formats speed into human readable value and label based on requested unit.
 */
export function formatSpeed(mps: number, unit: SpeedUnit = 'kmh', decimals: number = 1): FormattedSpeed {
  const safeMps = typeof mps === 'number' && !isNaN(mps) && mps >= 0 ? mps : 0;
  
  let val: number;
  let unitLabel: string;

  switch (unit) {
    case 'mph':
      val = mpsToMph(safeMps);
      unitLabel = 'mph';
      break;
    case 'mps':
      val = safeMps;
      unitLabel = 'm/s';
      break;
    case 'kmh':
    default:
      val = mpsToKmh(safeMps);
      unitLabel = 'km/h';
      break;
  }

  return {
    value: val,
    formatted: val.toFixed(decimals),
    unit,
    unitLabel,
  };
}
