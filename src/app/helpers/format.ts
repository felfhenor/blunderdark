/**
 * Format a multiplier as a percentage string.
 * e.g., 1.25 → "+25%", 0.90 → "-10%", 1.0 → "+0%"
 */
export function formatMultiplierAsPercentage(multiplier: number): string {
  const percentage = Math.round((multiplier - 1.0) * 100);
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage}%`;
}
