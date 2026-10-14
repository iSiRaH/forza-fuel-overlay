# Simulation Damage Tracking Overlay — Architecture & Implementation Plan 🏎️💥

## 1. Executive Summary

This plan outlines the architecture, data pipeline, user experience, and technical implementation for introducing a **dedicated, independent Simulation Damage Tracking Overlay Window** to the `forza-fuel-overlay` ecosystem.

Currently, the application features an Electron-based overlay focused on real-time fuel metrics (`apps/overlay`) backed by a UDP telemetry receiver (`apps/telemetry`) and calculation engines (`packages/fuel-engine`, `packages/shared`). 

The new **Simulation Damage Tracking Overlay** will operate as a **second transparent, borderless, always-on-top desktop window** capable of running side-by-side with the fuel overlay. It provides sim drivers with instant, non-intrusive diagnostics on **tire degradation & temperatures**, **powertrain stress (engine & gearbox over-rev/wear)**, **suspension travel bottoming**, **aero downforce loss**, and **directional collision impacts**.

---

## 2. System Architecture

The following diagram illustrates how the damage overlay integrates with the existing PNPM monorepo architecture:

```
┌────────────────────────────────────────────────────────┐
│      Forza Horizon 6 / FM2023 / FH5 (UDP Data Out)     │
└───────────────────────────┬────────────────────────────┘
                            │ UDP Packets (Port 5300)
                            ▼
┌────────────────────────────────────────────────────────┐
│               apps/telemetry Service                   │
│  ┌───────────────────────┐  ┌───────────────────────┐  │
│  │ Enhanced UDP Parser   │  │ packages/damage-engine│  │
│  │ (Tire, Susp, Accel)   │─>│ (Wear, Stress, G-Force│  │
│  └───────────────────────┘  └───────────────────────┘  │
│                            │                           │
│                            ▼                           │
│              Telemetry WebSocket Server                │
│                 (ws://localhost:8080)                  │
└───────────────┬─────────────────────────┬──────────────┘
                │                         │
  WebSocket     │                         │ WebSocket
  JSON Stream   │                         │ JSON Stream
                ▼                         ▼
┌─────────────────────────┐     ┌────────────────────────┐
│  Electron Window 1      │     │  Electron Window 2     │
│  Fuel Overlay           │     │  Damage Overlay        │
│  (Route: `/#/` or fuel) │     │  (Route: `/#/damage`)  │
│  Position: Bottom-Left  │     │  Position: Top-Right   │
└─────────────────────────┘     └────────────────────────┘
```

---

## 3. Core Features of the Damage Overlay

### 3.1. 4-Corner Tire Telemetry & Wear Analysis
* **Live Tire Wear (FL, FR, RL, RR)**:
  * Direct ingestion of native wear metrics for FM2023 331-byte packets (offsets 323–330).
  * Algorithmic wear simulation for FH5/FH6 based on cumulative tire slip ratio, slip angles, surface rumble, lateral/longitudinal acceleration stress, and road surface friction.
  * Visual wear thresholds:
    * 🟢 **Optimal**: 0% – 25% wear (Green)
    * 🟡 **Degraded**: 25% – 50% wear (Yellow)
    * 🟠 **Warning**: 50% – 75% wear (Orange)
    * 🔴 **Critical / Blown Risk**: 75% – 100% wear (Pulsing Red)
* **Tire Thermal Operating Window**:
  * Surface temperature gauges for all 4 wheels.
  * Temperature states: Cold (<75°C), Optimal (85°C – 105°C), Overheating (>115°C), Blistering (>130°C).
* **Stint & Remaining Laps Prediction**:
  * Real-time calculation of wear rate per lap (% wear / lap).
  * Estimated laps remaining until tire performance degrades below 75% or reaches failure.

### 3.2. Powertrain & Mechanical Health
* **Engine Abuse & Over-Rev Tracker**:
  * Detection of missed shifts, aggressive downshifts ("money-shift"), and prolonged redline abuse.
  * Thermal engine stress tracking from continuous maximum load.
* **Transmission & Clutch Wear**:
  * Detection of clutch slippage under high throttle inputs.
  * Bad gear change shock tracking.

### 3.3. Suspension & Chassis Stress
* **Suspension Compression & Bottom-Out**:
  * Real-time monitoring of normalized suspension travel (FL, FR, RL, RR).
  * High-frequency detection of bottoming-out spikes and curb impacts causing handling instability.

### 3.4. Collision Detection & Aero Damage
* **G-Force Impact Shock Sensor**:
  * Instantaneous 3-axis acceleration delta calculation ($\Delta G = |\vec{a}_t - \vec{a}_{t-1}|$).
  * Threshold-based collision detection (>3.5G = Minor Tap, >6.0G = Moderate Crash, >10.0G = Heavy Collision).
  * Directional impact tagging (Front, Rear, Left, Right).
* **Estimated Aero Integrity**:
  * Front and rear aerodynamic downforce loss estimation proportional to severe collision history.

---

## 4. Multi-Window Electron Architecture

### 4.1. Window Independence & Configuration
The Electron main process (`apps/overlay/electron/main.js`) will manage two separate `BrowserWindow` instances:

| Property | Fuel Window (`mainWindow`) | Damage Window (`damageWindow`) |
|---|---|---|
| **Default Dimensions** | 760 × 640 (Full) / 480 × 140 (Minimal) | 420 × 540 (Full) / 280 × 160 (HUD) |
| **Default Position** | Bottom-Left / Center (`x: 40, y: 380`) | Top-Right (`x: screenWidth - 460, y: 40`) |
| **Route / Hash** | `http://localhost:5173/#/fuel` | `http://localhost:5173/#/damage` |
| **Always On Top** | `true` (`'screen-saver'` level) | `true` (`'screen-saver'` level) |
| **Transparency** | `frame: false, transparent: true` | `frame: false, transparent: true` |
| **Pass-Through Clicks** | Dynamic via IPC (`setIgnoreMouseEvents`) | Dynamic via IPC (`setIgnoreMouseEvents`) |
| **Hotkeys** | `M` (Minimal Mode) | `D` (Minimal HUD) / `Ctrl+Shift+D` (Toggle Show/Hide) |

