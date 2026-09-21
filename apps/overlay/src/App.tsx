import { useTelemetry } from './hooks/useTelemetry';
import { formatGear } from '../../../packages/shared/src/utils/gear.js';
import { FuelGauge } from './components/FuelGauge';
import { FuelConsumption } from './components/FuelConsumption';
import { FuelStatus } from './components/FuelStatus';
import { RemainingLaps } from './components/RemainingLaps';
import { WarningIndicator } from './components/WarningIndicator';
import { FuelEmptyModal } from './components/FuelEmptyModal';
import './App.css';

export function App() {
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
  } = useTelemetry();

  return (
    <div className="overlay-container">
      {/* Zero Fuel Empty Alert Popup */}
      <FuelEmptyModal
        isOpen={showEmptyModal}
        onClose={dismissEmptyModal}
      />

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
            <span>RPM {Math.round(currentRpm)} / {Math.round(maxRpm)}</span>
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
        />

        <FuelConsumption
          lapNumber={telemetry?.lapNumber ?? 1}
          currentLapTime={telemetry?.currentLap ?? 0}
          bestLapTime={telemetry?.bestLap ?? 0}
          distanceTraveled={telemetry?.distanceTraveled ?? 0}
          fuelSpentLiters={fuelSpentLiters}
          fuelConsumptionRate={fuelConsumptionRate}
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
        <span>Car: <strong>{carName}</strong> (ID: {carOrdinal || '---'}) | Position: P{telemetry?.racePosition ?? 1}</span>
        <span>
          Game Status: {isFuelTaskPaused ? '⏸️ FUEL PAUSED' : telemetry?.isRaceOn ? '🟢 RACING' : '🟡 GAME PAUSED'}
        </span>
      </footer>
    </div>
  );
}

export default App;
