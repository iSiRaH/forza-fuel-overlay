export type DamageSeverity = 'healthy' | 'minor' | 'moderate' | 'severe' | 'critical' | 'unavailable';

export interface DamageThresholds {
  minorMax: number;    // e.g. 19
  moderateMax: number; // e.g. 49
  severeMax: number;   // e.g. 79
  criticalMax: number; // e.g. 100
}

export type ComponentId =
  | 'engine'
  | 'transmission'
  | 'suspension'
  | 'brakes'
  | 'tires'
  | 'steering'
  | 'chassis';

export interface ComponentDamageState {
  id: ComponentId;
  name: string;
  isAvailable: boolean;
  damagePercent: number | null;     // 0 - 100%, or null if telemetry does not supply it
  conditionPercent: number | null;  // 100 - damagePercent, or null if unavailable
  severity: DamageSeverity;
  statusLabel: string;             // "Healthy", "Minor", "Moderate", "Critical", or "Unavailable"
  details?: {
    temps?: { fl?: number; fr?: number; rl?: number; rr?: number };
    wearCorners?: { fl?: number | null; fr?: number | null; rl?: number | null; rr?: number | null };
    suspensionTravel?: { fl?: number; fr?: number; rl?: number; rr?: number };
    info?: string;
  };
}

export interface VehicleDamageSummary {
  overallConditionPct: number | null; // 0 - 100%, or null if all unavailable
  overallDamagePct: number | null;    // 0 - 100%, or null if all unavailable
  overallSeverity: DamageSeverity;
  vehicleStatus: 'Healthy' | 'Minor Damage' | 'Damaged' | 'Critical' | 'Unavailable' | 'Offline';
  isStale: boolean;
  components: Record<ComponentId, ComponentDamageState>;
  tiresCornerDetail?: {
    fl: { wear: number | null; temp: number | null; severity: DamageSeverity };
    fr: { wear: number | null; temp: number | null; severity: DamageSeverity };
    rl: { wear: number | null; temp: number | null; severity: DamageSeverity };
    rr: { wear: number | null; temp: number | null; severity: DamageSeverity };
  };
  lastUpdatedMs: number;
}