### 4.2. Routing & Multi-Page Strategy
To maintain a unified build without complex multi-bundle configurations:
* Use **hash-based routing** (`window.location.hash` or lightweight router).
* In development:
  * Fuel Window: loads `http://localhost:5173/#/fuel`
  * Damage Window: loads `http://localhost:5173/#/damage`
* In production:
  * Fuel Window: `mainWindow.loadFile('dist/index.html', { hash: 'fuel' })`
  * Damage Window: `damageWindow.loadFile('dist/index.html', { hash: 'damage' })`

### 4.3. IPC Controls & Shared Telemetry
* Both windows connect directly to `ws://localhost:8080`. The WebSocket server already supports multiple concurrent clients (`clients.add(ws)`).
* Electron IPC channels:
  * `toggle-damage-overlay`: Show / hide damage window.
  * `reset-window-position`: Restore default HUD positions.
  * `save-window-bounds`: Persist custom user positions to disk.

---

## 5. New Monorepo Package: `packages/damage-engine`

Similar to `packages/fuel-engine`, a dedicated package will isolate domain calculations:

```text
packages/damage-engine/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts               # Public exports
    ├── damageTracker.ts       # Central damage aggregator
    ├── tires/
    │   ├── tireWearModel.ts   # Slip-based wear & FM2023 ingestion
    │   └── tireThermal.ts    # Thermal window categorization
    ├── powertrain/
    │   ├── engineStress.ts    # Over-rev, redline & thermal wear
    │   └── transmission.ts    # Clutch slip & shift shocks
    ├── chassis/
    │   ├── suspension.ts      # Bottoming out & travel bounds
    │   └── impactDetector.ts  # Delta-G collision detector
    └── types.ts               # Damage domain types
```

