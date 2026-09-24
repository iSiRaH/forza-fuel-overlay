import React, { useState } from 'react';
import { formatGear } from '../../../../packages/shared/src/utils/gear.js';
import type { SpeedUnit } from '../../../../packages/shared/src/utils/speed.js';

interface MinimalFuelOverlayProps {
  telemetry: any;
  isConnected: boolean;
  speedUnit: SpeedUnit;
  toggleSpeedUnit: () => void;
  refillFuel: () => void;
  currentSpeed: number;
  rpmPercent: number;
  currentRpm: number;
  maxRpm: number;
  isShiftWarning: boolean;
  fuelPct: number;
  maxFuelCapacityLiters: number;
  currentFuelLiters: number;
  fuelSpentLiters: number;
  fuelConsumptionRate: number;
  fuelRateLPerHour: number;
  remainingTimeFormatted: string;
  remainingDistanceFormatted: string;
  isFuelLow: boolean;
  isFuelCritical: boolean;
  carName: string;
  piClassName: string;
  piRating: number;
  piBadgeColor: string;
  piBadgeBg: string;
  increaseTankCapacity: () => void;
  decreaseTankCapacity: () => void;
  isFuelTaskPaused: boolean;
  togglePauseFuelTask: () => void;
  onSwitchToFullUI: () => void;
}

