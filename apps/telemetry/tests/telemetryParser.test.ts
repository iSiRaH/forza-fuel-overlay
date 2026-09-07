import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseForzaTelemetryPacket } from '../src/parser/telemetryParser.js';

describe('Forza UDP Telemetry Packet Parser', () => {
  it('should throw an error for packets smaller than 311 bytes', () => {
    const invalidPacket = Buffer.alloc(100);
    assert.throws(() => parseForzaTelemetryPacket(invalidPacket), /Invalid packet size/);
  });

  it('should correctly parse binary Forza Dash packet fields', () => {
    const packet = Buffer.alloc(323);

    // isRaceOn = 1 at offset 0
    packet.writeInt32LE(1, 0);
    // timestampMS = 100000 at offset 4
    packet.writeUInt32LE(100000, 4);
    // engineMaxRpm = 8500 at offset 8
    packet.writeFloatLE(8500, 8);
    // currentEngineRpm = 6000 at offset 16
    packet.writeFloatLE(6000, 16);
    // speed = 60 m/s (~216 km/h) at offset 244
    packet.writeFloatLE(60, 244);
    // fuel = 0.80 (80%) at offset 280
    packet.writeFloatLE(0.8, 280);
    // currentRaceTime = 45.5s at offset 300
    packet.writeFloatLE(45.5, 300);
    // lapNumber = 3 at offset 304
    packet.writeUInt16LE(3, 304);
    // gear = 5 at offset 311
    packet.writeUInt8(5, 311);

    const parsed = parseForzaTelemetryPacket(packet);

    assert.equal(parsed.isRaceOn, true);
    assert.equal(parsed.timestampMS, 100000);
    assert.equal(parsed.engineMaxRpm, 8500);
    assert.equal(parsed.currentEngineRpm, 6000);
    assert.equal(parsed.speed, 60);
    assert.ok(Math.abs((parsed.fuel ?? 0) - 0.8) < 1e-4);
    assert.equal(parsed.currentRaceTime, 45.5);
    assert.equal(parsed.lapNumber, 3);
    assert.equal(parsed.gear, 5);
  });
});
