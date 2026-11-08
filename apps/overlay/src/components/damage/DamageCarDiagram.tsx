import React from 'react';
import type {
  ComponentDamageState,
  DamageSeverity,
  VehicleDamageSummary,
} from '../../../../../packages/shared/src/types/damage.js';
import { formatDamagePercent } from '../../utils/damage-calculator.js';

interface DamageCarDiagramProps {
  summary: VehicleDamageSummary;
  displayMode?: 'damage' | 'condition';
}

interface CalloutProps {
  label: string;
  value: number | null;
  severity: DamageSeverity;
  side: 'left' | 'right';
  y: number;
  targetX?: number;
  targetY?: number;
}

const SEVERITY_COLORS: Record<DamageSeverity, string> = {
  healthy: '#ffffff',
  minor: '#facc15',
  moderate: '#f59e0b',
  severe: '#f97316',
  critical: '#ef4444',
  unavailable: '#64748b',
};

const getDisplayedValue = (
  component: ComponentDamageState,
  displayMode: 'damage' | 'condition',
) => displayMode === 'damage' ? component.damagePercent : component.conditionPercent;

const Callout: React.FC<CalloutProps> = ({
  label,
  value,
  severity,
  side,
  y,
  targetX,
  targetY,
}) => {
  const color = SEVERITY_COLORS[severity];
  const labelX = side === 'left' ? 14 : 386;
  const lineStartX = side === 'left' ? 86 : 314;
  const elbowX = side === 'left' ? 112 : 288;
  const anchor = side === 'left' ? 'start' : 'end';

  return (
    <g className={`dmg-car-callout sev-${severity}`}>
      {targetX !== undefined && targetY !== undefined && (
        <>
          <path
            d={`M ${lineStartX} ${y} H ${elbowX} L ${targetX} ${targetY}`}
            stroke={color}
            className="dmg-car-callout-line"
          />
          <circle cx={targetX} cy={targetY} r="3" fill={color} className="dmg-car-callout-point" />
        </>
      )}
      <text x={labelX} y={y - 4} textAnchor={anchor} className="dmg-car-callout-label">
        {label}
      </text>
      <text x={labelX} y={y + 10} textAnchor={anchor} fill={color} className="dmg-car-callout-value">
        {formatDamagePercent(value)}
      </text>
    </g>
  );
};

