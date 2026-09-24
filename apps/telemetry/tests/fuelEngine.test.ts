import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getCarFuelSpecs, getCarPiClass } from '../../../packages/shared/src/utils/carDatabase.js';
import {
  calculateFuelConsumptionStep,
  calculateDisplacementFactor,
  calculateRpmFactor,
  calculateThrottleFactor,
  calculateFuelRateLPerHour,
} from '../../../packages/fuel-engine/src/calculator.js';
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

  it('should generate consistent, distinct fuel capacities for unmapped car ordinals', () => {
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

describe('Engine Displacement Scaling (Section 4 & 22)', () => {
  it('should calculate correct displacement factors clamped between 0.50 and 4.00', () => {
    assert.strictEqual(calculateDisplacementFactor(1.0), 0.50);
    assert.strictEqual(calculateDisplacementFactor(1.5), 0.75);
    assert.strictEqual(calculateDisplacementFactor(2.0), 1.00);
    assert.strictEqual(calculateDisplacementFactor(3.0), 1.50);
    assert.strictEqual(calculateDisplacementFactor(4.0), 2.00);
    assert.strictEqual(calculateDisplacementFactor(6.0), 3.00);
    assert.strictEqual(calculateDisplacementFactor(8.0), 4.00);
    assert.strictEqual(calculateDisplacementFactor(10.0), 4.00); // Clamped max
    assert.strictEqual(calculateDisplacementFactor(0.2), 0.50); // Clamped min
  });

  it('should produce higher consumption for larger engine sizes at same RPM and throttle', () => {
    const step1_5 = calculateFuelConsumptionStep({
      speedMps: 30,
      engineDisplacementLiters: 1.5,
      currentRpm: 4000,
      maxRpm: 8000,
      accelPercent: 50,
      dtSeconds: 1.0,
    });

    const step3_0 = calculateFuelConsumptionStep({
      speedMps: 30,
      engineDisplacementLiters: 3.0,
      currentRpm: 4000,
      maxRpm: 8000,
      accelPercent: 50,
      dtSeconds: 1.0,
    });

    const step6_0 = calculateFuelConsumptionStep({
      speedMps: 30,
      engineDisplacementLiters: 6.0,
      currentRpm: 4000,
      maxRpm: 8000,
      accelPercent: 50,
      dtSeconds: 1.0,
    });

    assert.ok(step3_0.fuelRateLPerHour > step1_5.fuelRateLPerHour);
    assert.ok(step6_0.fuelRateLPerHour > step3_0.fuelRateLPerHour);
  });
});

describe('Non-Linear RPM & Throttle Consumption (Section 7, 8 & 9)', () => {
  it('should scale RPM factor non-linearly towards redline', () => {
    const rpm0 = calculateRpmFactor(0.0);
    const rpm50 = calculateRpmFactor(0.5);
    const rpm75 = calculateRpmFactor(0.75);
    const rpm100 = calculateRpmFactor(1.0);

    assert.strictEqual(rpm0, 0.20);
    assert.ok(rpm50 > 0.70 && rpm50 < 0.90);
    assert.ok(rpm75 > 1.60 && rpm75 < 1.75);
    assert.strictEqual(rpm100, 3.00);
  });

  it('should increase consumption with higher throttle at constant RPM', () => {
    const throttle20 = calculateThrottleFactor(20, 4000);
    const throttle50 = calculateThrottleFactor(50, 4000);
    const throttle80 = calculateThrottleFactor(80, 4000);
    const throttle100 = calculateThrottleFactor(100, 4000);

    assert.ok(Math.abs(throttle20 - 0.82) < 0.001);
    assert.ok(Math.abs(throttle50 - 1.075) < 0.001);
    assert.ok(Math.abs(throttle80 - 1.33) < 0.001);
    assert.strictEqual(throttle100, 1.50);
  });

  it('should apply low coasting factor (0.15) when throttle < 5% and engine is spinning', () => {
    const coastingFactor = calculateThrottleFactor(0, 4000);
    assert.strictEqual(coastingFactor, 0.15);

    const stepCoasting = calculateFuelConsumptionStep({
      speedMps: 30,
      engineDisplacementLiters: 3.0,
      currentRpm: 5000,
      maxRpm: 8000,
      accelPercent: 0,
      dtSeconds: 1.0,
    });

    assert.ok(stepCoasting.fuelRateLPerHour < 2.0);
  });

  it('should produce 0 fuel consumption when engine RPM is 0', () => {
    const rateOff = calculateFuelRateLPerHour(1.0, 1.0, 1.0, 0);
    assert.strictEqual(rateOff, 0);
  });
});

describe('Full Worked Example Verification (Section 11 & 37)', () => {
  it('should accurately calculate consumption for 4.0L engine at 6000 RPM (8000 redline), 80% throttle', () => {
    const step = calculateFuelConsumptionStep({
      speedMps: 30,
      engineDisplacementLiters: 4.0,
      currentRpm: 6000,
      maxRpm: 8000,
      accelPercent: 80,
      dtSeconds: 0.25,
    });

    // Step 1: Disp factor = 4.0 / 2.0 = 2.0
    assert.strictEqual(step.displacementFactor, 2.0);
    // Step 2: RPM ratio = 6000 / 8000 = 0.75
    assert.strictEqual(step.rpmRatio, 0.75);
    // Step 3: RPM factor = 0.20 + (0.75^2.2 * 2.80) ≈ 1.687
    assert.ok(Math.abs(step.rpmFactor - 1.687) < 0.05);
    // Step 5: Throttle factor = 0.65 + (0.80 * 0.85) = 1.33
    assert.strictEqual(step.throttleFactor, 1.33);
    // Step 6: Fuel rate = 2.0 * 2.0 * 1.687 * 1.33 ≈ 8.97 L/h
    assert.ok(Math.abs(step.fuelRateLPerHour - 8.97) < 0.2);
  });
});

describe('FuelTracker State, Pausing, Gaps & Refill (Section 14 - 21)', () => {
  it('should track cumulative fuel spent and handle refilling', () => {
    const tracker = new FuelTracker(1024); // Porsche 911 GT3 RS (68L capacity)
    const initialSpecs = tracker.getSpecs();
    assert.strictEqual(initialSpecs.maxFuelCapacityLiters, 68);

    for (let i = 0; i < 50; i++) {
      tracker.processTelemetry({
        timestampMS: i * 100,
        carOrdinal: 1024,
        speed: 50,
        currentEngineRpm: 7000,
        engineMaxRpm: 8500,
        accel: 255,
      });
    }

    const stateBeforeRefill = tracker.processTelemetry({
      timestampMS: 5000,
      carOrdinal: 1024,
    });

    assert.ok(stateBeforeRefill.fuelSpentLiters > 0);

    const stateAfterRefill = tracker.refill(1.0);
    assert.strictEqual(stateAfterRefill.fuelRatio, 1.0);
    assert.strictEqual(stateAfterRefill.currentFuelLiters, 68);
    assert.strictEqual(stateAfterRefill.fuelSpentLiters, 0);
  });

  it('should support user-configurable fuel tank size in 5 L steps', () => {
    const tracker = new FuelTracker(1024);

    const state55 = tracker.setTankCapacity(55);
    assert.strictEqual(state55.maxFuelCapacityLiters, 55);

    const state65 = tracker.setTankCapacity(65);
    assert.strictEqual(state65.maxFuelCapacityLiters, 65);

    const stateRounded = tracker.setTankCapacity(52);
    assert.strictEqual(stateRounded.maxFuelCapacityLiters, 50);

    const stateMin = tracker.setTankCapacity(0);
    assert.strictEqual(stateMin.maxFuelCapacityLiters, 5);
  });

  it('should freeze fuel state during pause and rebase telemetry timestamp baseline on resume', () => {
    const tracker = new FuelTracker(1024);

    for (let i = 0; i < 10; i++) {
      tracker.processTelemetry({
        isRaceOn: true,
        timestampMS: i * 100,
        carOrdinal: 1024,
        speed: 40,
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
    tracker.setPaused(true);

    for (let i = 0; i < 20; i++) {
      const pausedState = tracker.processTelemetry({
        isRaceOn: false,
        timestampMS: 1000 + (i * 1000),
        carOrdinal: 1024,
        speed: 60,
      });
      assert.strictEqual(pausedState.currentFuelLiters, fuelBeforePause);
    }

    tracker.setPaused(false);

    const stateOnResume = tracker.processTelemetry({
      isRaceOn: true,
      timestampMS: 50000,
      carOrdinal: 1024,
      speed: 40,
    });

    assert.ok(Math.abs(stateOnResume.currentFuelLiters - fuelBeforePause) < 0.1);
  });

  it('should safely ignore large telemetry gaps (> 2 seconds)', () => {
    const tracker = new FuelTracker(1024);

    tracker.processTelemetry({
      timestampMS: 1000,
      carOrdinal: 1024,
      currentEngineRpm: 5000,
    });

    const stateBeforeGap = tracker.processTelemetry({
      timestampMS: 1100,
      carOrdinal: 1024,
      currentEngineRpm: 5000,
    });

    // Simulate 10-second drop/gap
    const stateAfterGap = tracker.processTelemetry({
      timestampMS: 11100,
      carOrdinal: 1024,
      currentEngineRpm: 5000,
    });

    // Large gap should be ignored -> 0 fuel consumed during the 10s gap
    assert.strictEqual(stateAfterGap.currentFuelLiters, stateBeforeGap.currentFuelLiters);
  });
});
