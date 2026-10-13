import React from 'react';
import type { VehicleDamageSummary } from '../../../../../packages/shared/src/types/damage.js';
import { formatDamagePercent } from '../../utils/damage-calculator.js';

interface CompactDamageHUDProps {
  summary: VehicleDamageSummary;
  onExpand: () => void;
  onOpenSettings: () => void;
}

export const CompactDamageHUD: React.FC<CompactDamageHUDProps> = ({
  summary,
  onExpand,
  onOpenSettings,
}) => {
  const { overallConditionPct, components, overallSeverity } = summary;
  const isCritical = overallSeverity === 'critical';

  const engine = components.engine;
  const tires = components.tires;
  const suspension = components.suspension;

  return (
    <div className={`dmg-compact-root ${isCritical ? 'sev-critical' : ''}`}>
      <div className="dmg-compact-bar">
        {/* Left: Overall condition */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px' }}>💥</span>
          <span style={{ fontSize: '13px', fontWeight: 900, color: '#f8fafc' }}>
            {formatDamagePercent(overallConditionPct)}
          </span>
          {isCritical && (
            <span
              style={{
                background: '#ef4444',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 800,
                padding: '1px 5px',
                borderRadius: '4px',
                letterSpacing: '0.4px',
              }}
            >
              CRITICAL
            </span>
          )}
        </div>

        {/* Middle: Key components */}
        <div className="dmg-compact-pill-group">
          <div className="dmg-compact-pill" title="Engine Condition">
            <span>⚙️</span>
            <span style={{ color: engine.isAvailable ? '#e2e8f0' : '#64748b' }}>
              {engine.isAvailable ? formatDamagePercent(engine.conditionPercent) : 'N/A'}
            </span>
          </div>

          <div className="dmg-compact-pill" title="Tires Condition">
            <span>🛞</span>
            <span style={{ color: tires.isAvailable ? '#e2e8f0' : '#64748b' }}>
              {tires.isAvailable ? formatDamagePercent(tires.conditionPercent) : 'N/A'}
            </span>
          </div>

          <div className="dmg-compact-pill" title="Suspension Condition">
            <span>🗜️</span>
            <span style={{ color: suspension.isAvailable ? '#e2e8f0' : '#64748b' }}>
              {suspension.isAvailable ? formatDamagePercent(suspension.conditionPercent) : 'N/A'}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="dmg-no-drag" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="dmg-icon-btn"
            onClick={onExpand}
            title="Expand Full HUD (C)"
            style={{ padding: '2px 6px', fontSize: '10px' }}
          >
            ⤢
          </button>
          <button
            className="dmg-icon-btn"
            onClick={onOpenSettings}
            title="Settings"
            style={{ padding: '2px 6px', fontSize: '10px' }}
          >
            ⚙
          </button>
        </div>
      </div>
    </div>
  );
};
