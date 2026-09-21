/**
 * Decodes raw FH6 gear value into standard numeric gear representation:
 * - 0 = Reverse (R)
 * - -1 = Neutral (N)
 * - 1..10 = 1st, 2nd, ... 10th gear
 */
export function decodeGear(rawGear: number): number {
  if (rawGear === 0) {
    return 0; // Reverse
  }
  if (rawGear === -1 || rawGear === 255 || rawGear === 15) {
    return -1; // Neutral
  }
  return rawGear;
}

/**
 * Formats numeric gear value into clean UI display string:
 * - 0 -> "R"
 * - -1 -> "N"
 * - 1..10 -> "1", "2", "3", ...
 * - null / undefined -> "--"
 */
export function formatGear(gear: number | null | undefined): string {
  if (gear === undefined || gear === null) {
    return '--';
  }
  if (gear === 0) {
    return 'R';
  }
  if (gear === -1) {
    return 'N';
  }
  return String(gear);
}
