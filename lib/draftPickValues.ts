const MAX_ROUND = 16;
const ROUND_1_VALUE = 95;
const ROUND_16_VALUE = 10;

/**
 * Calculate the value of a draft pick based on the round number
 * Linear drop from Round 1 (95 points) to Round 16 (10 points)
 */
export function pickValue(round: number): number {
  if (round < 1 || round > MAX_ROUND) {
    throw new Error(`Round out of range. Must be between 1 and ${MAX_ROUND}`);
  }

  // Linear drop from 95 to 10 over 16 rounds
  const step = (ROUND_1_VALUE - ROUND_16_VALUE) / (MAX_ROUND - 1);
  const value = ROUND_1_VALUE - (round - 1) * step;
  
  return Math.round(value * 10) / 10;
}

/**
 * Get the value of a draft pick based on its round
 * This is a wrapper function for backward compatibility
 */
export function getDraftPickValue(round: number): number {
  return pickValue(round)
}

/**
 * Get a human-readable description of a draft pick
 */
export function getDraftPickDescription(year: number, round: number): string {
  const roundSuffix = getRoundSuffix(round)
  return `${year} Round ${round}${roundSuffix}`
}

function getRoundSuffix(round: number): string {
  const lastDigit = round % 10
  const lastTwoDigits = round % 100
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return 'th'
  }
  
  switch (lastDigit) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