### 5.1. Data Models (`packages/shared/src/types/damage.ts`)

```typescript
export interface WheelCornerData {
  wearPercent: number;          // 0.0 - 100.0%
  temperatureC: number;        // Surface temp in Celsius
  tempZone: 'cold' | 'optimal' | 'hot' | 'blistering';
  suspensionTravelPct: number; // 0.0 - 100.0%
  isBottomedOut: boolean;
  slipRatio: number;
}

export interface PowertrainDamageData {
  engineHealthPct: number;     // 100.0% to 0.0%
  gearboxHealthPct: number;    // 100.0% to 0.0%
  clutchWearPct: number;       // 0.0% to 100.0%
  isOverRevving: boolean;
  moneyShiftCount: number;
}

export interface ImpactEvent {
  timestamp: number;
  severityG: number;
  direction: 'front' | 'rear' | 'left' | 'right';
  impactZone: string;
}

export interface SimulationDamageState {
  tires: {
    fl: WheelCornerData;
    fr: WheelCornerData;
    rl: WheelCornerData;
    rr: WheelCornerData;
    estimatedLapsRemaining: number | null;
    highestWearWheel: 'FL' | 'FR' | 'RL' | 'RR';
  };
  powertrain: PowertrainDamageData;
  aero: {
    frontWingIntegrityPct: number;
    rearWingIntegrityPct: number;
    totalDownforceLossPct: number;
  };
  chassis: {
    suspensionStressPct: number;
    recentImpacts: ImpactEvent[];
  };
  isPitStopRecommended: boolean;
}
```

---

## 6. UI / UX Design & Components

The Damage Overlay UI will follow the high-performance glassmorphism dark aesthetic:

### 6.1. Visual Layout
* **Header Bar**:
  * Title: `SIMULATION DAMAGE TRACKER` with status badge (`LIVE 60Hz` / `DEMO`).
  * Quick Actions: Drag handle, Reset Damage button (`REPAIR`), Click-Through lock, Minimize/Expand button.
* **Car Silhouette (Chassis View)**:
  * Central top-down vector wireframe of a GT car.
  * Four corner cards positioned around wheels:
    * Wheel identifier tag (`FL`, `FR`, `RL`, `RR`).
    * Color-coded radial or bar progress for wear (0% to 100%).
    * Temperature numeric readouts with thermal badge (`94°C OPTIMAL`).
    * Live suspension stroke gauge.
* **Powertrain Health Strip**:
  * Dual horizontal linear gauges:
    * `ENGINE`: 98% (Smooth green to crimson gradient).
    * `GEARBOX`: 95%.
    * `AERO INTEGRITY`: 91%.
* **Live Impact Warning Banner**:
  * Dynamic banner that slides in on impact: `⚠️ IMPACT DETECTED: 5.2G FRONT-RIGHT (AERO -8%)`.
* **Strategy Callout**:
  * `TIRE STINT RECOMMENDATION: PIT IN 3 LAPS (FL 78% CRITICAL)`.

### 6.2. Minimal HUD Mode
* For drivers with limited screen space, pressing hotkey `D` shrinks the window into an ultra-compact HUD bar:
  * Compact 4-wheel horizontal pill: `[FL: 12% | FR: 18% | RL: 8% | RR: 11%]`.
  * Engine health percentage pill: `[ENG: 100%]`.

---

## 7. Implementation Phases & Milestones

### Phase 1: Shared Damage Engine & Telemetry Parsing
1. **Extend UDP offsets** in `apps/telemetry/src/parser/offsets.ts`:
   - Normalized suspension travel (`68-80`).
   - Wheel slip ratios (`84-96`).
   - Tire temps (`268-280`).
   - Trailing tire wear bytes for FM2023 (`323-330`).
