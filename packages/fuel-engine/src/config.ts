/**
 * Centralized simulation constants for the Forza Horizon RPM + Engine Displacement based fuel model.
 */
export const FUEL_CONFIG = {
  /** Base fuel consumption rate (simulation constant in Liters / hour) */
  BASE_FUEL_RATE: 2.0,

  /** Reference engine displacement in Liters used for normalization */
  REFERENCE_DISPLACEMENT: 2.0,

  /** Minimum clamped displacement factor */
  MIN_DISPLACEMENT_FACTOR: 0.50,

  /** Maximum clamped displacement factor */
  MAX_DISPLACEMENT_FACTOR: 4.00,

  /** Non-linear RPM scaling exponent */
  RPM_EXPONENT: 2.2,

  /** Minimum RPM factor */
  RPM_FACTOR_MIN: 0.20,

  /** Maximum RPM factor at redline */
  RPM_FACTOR_MAX: 3.00,

  /** Minimum throttle factor (at low throttle) */
  THROTTLE_FACTOR_MIN: 0.65,

  /** Maximum throttle factor (at 100% throttle) */
  THROTTLE_FACTOR_MAX: 1.50,

  /** Throttle ratio threshold below which coasting / engine braking is active */
  COASTING_THROTTLE_THRESHOLD: 0.05,

  /** Low fuel consumption factor during coasting / engine braking */
  COASTING_FUEL_FACTOR: 0.15,

  /** Fallback engine displacement in Liters if car displacement is missing or invalid */
  DEFAULT_ENGINE_DISPLACEMENT: 2.0,

  /** Fallback redline RPM if engineMaxRpm is missing or invalid */
  DEFAULT_REDLINE_RPM: 7000,

  /** Maximum allowed delta time gap in seconds. Gaps larger than this will be ignored to prevent fuel drops */
  MAX_TELEMETRY_GAP_SECONDS: 2.0,
} as const;