export const MinimalFuelOverlay: React.FC<MinimalFuelOverlayProps> = ({
  telemetry,
  isConnected,
  speedUnit,
  toggleSpeedUnit,
  refillFuel,
  currentSpeed,
  rpmPercent,
  isShiftWarning,
  fuelPct,
  maxFuelCapacityLiters,
  currentFuelLiters,
  fuelSpentLiters,
  fuelRateLPerHour,
  remainingTimeFormatted,
  remainingDistanceFormatted,
  isFuelLow,
  isFuelCritical,
  carName,
  piClassName,
  piRating,
  piBadgeColor,
  piBadgeBg,
  increaseTankCapacity,
  decreaseTankCapacity,
  isFuelTaskPaused,
  togglePauseFuelTask,
  onSwitchToFullUI,
}) => {
  const [showSettingsDrawer, setShowSettingsDrawer] = useState<boolean>(false);

  // Remaining laps estimation
  const estimatedLaps = Math.max(0, fuelPct / 2.5).toFixed(1);

  // Status colors
  const fuelStatusColor = isFuelCritical ? '#ff0055' : isFuelLow ? '#ffaa00' : '#00f2fe';
  const fuelBarBg = isFuelCritical
    ? 'linear-gradient(90deg, #ff4d4d, #ff0055)'
    : isFuelLow
    ? 'linear-gradient(90deg, #ffaa00, #ff5500)'
    : 'linear-gradient(90deg, #00f2fe, #00c6ff)';

  const currentL = Math.max(0, currentFuelLiters).toFixed(1);
  const maxL = maxFuelCapacityLiters.toFixed(1);
  const spentL = fuelSpentLiters.toFixed(1);
  const burnRateText = fuelRateLPerHour > 0 ? `${fuelRateLPerHour.toFixed(1)} L/h` : '-- L/h';

  return (
    <div className="minimal-overlay-wrapper">
      {/* Top Shift Flash Line */}
      {(isShiftWarning || rpmPercent >= 90) && (
        <div className="shift-flash-line" title={`SHIFT UP NOW! (${Math.round(rpmPercent)}% RPM)`} />
      )}

      {/* Minimal Overlay Header */}
      <header className="minimal-header">
        <div className="minimal-brand">
          <span className="minimal-status-dot" style={{ background: isConnected ? '#00f2fe' : '#ffaa00' }} />
          <span className="minimal-title">FH6 FUEL HUD</span>
          <div className="minimal-pi-badge" style={{ background: piBadgeBg, color: piBadgeColor }}>
            <span className="pi-letter">{piClassName}</span>
            <span className="pi-number">{piRating}</span>
          </div>
        </div>

        <div className="minimal-header-controls">
          <button
            type="button"
            className="mode-switch-btn full-dashboard"
            onClick={onSwitchToFullUI}
            title="Switch to Full Telemetry Dashboard (Shortcut: M)"
          >
            <span className="btn-icon">📊</span>
            <span className="btn-label">FULL DASHBOARD</span>
            <span className="hotkey-badge">M</span>
          </button>

          <button
            type="button"
            className="settings-toggle-btn"
            onClick={() => setShowSettingsDrawer((prev) => !prev)}
            title="Toggle quick controls"
          >
            {showSettingsDrawer ? '✖' : '⚙️'}
          </button>
        </div>
      </header>

      {/* Main Fuel Usage Display (Primary Visual Hero) */}
      <section className="minimal-fuel-hero">
        <div className="minimal-fuel-readout">
          <div className="fuel-pct-group">
            <span className="fuel-icon">⛽</span>
            <span className="minimal-fuel-pct" style={{ color: fuelStatusColor }}>
              {fuelPct.toFixed(1)}%
            </span>
          </div>

          <div className="minimal-liters-badge">
            <span className="liters-val">{currentL}</span> / <span className="max-liters">{maxL} L</span>
          </div>
        </div>

        {/* Dynamic Progress Gauge Bar */}
        <div className="minimal-gauge-track">
          <div
            className={`minimal-gauge-fill ${isFuelCritical ? 'pulse-critical' : ''}`}
            style={{ width: `${Math.min(100, Math.max(0, fuelPct))}%`, background: fuelBarBg }}
          />
        </div>

        {/* Minimal Warning Pill if Fuel Low/Critical */}
        {(isFuelLow || isFuelCritical) && (
          <div className={`minimal-warning-pill ${isFuelCritical ? 'critical' : 'low'}`}>
            {isFuelCritical ? '⚠️ PIT STOP REQUIRED - FUEL CRITICAL!' : '⛽ LOW FUEL WARNING'}
          </div>
        )}

        {/* Compact Telemetry Grid (Stats at a Glance) */}
        <div className="minimal-stats-grid">
          <div className="minimal-stat-item">
            <span className="stat-name">EST. LAPS</span>
            <span className="stat-val" style={{ color: fuelStatusColor }}>
              {estimatedLaps}
            </span>
          </div>

          <div className="minimal-stat-item">
            <span className="stat-name">EST. RANGE</span>
            <span className="stat-val highlight">{remainingDistanceFormatted}</span>
          </div>

          <div className="minimal-stat-item">
            <span className="stat-name">EST. TIME</span>
            <span className="stat-val highlight">{remainingTimeFormatted}</span>
          </div>

          <div className="minimal-stat-item">
            <span className="stat-name">BURN RATE</span>
            <span className="stat-val">{burnRateText}</span>
          </div>

          <div className="minimal-stat-item">
            <span className="stat-name">SPENT</span>
            <span className="stat-val">{spentL} L</span>
          </div>

          <div className="minimal-stat-item">
            <span className="stat-name">GEAR / SPEED</span>
            <span className="stat-val gear-speed-val">
              {formatGear(telemetry?.gear)} | {Math.round(currentSpeed)} {speedUnit.toUpperCase()}
            </span>
          </div>
        </div>
      </section>

      {/* Minimal Quick Action Bar (Primary Controls) */}
      <div className="minimal-action-bar">
        <button
          type="button"
          className="minimal-action-btn refill"
          onClick={refillFuel}
          title="Refill fuel tank to 100%"
        >
          🔄 REFILL 100%
        </button>

        <button
          type="button"
          className={`minimal-action-btn pause ${isFuelTaskPaused ? 'paused' : ''}`}
          onClick={togglePauseFuelTask}
          title={isFuelTaskPaused ? 'Resume fuel tracking' : 'Pause fuel tracking'}
        >
          {isFuelTaskPaused ? '▶️ RESUME' : '⏸️ PAUSE'}
        </button>

        <button
          type="button"
          className="minimal-action-btn unit"
          onClick={toggleSpeedUnit}
          title="Toggle speed unit"
        >
          {speedUnit.toUpperCase()}
        </button>
      </div>

      {/* Expandable Settings Drawer (Tank Size & Details) */}
      {showSettingsDrawer && (
        <div className="minimal-drawer">
          <div className="drawer-row">
            <span className="drawer-label">Tank Capacity:</span>
            <div className="drawer-stepper">
              <button type="button" onClick={decreaseTankCapacity} disabled={maxFuelCapacityLiters <= 5}>
                -
              </button>
              <span className="drawer-val">{Math.round(maxFuelCapacityLiters)} L</span>
              <button type="button" onClick={increaseTankCapacity}>
                +
              </button>
            </div>
          </div>
          <div className="drawer-row text-muted">
            <span>Car: {carName}</span>
          </div>
        </div>
      )}

      {/* Minimal Footer Hint */}
      <footer className="minimal-footer">
        <span>Press <kbd>M</kbd> to toggle Full Dashboard</span>
        <span>{isConnected ? '🟢 LIVE FEED' : '🟡 CONNECTING'}</span>
      </footer>
    </div>
  );
};

export default MinimalFuelOverlay;
