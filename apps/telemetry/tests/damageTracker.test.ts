import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DamageTracker } from '../../../packages/shared/src/damage/damageTracker.js';

describe('DamageTracker Physics & Degradation Engine', () => {
  it('should start with zero damage across all components', () => {
    const tracker = new DamageTracker();
    const state = tracker.processTelemetry({
      timestampMS: 1000,
      isRaceOn: true,
      speed: 0,
    });

    assert.equal(state.engineDamagePct, 0);
    assert.equal(state.transmissionDamagePct, 0);
    assert.equal(state.suspensionDamagePct, 0);
    assert.equal(state.brakesDamagePct, 0);
    assert.equal(state.tiresDamagePct, 0);
    assert.equal(state.steeringDamagePct, 0);
    assert.equal(state.chassisDamagePct, 0);
  });

  it('should accumulate tire wear from continuous slip and high temperatures', () => {
    const tracker = new DamageTracker();
    let time = 1000;

    // Simulate aggressive drift/wheelspin for 30 frames (0.5 sec)
    for (let i = 0; i < 30; i++) {
      time += 16;
      tracker.processTelemetry({
        timestampMS: time,
        isRaceOn: true,
        speed: 30, // 108 km/h
        wheelSlipFL: 0.65, // Significant wheelspin
        wheelSlipFR: 0.65,
        tireTempFL: 120, // Overheating
        tireTempFR: 120,
      });
    }

    const state = tracker.processTelemetry({
      timestampMS: time + 16,
      isRaceOn: true,
      speed: 30,
    });

    assert.ok(state.tireWearFL > 0, `Expected FL tire wear > 0, got ${state.tireWearFL}`);
    assert.ok(state.tireWearFR > 0, `Expected FR tire wear > 0, got ${state.tireWearFR}`);
    assert.equal(state.tiresDamagePct, Math.max(state.tireWearFL, state.tireWearFR));
  });

  it('should accumulate brake wear under heavy braking from high speed', () => {
    const tracker = new DamageTracker();
    let time = 2000;

    for (let i = 0; i < 40; i++) {
      time += 16;
      tracker.processTelemetry({
        timestampMS: time,
        isRaceOn: true,
        speed: 45, // 162 km/h
        brake: 255, // 100% brake pedal
      });
    }

    const state = tracker.processTelemetry({
      timestampMS: time + 16,
      isRaceOn: true,
    });

    assert.ok(state.brakesDamagePct > 0, `Expected brake wear > 0, got ${state.brakesDamagePct}`);
  });

  it('should accumulate suspension damage when bottoming out or hitting curbs', () => {
    const tracker = new DamageTracker();
    let time = 3000;

    for (let i = 0; i < 20; i++) {
      time += 16;
      tracker.processTelemetry({
        timestampMS: time,
        isRaceOn: true,
        speed: 35,
        suspensionTravelFL: 0.98, // Bottomed out against bump stops
        suspensionTravelFR: 0.98,
      });
    }

    const state = tracker.processTelemetry({
      timestampMS: time + 16,
      isRaceOn: true,
    });

    assert.ok(state.suspensionDamagePct > 0, `Expected suspension damage > 0, got ${state.suspensionDamagePct}`);
  });

  it('should accumulate engine damage from severe over-revving', () => {
    const tracker = new DamageTracker();
    let time = 4000;

    // Redline is 8000, RPM spikes to 9500 (money-shift)
    for (let i = 0; i < 30; i++) {
      time += 16;
      tracker.processTelemetry({
        timestampMS: time,
        isRaceOn: true,
        engineMaxRpm: 8000,
        currentEngineRpm: 9200,
      });
    }

    const state = tracker.processTelemetry({
      timestampMS: time + 16,
      isRaceOn: true,
    });

    assert.ok(state.engineDamagePct > 0, `Expected engine damage > 0, got ${state.engineDamagePct}`);
  });

  it('should accumulate chassis and steering damage from heavy impact shocks (G-force deltas)', () => {
    const tracker = new DamageTracker();

    // Baseline frame
    tracker.processTelemetry({
      timestampMS: 5000,
      isRaceOn: true,
      accelerationX: 0,
      accelerationY: 0,
      accelerationZ: 5,
      steer: 30,
    });

    // Impact frame: sudden 8G frontal and lateral spike
    const state = tracker.processTelemetry({
      timestampMS: 5016,
      isRaceOn: true,
      accelerationX: 45, // ~4.6G lateral
      accelerationY: 0,
      accelerationZ: -55, // ~5.6G frontal deceleration
      steer: 30,
    });

    assert.ok(state.chassisDamagePct > 0, `Expected chassis damage > 0, got ${state.chassisDamagePct}`);
    assert.ok(state.steeringDamagePct > 0, `Expected steering damage > 0, got ${state.steeringDamagePct}`);
  });

  it('should reset all damage when reset() is triggered or car changes', () => {
    const tracker = new DamageTracker();
    tracker.processTelemetry({
      timestampMS: 6000,
      isRaceOn: true,
      carOrdinal: 101,
      engineDamagePct: 20,
      tiresDamagePct: 15,
    });

    tracker.reset();

    const state = tracker.processTelemetry({
      timestampMS: 6016,
      isRaceOn: true,
      carOrdinal: 101,
    });

    assert.equal(state.engineDamagePct, 0);
    assert.equal(state.tiresDamagePct, 0);
    assert.equal(state.chassisDamagePct, 0);
  });

  it('should automatically reset damage when car is respawned via position teleportation', () => {
    const tracker = new DamageTracker();

    // Car suffers damage while driving
    tracker.processTelemetry({
      timestampMS: 7000,
      isRaceOn: true,
      speed: 25,
      positionX: 100.0,
      positionY: 5.0,
      positionZ: 200.0,
      engineDamagePct: 35,
      tiresDamagePct: 28,
      brakesDamagePct: 15,
    });

    // In-game car respawn: position instantly jumps to track spawn point (e.g. 50 meters away) while stopped
    const respawnState = tracker.processTelemetry({
      timestampMS: 7016,
      isRaceOn: true,
      speed: 0.0,
      positionX: 150.0,
      positionY: 5.0,
      positionZ: 220.0,
    });

    assert.equal(respawnState.engineDamagePct, 0, 'Engine damage should reset to 0% upon respawn');
    assert.equal(respawnState.tiresDamagePct, 0, 'Tires damage should reset to 0% upon respawn');
    assert.equal(respawnState.brakesDamagePct, 0, 'Brakes damage should reset to 0% upon respawn');
  });

  it('should automatically reset damage when player unpauses after "Reset Car Position" in pause menu', () => {
    const tracker = new DamageTracker();

    // Car damaged
    tracker.processTelemetry({
      timestampMS: 8000,
      isRaceOn: true,
      speed: 20,
      engineDamagePct: 40,
      chassisDamagePct: 30,
    });

    // Player opens pause menu (isRaceOn = false)
    tracker.processTelemetry({
      timestampMS: 8500,
      isRaceOn: false,
    });

    // Player selects "Reset Car Position" and returns to game (isRaceOn = true, speed = 0, no pedals)
    const respawnState = tracker.processTelemetry({
      timestampMS: 9000,
      isRaceOn: true,
      speed: 0.0,
      accel: 0,
      brake: 0,
    });

    assert.equal(respawnState.engineDamagePct, 0);
    assert.equal(respawnState.chassisDamagePct, 0);
  });
});

