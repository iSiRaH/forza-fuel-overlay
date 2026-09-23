import type { ForzaTelemetryData } from '../../../packages/shared/src/types/telemetry.js';
import { getCarFuelSpecs, type CarFuelSpecs } from '../../../packages/shared/src/utils/carDatabase.js';
import {
  calculateFuelConsumptionStep,
  calculateRemainingTime,
  calculateRemainingDistance,
  clamp,
} from './calculator.js';
import { FUEL_CONFIG } from './config.js';

export interface FuelTrackerState {
  maxFuelCapacityLiters: number;
  currentFuelLiters: number;
  fuelSpentLiters: number;
  engineDisplacementLiters: number;
  fuelRatio: number; // 0.0 to 1.0
  fuelPercentage: number; // 0.0 to 100.0%
  fuelConsumptionRate: number; // L / 100km
  fuelRateLPerHour: number; // L / h
  remainingTimeFormatted: string; // "2h 00m" or "--"
  remainingDistanceKm: number | null; // km or null
  remainingDistanceFormatted: string; // "200 km" or "--"
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
  private fuelEmptyNotified = false;

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
    const fuelPercentage = fuelRatio * 100;

    console.log(`[FUEL] User set tank capacity: ${validCapacity} L`);
    return {
      maxFuelCapacityLiters: validCapacity,
      currentFuelLiters: parseFloat(this.currentFuelLiters.toFixed(2)),
      fuelSpentLiters: parseFloat(this.fuelSpentLiters.toFixed(2)),
      engineDisplacementLiters: this.specs.engineDisplacementLiters,
      fuelRatio: parseFloat(fuelRatio.toFixed(4)),
      fuelPercentage: parseFloat(fuelPercentage.toFixed(1)),
      fuelConsumptionRate: 0,
      fuelRateLPerHour: 0,
      remainingTimeFormatted: '--',
      remainingDistanceKm: null,
      remainingDistanceFormatted: '--',
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
        this.fuelEmptyNotified = false;
        this.lastTimestampMS = null;
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
        fuelRatio: parseFloat(clamp(currentRatio, 0, 1).toFixed(4)),
        fuelPercentage: parseFloat((clamp(currentRatio, 0, 1) * 100).toFixed(1)),
        fuelConsumptionRate: 0,
        fuelRateLPerHour: 0,
        remainingTimeFormatted: '--',
        remainingDistanceKm: null,
        remainingDistanceFormatted: '--',
        carName: this.specs.carName,
      };
    }

    const timestampMS = data.timestampMS ?? Date.now();
    let dtSeconds = 0;

    if (this.lastTimestampMS !== null && timestampMS > this.lastTimestampMS) {
      const diffMs = timestampMS - this.lastTimestampMS;
      const diffSeconds = diffMs / 1000;
      if (diffSeconds > 0 && diffSeconds <= FUEL_CONFIG.MAX_TELEMETRY_GAP_SECONDS) {
        dtSeconds = diffSeconds;
      } else {
        // Gaps > 2 seconds (game pause, telemetry drop, PC lag) consume 0 fuel for this step
        dtSeconds = 0;
      }
    } else {
      // First frame after connect or rebase -> 0 dt
      dtSeconds = 0;
    }
    this.lastTimestampMS = timestampMS;

    const calculation = calculateFuelConsumptionStep({
      speedMps: data.speed ?? 0,
      gear: data.gear ?? 0,
      engineDisplacementLiters: this.specs.engineDisplacementLiters,
      currentRpm: data.currentEngineRpm ?? 0,
      maxRpm: data.engineMaxRpm ?? FUEL_CONFIG.DEFAULT_REDLINE_RPM,
      accelPercent: data.accel ?? 0,
      dtSeconds,
    });

    // Accumulate spent fuel step by step
    this.fuelSpentLiters += calculation.fuelSpentStepLiters;

    // If game packet reports active in-game fuel depletion (fuel > 0 and < 0.999) without custom user capacity override, sync game's ratio.
    // Otherwise, dynamically deplete fuel using engine formula.
    if (
      this.userConfiguredTankCapacity === undefined &&
      data.fuel !== undefined &&
      !isNaN(data.fuel) &&
      data.fuel > 0 &&
      data.fuel < 0.999
    ) {
      this.currentFuelLiters = clamp(data.fuel * effectiveMaxCapacity, 0, effectiveMaxCapacity);
    } else {
      this.currentFuelLiters = clamp(this.currentFuelLiters - calculation.fuelSpentStepLiters, 0, effectiveMaxCapacity);
    }

    // Check fuel empty condition
    if (this.currentFuelLiters <= 0 && !this.fuelEmptyNotified) {
      this.fuelEmptyNotified = true;
    }

    const fuelRatio = effectiveMaxCapacity > 0
      ? clamp(this.currentFuelLiters / effectiveMaxCapacity, 0, 1.0)
      : 1.0;

    const fuelPercentage = fuelRatio * 100;

    // Calculate estimated remaining driving time and distance
    const speedKmH = (data.speed ?? 0) * 3.6;
    const remainingTime = calculateRemainingTime(this.currentFuelLiters, calculation.fuelRateLPerHour);
    const remainingDist = calculateRemainingDistance(remainingTime.hours, speedKmH);

    return {
      maxFuelCapacityLiters: parseFloat(effectiveMaxCapacity.toFixed(1)),
      currentFuelLiters: parseFloat(this.currentFuelLiters.toFixed(2)),
      fuelSpentLiters: parseFloat(this.fuelSpentLiters.toFixed(2)),
      engineDisplacementLiters: this.specs.engineDisplacementLiters,
      fuelRatio: parseFloat(fuelRatio.toFixed(4)),
      fuelPercentage: parseFloat(fuelPercentage.toFixed(1)),
      fuelConsumptionRate: calculation.consumptionLPer100Km,
      fuelRateLPerHour: calculation.fuelRateLPerHour,
      remainingTimeFormatted: remainingTime.formatted,
      remainingDistanceKm: remainingDist.distanceKm !== null ? parseFloat(remainingDist.distanceKm.toFixed(1)) : null,
      remainingDistanceFormatted: remainingDist.formatted,
      carName: this.specs.carName,
    };
  }

  /**
   * Refills fuel tank back to max capacity (or specified ratio 0.0 - 1.0).
   */
  public refill(ratio = 1.0): FuelTrackerState {
    const targetRatio = clamp(ratio, 0, 1.0);
    const maxCap = this.specs.maxFuelCapacityLiters;
    this.currentFuelLiters = maxCap * targetRatio;
    this.fuelSpentLiters = 0; // Reset spent fuel counter on refill
    this.fuelEmptyNotified = false;
    this.lastTimestampMS = null; // Rebase timestamp baseline after refill to prevent spikes
    console.log(`[FUEL] Refilled to ${this.currentFuelLiters} L (${targetRatio * 100}%)`);

    return {
      maxFuelCapacityLiters: parseFloat(maxCap.toFixed(1)),
      currentFuelLiters: parseFloat(this.currentFuelLiters.toFixed(2)),
      fuelSpentLiters: 0,
      engineDisplacementLiters: this.specs.engineDisplacementLiters,
      fuelRatio: targetRatio,
      fuelPercentage: parseFloat((targetRatio * 100).toFixed(1)),
      fuelConsumptionRate: 0,
      fuelRateLPerHour: 0,
      remainingTimeFormatted: '--',
      remainingDistanceKm: null,
      remainingDistanceFormatted: '--',
      carName: this.specs.carName,
    };
  }

  public getSpecs(): CarFuelSpecs {
    return this.specs;
  }
}
