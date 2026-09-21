# Connecting Forza Horizon 6 (2026) Telemetry to Forza Fuel Overlay 🏎️⛽

This guide provides step-by-step instructions on how to configure **Forza Horizon 6 (2026)** (as well as FH5 and Forza Motorsport) to transmit real-time telemetry data over UDP, parse the data stream in Node.js/TypeScript, and output telemetry metrics to the console log.

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Game Configuration (In-Game Settings)](#game-configuration-in-game-settings)
3. [UDP Telemetry Packet Formats](#udp-telemetry-packet-formats)
4. [Listening to UDP Data in Node.js](#listening-to-udp-data-in-nodejs)
5. [Integrating with `logTelemetryData`](#integrating-with-logtelemetrydata)
6. [Testing & Troubleshooting](#testing--troubleshooting)

---

## 1. Overview

Forza Horizon 6 features the **Data Out** telemetry engine that broadcasts real-time car physics, engine performance, wheel telemetry, fuel level, and lap stats over **UDP packets**. 

```
┌────────────────────────┐      UDP (Port 5300)      ┌──────────────────────────────┐
│ Forza Horizon 6 Engine │ ────────────────────────> │  Apps / Telemetry Service    │
│  (PC / Xbox Console)   │  "Dash" Packet (323B)     │  (Node.js dgram + Parser)    │
└────────────────────────┘                           └──────────────┬───────────────┘
                                                                    │
                                                                    ▼
                                                         `logTelemetryData(...)`
                                                                    │
                                                                    ▼
                                                             Console Output
```

---

## 2. Game Configuration (In-Game Settings)

Follow these steps inside **Forza Horizon 6 (2026)**:

1. Open **Settings** from the main menu or pause screen.
2. Navigate to **HUD & Gameplay**.
3. Scroll down to the **Data Out** section:
   - **Data Out**: Set to **`ON`**.
   - **Data Out IP Address**: 
     - If playing on the **same PC**: set to `127.0.0.1`.
     - If playing on **Xbox** or another PC on the local network: set to your machine's local IP address (e.g., `192.168.1.100`).
   - **Data Out IP Port**: Set to **`5300`** (or your designated port).
   - **Data Out Structure**: Set to **`Dash`** (recommended for full metrics).

---

## 3. UDP Telemetry Packet Formats

Forza outputs two binary packet layouts:

- **Sled Format (232 bytes)**: Basic car physics (position, velocity vectors, RPM, acceleration, tire slip).
- **Dash Format (311/323/331 bytes)**: Full telemetry including fuel level, lap metrics, gear, race status, and tire temperatures.

### Key Offset Structure (Dash Format):

| Offset (Bytes) | Data Type | Field | Description |
|---|---|---|---|
| `0` | `s32` (int32) | `isRaceOn` | 0 when paused/in menu, 1 when driving/racing |
| `4` | `u32` (uint32) | `timestampMS` | Game timestamp in milliseconds |
| `8` | `f32` (float32) | `engineMaxRpm` | Maximum engine RPM |
| `16` | `f32` (float32) | `currentEngineRpm` | Current engine RPM |
| `32, 36, 40` | `f32` (float32) | `vx, vy, vz` | Velocity vector in m/s (speed = magnitude) |
| `276` | `f32` (float32) | `fuel` | Remaining fuel ratio (0.0 to 1.0) |
| `280` | `f32` (float32) | `distanceTraveled` | Distance traveled in meters |
| `284` | `f32` (float32) | `bestLap` | Best lap time in seconds |
| `288` | `f32` (float32) | `lastLap` | Last lap time in seconds |
| `292` | `f32` (float32) | `currentLap` | Current lap time in seconds |
| `296` | `f32` (float32) | `currentRaceTime` | Current total race time in seconds |
| `300` | `u16` (uint16) | `lapNumber` | Current lap number |
| `302` | `u8` (uint8) | `racePosition` | Position in race |
| `303` | `u8` (uint8) | `accel` | Accelerator pedal (0-255) |
| `304` | `u8` (uint8) | `brake` | Brake pedal (0-255) |
| `307` | `u8` (uint8) | `rawGear` | Gear (0=R, 1=N, 2=1st, 3=2nd, etc.) |

---

## 4. Listening to UDP Data in Node.js

Create a UDP socket server using Node.js `dgram` module to ingest the binary stream:

```typescript
import dgram from 'node:dgram';
import { logTelemetryData } from './telemetryLogger.js';
import type { ForzaTelemetryData } from '../../../packages/shared/src/types/telemetry.js';

const PORT = 5300;
const HOST = '0.0.0.0';

const server = dgram.createSocket('udp4');

function parseForzaDashPacket(buffer: Buffer): Partial<ForzaTelemetryData> {
  if (buffer.length < 232) {
    throw new Error('Packet size too small to be Forza telemetry');
  }

  const vx = buffer.length >= 44 ? buffer.readFloatLE(32) : 0;
  const vy = buffer.length >= 44 ? buffer.readFloatLE(36) : 0;
  const vz = buffer.length >= 44 ? buffer.readFloatLE(40) : 0;
  const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);

  const rawGear = buffer.length >= 308 ? buffer.readUInt8(307) : 1;
  const gear = rawGear === 0 ? -1 : rawGear === 1 ? 0 : rawGear - 1;

  return {
    isRaceOn: buffer.readInt32LE(0) === 1,
    timestampMS: buffer.readUInt32LE(4),
    engineMaxRpm: buffer.readFloatLE(8),
    engineIdleRpm: buffer.readFloatLE(12),
    currentEngineRpm: buffer.readFloatLE(16),
    speed,
    fuel: buffer.length >= 280 ? buffer.readFloatLE(276) : 1.0,
    distanceTraveled: buffer.length >= 284 ? buffer.readFloatLE(280) : 0,
    bestLap: buffer.length >= 288 ? buffer.readFloatLE(284) : 0,
    lastLap: buffer.length >= 292 ? buffer.readFloatLE(288) : 0,
    currentLap: buffer.length >= 296 ? buffer.readFloatLE(292) : 0,
    currentRaceTime: buffer.length >= 300 ? buffer.readFloatLE(296) : 0,
    lapNumber: buffer.length >= 302 ? buffer.readUInt16LE(300) : 0,
    racePosition: buffer.length >= 303 ? buffer.readUInt8(302) : 0,
    accel: buffer.length >= 304 ? buffer.readUInt8(303) : 0,
    brake: buffer.length >= 305 ? buffer.readUInt8(304) : 0,
    gear,
  };
}

server.on('message', (msg: Buffer) => {
  try {
    const telemetry = parseForzaDashPacket(msg);
    
    // Log to console (formatted or raw JSON)
    logTelemetryData(telemetry, { formatted: true });
  } catch (err) {
    console.error('Failed to parse incoming telemetry packet:', err);
  }
});

server.on('listening', () => {
  const address = server.address();
  console.log(`📡 Telemetry UDP server listening on ${address.address}:${address.port}`);
});

server.bind(PORT, HOST);
```

---

## 5. Integrating with `logTelemetryData`

You can customize how telemetry data is logged to the console:

### JSON Logging (Default):
```typescript
logTelemetryData(telemetry);
// Output: [TELEMETRY] {"isRaceOn":true,"timestampMS":123456,"lapNumber":2,"currentRaceTime":133.62,"speedKmH":199.8,"currentEngineRpm":6500,"gear":4,"fuelPct":75,"accel":240,"brake":0}
```

### Formatted String Logging:
```typescript
logTelemetryData(telemetry, { formatted: true, prefix: 'FORZA-LIVE' });
// Output: [FORZA-LIVE] Lap: 2 | Time: 133.62s | Speed: 199.8 km/h | RPM: 6500/8000 | Gear: 4 | Fuel: 75.0%
```

---

## 6. Testing & Troubleshooting

### Simulating UDP Packets (No Game Required)

You can send mock UDP packets to test your logger setup locally:

```typescript
import dgram from 'node:dgram';

const client = dgram.createSocket('udp4');
const mockPacket = Buffer.alloc(323);

// Set isRaceOn = 1
mockPacket.writeInt32LE(1, 0);
// Set currentEngineRpm = 6200
mockPacket.writeFloatLE(6200, 16);
// Set speed = 50 m/s (~180 km/h)
mockPacket.writeFloatLE(50, 244);
// Set fuel = 0.85 (85%)
mockPacket.writeFloatLE(0.85, 280);

client.send(mockPacket, 5300, '127.0.0.1', (err) => {
  if (err) console.error(err);
  else console.log('Mock telemetry packet sent!');
  client.close();
});
```

### Firewall Checklist
- If running on PC and playing on Xbox: Ensure port `5300/UDP` is allowed through Windows Firewall or your system firewall.
  ```bash
  # Windows PowerShell (Run as Administrator)
  New-NetFirewallRule -DisplayName "Forza Telemetry UDP 5300" -Direction Inbound -Protocol UDP -LocalPort 5300 -Action Allow
  ```
