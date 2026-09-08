import { useTelemetry } from './hooks/useTelemetry';
import { FuelGauge } from './components/FuelGauge';
import { FuelConsumption } from './components/FuelConsumption';
import { FuelStatus } from './components/FuelStatus';
import { RemainingLaps } from './components/RemainingLaps';
import { WarningIndicator } from './components/WarningIndicator';
import './App.css';

export function App() {
  const {
    telemetry,
    isConnected,
    speedUnit,
    toggleSpeedUnit,
    currentSpeed,
    rpmPercent,
    currentRpm,
    maxRpm,
    isShiftWarning,
    fuelPct,
    isFuelLow,
    isFuelCritical,
  } = useTelemetry();

  return (
    <div className="overlay-container">
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
            <h1 className="app-title">FORZA FUEL OVERLAY</h1>
            <span className="subtitle">Real-Time Racing Telemetry</span>
          </div>
        </div>

        <div className="controls">
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
          <span className="gear-value">
            {telemetry?.gear === undefined || telemetry.gear === 0 ? 'N' : telemetry.gear === -1 ? 'R' : telemetry.gear}
          </span>
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
            <span>RPM {Math.round(currentRpm)} / {Math.round(maxRpm)}</span>
            <span className="redline">{Math.round(maxRpm)}</span>
          </div>
        </div>
      </section>

      {/* Main Grid Layout */}
      <main className="dashboard-grid">
        <FuelGauge
          fuelPct={fuelPct}
          isFuelLow={isFuelLow}
          isFuelCritical={isFuelCritical}
        />

        <RemainingLaps
          fuelPct={fuelPct}
          bestLapTime={telemetry?.bestLap ?? 0}
        />

        <FuelConsumption
          lapNumber={telemetry?.lapNumber ?? 1}
          currentLapTime={telemetry?.currentLap ?? 0}
          bestLapTime={telemetry?.bestLap ?? 0}
          distanceTraveled={telemetry?.distanceTraveled ?? 0}
        />

        <FuelStatus
          fuelPct={fuelPct}
          power={telemetry?.power ?? 0}
          torque={telemetry?.torque ?? 0}
          gear={telemetry?.gear ?? 0}
          steer={telemetry?.steer ?? 0}
          accel={telemetry?.accel ?? 0}
          brake={telemetry?.brake ?? 0}
        />
      </main>

      {/* Footer Info */}
      <footer className="overlay-footer">
        <span>Car ID: {telemetry?.carOrdinal ?? '---'} | Position: P{telemetry?.racePosition ?? 1}</span>
        <span>Game Status: {telemetry?.isRaceOn ? '🟢 RACING' : '🟡 PAUSED'}</span>
      </footer>
    </div>
  );
}

export default App;
