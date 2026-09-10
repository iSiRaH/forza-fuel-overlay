import React from 'react';

interface FuelStatusProps {
  fuelPct: number;
  power: number;
  torque: number;
  gear: number;
  steer: number;
  accel: number;
  brake: number;
  engineDisplacementLiters?: number;
}

export const FuelStatus: React.FC<FuelStatusProps> = ({
  power,
  torque,
  gear,
  accel,
  brake,
  engineDisplacementLiters,
}) => {
  // Convert 0-255 uint8 or 0-1 float fraction to clean 0-100%
  const normalizeInputPct = (val: number): number => {
    if (!val || val <= 0) return 0;
    if (val <= 1) return Math.min(100, Math.round(val * 100));
    return Math.min(100, Math.round((val / 255) * 100));
  };

  const accelPct = normalizeInputPct(accel);
  const brakePct = normalizeInputPct(brake);

  const displacementText = engineDisplacementLiters ? `${engineDisplacementLiters.toFixed(1)} L` : '3.0 L';

  return (
    <div className="telemetry-card">
      <div className="card-header">
        <span className="card-title">⚙️ ENGINE & INPUTS</span>
        <span className="gear-badge">GEAR {gear === 0 ? 'N' : gear === -1 ? 'R' : gear}</span>
      </div>

      <div className="inputs-row">
        <div className="input-bar-group">
          <span className="input-label">THROTTLE ({accelPct}%)</span>
          <div className="input-track">
            <div className="input-fill accel" style={{ width: `${accelPct}%` }} />
          </div>
        </div>

        <div className="input-bar-group">
          <span className="input-label">BRAKE ({brakePct}%)</span>
          <div className="input-track">
            <div className="input-fill brake" style={{ width: `${brakePct}%` }} />
          </div>
        </div>
      </div>

      <div className="stats-grid" style={{ marginTop: '12px' }}>
        <div className="stat-box">
          <span className="stat-label">DISPLACEMENT</span>
          <span className="stat-value highlight">{displacementText}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">POWER</span>
          <span className="stat-value">{Math.round(power)} HP</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">TORQUE</span>
          <span className="stat-value">{Math.round(torque)} N·m</span>
        </div>
      </div>
    </div>
  );
};

