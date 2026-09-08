import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseForzaTelemetryPacket } from '../src/parser/telemetryParser.js';

describe('Forza UDP Telemetry Packet Parser', () => {
  it('should throw an error for packets smaller than 232 bytes', () => {
    const invalidPacket = Buffer.alloc(100);
    assert.throws(() => parseForzaTelemetryPacket(invalidPacket), /Invalid packet size/);
  });

  it('should correctly parse binary 232-byte Forza Sled packet (e.g. Free Roam / outside race)', () => {
    const packet = Buffer.alloc(232);
    // isRaceOn = 1 at offset 0
    packet.writeInt32LE(1, 0);
    // currentEngineRpm = 4500 at offset 16
    packet.writeFloatLE(4500, 16);
    // velocityZ = 30 m/s (~108 km/h) at offset 40
    packet.writeFloatLE(30, 40);

    const parsed = parseForzaTelemetryPacket(packet);
    assert.equal(parsed.isRaceOn, true);
    assert.equal(parsed.currentEngineRpm, 4500);
    assert.equal(parsed.speed, 30);
  });

  it('should correctly parse binary Forza Dash packet fields with accurate byte offsets', () => {
    const packet = Buffer.alloc(323);

    // isRaceOn = 1 at offset 0
    packet.writeInt32LE(1, 0);
    // timestampMS = 100000 at offset 4
    packet.writeUInt32LE(100000, 4);
    // engineMaxRpm = 8500 at offset 8
    packet.writeFloatLE(8500, 8);
    // currentEngineRpm = 6000 at offset 16
    packet.writeFloatLE(6000, 16);
    // velocityZ = 60 m/s (~216 km/h) at offset 40
    packet.writeFloatLE(60, 40);
    // fuel = 0.80 (80%) at offset 276
    packet.writeFloatLE(0.8, 276);
    // distanceTraveled = 1500m at offset 280
    packet.writeFloatLE(1500, 280);
    // currentRaceTime = 45.5s at offset 296
    packet.writeFloatLE(45.5, 296);
    // lapNumber = 3 at offset 300
    packet.writeUInt16LE(3, 300);
    // rawGear = 6 (5th gear) at offset 307
    packet.writeUInt8(6, 307);

    const parsed = parseForzaTelemetryPacket(packet);

    assert.equal(parsed.isRaceOn, true);
    assert.equal(parsed.timestampMS, 100000);
    assert.equal(parsed.engineMaxRpm, 8500);
    assert.equal(parsed.currentEngineRpm, 6000);
    assert.equal(parsed.speed, 60);
    assert.ok(Math.abs((parsed.fuel ?? 0) - 0.8) < 1e-4);
    assert.equal(parsed.distanceTraveled, 1500);
    assert.equal(parsed.currentRaceTime, 45.5);
    assert.equal(parsed.lapNumber, 3);
    assert.equal(parsed.gear, 5);
  });
});