2. **Implement `packages/damage-engine`**:
   - Create wear simulation algorithms and thermal classifiers.
   - Implement G-shock impact detector.
3. **Integrate into `apps/telemetry`**:
   - Parse packet fields and execute `DamageTracker.processTelemetry(...)`.
   - Broadcast updated payload via WebSocket.
4. **Update `MockTelemetryGenerator`**:
   - Add simulated tire wear, curb bounces, and collision spikes for dev testing.

### Phase 2: Electron Multi-Window Infrastructure
1. **Refactor `apps/overlay/electron/main.js`**:
   - Introduce `createDamageWindow()` alongside `createMainWindow()`.
   - Implement window position memory and multi-window lifecycle handling.
   - Support independent click-through (`setIgnoreMouseEvents`).
2. **Setup Routing in `apps/overlay`**:
   - Add route detection in `main.tsx` / `App.tsx` via URL hash (`#damage` vs `#fuel`).
   - Support standalone dev preview: `pnpm --filter overlay dev` with both routes accessible in browser tabs.

### Phase 3: Damage UI & Component Development
1. **Build Core Damage Components** (`apps/overlay/src/components/damage/`):
   - `DamageOverlay.tsx`: Main container & layout.
   - `ChassisWireframe.tsx`: Interactive car silhouette with 4-corner wheel cards.
   - `TireCornerCard.tsx`: Wear percentage, thermal gauge, slip indicator.
   - `PowertrainHealth.tsx`: Engine, transmission, and aero bars.
   - `ImpactAlertBanner.tsx`: Slide-in G-shock collision notification.
   - `MinimalDamageHUD.tsx`: Compact gameplay HUD.
2. **Styling & Micro-Animations** (`apps/overlay/src/styles/damage.css`):
   - Sleek dark theme, pulsing critical wear alerts, smooth gauge animations.

### Phase 4: Integration, Testing & Validation
1. **Mock Testing**: Run `pnpm dev:mock` to verify both Fuel and Damage overlays render smoothly at 60 FPS without frame drops.
2. **Game Telemetry Testing**: Validate live packet capture against Forza Horizon 6 / Forza Motorsport UDP broadcast.
3. **Packaging & Build**: Ensure `pnpm package:win` and `pnpm package:linux` bundle both overlay windows into the final executable.

---

## 8. Summary of Files to Add & Modify

```text
├── packages/
│   ├── shared/src/types/damage.ts         [NEW] Shared damage data types
│   ├── shared/src/index.ts                [MODIFIED] Export damage types
│   └── damage-engine/                     [NEW] Core damage calculation package
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── damageTracker.ts
│           ├── tires/tireWearModel.ts
│           ├── chassis/impactDetector.ts
│           └── powertrain/engineStress.ts
├── apps/
│   ├── telemetry/
│   │   ├── src/parser/offsets.ts          [MODIFIED] Add suspension, slip & wear offsets
│   │   ├── src/parser/telemetryParser.ts  [MODIFIED] Attach damage engine processing
│   │   ├── src/mock/mockGenerator.ts      [MODIFIED] Simulate tire wear & impacts
│   │   └── src/index.ts                   [MODIFIED] Handle REPAIR/RESET_DAMAGE WS commands
│   └── overlay/
│       ├── electron/main.js               [MODIFIED] Multi-window Electron management
│       ├── src/App.tsx                    [MODIFIED] Route dispatching (#fuel vs #damage)
│       ├── src/hooks/useDamageTelemetry.ts[NEW] Dedicated damage hook
│       └── src/components/damage/         [NEW] Damage overlay UI components
│           ├── DamageOverlay.tsx
│           ├── ChassisWireframe.tsx
│           ├── TireCornerCard.tsx
│           ├── PowertrainHealth.tsx
│           └── MinimalDamageHUD.tsx
└── SIMULATION_DAMAGE_OVERLAY_PLAN.md      [NEW] This comprehensive document
```