export const DamageCarDiagram: React.FC<DamageCarDiagramProps> = ({
  summary,
  displayMode = 'damage',
}) => {
  const { components, tiresCornerDetail } = summary;
  const value = (component: ComponentDamageState) => getDisplayedValue(component, displayMode);
  const tireFallback = value(components.tires);
  const tireValue = (corner: 'fl' | 'fr' | 'rl' | 'rr') => {
    const wear = tiresCornerDetail?.[corner].wear;
    if (wear === null || wear === undefined) return tireFallback;
    return displayMode === 'damage' ? wear : Math.max(0, 100 - wear);
  };
  const tireSeverity = (corner: 'fl' | 'fr' | 'rl' | 'rr') => {
    const detail = tiresCornerDetail?.[corner];
    return detail?.wear !== null && detail?.wear !== undefined
      ? detail.severity
      : components.tires.severity;
  };

  const partClass = (severity: DamageSeverity) => `dmg-car-part dmg-car-part-${severity}`;
  const hasDamage = (component: ComponentDamageState) =>
    component.severity !== 'healthy' && component.severity !== 'unavailable';

  const chassisColor = SEVERITY_COLORS[components.chassis.severity];
  const steeringColor = SEVERITY_COLORS[components.steering.severity];
  const suspensionColor = SEVERITY_COLORS[components.suspension.severity];
  const brakesColor = SEVERITY_COLORS[components.brakes.severity];
  const tireColors = {
    fl: SEVERITY_COLORS[tireSeverity('fl')],
    fr: SEVERITY_COLORS[tireSeverity('fr')],
    rl: SEVERITY_COLORS[tireSeverity('rl')],
    rr: SEVERITY_COLORS[tireSeverity('rr')],
  };

  return (
    <section className="dmg-car-panel" aria-label="Top-down vehicle damage diagram">
      <div className="dmg-car-panel-heading">
        <span>Component map</span>
        <span>{displayMode === 'damage' ? 'Damage %' : 'Condition %'}</span>
      </div>

      <svg
        className="dmg-car-diagram"
        viewBox="0 0 400 390"
        role="img"
        aria-label="Top-down car with live damage values around each component"
      >
        <defs>
          <filter id="dmg-car-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Geometry from the supplied vehicle_hud_clean_white.svg. */}
        <g className="dmg-car-outline" transform="translate(11 0)">
          <g className={partClass(components.chassis.severity)} stroke={chassisColor}>
            <path strokeWidth="1.6" d="M114 49 C118 39 123 34 131 30 M265 49 C261 39 255 33 248 29" />
            <path strokeWidth="1.65" d="M112 318 L112 323 C112 347 144 365 188 366 C232 365 264 347 264 323 L264 317" />
            <path strokeWidth="1.8" d="M116 45 C115 19 147 8 188 8 C229 8 262 19 263 45 M115 119 V243 M263 119 V243" />
            <path strokeWidth="1.8" d="M114 131 L94 139 Q92 140 93 149 L114 141 Z M264 131 L284 139 Q286 140 285 149 L264 141 Z" />
          </g>
          <g className={partClass(components.steering.severity)} stroke={steeringColor} strokeWidth="1.2">
            <path d="M136 51 L140 63 M240 51 L236 63" />
          </g>

          {([
            ['fl', 110.5, 52.2, 25.5, 60.8, 114.2, 56.4, 18.2, 53],
            ['fr', 241.5, 52.2, 24.8, 60.8, 245.3, 56.4, 17.4, 53],
            ['rl', 110.5, 252.5, 25.5, 61.2, 114.2, 256.2, 18.2, 53.7],
            ['rr', 241.5, 252.5, 24.8, 61.2, 245.3, 256.2, 17.4, 53.7],
          ] as const).map(([corner, x, y, width, height, innerX, innerY, innerWidth, innerHeight]) => (
            <g key={corner} className={partClass(tireSeverity(corner))} stroke={tireColors[corner]}>
              <rect x={x} y={y} width={width} height={height} rx="5.5" strokeWidth="2" />
              <rect x={innerX} y={innerY} width={innerWidth} height={innerHeight} rx="4.3" strokeWidth="1.05" opacity="0.9" />
            </g>
          ))}

          <g className={partClass(components.brakes.severity)} stroke={brakesColor} strokeWidth="1.65">
            <path d="M143 67 Q143 63 147 63 Q152 63 152 69 L152 101 Q152 105 148 105 Q143 105 143 101 Z" />
            <path d="M223 67 Q223 63 227 63 Q232 63 232 69 L232 101 Q232 105 227 105 Q223 105 223 101 Z" />
            <path d="M143 266 Q143 262 147 262 Q152 262 152 267 L152 298 Q152 303 148 303 Q143 303 143 298 Z" />
            <path d="M225 266 Q225 262 230 262 Q233 262 233 267 L233 298 Q233 303 230 303 Q225 303 225 298 Z" />
          </g>

          {[[168, 83], [210, 83], [168, 232], [210, 232]].map(([x, y]) => (
            <g key={`${x}-${y}`} className={partClass(components.suspension.severity)} transform={`translate(${x} ${y})`} stroke={suspensionColor}>
              <path strokeWidth="1.85" d="M-16 16 L-14 2 Q-11 -1 -10 -7 Q-9 -14 -2 -15 Q4 -17 8 -10 Q12 -3 12 4 L13 16 Z" />
              <circle cx="-1" cy="-4" r="3" strokeWidth="1.65" />
              {[0, 8, 16, 24].map((offset) => (
                <path key={offset} transform={`translate(0 ${offset})`} strokeWidth="1.45" d="M-16 23 L13 30 L14 34 L-16 27 Z" />
              ))}
              <path strokeWidth="1.7" d="M-17 59 L14 59 Q11 68 -1 73 Q-12 70 -17 59 Z" />
              <circle cx="-1" cy="64" r="3.3" strokeWidth="1.6" />
            </g>
          ))}

          {/* Show engine and gearbox locations when those components need attention. */}
          {hasDamage(components.engine) && (
            <g className={partClass(components.engine.severity)} stroke={SEVERITY_COLORS[components.engine.severity]} strokeWidth="1.8">
              <title>{`Engine: ${components.engine.statusLabel}`}</title>
              <path d="M177 32 H199 V37 H204 V55 H199 V60 H177 V55 H172 V37 H177 Z M180 40 H196 M180 47 H196 M180 54 H196" />
            </g>
          )}
          {hasDamage(components.transmission) && (
            <g className={partClass(components.transmission.severity)} stroke={SEVERITY_COLORS[components.transmission.severity]} strokeWidth="1.8">
              <title>{`Transmission: ${components.transmission.statusLabel}`}</title>
              <path d="M188 170 V184 M180 184 H196 L199 193 V213 L193 224 H183 L177 213 V193 Z M183 195 H193 M183 203 H193 M183 211 H193 M188 224 V282" />
            </g>
          )}
        </g>

        <Callout label="Front left tire" value={tireValue('fl')} severity={tireSeverity('fl')} side="left" y={65} targetX={134} targetY={82} />
        <Callout label="Steering" value={value(components.steering)} severity={components.steering.severity} side="left" y={32} targetX={149} targetY={57} />
        <Callout label="Suspension" value={value(components.suspension)} severity={components.suspension.severity} side="left" y={195} targetX={177} targetY={128} />
        <Callout label="Rear left tire" value={tireValue('rl')} severity={tireSeverity('rl')} side="left" y={270} targetX={134} targetY={283} />
        <Callout label="Brakes" value={value(components.brakes)} severity={components.brakes.severity} side="left" y={344} targetX={158} targetY={288} />

        <Callout label="Engine" value={value(components.engine)} severity={components.engine.severity} side="right" y={65} />
        <Callout label="Front right tire" value={tireValue('fr')} severity={tireSeverity('fr')} side="right" y={126} targetX={265} targetY={82} />
        <Callout label="Chassis" value={value(components.chassis)} severity={components.chassis.severity} side="right" y={195} targetX={274} targetY={195} />
        <Callout label="Rear right tire" value={tireValue('rr')} severity={tireSeverity('rr')} side="right" y={270} targetX={265} targetY={283} />
        <Callout label="Transmission" value={value(components.transmission)} severity={components.transmission.severity} side="right" y={344} />
      </svg>
    </section>
  );
};
