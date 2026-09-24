import { useState, useEffect } from 'react';
import { useTelemetry } from './hooks/useTelemetry';
import { formatGear } from '../../../packages/shared/src/utils/gear.js';
import { FuelGauge } from './components/FuelGauge';
import { FuelConsumption } from './components/FuelConsumption';
import { FuelStatus } from './components/FuelStatus';
import { RemainingLaps } from './components/RemainingLaps';
import { WarningIndicator } from './components/WarningIndicator';
import { FuelEmptyModal } from './components/FuelEmptyModal';
import { MinimalFuelOverlay } from './components/MinimalFuelOverlay';
import './App.css';

export type UiMode = 'full' | 'minimal';

export function App() {
  const telemetryData = useTelemetry();
  const {
    telemetry,
    isConnected,
    speedUnit,
    toggleSpeedUnit,
    refillFuel,
    currentSpeed,
    rpmPercent,
    currentRpm,
    maxRpm,
    isShiftWarning,
    fuelPct,
    maxFuelCapacityLiters,
    currentFuelLiters,
    fuelSpentLiters,
    engineDisplacementLiters,
    fuelConsumptionRate,
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
    carOrdinal,
    increaseTankCapacity,
    decreaseTankCapacity,
    isFuelTaskPaused,
    togglePauseFuelTask,
    showEmptyModal,
    dismissEmptyModal,
  } = telemetryData;

  // UI mode state: 'full' (detailed dashboard) or 'minimal' (gameplay HUD)
  const [uiMode, setUiMode] = useState<UiMode>(() => {
    try {
      const savedMode = localStorage.getItem('forza_ui_mode');
      if (savedMode === 'minimal' || savedMode === 'full') {
        return savedMode;
      }
    } catch {
      // localStorage fallback
    }
    return 'full';
  });

  // Save UI mode to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem('forza_ui_mode', uiMode);
    } catch {
      // ignore
    }
  }, [uiMode]);

  // Global hotkey 'M' listener to quickly toggle between UIs during gameplay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        setUiMode((prev) => (prev === 'full' ? 'minimal' : 'full'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleMouseEnter = () => {
    window.electronAPI?.setIgnoreMouseEvents(false);
  };

  const handleMouseLeave = () => {
    window.electronAPI?.setIgnoreMouseEvents(true, { forward: true });
  };

  return (
    <div
      className={`overlay-container ${uiMode === 'minimal' ? 'minimal-mode' : 'full-mode'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Zero Fuel Empty Alert Popup */}
      <FuelEmptyModal isOpen={showEmptyModal} onClose={dismissEmptyModal} />

      {uiMode === 'minimal' ? (
        /* MINIMAL FUEL USAGE OVERLAY (Distraction-free gameplay HUD) */
        <MinimalFuelOverlay
          telemetry={telemetry}
          isConnected={isConnected}
          speedUnit={speedUnit}
          toggleSpeedUnit={toggleSpeedUnit}
          refillFuel={refillFuel}
          currentSpeed={currentSpeed}
          rpmPercent={rpmPercent}
          currentRpm={currentRpm}
          maxRpm={maxRpm}
          isShiftWarning={isShiftWarning}
          fuelPct={fuelPct}
          maxFuelCapacityLiters={maxFuelCapacityLiters}
          currentFuelLiters={currentFuelLiters}
          fuelSpentLiters={fuelSpentLiters}
          fuelConsumptionRate={fuelConsumptionRate}
          fuelRateLPerHour={fuelRateLPerHour}
          remainingTimeFormatted={remainingTimeFormatted}
          remainingDistanceFormatted={remainingDistanceFormatted}
          isFuelLow={isFuelLow}
          isFuelCritical={isFuelCritical}
          carName={carName}
          piClassName={piClassName}
          piRating={piRating}
          piBadgeColor={piBadgeColor}
          piBadgeBg={piBadgeBg}
          increaseTankCapacity={increaseTankCapacity}
          decreaseTankCapacity={decreaseTankCapacity}
          isFuelTaskPaused={isFuelTaskPaused}
          togglePauseFuelTask={togglePauseFuelTask}
          onSwitchToFullUI={() => setUiMode('full')}
        />
      ) : (
        /* FULL / DETAILED TELEMETRY DASHBOARD UI */
        <>
          {/* Shift & Fuel Warning Banners */}
          <WarningIndicator
            isShiftWarning={isShiftWarning}
            isFuelLow={isFuelLow}
            isFuelCritical={isFuelCritical}
          />

          {/* Header Bar */}
          <header className="overlay-header">
            <div className="brand">
              <span className="logo-icon">🏎️</span>
              <div>
                <div className="app-title-row">
                  <h1 className="app-title">FORZA FUEL OVERLAY</h1>
                  <div
                    className="forza-pi-badge"
                    style={{ background: piBadgeBg, color: piBadgeColor }}
                    title={`Car Class: ${piClassName} ${piRating}`}
                  >
                    <span className="pi-letter">{piClassName}</span>
                    <span className="pi-number">{piRating}</span>
                  </div>
                </div>
                <span className="subtitle">{carName}</span>
              </div>
            </div>

            <div className="controls">
              {/* UI Mode Switcher Button */}
              <button
                type="button"
                className="mode-toggle-btn minimal-mode-btn"
                onClick={() => setUiMode('minimal')}
                title="Switch to Minimal Distraction-Free Fuel HUD (Hotkey: M)"
              >
                <span>⚡ MINIMAL HUD</span>
                <span className="hotkey-tag">M</span>
              </button>

              <button
                type="button"
                className={`pause-toggle-btn ${isFuelTaskPaused ? 'paused' : ''}`}
                onClick={togglePauseFuelTask}
                title={isFuelTaskPaused ? 'Resume fuel tracking task' : 'Pause fuel tracking task'}
              >
                {isFuelTaskPaused ? '▶️ RESUME FUEL' : '⏸️ PAUSE FUEL'}
              </button>

              <button
                type="button"
                className="unit-toggle-btn"
                onClick={toggleSpeedUnit}
                title="Click to toggle between km/h and mph"
              >
                UNIT: <strong>{speedUnit.toUpperCase()}</strong>
              </button>

              <div className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
                <span className="status-dot" />
                <span>{isConnected ? 'LIVE FEED' : 'CONNECTING...'}</span>
              </div>
            </div>
          </header>

          {/* Speedometer & RPM Hero Section */}
          <section className="speedometer-hero">
            <div className="gear-display">
              <span className="gear-label">GEAR</span>
              <span className="gear-value">{formatGear(telemetry?.gear)}</span>
            </div>

            <div className="speed-readout">
              <span className="speed-number">{Math.round(currentSpeed)}</span>
              <span className="speed-unit">{speedUnit === 'kmh' ? 'km/h' : 'mph'}</span>
            </div>

            <div className="rpm-container">
              <div className="rpm-bar-track">
                <div
                  className={`rpm-bar-fill ${isShiftWarning ? 'shift-flash' : ''}`}
                  style={{ width: `${rpmPercent}%` }}
                />
              </div>
              <div className="rpm-labels">
                <span>0</span>
                <span>
                  RPM {Math.round(currentRpm)} / {Math.round(maxRpm)}
                </span>
                <span className="redline">{Math.round(maxRpm)}</span>
              </div>
            </div>
          </section>

          {/* Main Grid Layout */}
          <main className="dashboard-grid">
            <FuelGauge
              fuelPct={fuelPct}
              currentFuelLiters={currentFuelLiters}
              maxFuelCapacityLiters={maxFuelCapacityLiters}
              isFuelLow={isFuelLow}
              isFuelCritical={isFuelCritical}
              onRefill={refillFuel}
              onIncreaseTankCapacity={increaseTankCapacity}
              onDecreaseTankCapacity={decreaseTankCapacity}
            />

            <RemainingLaps
              fuelPct={fuelPct}
              bestLapTime={telemetry?.bestLap ?? 0}
              remainingTimeFormatted={remainingTimeFormatted}
              remainingDistanceFormatted={remainingDistanceFormatted}
            />

            <FuelConsumption
              lapNumber={telemetry?.lapNumber ?? 1}
              currentLapTime={telemetry?.currentLap ?? 0}
              bestLapTime={telemetry?.bestLap ?? 0}
              distanceTraveled={telemetry?.distanceTraveled ?? 0}
              fuelSpentLiters={fuelSpentLiters}
              fuelConsumptionRate={fuelConsumptionRate}
              fuelRateLPerHour={fuelRateLPerHour}
            />

            <FuelStatus
              fuelPct={fuelPct}
              power={telemetry?.power ?? 0}
              torque={telemetry?.torque ?? 0}
              gear={telemetry?.gear}
              steer={telemetry?.steer ?? 0}
              accel={telemetry?.accel ?? 0}
              brake={telemetry?.brake ?? 0}
              engineDisplacementLiters={engineDisplacementLiters}
            />
          </main>

          {/* Footer Info */}
          <footer className="overlay-footer">
            <span>
              Car: <strong>{carName}</strong> (ID: {carOrdinal || '---'}) | Position: P
              {telemetry?.racePosition ?? 1}
            </span>
            <span>
              Game Status:{' '}
              {isFuelTaskPaused
                ? '⏸️ FUEL PAUSED'
                : telemetry?.isRaceOn
                ? '🟢 RACING'
                : '🟡 GAME PAUSED'}{' '}
              | Press <kbd>M</kbd> for Minimal HUD
            </span>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;
