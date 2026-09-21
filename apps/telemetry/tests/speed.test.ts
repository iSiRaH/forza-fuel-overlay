import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mpsToKmh,
  mpsToMph,
  kmhToMps,
  mphToMps,
  formatSpeed,
} from '../../../packages/shared/src/utils/speed.js';
import { parseForzaTelemetryPacket } from '../src/parser/telemetryParser.js';

describe('Speed Measurement Accuracy & Unit Conversions', () => {
  it('should accurately convert m/s to km/h', () => {
    // 0 m/s = 0 km/h
    assert.equal(mpsToKmh(0), 0);
    // 10 m/s = 36 km/h
    assert.equal(mpsToKmh(10), 36);
    // 50 m/s = 180 km/h
    assert.equal(mpsToKmh(50), 180);
    // 100 m/s = 360 km/h
    assert.equal(mpsToKmh(100), 360);
  });

  it('should accurately convert m/s to mph', () => {
    // 0 m/s = 0 mph
    assert.equal(mpsToMph(0), 0);
    // 100 m/s ~= 223.6936 mph
    const mph = mpsToMph(100);
    assert.ok(Math.abs(mph - 223.6936) < 1e-3);
  });

  it('should accurately convert km/h and mph back to m/s', () => {
    const originalMps = 60;
    const kmh = mpsToKmh(originalMps); // 216 km/h
    const backToMpsFromKmh = kmhToMps(kmh);
    assert.ok(Math.abs(backToMpsFromKmh - originalMps) < 1e-6);

    const mph = mpsToMph(originalMps);
    const backToMpsFromMph = mphToMps(mph);
    assert.ok(Math.abs(backToMpsFromMph - originalMps) < 1e-6);
  });

  it('should format speed correctly with requested unit and decimal places', () => {
    const speedMps = 55.5; // ~199.8 km/h

    const formattedKmh = formatSpeed(speedMps, 'kmh', 1);
    assert.equal(formattedKmh.value, 199.8);
    assert.equal(formattedKmh.formatted, '199.8');
    assert.equal(formattedKmh.unitLabel, 'km/h');

    const formattedMph = formatSpeed(speedMps, 'mph', 1);
    assert.equal(formattedMph.unitLabel, 'mph');
    assert.equal(formattedMph.formatted, '124.1');

    const formattedMps = formatSpeed(speedMps, 'mps', 2);
    assert.equal(formattedMps.unitLabel, 'm/s');
    assert.equal(formattedMps.formatted, '55.50');
  });

  it('should measure speed parser execution performance (benchmark)', () => {
    const packet = Buffer.alloc(323);
    packet.writeInt32LE(1, 0); // isRaceOn
    packet.writeFloatLE(75.5, 40); // velocityZ = 75.5 m/s (~271.8 km/h)
    packet.writeFloatLE(0.85, 276); // fuel = 85%

    const iterations = 50000;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      parseForzaTelemetryPacket(packet);
    }

    const totalTimeMs = performance.now() - startTime;
    const opsPerSec = Math.round((iterations / totalTimeMs) * 1000);

    console.log(`⏱️ Speed Parser Benchmark: ${iterations} packets parsed in ${totalTimeMs.toFixed(2)}ms (${opsPerSec.toLocaleString()} ops/sec)`);

    // Speed parser should easily handle > 10,000 packets per second
    assert.ok(opsPerSec > 10000, `Speed parser throughput too slow: ${opsPerSec} ops/sec`);
  });
});
