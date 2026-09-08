import React from 'react';

interface FuelGaugeProps {
  fuelPct: number;
  isFuelLow: boolean;
  isFuelCritical: boolean;
}

export const FuelGauge: React.FC<FuelGaugeProps> = ({
  fuelPct,
  isFuelLow,
  isFuelCritical,
}) => {
  const getBarColor = () => {
    if (isFuelCritical) return 'linear-gradient(90deg, #ff4d4d, #ff0055)';
    if (isFuelLow) return 'linear-gradient(90deg, #ffaa00, #ff5500)';
    return 'linear-gradient(90deg, #00f2fe, #4facfe)';
  };

  return (
    <div className="fuel-gauge-card">
      <div className="card-header">
        <span className="card-title">⛽ FUEL LEVEL</span>
        <span className={`fuel-pct-text ${isFuelCritical ? 'critical' : isFuelLow ? 'low' : ''}`}>
          {fuelPct.toFixed(1)}%
        </span>
      </div>

      <div className="gauge-bar-track">
        <div
          className={`gauge-bar-fill ${isFuelCritical ? 'pulse-critical' : ''}`}
          style={{
            width: `${Math.min(100, Math.max(0, fuelPct))}%`,
            background: getBarColor(),
          }}
        />
      </div>

      <div className="gauge-markers">
        <span>E</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>F</span>
      </div>
    </div>
  );
};
