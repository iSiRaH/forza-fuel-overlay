import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { logTelemetryData } from '../src/telemetry/telemetryLogger.js';
import type { ForzaTelemetryData } from '../../../packages/shared/src/types/telemetry.js';

describe('Telemetry Data Console Logging Test', () => {
  const sampleTelemetry: ForzaTelemetryData = {
    isRaceOn: true,
    timestampMS: 12345678,
    engineMaxRpm: 8000,
    engineIdleRpm: 1000,
    currentEngineRpm: 6500,
    speed: 55.5, // 55.5 m/s = ~199.8 km/h
    power: 350,
    torque: 450,
    gear: 4,
    accel: 240,
    brake: 0,
    clutch: 0,
    handBrake: 0,
    steer: 5,
    fuel: 0.75, // 75% fuel remaining
    distanceTraveled: 3500.5,
    bestLap: 88.42,
    lastLap: 89.15,
    currentLap: 45.2,
    currentRaceTime: 133.62,
    lapNumber: 2,
    racePosition: 1,
    carOrdinal: 1024,
    carClass: 3,
    carPerformanceIndex: 799,
  };

  it('should correctly log telemetry data as JSON string to console log', () => {
    const logs: string[] = [];
    const mockLogger = (msg: string) => {
      logs.push(msg);
    };

    const output = logTelemetryData(sampleTelemetry, { logger: mockLogger });

    assert.equal(logs.length, 1);
    assert.ok(logs[0]?.startsWith('[TELEMETRY]'));
    assert.ok(output.includes('"speedKmH":199.8'));
    assert.ok(output.includes('"currentEngineRpm":6500'));
    assert.ok(output.includes('"gear":4'));
    assert.ok(output.includes('"fuelPct":75'));
    assert.ok(output.includes('"lapNumber":2'));
  });

  it('should correctly output formatted string telemetry log', () => {
    const logs: string[] = [];
    const mockLogger = (msg: string) => {
      logs.push(msg);
    };

    const output = logTelemetryData(sampleTelemetry, {
      formatted: true,
      logger: mockLogger,
      prefix: 'FORZA-TEST',
    });

    assert.equal(logs.length, 1);
    assert.ok(logs[0]?.startsWith('[FORZA-TEST]'));
    assert.ok(logs[0]?.includes('Lap: 2'));
    assert.ok(logs[0]?.includes('Speed: 199.8 km/h'));
    assert.ok(logs[0]?.includes('RPM: 6500/8000'));
    assert.ok(logs[0]?.includes('Gear: 4'));
    assert.ok(logs[0]?.includes('Fuel: 75.0%'));
  });

  it('should intercept console.log when standard console output is used', () => {
    const originalConsoleLog = console.log;
    let loggedMessage = '';

    console.log = (msg: string) => {
      loggedMessage = msg;
    };

    try {
      logTelemetryData(sampleTelemetry, { prefix: 'CONSOLE-VERIFY' });
      assert.ok(loggedMessage.startsWith('[CONSOLE-VERIFY]'));
      assert.ok(loggedMessage.includes('"isRaceOn":true'));
      assert.ok(loggedMessage.includes('"speedKmH":199.8'));
    } finally {
      console.log = originalConsoleLog;
    }
  });
});
