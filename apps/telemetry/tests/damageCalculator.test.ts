import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDamage,
  mapDamageSeverity,
  normalizeDamagePercent,
  formatDamagePercent,
  DEFAULT_DAMAGE_THRESHOLDS,
} from '../../overlay/src/utils/damage-calculator.js';
import type { ForzaTelemetryData } from '../../../packages/shared/src/types/telemetry.js';

describe('Simulation Damage Calculator (Interpretation Module)', () => {
  // Test Fixture 1: Real game telemetry from standard Forza Horizon 6 UDP stream (No explicit component damage percentages)
  const realGamePacketFixture: Partial<ForzaTelemetryData> = {
    isRaceOn: true,
    timestampMS: 45000,
    speed: 48.5,
    currentEngineRpm: 5200,
    engineMaxRpm: 8000,
    tireTempFL: 92.4,
    tireTempFR: 95.1,
    tireTempRL: 88.0,
    tireTempRR: 89.2,
    suspensionTravelFL: 0.35,
    suspensionTravelFR: 0.38,
    suspensionTravelRL: 0.42,
    suspensionTravelRR: 0.41,
    // Note: Forza Data Out does NOT output transmission, steering, brakes, or engine damage percentages
  };

  // Test Fixture 2: Synthetic telemetry fixture with verified component damage values
  const syntheticDamagedFixture: Partial<ForzaTelemetryData> = {
    isRaceOn: true,
    timestampMS: 98000,
    speed: 35.0,
    currentEngineRpm: 4000,
    engineMaxRpm: 7500,
    engineDamagePct: 25.0, // Moderate engine damage
    tireWearFL: 0.35,      // 35% wear (fractional 0-1)
    tireWearFR: 0.48,      // 48% wear
    tireWearRL: 0.15,      // 15% wear
    tireWearRR: 0.20,      // 20% wear
    transmissionDamagePct: 12.0, // Minor
    suspensionDamagePct: 55.0,   // Severe
  };

  it('should correctly normalize damage fractions and percentages', () => {
    assert.equal(normalizeDamagePercent(null), null);
    assert.equal(normalizeDamagePercent(undefined), null);
    assert.equal(normalizeDamagePercent(NaN), null);
    assert.equal(normalizeDamagePercent('invalid'), null);
    assert.equal(normalizeDamagePercent(0), 0);
    assert.equal(normalizeDamagePercent(0.25), 25);
    assert.equal(normalizeDamagePercent(1.0), 100);
    assert.equal(normalizeDamagePercent(45), 45);
    assert.equal(normalizeDamagePercent(120), 100); // clamped to 100
  });

  it('should map severity according to configurable thresholds', () => {
    // 0-19%: Minor (0 = Healthy)
    assert.equal(mapDamageSeverity(0), 'healthy');
    assert.equal(mapDamageSeverity(10), 'minor');
    assert.equal(mapDamageSeverity(19), 'minor');

    // 20-49%: Moderate
    assert.equal(mapDamageSeverity(20), 'moderate');
    assert.equal(mapDamageSeverity(45), 'moderate');
    assert.equal(mapDamageSeverity(49), 'moderate');

    // 50-79%: Severe
    assert.equal(mapDamageSeverity(50), 'severe');
    assert.equal(mapDamageSeverity(75), 'severe');
    assert.equal(mapDamageSeverity(79), 'severe');

    // 80-100%: Critical
    assert.equal(mapDamageSeverity(80), 'critical');
    assert.equal(mapDamageSeverity(100), 'critical');

    // Missing / null
    assert.equal(mapDamageSeverity(null), 'unavailable');
  });

  it('should format percentages cleanly with fallback for unavailable data', () => {
    assert.equal(formatDamagePercent(null), 'N/A');
    assert.equal(formatDamagePercent(25.4), '25%');
    assert.equal(formatDamagePercent(0), '0%');
  });

  it('should NOT invent percentages when telemetry does not expose component damage (Real game telemetry)', () => {
    const result = calculateDamage(realGamePacketFixture, true);

    // Verify transmission, brakes, steering, and chassis are marked UNAVAILABLE, not 0%
    assert.equal(result.components.transmission.isAvailable, false);
    assert.equal(result.components.transmission.damagePercent, null);
    assert.equal(result.components.transmission.severity, 'unavailable');

    assert.equal(result.components.brakes.isAvailable, false);
    assert.equal(result.components.brakes.damagePercent, null);
    assert.equal(result.components.brakes.severity, 'unavailable');

    assert.equal(result.components.steering.isAvailable, false);
    assert.equal(result.components.steering.damagePercent, null);

    assert.equal(result.components.chassis.isAvailable, false);
    assert.equal(result.components.chassis.damagePercent, null);

    // Tires: temperatures should be present in details, but wear is unavailable
    assert.equal(result.components.tires.isAvailable, false);
    assert.equal(result.components.tires.damagePercent, null);
    assert.ok(result.components.tires.details?.temps?.fl === 92.4);

    // Overall status is Unavailable since no verified damage % exists in standard game packet
    assert.equal(result.overallConditionPct, null);
    assert.equal(result.vehicleStatus, 'Unavailable');
  });

  it('should calculate accurate condition and severity for synthetic damaged telemetry', () => {
    const result = calculateDamage(syntheticDamagedFixture, true);

    // Engine: 25% damage -> Moderate severity, 75% condition
    assert.equal(result.components.engine.isAvailable, true);
    assert.equal(result.components.engine.damagePercent, 25);
    assert.equal(result.components.engine.conditionPercent, 75);
    assert.equal(result.components.engine.severity, 'moderate');

    // Tires: max corner wear is 48% (FR) -> Moderate
    assert.equal(result.components.tires.isAvailable, true);
    assert.equal(result.components.tires.damagePercent, 48);
    assert.equal(result.components.tires.severity, 'moderate');

    // Suspension: 55% -> Severe
    assert.equal(result.components.suspension.isAvailable, true);
    assert.equal(result.components.suspension.damagePercent, 55);
    assert.equal(result.components.suspension.severity, 'severe');

    // Transmission: 12% -> Minor
    assert.equal(result.components.transmission.isAvailable, true);
    assert.equal(result.components.transmission.damagePercent, 12);
    assert.equal(result.components.transmission.severity, 'minor');

    // Overall condition limited by worst component (Suspension 55% damage -> 45% condition, Damaged)
    assert.equal(result.overallDamagePct, 55);
    assert.equal(result.overallConditionPct, 45);
    assert.equal(result.overallSeverity, 'severe');
    assert.equal(result.vehicleStatus, 'Damaged');
  });

  it('should handle zero damage as Healthy', () => {
    const pristineCar: Partial<ForzaTelemetryData> = {
      isRaceOn: true,
      timestampMS: 12000,
      engineDamagePct: 0,
      transmissionDamagePct: 0,
      tiresDamagePct: 0,
    };

    const result = calculateDamage(pristineCar, true);
    assert.equal(result.overallDamagePct, 0);
    assert.equal(result.overallConditionPct, 100);
    assert.equal(result.overallSeverity, 'healthy');
    assert.equal(result.vehicleStatus, 'Healthy');
  });

  it('should handle critical damage (80-100%)', () => {
    const wreckedCar: Partial<ForzaTelemetryData> = {
      isRaceOn: true,
      timestampMS: 67000,
      engineDamagePct: 88,
      suspensionDamagePct: 92,
    };

    const result = calculateDamage(wreckedCar, true);
    assert.equal(result.overallDamagePct, 92);
    assert.equal(result.overallConditionPct, 8);
    assert.equal(result.overallSeverity, 'critical');
    assert.equal(result.vehicleStatus, 'Critical');
  });

  it('should handle disconnected and null telemetry gracefully', () => {
    const offlineResult = calculateDamage(null, false);
    assert.equal(offlineResult.vehicleStatus, 'Offline');
    assert.equal(offlineResult.overallConditionPct, null);
    assert.equal(offlineResult.overallDamagePct, null);
    assert.equal(offlineResult.isStale, true);
    assert.equal(offlineResult.components.engine.isAvailable, false);
    assert.equal(offlineResult.components.engine.severity, 'unavailable');
  });
});
