export interface CarFuelSpecs {
  maxFuelCapacityLiters: number;
  engineDisplacementLiters: number;
  carName?: string;
}

/**
 * Database of known Forza car ordinals and their respective specs.
 */
const CAR_DATABASE: Record<number, CarFuelSpecs> = {
  // Example car models
  1024: { maxFuelCapacityLiters: 68, engineDisplacementLiters: 3.8, carName: 'Porsche 911 GT3 RS' },
  2048: { maxFuelCapacityLiters: 80, engineDisplacementLiters: 5.2, carName: 'Lamborghini Huracán Performante' },
  3072: { maxFuelCapacityLiters: 90, engineDisplacementLiters: 8.0, carName: 'Bugatti Chiron' },
  4096: { maxFuelCapacityLiters: 55, engineDisplacementLiters: 2.0, carName: 'Honda Civic Type R' },
  5120: { maxFuelCapacityLiters: 65, engineDisplacementLiters: 2.9, carName: 'Alfa Romeo Giulia Quadrifoglio' },
  6144: { maxFuelCapacityLiters: 75, engineDisplacementLiters: 6.2, carName: 'Chevrolet Corvette Z06' },
  7168: { maxFuelCapacityLiters: 100, engineDisplacementLiters: 4.0, carName: 'Ferrari 488 GTE (Race Car)' },
};

/**
 * Resolves full fuel capacity and engine displacement for a car model.
 * If car ordinal is unknown, calculates realistic estimates based on car class and peak power.
 */
export function getCarFuelSpecs(
  carOrdinal?: number,
  carClass?: number,
  powerHp?: number
): CarFuelSpecs {
  if (carOrdinal !== undefined && CAR_DATABASE[carOrdinal]) {
    return CAR_DATABASE[carOrdinal];
  }

  // Fallback estimates based on car class (0=D, 1=C, 2=B, 3=A, 4=S1, 5=S2, 6=X)
  let maxFuelCapacityLiters = 60; // Default 60L tank
  let engineDisplacementLiters = 3.0; // Default 3.0L engine

  if (carClass !== undefined) {
    switch (carClass) {
      case 0: // D Class (Compact / Economy)
        maxFuelCapacityLiters = 45;
        engineDisplacementLiters = 1.6;
        break;
      case 1: // C Class (Sport Hatch / Light Sport)
        maxFuelCapacityLiters = 50;
        engineDisplacementLiters = 2.0;
        break;
      case 2: // B Class (Sport Sedan / Coupe)
        maxFuelCapacityLiters = 58;
        engineDisplacementLiters = 2.5;
        break;
      case 3: // A Class (High Performance)
        maxFuelCapacityLiters = 65;
        engineDisplacementLiters = 3.5;
        break;
      case 4: // S1 Class (Supercar)
        maxFuelCapacityLiters = 75;
        engineDisplacementLiters = 4.2;
        break;
      case 5: // S2 Class (Hypercar)
        maxFuelCapacityLiters = 88;
        engineDisplacementLiters = 5.2;
        break;
      case 6: // X Class (Extreme / Race Spec)
        maxFuelCapacityLiters = 100;
        engineDisplacementLiters = 6.0;
        break;
    }
  }

  // Refine engine displacement estimate based on HP if available
  if (powerHp && powerHp > 0) {
    if (powerHp > 1000) {
      engineDisplacementLiters = Math.max(engineDisplacementLiters, 6.5);
      maxFuelCapacityLiters = Math.max(maxFuelCapacityLiters, 90);
    } else if (powerHp > 700) {
      engineDisplacementLiters = Math.max(engineDisplacementLiters, 4.8);
      maxFuelCapacityLiters = Math.max(maxFuelCapacityLiters, 80);
    } else if (powerHp > 450) {
      engineDisplacementLiters = Math.max(engineDisplacementLiters, 3.8);
      maxFuelCapacityLiters = Math.max(maxFuelCapacityLiters, 70);
    }
  }

  return {
    maxFuelCapacityLiters,
    engineDisplacementLiters,
  };
}
