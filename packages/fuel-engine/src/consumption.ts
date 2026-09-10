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

  constructor(initialCarOrdinal?: number, initialCarClass?: number, initialPowerHp?: number) {
    this.currentCarOrdinal = initialCarOrdinal;
    this.currentCarClass = initialCarClass;
    this.specs = getCarFuelSpecs(initialCarOrdinal, initialCarClass, initialPowerHp);
    this.currentFuelLiters = this.specs.maxFuelCapacityLiters;
  }

  /**
   * Updates car specs if car ordinal or class changes.
   */
  public updateCarSpecs(carOrdinal?: number, carClass?: number, powerHp?: number): CarFuelSpecs {
    if (
      carOrdinal !== this.currentCarOrdinal ||
      carClass !== this.currentCarClass
    ) {
      this.currentCarOrdinal = carOrdinal;
      this.currentCarClass = carClass;
      this.specs = getCarFuelSpecs(carOrdinal, carClass, powerHp);
      // Reset fuel to full for new car
      this.currentFuelLiters = this.specs.maxFuelCapacityLiters;
      this.fuelSpentLiters = 0;
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

    // If game packet has explicit telemetry fuel ratio (0.0 - 1.0), use it to adjust current fuel
    if (data.fuel !== undefined && !isNaN(data.fuel) && data.fuel >= 0 && data.fuel <= 1.0) {
      const telemetryFuelLiters = data.fuel * this.specs.maxFuelCapacityLiters;

      // Track spent fuel based on difference or calculated step
      this.fuelSpentLiters += calculation.fuelSpentStepLiters;
      this.currentFuelLiters = Math.max(0, Math.min(this.specs.maxFuelCapacityLiters, telemetryFuelLiters));
    } else {
      // Calculate depleted fuel step by step
      this.fuelSpentLiters += calculation.fuelSpentStepLiters;
      this.currentFuelLiters = Math.max(0, this.currentFuelLiters - calculation.fuelSpentStepLiters);
    }

    const fuelRatio = this.specs.maxFuelCapacityLiters > 0
      ? this.currentFuelLiters / this.specs.maxFuelCapacityLiters
      : 1.0;

    return {
      maxFuelCapacityLiters: parseFloat(this.specs.maxFuelCapacityLiters.toFixed(1)),
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
    this.currentFuelLiters = this.specs.maxFuelCapacityLiters * targetRatio;
    this.fuelSpentLiters = 0; // Reset spent fuel counter on refill

    return {
      maxFuelCapacityLiters: parseFloat(this.specs.maxFuelCapacityLiters.toFixed(1)),
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
