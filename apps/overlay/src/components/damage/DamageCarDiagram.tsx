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
  targetX: number;
  targetY: number;
}

const SEVERITY_COLORS: Record<DamageSeverity, string> = {
  healthy: '#00e5ff',
  minor: '#38bdf8',
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
      <path
        d={`M ${lineStartX} ${y} H ${elbowX} L ${targetX} ${targetY}`}
        stroke={color}
        className="dmg-car-callout-line"
      />
      <circle cx={targetX} cy={targetY} r="3" fill={color} className="dmg-car-callout-point" />
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
  const tireSeverity = (corner: 'fl' | 'fr' | 'rl' | 'rr') =>
    tiresCornerDetail?.[corner].severity ?? components.tires.severity;

  const engineColor = SEVERITY_COLORS[components.engine.severity];
  const chassisColor = SEVERITY_COLORS[components.chassis.severity];
  const transmissionColor = SEVERITY_COLORS[components.transmission.severity];
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

        <g opacity="0.18" className="dmg-car-grid">
          {[70, 125, 180, 235, 290, 345].map((y) => (
            <line key={y} x1="96" y1={y} x2="304" y2={y} />
          ))}
          <line x1="200" y1="24" x2="200" y2="372" />
        </g>

        {/* Open body shell and chassis rails, matching Forza's mechanical damage HUD. */}
        <path
          className="dmg-car-body"
          style={{ '--part-color': chassisColor } as React.CSSProperties}
          d="M151 73 C153 42 171 27 200 27 C229 27 247 42 249 73 L249 107 L261 130 L252 156 L252 253 L261 278 L249 299 L249 326 C246 352 229 365 200 365 C171 365 154 352 151 326 L151 299 L139 278 L148 253 L148 156 L139 130 L151 107 Z"
        />
        <g className="dmg-car-frame" style={{ '--part-color': chassisColor } as React.CSSProperties}>
          <path d="M161 105 V299 M239 105 V299" />
          <path d="M161 116 H239 M153 185 H247 M153 210 H247 M161 289 H239" />
          <path d="M161 156 L180 185 M239 156 L220 185 M161 253 L180 210 M239 253 L220 210" />
        </g>

        <g className="dmg-car-tires">
          <rect style={{ '--part-color': tireColors.fl } as React.CSSProperties} x="124" y="70" width="27" height="69" rx="5" />
          <rect style={{ '--part-color': tireColors.fr } as React.CSSProperties} x="249" y="70" width="27" height="69" rx="5" />
          <rect style={{ '--part-color': tireColors.rl } as React.CSSProperties} x="124" y="266" width="27" height="69" rx="5" />
          <rect style={{ '--part-color': tireColors.rr } as React.CSSProperties} x="249" y="266" width="27" height="69" rx="5" />
          <g className="dmg-car-tire-treads">
            {[80, 92, 104, 116, 128, 276, 288, 300, 312, 324].map((y) => (
              <React.Fragment key={y}>
                <line x1="127" y1={y} x2="148" y2={y} />
                <line x1="252" y1={y} x2="273" y2={y} />
              </React.Fragment>
            ))}
          </g>
        </g>

        {/* Front and rear axles, brake discs, and differentials. */}
        <g className="dmg-car-axles">
          <path d="M151 105 H249 M151 300 H249" />
          <g className="dmg-car-brakes" style={{ '--part-color': brakesColor } as React.CSSProperties}>
            <circle cx="158" cy="105" r="9" /><circle cx="242" cy="105" r="9" />
            <circle cx="158" cy="300" r="9" /><circle cx="242" cy="300" r="9" />
            <path d="M154 99 L162 111 M238 99 L246 111 M154 294 L162 306 M238 294 L246 306" />
          </g>
          <g className="dmg-car-differentials" style={{ '--part-color': transmissionColor } as React.CSSProperties}>
            <path d="M186 105 L193 95 H207 L214 105 L207 115 H193 Z" />
            <path d="M186 300 L193 290 H207 L214 300 L207 310 H193 Z" />
            <circle cx="200" cy="105" r="4" /><circle cx="200" cy="300" r="4" />
          </g>
        </g>

        {/* Engine and steering rack. */}
        <g className="dmg-car-engine" style={{ '--part-color': engineColor } as React.CSSProperties}>
          <rect x="174" y="47" width="52" height="43" rx="8" />
          <path d="M181 55 H219 M181 64 H219 M181 73 H219 M181 82 H219" />
          <circle cx="183" cy="68" r="3" /><circle cx="217" cy="68" r="3" />
        </g>
        <g className="dmg-car-steering" style={{ '--part-color': steeringColor } as React.CSSProperties}>
          <path d="M160 123 H240 M169 117 V129 M231 117 V129" />
          <circle cx="200" cy="123" r="8" />
          <path d="M194 117 L206 129 M206 117 L194 129" />
        </g>

        {/* Exposed coil springs are the visual focus of the reference HUD. */}
        <g className="dmg-car-suspension" style={{ '--part-color': suspensionColor } as React.CSSProperties}>
          <path d="M173 132 C162 136 184 140 173 144 C162 148 184 152 173 156 C162 160 184 164 173 168 C162 172 184 176 173 180" />
          <path d="M227 132 C216 136 238 140 227 144 C216 148 238 152 227 156 C216 160 238 164 227 168 C216 172 238 176 227 180" />
          <path d="M173 218 C162 222 184 226 173 230 C162 234 184 238 173 242 C162 246 184 250 173 254 C162 258 184 262 173 266" />
          <path d="M227 218 C216 222 238 226 227 230 C216 234 238 238 227 242 C216 246 238 250 227 254 C216 258 238 262 227 266" />
          <path d="M173 132 V123 M173 180 V188 M227 132 V123 M227 180 V188 M173 218 V210 M173 266 V275 M227 218 V210 M227 266 V275" />
        </g>

        <g className="dmg-car-driveline" style={{ '--part-color': transmissionColor } as React.CSSProperties}>
          <path d="M200 113 V292" />
          <rect x="192" y="181" width="16" height="43" rx="7" />
          <path d="M196 190 H204 M196 198 H204 M196 206 H204 M196 214 H204" />
        </g>

        <Callout label="Front left tire" value={tireValue('fl')} severity={tireSeverity('fl')} side="left" y={65} targetX={137} targetY={91} />
        <Callout label="Steering" value={value(components.steering)} severity={components.steering.severity} side="left" y={126} targetX={173} targetY={123} />
        <Callout label="Suspension" value={value(components.suspension)} severity={components.suspension.severity} side="left" y={195} targetX={173} targetY={172} />
        <Callout label="Rear left tire" value={tireValue('rl')} severity={tireSeverity('rl')} side="left" y={270} targetX={137} targetY={300} />
        <Callout label="Brakes" value={value(components.brakes)} severity={components.brakes.severity} side="left" y={344} targetX={158} targetY={300} />

        <Callout label="Engine" value={value(components.engine)} severity={components.engine.severity} side="right" y={65} targetX={220} targetY={68} />
        <Callout label="Front right tire" value={tireValue('fr')} severity={tireSeverity('fr')} side="right" y={126} targetX={263} targetY={104} />
        <Callout label="Chassis" value={value(components.chassis)} severity={components.chassis.severity} side="right" y={195} targetX={239} targetY={185} />
        <Callout label="Rear right tire" value={tireValue('rr')} severity={tireSeverity('rr')} side="right" y={270} targetX={263} targetY={300} />
        <Callout label="Transmission" value={value(components.transmission)} severity={components.transmission.severity} side="right" y={344} targetX={207} targetY={300} />
      </svg>
    </section>
  );
};
