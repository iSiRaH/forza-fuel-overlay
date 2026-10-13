import React from 'react';
import type { VehicleDamageSummary } from '../../../../../packages/shared/src/types/damage.js';
import { formatDamagePercent } from '../../utils/damage-calculator.js';

interface DamageStatusBannerProps {
  summary: VehicleDamageSummary;
  isConnected: boolean;
}

export const DamageStatusBanner: React.FC<DamageStatusBannerProps> = ({ summary, isConnected }) => {
  const { overallConditionPct, vehicleStatus, overallSeverity } = summary;

  // SVG Gauge calculations
  const size = 56;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const condition = overallConditionPct ?? 0;
  const strokeDashoffset = circumference - (condition / 100) * circumference;

  const getStatusColor = () => {
    switch (overallSeverity) {
      case 'healthy':
        return '#00e5ff';
      case 'minor':
        return '#38bdf8';
      case 'moderate':
        return '#f59e0b';
      case 'severe':
        return '#f97316';
      case 'critical':
        return '#ef4444';
      case 'unavailable':
      default:
        return '#64748b';
    }
  };

  const statusColor = getStatusColor();

  return (
    <div className="dmg-overall-card">
      <div className="dmg-overall-info">
        <span className="dmg-overall-label">Vehicle Condition</span>
        <span className="dmg-overall-status" style={{ color: statusColor }}>
          {vehicleStatus}
        </span>
        <span className="dmg-telemetry-tag">
          <span className={`dmg-status-dot ${!isConnected ? 'offline' : ''}`} />
          {isConnected ? 'Forza Telemetry Stream' : 'Awaiting Game Stream'}
        </span>
      </div>

      <div className="dmg-overall-gauge">
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Active Condition Arc */}
          {overallConditionPct !== null && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={statusColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease' }}
            />
          )}
        </svg>
        <span className="dmg-gauge-value" style={{ position: 'absolute', color: statusColor }}>
          {formatDamagePercent(overallConditionPct)}
        </span>
      </div>
    </div>
  );
};
