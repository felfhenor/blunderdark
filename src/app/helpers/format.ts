/**
 * Format a multiplier as a percentage string.
 * e.g., 1.25 → "+25%", 0.90 → "-10%", 1.0 → "+0%"
 */
export function formatMultiplierAsPercentage(multiplier: number): string {
  const percentage = Math.round((multiplier - 1.0) * 100);
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage}%`;
}

/**
 * Get the daisyUI badge class for a creature tier.
 */
export function formatTierBadgeClass(tier: number): string {
  if (tier >= 4) return 'badge-error';
  if (tier === 3) return 'badge-warning';
  if (tier === 2) return 'badge-info';
  return 'badge-outline';
}
