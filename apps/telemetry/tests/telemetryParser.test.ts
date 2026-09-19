import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseForzaTelemetryPacket } from '../src/parser/telemetryParser.js';
import { formatGear, decodeGear } from '../../../packages/shared/src/utils/gear.js';

describe('Forza UDP Telemetry Packet Parser (FH6 324-byte & Legacy Formats)', () => {
  it('should throw an error for packets smaller than 232 bytes', () => {
    const invalidPacket = Buffer.alloc(100);
    assert.throws(() => parseForzaTelemetryPacket(invalidPacket), /Invalid packet size/);
  });

  it('should correctly parse 324-byte FH6 Car Dash packet fields with exact FH6 offsets', () => {
    const packet = Buffer.alloc(324);

    // 0: isRaceOn = 1
    packet.writeInt32LE(1, 0);
    // 4: timestampMS = 100000
    packet.writeUInt32LE(100000, 4);
    // 8: engineMaxRpm = 9000
    packet.writeFloatLE(9000, 8);
    // 12: engineIdleRpm = 1000
    packet.writeFloatLE(1000, 12);
    // 16: currentEngineRpm = 4214
    packet.writeFloatLE(4214, 16);
    // 40: velocityZ = 21.3889 m/s (~77 km/h)
    packet.writeFloatLE(21.3889, 40);

    // 256: speed = 21.3889 m/s
    packet.writeFloatLE(21.3889, 256);
    // 260: rawPower = 300,000 Watts (~402.3 HP)
    packet.writeFloatLE(300000, 260);
    // 264: rawTorque = 450 N-m
    packet.writeFloatLE(450, 264);

    // 288: fuel = 0.75 (75%)
    packet.writeFloatLE(0.75, 288);
    // 292: distanceTraveled = 2500m
    packet.writeFloatLE(2500, 292);
    // 296: bestLap = 88.5s
    packet.writeFloatLE(88.5, 296);
    // 300: lastLap = 89.2s
    packet.writeFloatLE(89.2, 300);
    // 304: currentLap = 42.1s
    packet.writeFloatLE(42.1, 304);
    // 308: currentRaceTime = 135.5s
    packet.writeFloatLE(135.5, 308);

    // 312: lapNumber = 2
    packet.writeUInt16LE(2, 312);
    // 314: racePosition = 1
    packet.writeUInt8(1, 314);

    // 315: accel = 255 (100% throttle)
    packet.writeUInt8(255, 315);
    // 316: brake = 0 (0% brake)
    packet.writeUInt8(0, 316);
    // 317: clutch = 0
    packet.writeUInt8(0, 317);
    // 318: handbrake = 0
    packet.writeUInt8(0, 318);

    // 319: gear = 2 (2nd gear)
    packet.writeInt8(2, 319);
    // 320: steer = -45 (left turn)
    packet.writeInt8(-45, 320);

    const parsed = parseForzaTelemetryPacket(packet);

    assert.equal(parsed.isRaceOn, true);
    assert.equal(parsed.timestampMS, 100000);
    assert.equal(parsed.engineMaxRpm, 9000);
    assert.equal(parsed.currentEngineRpm, 4214);
    assert.ok(Math.abs((parsed.speed ?? 0) - 21.3889) < 1e-3);
    assert.ok(Math.abs((parsed.power ?? 0) - 402.3) < 1.0);
    assert.equal(parsed.torque, 450);
    assert.ok(Math.abs((parsed.fuel ?? 0) - 0.75) < 1e-4);
    assert.equal(parsed.distanceTraveled, 2500);
    assert.ok(Math.abs((parsed.bestLap ?? 0) - 88.5) < 1e-3);
    assert.ok(Math.abs((parsed.lastLap ?? 0) - 89.2) < 1e-3);
    assert.ok(Math.abs((parsed.currentLap ?? 0) - 42.1) < 1e-3);
    assert.ok(Math.abs((parsed.currentRaceTime ?? 0) - 135.5) < 1e-3);
    assert.equal(parsed.lapNumber, 2);
    assert.equal(parsed.racePosition, 1);
    assert.equal(parsed.accel, 255);
    assert.equal(parsed.brake, 0);
    assert.equal(parsed.gear, 2);
    assert.equal(formatGear(parsed.gear), '2');
    assert.equal(parsed.steer, -45);
  });

  it('should correctly map FH6 raw gear bytes at offset 319 to numeric values and UI text', () => {
    // 2nd Gear -> 2
    const packet2 = Buffer.alloc(324);
    packet2.writeInt32LE(1, 0);
    packet2.writeInt8(2, 319);
    const parsed2 = parseForzaTelemetryPacket(packet2);
    assert.equal(parsed2.gear, 2);
    assert.equal(formatGear(parsed2.gear), '2');

    // 1st Gear -> 1
    const packet1 = Buffer.alloc(324);
    packet1.writeInt32LE(1, 0);
    packet1.writeInt8(1, 319);
    const parsed1 = parseForzaTelemetryPacket(packet1);
    assert.equal(parsed1.gear, 1);
    assert.equal(formatGear(parsed1.gear), '1');

    // Reverse -> 0 ('R')
    const packetR = Buffer.alloc(324);
    packetR.writeInt32LE(1, 0);
    packetR.writeInt8(0, 319);
    const parsedR = parseForzaTelemetryPacket(packetR);
    assert.equal(parsedR.gear, 0);
    assert.equal(formatGear(parsedR.gear), 'R');

    // Neutral -> -1 ('N')
    const packetN = Buffer.alloc(324);
    packetN.writeInt32LE(1, 0);
    packetN.writeInt8(-1, 319);
    const parsedN = parseForzaTelemetryPacket(packetN);
    assert.equal(parsedN.gear, -1);
    assert.equal(formatGear(parsedN.gear), 'N');
  });

  it('should format uninitialized or missing gear states as "--"', () => {
    assert.equal(formatGear(undefined), '--');
    assert.equal(formatGear(null), '--');
  });

  it('should correctly parse pedal inputs (throttle, brake) at offsets 315 & 316', () => {
    const packet = Buffer.alloc(324);
    packet.writeInt32LE(1, 0);

    // Half throttle (128 ~ 50.2%), Full brake (255 ~ 100%)
    packet.writeUInt8(128, 315);
    packet.writeUInt8(255, 316);

    const parsed = parseForzaTelemetryPacket(packet);
    assert.equal(parsed.accel, 128);
    assert.equal(parsed.brake, 255);
  });

  it('should parse binary 232-byte Sled packet format gracefully', () => {
    const packet = Buffer.alloc(232);
    packet.writeInt32LE(1, 0);
    packet.writeFloatLE(4500, 16);
    packet.writeFloatLE(30, 40);

    const parsed = parseForzaTelemetryPacket(packet);
    assert.equal(parsed.isRaceOn, true);
    assert.equal(parsed.currentEngineRpm, 4500);
    assert.equal(parsed.speed, 30);
  });
});
