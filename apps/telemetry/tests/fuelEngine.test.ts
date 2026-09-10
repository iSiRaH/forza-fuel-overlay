import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getCarFuelSpecs } from '../../../packages/shared/src/utils/carDatabase.js';
import { calculateFuelConsumptionStep } from '../../../packages/fuel-engine/src/calculator.js';
import { FuelTracker } from '../../../packages/fuel-engine/src/consumption.js';

describe('Car Model Fuel Capacity & Engine Displacement Database', () => {
  it('should return exact car specs for known car ordinals', () => {
    const porscheSpecs = getCarFuelSpecs(1024);
    assert.strictEqual(porscheSpecs.maxFuelCapacityLiters, 68);
    assert.strictEqual(porscheSpecs.engineDisplacementLiters, 3.8);

    const lamboSpecs = getCarFuelSpecs(2048);
    assert.strictEqual(lamboSpecs.maxFuelCapacityLiters, 80);
    assert.strictEqual(lamboSpecs.engineDisplacementLiters, 5.2);
  });

  it('should calculate realistic fallback fuel capacity and engine displacement by car class and power', () => {
    const compactCar = getCarFuelSpecs(9999, 0); // D class
    assert.strictEqual(compactCar.maxFuelCapacityLiters, 45);
    assert.strictEqual(compactCar.engineDisplacementLiters, 1.6);

    const hyperCar = getCarFuelSpecs(9999, 5, 800); // S2 class with 800 HP
    assert.strictEqual(hyperCar.maxFuelCapacityLiters, 88);
    assert.strictEqual(hyperCar.engineDisplacementLiters, 5.2);
  });
});

describe('Fuel Spent Calculation Engine', () => {
  it('should calculate spent fuel step based on car speed, gear, engine capacity, and throttle', () => {
    const resultIdle = calculateFuelConsumptionStep({
      speedMps: 0,
      gear: 0,
      engineDisplacementLiters: 3.0,
      currentRpm: 1000,
      maxRpm: 8000,
      accelPercent: 0,
      dtSeconds: 1.0,
    });

    const resultHighSpeed = calculateFuelConsumptionStep({
      speedMps: 60, // 216 km/h
      gear: 5,
      engineDisplacementLiters: 4.2,
      currentRpm: 7500,
      maxRpm: 8500,
      accelPercent: 255,
      dtSeconds: 1.0,
    });

    // High speed / high RPM / full throttle / larger displacement should burn more fuel than idle
    assert.ok(resultHighSpeed.fuelSpentStepLiters > resultIdle.fuelSpentStepLiters * 3);
    assert.ok(resultHighSpeed.instantaneousBurnRateLps > 0.0005);
    assert.ok(resultHighSpeed.consumptionLPer100Km > 0);
  });
});

describe('FuelTracker & Refill Option', () => {
  it('should track cumulative fuel spent and handle refilling to 100% full capacity', () => {
    const tracker = new FuelTracker(1024); // Porsche 911 GT3 RS (68L capacity, 3.8L engine)
    const initialSpecs = tracker.getSpecs();
    assert.strictEqual(initialSpecs.maxFuelCapacityLiters, 68);

    // Process high load telemetry ticks
    for (let i = 0; i < 50; i++) {
      tracker.processTelemetry({
        timestampMS: i * 100,
        carOrdinal: 1024,
        speed: 50,
        gear: 4,
        currentEngineRpm: 7000,
        engineMaxRpm: 8500,
        accel: 255,
      });
    }

    const stateBeforeRefill = tracker.processTelemetry({
      timestampMS: 5000,
      carOrdinal: 1024,
    });

    assert.ok(stateBeforeRefill.fuelSpentLiters > 0, 'Fuel spent should be greater than 0');
    assert.strictEqual(stateBeforeRefill.maxFuelCapacityLiters, 68);

    // Perform fuel refill action
    const stateAfterRefill = tracker.refill(1.0);

    assert.strictEqual(stateAfterRefill.fuelRatio, 1.0);
    assert.strictEqual(stateAfterRefill.currentFuelLiters, 68);
    assert.strictEqual(stateAfterRefill.fuelSpentLiters, 0);
  });
});
