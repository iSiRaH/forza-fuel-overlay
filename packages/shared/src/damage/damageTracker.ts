export interface DamageTrackerState {
  engineDamagePct: number;
  transmissionDamagePct: number;
  suspensionDamagePct: number;
  brakesDamagePct: number;
  tiresDamagePct: number;
  tireWearFL: number;
  tireWearFR: number;
  tireWearRL: number;
  tireWearRR: number;
  steeringDamagePct: number;
  chassisDamagePct: number;
}

export interface TelemetryDamageInput {
  timestampMS?: number;
  isRaceOn?: boolean;
  carOrdinal?: number;
  speed?: number; // m/s
  accelerationX?: number;
  accelerationY?: number;
  accelerationZ?: number;
  yaw?: number;
  pitch?: number;
  roll?: number;
  positionX?: number;
  positionY?: number;
  positionZ?: number;
  suspensionTravelFL?: number;
  suspensionTravelFR?: number;
  suspensionTravelRL?: number;
  suspensionTravelRR?: number;
  wheelSlipFL?: number;
  wheelSlipFR?: number;
  wheelSlipRL?: number;
  wheelSlipRR?: number;
  tireTempFL?: number; // In Celsius
  tireTempFR?: number;
  tireTempRL?: number;
  tireTempRR?: number;
  brake?: number; // 0-255
  accel?: number; // 0-255
  clutch?: number; // 0-255
  gear?: number;
  steer?: number; // -127 to 127
  currentEngineRpm?: number;
  engineMaxRpm?: number;
  distanceTraveled?: number;
  // Native wear from extended packet (FM2023 331-byte) if available
  nativeWearFL?: number;
  nativeWearFR?: number;
  nativeWearRL?: number;
  nativeWearRR?: number;
  // Direct damage percentages if injected or already available
  engineDamagePct?: number;
  transmissionDamagePct?: number;
  suspensionDamagePct?: number;
  brakesDamagePct?: number;
  tiresDamagePct?: number;
  steeringDamagePct?: number;
  chassisDamagePct?: number;
}

/**
 * Real-time damage and tire wear tracking engine for Forza telemetry.
 * Simulates mechanical degradation and collision damage based on high-frequency (60Hz) physics telemetry:
 * - 4-corner tire wear from rolling distance, wheel slip ratios, and overheating
 * - Brake wear from high-speed heavy braking energy dissipation
 * - Suspension damage from travel bottoming-out spikes and curb impacts
 * - Steering alignment damage from lateral impact shocks and curb hits
 * - Transmission damage from aggressive un-clutched shift shocks and clutch slipping
 * - Engine damage from over-revs (money-shifts) and sustained redline load
 * - Chassis / Aero / Body damage from 3D acceleration G-shock impacts
 */
export class DamageTracker {
  private state: DamageTrackerState = {
    engineDamagePct: 0,
    transmissionDamagePct: 0,
    suspensionDamagePct: 0,
    brakesDamagePct: 0,
    tiresDamagePct: 0,
    tireWearFL: 0,
    tireWearFR: 0,
    tireWearRL: 0,
    tireWearRR: 0,
    steeringDamagePct: 0,
    chassisDamagePct: 0,
  };

  private lastTimestampMS = 0;
  private lastDistance = 0;
  private lastCarOrdinal: number | null = null;
  private lastAccelX = 0;
  private lastAccelY = 0;
  private lastAccelZ = 0;
  private lastGear: number | undefined;

  // Respawn & teleportation tracking
  private hasLastPosition = false;
  private lastPositionX = 0;
  private lastPositionY = 0;
  private lastPositionZ = 0;
  private lastIsRaceOn: boolean | null = null;
  private wasInverted = false;

