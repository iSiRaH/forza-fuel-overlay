import React from 'react';

interface FuelConsumptionProps {
  lapNumber: number;
  currentLapTime: number;
  bestLapTime: number;
  distanceTraveled: number;
}

export const FuelConsumption: React.FC<FuelConsumptionProps> = ({
  lapNumber,
  currentLapTime,
  bestLapTime,
  distanceTraveled,
}) => {
  const formatTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '--:--.--';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  const distanceKm = (distanceTraveled / 1000).toFixed(2);

  return (
    <div className="telemetry-card">
      <div className="card-header">
        <span className="card-title">🏁 LAP & SESSION</span>
        <span className="lap-badge">LAP {lapNumber || 1}</span>
      </div>

      <div className="stats-grid">
        <div className="stat-box">
          <span className="stat-label">CURRENT LAP</span>
          <span className="stat-value">{formatTime(currentLapTime)}</span>
        </div>

        <div className="stat-box">
          <span className="stat-label">BEST LAP</span>
          <span className="stat-value highlight">{formatTime(bestLapTime)}</span>
        </div>

        <div className="stat-box">
          <span className="stat-label">DISTANCE</span>
          <span className="stat-value">{distanceKm} km</span>
        </div>
      </div>
    </div>
  );
};
