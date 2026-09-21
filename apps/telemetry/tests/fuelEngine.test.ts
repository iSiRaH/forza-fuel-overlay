import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getCarFuelSpecs, getCarPiClass } from '../../../packages/shared/src/utils/carDatabase.js';
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
    assert.ok(compactCar.maxFuelCapacityLiters >= 38 && compactCar.maxFuelCapacityLiters <= 55);

    const hyperCar = getCarFuelSpecs(9999, 5, 800); // S2 class with 800 HP
    assert.ok(hyperCar.maxFuelCapacityLiters >= 75 && hyperCar.maxFuelCapacityLiters <= 100);
  });

  it('should generate consistent, distinct fuel capacities for 632+ unmapped car ordinals in FH6', () => {
    const carA = getCarFuelSpecs(1234, 4); // S1 Class Car 1234
    const carB = getCarFuelSpecs(5678, 4); // S1 Class Car 5678
    assert.notStrictEqual(carA.maxFuelCapacityLiters, carB.maxFuelCapacityLiters);
  });

  it('should correctly resolve Forza PI Class badges and theme colors', () => {
    const piD = getCarPiClass(0, 450);
    assert.strictEqual(piD.className, 'D');

    const piA = getCarPiClass(3, 750);
    assert.strictEqual(piA.className, 'A');

    const piS1 = getCarPiClass(4, 895);
    assert.strictEqual(piS1.className, 'S1');

    const piR = getCarPiClass(6, 955);
    assert.strictEqual(piR.className, 'R');

    const piX = getCarPiClass(7, 999);
    assert.strictEqual(piX.className, 'X');
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

  it('should support user-configurable fuel tank size in 5 L steps', () => {
    const tracker = new FuelTracker(1024);
    
    // Set custom tank capacity to 55 L
    const state55 = tracker.setTankCapacity(55);
    assert.strictEqual(state55.maxFuelCapacityLiters, 55);
    assert.strictEqual(state55.currentFuelLiters, 55);

    // Increase to 65 L
    const state65 = tracker.setTankCapacity(65);
    assert.strictEqual(state65.maxFuelCapacityLiters, 65);

    // Rounding to nearest 5 L step (e.g. 52 L -> 50 L)
    const stateRounded = tracker.setTankCapacity(52);
    assert.strictEqual(stateRounded.maxFuelCapacityLiters, 50);

    // Minimum boundary protection (e.g. 0 L -> 5 L min)
    const stateMin = tracker.setTankCapacity(0);
    assert.strictEqual(stateMin.maxFuelCapacityLiters, 5);
  });

  it('should freeze fuel state during pause and rebase telemetry timestamp on resume', () => {
    const tracker = new FuelTracker(1024);
    
    // Initial ticks to consume some fuel
    for (let i = 0; i < 10; i++) {
      tracker.processTelemetry({
        isRaceOn: true,
        timestampMS: i * 100,
        carOrdinal: 1024,
        speed: 40,
        gear: 3,
        currentEngineRpm: 5000,
      });
    }

    const stateBeforePause = tracker.processTelemetry({
      isRaceOn: true,
      timestampMS: 1000,
      carOrdinal: 1024,
      speed: 40,
    });

    const fuelBeforePause = stateBeforePause.currentFuelLiters;
    assert.ok(fuelBeforePause > 0 && fuelBeforePause < 68);

    // PAUSE fuel tracking
    tracker.setPaused(true);

    // Process telemetry while paused (even if player drives or 100 seconds elapse)
    for (let i = 0; i < 20; i++) {
      const pausedState = tracker.processTelemetry({
        isRaceOn: false,
        timestampMS: 1000 + (i * 1000), // 20 seconds pass
        carOrdinal: 1024,
        speed: 60,
      });
      assert.strictEqual(pausedState.currentFuelLiters, fuelBeforePause, 'Fuel state must remain frozen during pause');
    }

    // RESUME fuel tracking
    tracker.setPaused(false);

    // Process first frame on resume after 30 seconds gap
    const stateOnResume = tracker.processTelemetry({
      isRaceOn: true,
      timestampMS: 50000, // 50s timestamp
      carOrdinal: 1024,
      speed: 40,
    });

    // Fuel on resume must continue seamlessly from preserved fuel state without sudden drop
    assert.ok(
      Math.abs(stateOnResume.currentFuelLiters - fuelBeforePause) < 0.1,
      `Fuel on resume (${stateOnResume.currentFuelLiters} L) should continue smoothly from pre-pause state (${fuelBeforePause} L)`
    );
  });
});

