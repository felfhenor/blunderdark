import type { CombatUnit } from '@interfaces';
import { describe, expect, it } from 'vitest';

import {
  combatCalculateDamage,
  combatDoesAttackHit,
  combatResolve,
  combatRollD20,
} from '@helpers/combat';

// --- Helpers ---

/** Create an RNG that returns a fixed value in [0, 1). */
function fixedRng(value: number): () => number {
  return () => value;
}

/** RNG value that produces a specific d20 roll: (roll - 1) / 20 */
function rngForRoll(roll: number): () => number {
  return fixedRng((roll - 1) / 20);
}

function makeUnit(overrides: Partial<CombatUnit> = {}): CombatUnit {
  return {
    attack: 10,
    defense: 8,
    hp: 30,
    maxHp: 30,
    ...overrides,
  };
}

// --- Tests ---

describe('combatRollD20', () => {
  it('should return 1 for rng() = 0.0', () => {
    expect(combatRollD20(fixedRng(0.0))).toBe(1);
  });

  it('should return 20 for rng() = 0.95', () => {
    expect(combatRollD20(fixedRng(0.95))).toBe(20);
  });

  it('should return 10 for rng() = 0.45', () => {
    expect(combatRollD20(fixedRng(0.45))).toBe(10);
  });
});

describe('combatDoesAttackHit', () => {
  const attacker = makeUnit({ attack: 10 });
  const defender = makeUnit({ defense: 8 });
  // Threshold: roll + 10 >= 8 + 10 = 18, so roll >= 8

  it('should hit when roll + attack >= defense + 10', () => {
    expect(combatDoesAttackHit(8, attacker, defender)).toBe(true);
  });

  it('should miss when roll + attack < defense + 10', () => {
    expect(combatDoesAttackHit(7, attacker, defender)).toBe(false);
  });

  it('should always hit on natural 20', () => {
    const weakAttacker = makeUnit({ attack: 1 });
    const strongDefender = makeUnit({ defense: 50 });
    expect(combatDoesAttackHit(20, weakAttacker, strongDefender)).toBe(true);
  });

  it('should always miss on natural 1', () => {
    const strongAttacker = makeUnit({ attack: 50 });
    const weakDefender = makeUnit({ defense: 1 });
    expect(combatDoesAttackHit(1, strongAttacker, weakDefender)).toBe(false);
  });

  it('should hit at exactly the threshold', () => {
    // roll(8) + attack(10) = 18 = defense(8) + 10
    expect(combatDoesAttackHit(8, attacker, defender)).toBe(true);
  });

  it('should miss at one below threshold', () => {
    // roll(7) + attack(10) = 17 < defense(8) + 10 = 18
    expect(combatDoesAttackHit(7, attacker, defender)).toBe(false);
  });
});

describe('combatCalculateDamage', () => {
  it('should return attack - defense when attack > defense', () => {
    const attacker = makeUnit({ attack: 15 });
    const defender = makeUnit({ defense: 8 });
    expect(combatCalculateDamage(attacker, defender)).toBe(7);
  });

  it('should return 1 when attack equals defense', () => {
    const attacker = makeUnit({ attack: 10 });
    const defender = makeUnit({ defense: 10 });
    expect(combatCalculateDamage(attacker, defender)).toBe(1);
  });

  it('should return 1 when attack < defense (minimum damage)', () => {
    const attacker = makeUnit({ attack: 5 });
    const defender = makeUnit({ defense: 15 });
    expect(combatCalculateDamage(attacker, defender)).toBe(1);
  });
});

describe('combatResolve', () => {
  it('should return a hit with damage when roll succeeds', () => {
    const attacker = makeUnit({ attack: 12 });
    const defender = makeUnit({ defense: 8, hp: 30, maxHp: 30 });
    // Need roll + 12 >= 8 + 10 = 18, so roll >= 6
    const result = combatResolve(attacker, defender, rngForRoll(10));
    expect(result.hit).toBe(true);
    expect(result.roll).toBe(10);
    expect(result.damage).toBe(4); // 12 - 8
    expect(result.defenderHp).toBe(26); // 30 - 4
    expect(result.defenderDead).toBe(false);
  });

  it('should return a miss with 0 damage when roll fails', () => {
    const attacker = makeUnit({ attack: 10 });
    const defender = makeUnit({ defense: 8, hp: 30, maxHp: 30 });
    // Need roll + 10 >= 18, so roll >= 8. Roll 3 misses.
    const result = combatResolve(attacker, defender, rngForRoll(3));
    expect(result.hit).toBe(false);
    expect(result.roll).toBe(3);
    expect(result.damage).toBe(0);
    expect(result.defenderHp).toBe(30);
    expect(result.defenderDead).toBe(false);
  });

  it('should always hit on natural 20', () => {
    const attacker = makeUnit({ attack: 1 });
    const defender = makeUnit({ defense: 50, hp: 100, maxHp: 100 });
    const result = combatResolve(attacker, defender, rngForRoll(20));
    expect(result.hit).toBe(true);
    expect(result.roll).toBe(20);
    expect(result.damage).toBe(1); // min damage
    expect(result.defenderHp).toBe(99);
    expect(result.defenderDead).toBe(false);
  });

  it('should always miss on natural 1', () => {
    const attacker = makeUnit({ attack: 50 });
    const defender = makeUnit({ defense: 1, hp: 10, maxHp: 10 });
    const result = combatResolve(attacker, defender, rngForRoll(1));
    expect(result.hit).toBe(false);
    expect(result.roll).toBe(1);
    expect(result.damage).toBe(0);
    expect(result.defenderHp).toBe(10);
    expect(result.defenderDead).toBe(false);
  });

  it('should kill defender when damage reduces HP to 0', () => {
    const attacker = makeUnit({ attack: 20 });
    const defender = makeUnit({ defense: 5, hp: 10, maxHp: 30 });
    // damage = 20 - 5 = 15, HP 10 - 15 = 0 (clamped)
    const result = combatResolve(attacker, defender, rngForRoll(20));
    expect(result.hit).toBe(true);
    expect(result.damage).toBe(15);
    expect(result.defenderHp).toBe(0);
    expect(result.defenderDead).toBe(true);
  });

  it('should not let HP go below 0', () => {
    const attacker = makeUnit({ attack: 100 });
    const defender = makeUnit({ defense: 1, hp: 5, maxHp: 30 });
    const result = combatResolve(attacker, defender, rngForRoll(20));
    expect(result.defenderHp).toBe(0);
    expect(result.defenderDead).toBe(true);
  });

  it('should kill defender when damage exactly equals HP', () => {
    const attacker = makeUnit({ attack: 13 });
    const defender = makeUnit({ defense: 8, hp: 5, maxHp: 30 });
    // damage = 13 - 8 = 5, HP 5 - 5 = 0
    const result = combatResolve(attacker, defender, rngForRoll(20));
    expect(result.hit).toBe(true);
    expect(result.damage).toBe(5);
    expect(result.defenderHp).toBe(0);
    expect(result.defenderDead).toBe(true);
  });

  it('should use injectable RNG for deterministic results', () => {
    const attacker = makeUnit({ attack: 10 });
    const defender = makeUnit({ defense: 8, hp: 30, maxHp: 30 });
    const result1 = combatResolve(attacker, defender, rngForRoll(15));
    const result2 = combatResolve(attacker, defender, rngForRoll(15));
    expect(result1).toEqual(result2);
  });
});
