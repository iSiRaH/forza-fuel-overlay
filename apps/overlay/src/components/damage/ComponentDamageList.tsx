import React from 'react';
import type {
  ComponentDamageState,
  ComponentId,
  VehicleDamageSummary,
} from '../../../../../packages/shared/src/types/damage.js';
import { formatDamagePercent } from '../../utils/damage-calculator.js';

interface ComponentDamageListProps {
  summary: VehicleDamageSummary;
}

const COMPONENT_ICONS: Record<ComponentId, string> = {
  engine: '⚙️',
  transmission: '🕹️',
  suspension: '🗜️',
  brakes: '🛑',
  tires: '🛞',
  steering: '🧭',
  chassis: '🏎️',
};

export const ComponentDamageList: React.FC<ComponentDamageListProps> = ({ summary }) => {
  const { components, tiresCornerDetail } = summary;
  const componentOrder: ComponentId[] = [
    'engine',
    'transmission',
    'suspension',
    'brakes',
    'tires',
    'steering',
    'chassis',
  ];

  return (
    <div className="dmg-component-list">
      {componentOrder.map((id) => {
        const comp = components[id];
        return (
          <ComponentItem
            key={id}
            component={comp}
            tiresCornerDetail={id === 'tires' ? tiresCornerDetail : undefined}
          />
        );
      })}
    </div>
  );
};

interface ComponentItemProps {
  component: ComponentDamageState;
  tiresCornerDetail?: VehicleDamageSummary['tiresCornerDetail'];
}

const ComponentItem: React.FC<ComponentItemProps> = ({ component, tiresCornerDetail }) => {
  const { id, name, isAvailable, conditionPercent, severity, statusLabel, details } =
    component;

  const icon = COMPONENT_ICONS[id] || '🔧';
  const isHealthy = severity === 'healthy';
  const isMinor = severity === 'minor';
  const isModerate = severity === 'moderate';
  const isSevere = severity === 'severe';
  const isCritical = severity === 'critical';

  const severityClass = isHealthy
    ? 'sev-healthy'
    : isMinor
    ? 'sev-minor'
    : isModerate
    ? 'sev-moderate'
    : isSevere
    ? 'sev-severe'
    : isCritical
    ? 'sev-critical'
    : 'sev-unavailable';

  const badgeBgClass = isHealthy
    ? 'sev-healthy-bg'
    : isMinor
    ? 'sev-minor-bg'
    : isModerate
    ? 'sev-moderate-bg'
    : isSevere
    ? 'sev-severe-bg'
    : isCritical
    ? 'sev-critical-bg'
    : 'sev-unavailable-bg';

  const fillClass = isHealthy
    ? 'fill-healthy'
    : isMinor
    ? 'fill-minor'
    : isModerate
    ? 'fill-moderate'
    : isSevere
    ? 'fill-severe'
    : isCritical
    ? 'fill-critical'
    : 'fill-unavailable';

  // Condition is 100% when full health, decreasing as damage increases
  const fillWidth = isAvailable && conditionPercent !== null ? `${Math.max(0, Math.min(100, conditionPercent))}%` : '0%';

  return (
    <div className={`dmg-component-item ${!isAvailable ? 'unavailable' : ''}`}>
      <div className="dmg-component-header">
        <div className="dmg-comp-title-group">
          <span className="dmg-comp-icon">{icon}</span>
          <span className="dmg-comp-name">{name}</span>
          {details?.info && (
            <span style={{ fontSize: '9px', color: '#f59e0b', fontWeight: 600 }}>
              • {details.info}
            </span>
          )}
        </div>

        <div className="dmg-comp-value-group">
          <span className={`dmg-comp-severity-badge ${badgeBgClass}`}>
            {statusLabel}
          </span>
          <span className={`dmg-comp-pct ${severityClass}`}>
            {isAvailable ? formatDamagePercent(conditionPercent) : 'N/A'}
          </span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="dmg-progress-track">
        <div
          className={`dmg-progress-fill ${fillClass}`}
          style={{ width: fillWidth }}
        />
      </div>

      {/* Special 4-Corner Wheel Telemetry breakdown for Tires */}
      {id === 'tires' && tiresCornerDetail && (
        <div className="dmg-tire-grid">
          {(['fl', 'fr', 'rl', 'rr'] as const).map((corner) => {
            const cornerData = tiresCornerDetail[corner];
            const cornerLabel = corner.toUpperCase();
            return (
              <div key={corner} className="dmg-tire-corner">
                <div className="dmg-tire-corner-head">
                  <span>{cornerLabel}</span>
                  {cornerData.temp !== null && (
                    <span className="dmg-tire-temp">
                      {Math.round(cornerData.temp > 130 ? ((cornerData.temp - 32) * 5) / 9 : cornerData.temp)}°C
                    </span>
                  )}
                </div>
                <div className="dmg-tire-wear-val">
                  {cornerData.wear !== null ? (
                    <span style={{ color: cornerData.wear > 50 ? '#ef4444' : cornerData.wear > 25 ? '#f59e0b' : '#38bdf8' }}>
                      Wear: {Math.round(cornerData.wear)}%
                    </span>
                  ) : (
                    <span style={{ color: '#64748b', fontSize: '9.5px' }}>
                      Temp Tracked
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
