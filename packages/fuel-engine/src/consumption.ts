import type { ForzaTelemetryData } from '../../../packages/shared/src/types/telemetry.js';
import { getCarFuelSpecs, type CarFuelSpecs } from '../../../packages/shared/src/utils/carDatabase.js';
import { calculateFuelConsumptionStep } from './calculator.js';

export interface FuelTrackerState {
  maxFuelCapacityLiters: number;
  currentFuelLiters: number;
  fuelSpentLiters: number;
  engineDisplacementLiters: number;
  fuelRatio: number; // 0.0 to 1.0
  fuelConsumptionRate: number; // L / 100km
  carName?: string | undefined;
}

export class FuelTracker {
  private specs: CarFuelSpecs;
  private currentCarOrdinal?: number | undefined;
  private currentCarClass?: number | undefined;
  private fuelSpentLiters = 0;
  private currentFuelLiters = 60;
  private lastTimestampMS: number | null = null;
  private userConfiguredTankCapacity?: number | undefined;
  private isPausedManually = false;

  constructor(initialCarOrdinal?: number, initialCarClass?: number, initialPowerHp?: number) {
    this.currentCarOrdinal = initialCarOrdinal;
    this.currentCarClass = initialCarClass;
    this.specs = getCarFuelSpecs(initialCarOrdinal, initialCarClass, initialPowerHp);
    this.currentFuelLiters = this.specs.maxFuelCapacityLiters;
  }

  /**
   * Allows the user to configure a custom fuel tank size (in 5 L steps, minimum 5 L).
   */
  public setTankCapacity(capacityLiters: number): FuelTrackerState {
    const validCapacity = Math.max(5, Math.round(capacityLiters / 5) * 5);
    this.userConfiguredTankCapacity = validCapacity;
    this.specs.maxFuelCapacityLiters = validCapacity;
    
    // Ensure current fuel does not exceed new max capacity
    this.currentFuelLiters = Math.max(0, Math.min(validCapacity, this.currentFuelLiters));
    
    const fuelRatio = validCapacity > 0 ? this.currentFuelLiters / validCapacity : 1.0;
    
    console.log(`[FUEL] User set tank capacity: ${validCapacity} L`);
    return {
      maxFuelCapacityLiters: validCapacity,
      currentFuelLiters: parseFloat(this.currentFuelLiters.toFixed(2)),
      fuelSpentLiters: parseFloat(this.fuelSpentLiters.toFixed(2)),
      engineDisplacementLiters: this.specs.engineDisplacementLiters,
      fuelRatio: parseFloat(fuelRatio.toFixed(4)),
      fuelConsumptionRate: 0,
      carName: this.specs.carName,
    };
  }

  /**
   * Sets manual pause state for fuel calculation.
   */
  public setPaused(paused: boolean): void {
    if (this.isPausedManually !== paused) {
      this.isPausedManually = paused;
      console.log(`[FUEL] Fuel calculation manual pause state: ${paused ? 'PAUSED' : 'RUNNING'}`);
      if (!paused) {
        // Reset timestamp baseline when resuming to prevent time jump consumption spike
        this.lastTimestampMS = null;
        console.log('[FUEL] Telemetry baseline reset on resume');
      }
    }
  }

  public isPaused(): boolean {
    return this.isPausedManually;
  }

  /**
   * Updates car specs if car ordinal or class changes.
   */
  public updateCarSpecs(carOrdinal?: number, carClass?: number, powerHp?: number): CarFuelSpecs {
    // Ignore invalid/undefined car Ordinal resets during telemetry stream
    if (carOrdinal !== undefined && carOrdinal > 0 && carOrdinal !== this.currentCarOrdinal) {
      const isInitialSet = this.currentCarOrdinal === undefined;
      this.currentCarOrdinal = carOrdinal;
      this.currentCarClass = carClass;
      this.specs = getCarFuelSpecs(carOrdinal, carClass, powerHp);

      if (this.userConfiguredTankCapacity !== undefined) {
        this.specs.maxFuelCapacityLiters = this.userConfiguredTankCapacity;
      }

      // Only reset fuel state if changing mid-session from an existing car to a new car
      if (!isInitialSet) {
        this.currentFuelLiters = this.specs.maxFuelCapacityLiters;
        this.fuelSpentLiters = 0;
      }
    } else if (this.userConfiguredTankCapacity !== undefined) {
      this.specs.maxFuelCapacityLiters = this.userConfiguredTankCapacity;
    }
    return this.specs;
  }

