import type { ForzaTelemetryData } from '../../../../packages/shared/src/types/telemetry.js';

export interface MockGeneratorOptions {
  intervalMs?: number;
  onData?: (data: Partial<ForzaTelemetryData>) => void;
}

export class MockTelemetryGenerator {
  private timer: NodeJS.Timeout | null = null;
  private intervalMs: number;
  private onData?: (data: Partial<ForzaTelemetryData>) => void;

  // Simulation state
  private isRaceOn = true;
  private timestampMS = 0;
  private engineMaxRpm = 8500;
  private engineIdleRpm = 1000;
  private currentEngineRpm = 1200;
  private speed = 0; // m/s
  private gear = 1;
  private accel = 200; // 0-255
  private brake = 0; // 0-255
  private clutch = 0;
  private handBrake = 0;
  private steer = 0;
  private fuel = 0.95; // 95% remaining
  private distanceTraveled = 0;
  private bestLap = 88.42; // seconds
  private lastLap = 89.15;
  private currentLap = 0;
  private currentRaceTime = 0;
  private lapNumber = 1;
  private racePosition = 2;
  private carOrdinal = 1024;
  private carClass = 4; // S1 class
  private carPerformanceIndex = 895;

  private isAccelerating = true;
  private steerAngle = 0;

  constructor(options: MockGeneratorOptions = {}) {
    this.intervalMs = options.intervalMs || 33; // ~30 fps simulated stream
    if (options.onData) {
      this.onData = options.onData;
    }
  }

  public start(): void {
    if (this.timer) return;

    console.log('🏎️ Mock Telemetry Generator STARTED (Simulated Data Stream)');
    this.timer = setInterval(() => this.tick(), this.intervalMs);
  }

  private tick(): void {
    const dt = this.intervalMs / 1000;
    this.timestampMS += this.intervalMs;
    this.currentRaceTime += dt;
    this.currentLap += dt;

    // Simulate steering curve
    this.steerAngle += 0.05;
    this.steer = Math.round(Math.sin(this.steerAngle) * 45);

    // Simulate acceleration / gear shifting cycle
    if (this.isAccelerating) {
      this.accel = 240 + Math.floor(Math.random() * 15);
      this.brake = 0;
      this.currentEngineRpm += 150 + Math.random() * 50;

      // Speed increases (m/s)
      this.speed += 0.4 + (this.gear * 0.1);

      // Gear shifts
      if (this.currentEngineRpm >= 8200) {
        if (this.gear < 6) {
          this.gear++;
          this.currentEngineRpm = 5200;
        } else {
          // Reached max speed around 80 m/s (~288 km/h)
          this.isAccelerating = false;
        }
      }
    } else {
      // Braking for corner
      this.accel = 0;
      this.brake = 210 + Math.floor(Math.random() * 30);
      this.currentEngineRpm = Math.max(2200, this.currentEngineRpm - 200);
      this.speed = Math.max(12, this.speed - 0.9);

      if (this.speed <= 25 && this.gear > 2) {
        this.gear--;
      }

      if (this.speed <= 15) {
        this.isAccelerating = true;
      }
    }

    // Distance traveled
    this.distanceTraveled += this.speed * dt;

    // Fuel depletion simulation (approx 0.0001 per tick during heavy load)
    const fuelRate = 0.00003 + (this.currentEngineRpm / 8500) * 0.00005;
    this.fuel = Math.max(0.01, this.fuel - fuelRate);

    // Lap completion simulation (~85 sec lap)
    if (this.currentLap >= 85) {
      this.lastLap = this.currentLap;
      if (this.lastLap < this.bestLap) {
        this.bestLap = this.lastLap;
      }
      this.currentLap = 0;
      this.lapNumber++;
    }

    const data: Partial<ForzaTelemetryData> = {
      isRaceOn: this.isRaceOn,
      timestampMS: this.timestampMS,
      engineMaxRpm: this.engineMaxRpm,
      engineIdleRpm: this.engineIdleRpm,
      currentEngineRpm: Math.round(this.currentEngineRpm),
      speed: parseFloat(this.speed.toFixed(2)),
      power: Math.round(150 + (this.currentEngineRpm / 8500) * 350),
      torque: Math.round(350 + (this.currentEngineRpm / 8500) * 150),
      gear: this.gear,
      accel: this.accel,
      brake: this.brake,
      clutch: this.clutch,
      handBrake: this.handBrake,
      steer: this.steer,
      fuel: parseFloat(this.fuel.toFixed(4)),
      distanceTraveled: Math.round(this.distanceTraveled),
      bestLap: parseFloat(this.bestLap.toFixed(2)),
      lastLap: parseFloat(this.lastLap.toFixed(2)),
      currentLap: parseFloat(this.currentLap.toFixed(2)),
      currentRaceTime: parseFloat(this.currentRaceTime.toFixed(2)),
      lapNumber: this.lapNumber,
      racePosition: this.racePosition,
      carOrdinal: this.carOrdinal,
      carClass: this.carClass,
      carPerformanceIndex: this.carPerformanceIndex,
    };

    if (this.onData) {
      this.onData(data);
    }
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('🛑 Mock Telemetry Generator STOPPED');
    }
  }
}
