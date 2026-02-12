import type { CombatResult, CombatUnit } from '@interfaces';

/**
 * Roll a d20 (1-20) using the provided RNG function.
 * RNG should return a value in [0, 1).
 */
export function rollD20(rng: () => number): number {
  return Math.floor(rng() * 20) + 1;
}

/**
 * Determine if an attack hits.
 * - Natural 20 always hits.
 * - Natural 1 always misses.
 * - Otherwise: roll + attacker.attack >= defender.defense + 10
 */
export function doesAttackHit(
  roll: number,
  attacker: CombatUnit,
  defender: CombatUnit,
): boolean {
  if (roll === 20) return true;
  if (roll === 1) return false;
  return roll + attacker.attack >= defender.defense + 10;
}

/**
 * Calculate damage on a hit.
 * damage = attacker.attack - defender.defense, minimum 1 on a hit.
 */
export function calculateDamage(
  attacker: CombatUnit,
  defender: CombatUnit,
): number {
  return Math.max(1, attacker.attack - defender.defense);
}

/**
 * Resolve a single combat attack. Pure function — caller applies results.
 *
 * @param attacker - The attacking unit
 * @param defender - The defending unit
 * @param rng - RNG function returning [0, 1) for testability
 * @returns CombatResult with hit, roll, damage, defenderHp, defenderDead
 */
export function resolveCombat(
  attacker: CombatUnit,
  defender: CombatUnit,
  rng: () => number,
): CombatResult {
  const roll = rollD20(rng);
  const hit = doesAttackHit(roll, attacker, defender);
  const damage = hit ? calculateDamage(attacker, defender) : 0;
  const defenderHp = Math.max(0, defender.hp - damage);
  const defenderDead = defenderHp === 0;

  return { hit, roll, damage, defenderHp, defenderDead };
}