  /**
   * Process incoming telemetry packet and update fuel spent & remaining fuel.
   */
  public processTelemetry(data: Partial<ForzaTelemetryData>): FuelTrackerState {
    const carOrdinal = data.carOrdinal;
    const carClass = data.carClass;
    const powerHp = data.power;

    this.updateCarSpecs(carOrdinal, carClass, powerHp);

    const effectiveMaxCapacity = this.specs.maxFuelCapacityLiters;
    const isGamePaused = data.isRaceOn === false;
    const isPaused = this.isPausedManually || isGamePaused;

    // Handle paused state: freeze fuel values and reset telemetry timestamp baseline
    if (isPaused) {
      this.lastTimestampMS = null;
      const currentRatio = effectiveMaxCapacity > 0 ? this.currentFuelLiters / effectiveMaxCapacity : 1.0;
      return {
        maxFuelCapacityLiters: parseFloat(effectiveMaxCapacity.toFixed(1)),
        currentFuelLiters: parseFloat(Math.max(0, this.currentFuelLiters).toFixed(2)),
        fuelSpentLiters: parseFloat(this.fuelSpentLiters.toFixed(2)),
        engineDisplacementLiters: this.specs.engineDisplacementLiters,
        fuelRatio: parseFloat(Math.max(0, Math.min(1, currentRatio)).toFixed(4)),
        fuelConsumptionRate: 0,
        carName: this.specs.carName,
      };
    }

    const timestampMS = data.timestampMS ?? Date.now();
    let dtSeconds = 0.033; // Default 30fps step (~33ms)

    if (this.lastTimestampMS !== null && timestampMS > this.lastTimestampMS) {
      const diffMs = timestampMS - this.lastTimestampMS;
      if (diffMs < 5000) {
        dtSeconds = diffMs / 1000;
      }
    }
    this.lastTimestampMS = timestampMS;

    const calculation = calculateFuelConsumptionStep({
      speedMps: data.speed ?? 0,
      gear: data.gear ?? 0,
      engineDisplacementLiters: this.specs.engineDisplacementLiters,
      currentRpm: data.currentEngineRpm ?? 1000,
      maxRpm: data.engineMaxRpm ?? 8000,
      accelPercent: data.accel ?? 0,
      dtSeconds,
    });

    // Accumulate spent fuel step by step
    this.fuelSpentLiters += calculation.fuelSpentStepLiters;

    // If game packet reports active in-game fuel depletion (fuel > 0 and < 0.999) without custom user capacity override, use game's ratio.
    // Otherwise, dynamically deplete fuel using physics-based step calculation.
    if (
      this.userConfiguredTankCapacity === undefined &&
      data.fuel !== undefined &&
      !isNaN(data.fuel) &&
      data.fuel > 0 &&
      data.fuel < 0.999
    ) {
      this.currentFuelLiters = Math.max(0, Math.min(effectiveMaxCapacity, data.fuel * effectiveMaxCapacity));
    } else {
      this.currentFuelLiters = Math.max(0, Math.min(effectiveMaxCapacity, this.currentFuelLiters - calculation.fuelSpentStepLiters));
    }

    const fuelRatio = effectiveMaxCapacity > 0
      ? Math.max(0, Math.min(1.0, this.currentFuelLiters / effectiveMaxCapacity))
      : 1.0;

    return {
      maxFuelCapacityLiters: parseFloat(effectiveMaxCapacity.toFixed(1)),
      currentFuelLiters: parseFloat(this.currentFuelLiters.toFixed(2)),
      fuelSpentLiters: parseFloat(this.fuelSpentLiters.toFixed(2)),
      engineDisplacementLiters: this.specs.engineDisplacementLiters,
      fuelRatio: parseFloat(fuelRatio.toFixed(4)),
      fuelConsumptionRate: calculation.consumptionLPer100Km,
      carName: this.specs.carName,
    };
  }

  /**
   * Refills fuel tank back to max capacity (or specified ratio 0.0 - 1.0).
   */
  public refill(ratio = 1.0): FuelTrackerState {
    const targetRatio = Math.max(0, Math.min(1.0, ratio));
    const maxCap = this.specs.maxFuelCapacityLiters;
    this.currentFuelLiters = maxCap * targetRatio;
    this.fuelSpentLiters = 0; // Reset spent fuel counter on refill
    console.log(`[FUEL] Refilled to ${this.currentFuelLiters} L (${targetRatio * 100}%)`);

    return {
      maxFuelCapacityLiters: parseFloat(maxCap.toFixed(1)),
      currentFuelLiters: parseFloat(this.currentFuelLiters.toFixed(2)),
      fuelSpentLiters: 0,
      engineDisplacementLiters: this.specs.engineDisplacementLiters,
      fuelRatio: targetRatio,
      fuelConsumptionRate: 0,
      carName: this.specs.carName,
    };
  }

  public getSpecs(): CarFuelSpecs {
    return this.specs;
  }
}
