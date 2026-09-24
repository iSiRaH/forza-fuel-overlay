import React from 'react';

interface FuelGaugeProps {
  fuelPct: number;
  currentFuelLiters?: number;
  maxFuelCapacityLiters?: number;
  isFuelLow: boolean;
  isFuelCritical: boolean;
  onRefill?: () => void;
  onIncreaseTankCapacity?: () => void;
  onDecreaseTankCapacity?: () => void;
}

export const FuelGauge: React.FC<FuelGaugeProps> = ({
  fuelPct,
  currentFuelLiters,
  maxFuelCapacityLiters,
  isFuelLow,
  isFuelCritical,
  onRefill,
  onIncreaseTankCapacity,
  onDecreaseTankCapacity,
}) => {
  const getBarColor = () => {
    if (isFuelCritical) return 'linear-gradient(90deg, #ff4d4d, #ff0055)';
    if (isFuelLow) return 'linear-gradient(90deg, #ffaa00, #ff5500)';
    return 'linear-gradient(90deg, #00f2fe, #4facfe)';
  };

  const currentL = currentFuelLiters !== undefined ? Math.max(0, currentFuelLiters).toFixed(1) : ((fuelPct / 100) * (maxFuelCapacityLiters ?? 60)).toFixed(1);
  const maxL = maxFuelCapacityLiters !== undefined ? maxFuelCapacityLiters.toFixed(1) : '60.0';
  const tankSize = Math.round(maxFuelCapacityLiters ?? 60);

  return (
    <div className="fuel-gauge-card">
      <div className="card-header">
        <div className="card-title-group">
          <span className="card-title">⛽ FUEL LEVEL</span>
          <span className="fuel-capacity-badge">{currentL} / {maxL} L</span>
        </div>
        <div className="card-header-actions">
          {onRefill && (
            <button
              type="button"
              className="refill-btn"
              onClick={onRefill}
              title="Refill fuel tank to 100%"
            >
              🔄 REFILL FUEL
            </button>
          )}
          <span className={`fuel-pct-text ${isFuelCritical ? 'critical' : isFuelLow ? 'low' : ''}`}>
            {fuelPct.toFixed(1)}%
          </span>
        </div>
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
        <span>F ({maxL}L)</span>
      </div>

      <div className="tank-capacity-control-row">
        <span className="tank-capacity-label">Fuel Tank Capacity</span>
        <div className="tank-capacity-stepper">
          <button
            type="button"
            className="stepper-btn"
            onClick={onDecreaseTankCapacity}
            disabled={!onDecreaseTankCapacity || tankSize <= 5}
            title="Decrease fuel tank capacity (-5 L)"
          >
            [-]
          </button>
          <span className="capacity-value-display">{tankSize} L</span>
          <button
            type="button"
            className="stepper-btn"
            onClick={onIncreaseTankCapacity}
            disabled={!onIncreaseTankCapacity}
            title="Increase fuel tank capacity (+5 L)"
          >
            [+]
          </button>
        </div>
      </div>
    </div>
  );
};

