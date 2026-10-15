import React from 'react';
import type { VehicleDamageSummary } from '../../../../../packages/shared/src/types/damage.js';
import { formatDamagePercent } from '../../utils/damage-calculator.js';

interface CompactDamageHUDProps {
  summary: VehicleDamageSummary;
  displayMode?: 'damage' | 'condition';
  onExpand: () => void;
  onOpenSettings: () => void;
}

export const CompactDamageHUD: React.FC<CompactDamageHUDProps> = ({
  summary,
  displayMode = 'damage',
  onExpand,
  onOpenSettings,
}) => {
  const { overallConditionPct, overallDamagePct, components, overallSeverity } = summary;
  const isCritical = overallSeverity === 'critical';

  const engine = components.engine;
  const tires = components.tires;
  const suspension = components.suspension;

  const isDamageMode = displayMode === 'damage';
  const overallDisplay = isDamageMode
    ? (overallDamagePct !== null ? formatDamagePercent(overallDamagePct) : 'N/A')
    : (overallConditionPct !== null ? formatDamagePercent(overallConditionPct) : 'N/A');

  const getPillVal = (comp: typeof engine) => {
    if (!comp.isAvailable) return 'N/A';
    return isDamageMode
      ? formatDamagePercent(comp.damagePercent)
      : formatDamagePercent(comp.conditionPercent);
  };

  return (
    <div className={`dmg-compact-root ${isCritical ? 'sev-critical' : ''}`}>
      <div className="dmg-compact-bar">
        {/* Left: Overall value */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px' }}>💥</span>
          <span style={{ fontSize: '13px', fontWeight: 900, color: '#f8fafc' }}>
            {overallDisplay}
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
          <div className="dmg-compact-pill" title={isDamageMode ? 'Engine Damage' : 'Engine Condition'}>
            <span>⚙️</span>
            <span style={{ color: engine.isAvailable ? '#e2e8f0' : '#64748b' }}>
              {getPillVal(engine)}
            </span>
          </div>

          <div className="dmg-compact-pill" title={isDamageMode ? 'Tires Damage' : 'Tires Condition'}>
            <span>🛞</span>
            <span style={{ color: tires.isAvailable ? '#e2e8f0' : '#64748b' }}>
              {getPillVal(tires)}
            </span>
          </div>

          <div className="dmg-compact-pill" title={isDamageMode ? 'Suspension Damage' : 'Suspension Condition'}>
            <span>🗜️</span>
            <span style={{ color: suspension.isAvailable ? '#e2e8f0' : '#64748b' }}>
              {getPillVal(suspension)}
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