  /**
   * Resets all component wear and damage back to 0% (Healthy).
   * Automatically invoked when a car is respawned or repaired in-game.
   */
  public reset(): void {
    this.state = {
      engineDamagePct: 0,
      transmissionDamagePct: 0,
      suspensionDamagePct: 0,
      brakesDamagePct: 0,
      tiresDamagePct: 0,
      tireWearFL: 0,
      tireWearFR: 0,
      tireWearRL: 0,
      tireWearRR: 0,
      steeringDamagePct: 0,
      chassisDamagePct: 0,
    };
    this.lastTimestampMS = 0;
    this.lastDistance = 0;
    this.lastAccelX = 0;
    this.lastAccelY = 0;
    this.lastAccelZ = 0;
    this.lastGear = undefined;
    this.hasLastPosition = false;
    this.wasInverted = false;
  }

  /**
   * Processes a telemetry frame and returns updated component damage percentages.
   */
  public processTelemetry(input: TelemetryDamageInput): DamageTrackerState {
    const timestampMS = input.timestampMS ?? 0;
    const isRaceOn = input.isRaceOn ?? true;
    const carOrdinal = input.carOrdinal ?? 0;
    const speed = Math.max(0, input.speed ?? 0);
    const distance = Math.max(0, input.distanceTraveled ?? 0);

    // 1. Detect Car Switch
    if (this.lastCarOrdinal !== null && carOrdinal !== 0 && carOrdinal !== this.lastCarOrdinal) {
      this.reset();
    }
    this.lastCarOrdinal = carOrdinal;

    // 2. Detect In-Game Car Respawn / Reset Car Position
    // A: Position Teleportation (car instantly moved to track spawn point)
    if (
      this.hasLastPosition &&
      input.positionX !== undefined &&
      input.positionY !== undefined &&
      input.positionZ !== undefined
    ) {
      const dx = input.positionX - this.lastPositionX;
      const dy = input.positionY - this.lastPositionY;
      const dz = input.positionZ - this.lastPositionZ;
      const distJump = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const maxPossibleDistInDt = Math.max(speed, 6) * 0.05 + 2.5;

      // When the car teleports > 2.5 meters in a single frame while stationary or nearly stopped
      if (distJump > 2.5 && (distJump > maxPossibleDistInDt || speed < 3.0)) {
        this.reset();
        this.lastPositionX = input.positionX;
        this.lastPositionY = input.positionY;
        this.lastPositionZ = input.positionZ;
        this.hasLastPosition = true;
        this.lastIsRaceOn = isRaceOn;
        return { ...this.state };
      }
      this.lastPositionX = input.positionX;
      this.lastPositionY = input.positionY;
      this.lastPositionZ = input.positionZ;
    } else if (
      input.positionX !== undefined &&
      input.positionY !== undefined &&
      input.positionZ !== undefined
    ) {
      this.lastPositionX = input.positionX;
      this.lastPositionY = input.positionY;
      this.lastPositionZ = input.positionZ;
      this.hasLastPosition = true;
    }

    // B: Pause Menu "Reset Car Position" (Transition from pause menu back into game with car placed stationary)
    if (this.lastIsRaceOn === false && isRaceOn === true) {
      if (speed < 0.5 && (input.accel ?? 0) === 0 && (input.brake ?? 0) === 0) {
        this.reset();
        this.lastIsRaceOn = isRaceOn;
        return { ...this.state };
      }
    }
    this.lastIsRaceOn = isRaceOn;

    // C: Vehicle Rollover / Inversion Respawn (Car was upside down and game respawned it upright)
    const roll = Math.abs(input.roll ?? 0);
    const pitch = Math.abs(input.pitch ?? 0);
    if (this.wasInverted && roll < 0.25 && pitch < 0.25 && speed < 1.5) {
      this.reset();
      this.wasInverted = false;
      return { ...this.state };
    }
    this.wasInverted = roll > 0.8 || pitch > 0.8;

    // 3. Detect Rewind / Restart
    if (this.lastTimestampMS > 0 && timestampMS > 0) {
      if (timestampMS < this.lastTimestampMS - 800 || (this.lastDistance > 50 && distance < 10)) {
        // Player rewound or restarted the race
        if (distance < 10) {
          this.reset();
        } else {
          // Scale back damage on rewind
          const rewindFactor = 0.80;
          this.state.tiresDamagePct *= rewindFactor;
          this.state.tireWearFL *= rewindFactor;
          this.state.tireWearFR *= rewindFactor;
          this.state.tireWearRL *= rewindFactor;
          this.state.tireWearRR *= rewindFactor;
          this.state.chassisDamagePct *= rewindFactor;
          this.state.steeringDamagePct *= rewindFactor;
          this.state.brakesDamagePct *= rewindFactor;
          this.state.suspensionDamagePct *= rewindFactor;
        }
      }
    }

    // 4. Compute Delta Time (seconds)
    let dt = 0.016; // default ~60Hz
    if (this.lastTimestampMS > 0 && timestampMS > this.lastTimestampMS) {
      dt = Math.min(0.2, (timestampMS - this.lastTimestampMS) / 1000);
    }
    this.lastTimestampMS = timestampMS;

    const deltaDist = this.lastDistance > 0 && distance >= this.lastDistance ? distance - this.lastDistance : speed * dt;
    this.lastDistance = distance;

    // Acceleration deltas (m/s^2) for G-shock detection
    const ax = input.accelerationX ?? 0;
    const ay = input.accelerationY ?? 0;
    const az = input.accelerationZ ?? 0;
    const dAx = ax - this.lastAccelX;
    const dAy = ay - this.lastAccelY;
    const dAz = az - this.lastAccelZ;
    this.lastAccelX = ax;
    this.lastAccelY = ay;
    this.lastAccelZ = az;

    const shockMagnitudeG = Math.sqrt(dAx * dAx + dAy * dAy + dAz * dAz) / 9.81;

    // If game has direct damage overrides (e.g. from synthetic fixture or native packet):
    if (input.engineDamagePct !== undefined) this.state.engineDamagePct = input.engineDamagePct;
    if (input.transmissionDamagePct !== undefined) this.state.transmissionDamagePct = input.transmissionDamagePct;
    if (input.suspensionDamagePct !== undefined) this.state.suspensionDamagePct = input.suspensionDamagePct;
    if (input.brakesDamagePct !== undefined) this.state.brakesDamagePct = input.brakesDamagePct;
    if (input.steeringDamagePct !== undefined) this.state.steeringDamagePct = input.steeringDamagePct;
    if (input.chassisDamagePct !== undefined) this.state.chassisDamagePct = input.chassisDamagePct;

    // Only accumulate dynamic damage when race is actively on
    if (isRaceOn) {
      // ----------------------------------------------------------------------
      // A. TIRE WEAR MODEL
      // ----------------------------------------------------------------------
      if (input.nativeWearFL !== undefined && input.nativeWearFL >= 0) {
        this.state.tireWearFL = input.nativeWearFL <= 1.0 ? input.nativeWearFL * 100 : input.nativeWearFL;
        this.state.tireWearFR = (input.nativeWearFR ?? input.nativeWearFL) <= 1.0 ? (input.nativeWearFR ?? input.nativeWearFL) * 100 : (input.nativeWearFR ?? input.nativeWearFL);
        this.state.tireWearRL = (input.nativeWearRL ?? input.nativeWearFL) <= 1.0 ? (input.nativeWearRL ?? input.nativeWearFL) * 100 : (input.nativeWearRL ?? input.nativeWearFL);
        this.state.tireWearRR = (input.nativeWearRR ?? input.nativeWearFL) <= 1.0 ? (input.nativeWearRR ?? input.nativeWearFL) * 100 : (input.nativeWearRR ?? input.nativeWearFL);
      } else {
        // Base rolling wear per meter: ~0.0001% per meter (~10% per 100 km)
        const baseRollingWear = Math.min(0.05, deltaDist * 0.0001);

        const corners = [
          { key: 'tireWearFL' as const, slip: Math.abs(input.wheelSlipFL ?? 0), temp: input.tireTempFL ?? 95 },
          { key: 'tireWearFR' as const, slip: Math.abs(input.wheelSlipFR ?? 0), temp: input.tireTempFR ?? 95 },
          { key: 'tireWearRL' as const, slip: Math.abs(input.wheelSlipRL ?? 0), temp: input.tireTempRL ?? 95 },
          { key: 'tireWearRR' as const, slip: Math.abs(input.wheelSlipRR ?? 0), temp: input.tireTempRR ?? 95 },
        ];

        for (const corner of corners) {
          // Slip wear: wear increases quadratically when slip exceeds threshold
          const excessSlip = Math.max(0, corner.slip - 0.08);
          const slipWear = excessSlip * Math.min(speed, 60) * 0.04 * dt;

          // Thermal multiplier: tires above 105°C wear significantly faster
          const thermalMult = 1.0 + Math.max(0, (corner.temp - 105) / 25);

          const addedWear = (baseRollingWear + slipWear) * thermalMult;
          this.state[corner.key] = Math.min(100, this.state[corner.key] + addedWear);
        }
      }

      this.state.tiresDamagePct = Math.max(
        this.state.tireWearFL,
        this.state.tireWearFR,
        this.state.tireWearRL,
        this.state.tireWearRR
      );

      // ----------------------------------------------------------------------
      // B. BRAKES DAMAGE MODEL
      // ----------------------------------------------------------------------
      if (input.brakesDamagePct === undefined) {
        const brakeRaw = input.brake ?? 0;
        if (brakeRaw > 25 && speed > 3) {
          const brakeNormalized = brakeRaw / 255;
          const brakingEnergy = brakeNormalized * brakeNormalized * (speed / 25) * 0.08 * dt;
          this.state.brakesDamagePct = Math.min(100, this.state.brakesDamagePct + brakingEnergy);
        }
      }

      // ----------------------------------------------------------------------
      // C. SUSPENSION DAMAGE MODEL
      // ----------------------------------------------------------------------
      if (input.suspensionDamagePct === undefined) {
        const travels = [
          input.suspensionTravelFL ?? 0,
          input.suspensionTravelFR ?? 0,
          input.suspensionTravelRL ?? 0,
          input.suspensionTravelRR ?? 0,
        ];
        const maxTravel = Math.max(...travels);
        // Bottoming out when travel approaches or exceeds 0.90
        if (maxTravel > 0.90) {
          const bottomingSeverity = ((maxTravel - 0.90) / 0.10) * Math.min(speed / 15, 2.0) * 0.35 * dt;
          this.state.suspensionDamagePct = Math.min(100, this.state.suspensionDamagePct + bottomingSeverity);
        }

        // Vertical curb / jump strike shock
        if (Math.abs(dAy) > 12) {
          const curbHitDamage = (Math.abs(dAy) - 12) * 0.035;
          this.state.suspensionDamagePct = Math.min(100, this.state.suspensionDamagePct + curbHitDamage);
        }
      }

      // ----------------------------------------------------------------------
      // D. STEERING DAMAGE MODEL
      // ----------------------------------------------------------------------
      if (input.steeringDamagePct === undefined) {
        const steerInput = Math.abs(input.steer ?? 0);
        // Impact while cornering or lateral impact
        if (shockMagnitudeG > 3.5) {
          if (steerInput > 15 || Math.abs(dAx / 9.81) > 2.0) {
            const steerShockDamage = (shockMagnitudeG - 3.5) * 1.2;
            this.state.steeringDamagePct = Math.min(100, this.state.steeringDamagePct + steerShockDamage);
          }
        }
        // Front suspension imbalance causing alignment pull
        const travelDiff = Math.abs((input.suspensionTravelFL ?? 0) - (input.suspensionTravelFR ?? 0));
        if (travelDiff > 0.35 && speed > 20) {
          this.state.steeringDamagePct = Math.min(100, this.state.steeringDamagePct + 0.03 * dt);
        }
      }

      // ----------------------------------------------------------------------
      // E. TRANSMISSION & DRIVELINE DAMAGE MODEL
      // ----------------------------------------------------------------------
      if (input.transmissionDamagePct === undefined) {
        const currentGear = input.gear;
        const currentRpm = input.currentEngineRpm ?? 0;
        const maxRpm = input.engineMaxRpm ?? 7000;
        const accelRaw = input.accel ?? 0;
        const clutchRaw = input.clutch ?? 0;

        // Shift shock detection
        if (this.lastGear !== undefined && currentGear !== undefined && currentGear !== this.lastGear) {
          // Unclutched / aggressive shift at redline
          if (currentRpm > maxRpm * 0.88 && accelRaw > 180 && clutchRaw < 40) {
            this.state.transmissionDamagePct = Math.min(100, this.state.transmissionDamagePct + 0.12);
          }
          // Money-shift / over-rev on downshift
          if (currentRpm > maxRpm) {
            this.state.transmissionDamagePct = Math.min(100, this.state.transmissionDamagePct + 1.2);
          }
        }
        this.lastGear = currentGear;

        // Clutch slipping under high torque
        if (clutchRaw > 25 && clutchRaw < 220 && accelRaw > 150 && speed > 5) {
          this.state.transmissionDamagePct = Math.min(100, this.state.transmissionDamagePct + 0.05 * dt);
        }
      }

      // ----------------------------------------------------------------------
      // F. ENGINE DAMAGE MODEL
      // ----------------------------------------------------------------------
      if (input.engineDamagePct === undefined) {
        const currentRpm = input.currentEngineRpm ?? 0;
        const maxRpm = input.engineMaxRpm ?? 7000;
        // Over-revving beyond redline
        if (maxRpm > 0 && currentRpm > maxRpm * 1.02) {
          const overRevSeverity = (currentRpm - maxRpm * 1.02) / (maxRpm * 0.15);
          this.state.engineDamagePct = Math.min(100, this.state.engineDamagePct + overRevSeverity * 1.5 * dt);
        }
        // Severe front collision into engine bay
        if (dAz < -5.5 * 9.81) {
          const frontImpact = (Math.abs(dAz / 9.81) - 5.5) * 1.5;
          this.state.engineDamagePct = Math.min(100, this.state.engineDamagePct + frontImpact);
        }
        // Sustained redline stress
        if (maxRpm > 0 && currentRpm > maxRpm * 0.98 && (input.accel ?? 0) > 230) {
          this.state.engineDamagePct = Math.min(100, this.state.engineDamagePct + 0.012 * dt);
        }
      }

      // ----------------------------------------------------------------------
      // G. CHASSIS / AERO / BODY DAMAGE MODEL
      // ----------------------------------------------------------------------
      if (input.chassisDamagePct === undefined) {
        if (shockMagnitudeG > 3.0) {
          let impactAdd = 0;
          if (shockMagnitudeG > 8.0) {
            impactAdd = (shockMagnitudeG - 8.0) * 2.5 + 6.0; // Heavy crash
          } else if (shockMagnitudeG > 5.0) {
            impactAdd = (shockMagnitudeG - 5.0) * 1.2 + 1.5; // Moderate hit
          } else {
            impactAdd = (shockMagnitudeG - 3.0) * 0.6; // Minor tap
          }
          this.state.chassisDamagePct = Math.min(100, this.state.chassisDamagePct + impactAdd);
        }
      }
    }

    // Clean rounded output
    return {
      engineDamagePct: Math.round(this.state.engineDamagePct * 10) / 10,
      transmissionDamagePct: Math.round(this.state.transmissionDamagePct * 10) / 10,
      suspensionDamagePct: Math.round(this.state.suspensionDamagePct * 10) / 10,
      brakesDamagePct: Math.round(this.state.brakesDamagePct * 10) / 10,
      tiresDamagePct: Math.round(this.state.tiresDamagePct * 10) / 10,
      tireWearFL: Math.round(this.state.tireWearFL * 10) / 10,
      tireWearFR: Math.round(this.state.tireWearFR * 10) / 10,
      tireWearRL: Math.round(this.state.tireWearRL * 10) / 10,
      tireWearRR: Math.round(this.state.tireWearRR * 10) / 10,
      steeringDamagePct: Math.round(this.state.steeringDamagePct * 10) / 10,
      chassisDamagePct: Math.round(this.state.chassisDamagePct * 10) / 10,
    };
  }
}
