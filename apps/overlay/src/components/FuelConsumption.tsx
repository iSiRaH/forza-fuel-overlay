import React from 'react';

interface FuelConsumptionProps {
  lapNumber: number;
  currentLapTime: number;
  bestLapTime: number;
  distanceTraveled: number;
  fuelSpentLiters?: number;
  fuelConsumptionRate?: number;
}

export const FuelConsumption: React.FC<FuelConsumptionProps> = ({
  lapNumber,
  currentLapTime,
  bestLapTime,
  distanceTraveled,
  fuelSpentLiters,
  fuelConsumptionRate,
}) => {
  const formatTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '--:--.--';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  const distanceKm = (distanceTraveled / 1000).toFixed(2);
  const spentL = fuelSpentLiters !== undefined ? fuelSpentLiters.toFixed(2) : '0.00';
  const burnRate = fuelConsumptionRate !== undefined && fuelConsumptionRate > 0 ? `${fuelConsumptionRate.toFixed(1)} L/100km` : '-- L/100km';

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

        <div className="stat-box">
          <span className="stat-label">FUEL SPENT</span>
          <span className="stat-value highlight-fuel">{spentL} L</span>
        </div>

        <div className="stat-box">
          <span className="stat-label">BURN RATE</span>
          <span className="stat-value">{burnRate}</span>
        </div>
      </div>
    </div>
  );
};

