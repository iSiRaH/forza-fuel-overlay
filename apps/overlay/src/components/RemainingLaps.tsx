import React from 'react';

interface RemainingLapsProps {
  fuelPct: number;
  bestLapTime?: number;
  remainingTimeFormatted?: string;
  remainingDistanceFormatted?: string;
}

export const RemainingLaps: React.FC<RemainingLapsProps> = ({
  fuelPct,
  remainingTimeFormatted = '--',
  remainingDistanceFormatted = '--',
}) => {
  // Estimate remaining laps based on ~2.5% fuel per lap average
  const estimatedLaps = Math.max(0, (fuelPct / 2.5)).toFixed(1);
  const statusColor = parseFloat(estimatedLaps) < 3 ? '#ff4d4d' : parseFloat(estimatedLaps) < 6 ? '#ffaa00' : '#00f2fe';

  return (
    <div className="telemetry-card">
      <div className="card-header">
        <span className="card-title">📊 FUEL RANGE PREDICTION</span>
      </div>

      <div className="range-display">
        <div className="range-value" style={{ color: statusColor }}>
          {estimatedLaps}
          <span className="range-unit">LAPS</span>
        </div>
        <span className="range-subtitle">Estimated Remaining Lap Capacity</span>
      </div>

      <div className="stats-grid" style={{ marginTop: '10px' }}>
        <div className="stat-box">
          <span className="stat-label">EST. TIME</span>
          <span className="stat-value highlight">{remainingTimeFormatted}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">EST. RANGE</span>
          <span className="stat-value highlight">{remainingDistanceFormatted}</span>
        </div>
      </div>
    </div>
  );
};
