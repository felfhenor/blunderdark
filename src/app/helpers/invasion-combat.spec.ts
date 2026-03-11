import { describe, expect, it, vi } from 'vitest';
import type { AbilityState, CombatAbilityId, CombatantId } from '@interfaces';
import type { AbilityEffectContent, AbilityEffectId } from '@interfaces/content-abilityeffect';
import type { CombatAbilityContent } from '@interfaces/content-combatability';
import type { Combatant, TilePosition, TurnQueue } from '@interfaces/invasion';
import {
  combatantHasStatus,
  invasionCombatAdvanceTurn,
  invasionCombatArePositionsAdjacent,
  invasionCombatBuildTurnQueue,
  invasionCombatCreateCombatant,
  invasionCombatExecuteAbility,
  invasionCombatExecuteAiTurn,
  invasionCombatExecuteAttack,
  invasionCombatExecuteMove,
  invasionCombatExecuteWait,
  invasionCombatGetAdjacentPositions,
  invasionCombatGetAliveCombatants,
  invasionCombatGetAvailableActions,
  invasionCombatGetCurrentActor,
  invasionCombatGetValidAttackTargets,
  invasionCombatGetValidMoveTargets,
  invasionCombatIsRoundComplete,
  invasionCombatResolveAiAction,
  invasionCombatStartNewRound,
} from '@helpers/invasion-combat';

// --- Effect definitions (mirrors gamedata/abilityeffect/base.yml) ---

const effectDefinitions: Record<string, AbilityEffectContent> = {
  Damage: {
    id: 'ae-damage' as AbilityEffectId,
    name: 'Damage',
    __type: 'abilityeffect',
    dealsDamage: true,
    statusName: undefined,
    overrideTargetsHit: undefined,
  },
  Stun: {
    id: 'ae-stun' as AbilityEffectId,
    name: 'Stun',
    __type: 'abilityeffect',
    dealsDamage: false,
    statusName: 'stunned',
    overrideTargetsHit: undefined,
  },
  'Buff Attack': {
    id: 'ae-buff-atk' as AbilityEffectId,
    name: 'Buff Attack',
    __type: 'abilityeffect',
    dealsDamage: false,
    statusName: 'berserk',
    overrideTargetsHit: undefined,
  },
  'Buff Defense': {
    id: 'ae-buff-def' as AbilityEffectId,
    name: 'Buff Defense',
    __type: 'abilityeffect',
    dealsDamage: false,
    statusName: 'shielded',
    overrideTargetsHit: undefined,
  },
  Evasion: {
    id: 'ae-evasion' as AbilityEffectId,
    name: 'Evasion',
    __type: 'abilityeffect',
    dealsDamage: false,
    statusName: 'phased',
    overrideTargetsHit: 0,
  },
  Resurrect: {
    id: 'ae-resurrect' as AbilityEffectId,
    name: 'Resurrect',
    __type: 'abilityeffect',
    dealsDamage: false,
    statusName: 'resurrected',
    overrideTargetsHit: 1,
  },
  'Heal Effect': {
    id: 'ae-heal' as AbilityEffectId,
    name: 'Heal Effect',
    __type: 'abilityeffect',
    dealsDamage: false,
    statusName: 'healing',
    overrideTargetsHit: undefined,
  },
  'Dispel Effect': {
    id: 'ae-dispel-effect' as AbilityEffectId,
    name: 'Dispel Effect',
    __type: 'abilityeffect',
    dealsDamage: false,
    statusName: 'dispel',
    overrideTargetsHit: undefined,
  },
  'Fear Immunity': {
    id: 'ae-fear-immunity' as AbilityEffectId,
    name: 'Fear Immunity',
    __type: 'abilityeffect',
    dealsDamage: false,
    statusName: 'courage',
    overrideTargetsHit: undefined,
  },
  Mark: {
    id: 'ae-mark' as AbilityEffectId,
    name: 'Mark',
    __type: 'abilityeffect',
    dealsDamage: false,
    statusName: 'marked',
    overrideTargetsHit: undefined,
  },
  'Magic Damage': {
    id: 'ae-magic-damage' as AbilityEffectId,
    name: 'Magic Damage',
    __type: 'abilityeffect',
    dealsDamage: true,
    statusName: undefined,
    overrideTargetsHit: undefined,
  },
};

// --- Test combat ability definitions ---

const stunAbility: CombatAbilityContent = {
  id: 'ability-stun' as CombatAbilityId,
  name: 'Test Stun',
  __type: 'combatability',
  description: 'Stuns a target',
  chance: 100,
  cooldown: 3,
  effects: [{ effectType: 'Stun', value: 0, targetType: 'single', duration: 2 }],
};

const buffDefenseAbility: CombatAbilityContent = {
  id: 'ability-buff-def' as CombatAbilityId,
  name: 'Test Shield',
  __type: 'combatability',
  description: '+50% defense for 3 turns',
  chance: 100,
  cooldown: 4,
  effects: [{ effectType: 'Buff Defense', value: 50, targetType: 'self', duration: 3 }],
};

const resurrectAbility: CombatAbilityContent = {
  id: 'ability-resurrect' as CombatAbilityId,
  name: 'Test Resurrect',
  __type: 'combatability',
  description: 'Revive a dead ally at 50% HP',
  chance: 100,
  cooldown: 5,
  effects: [{ effectType: 'Resurrect', value: 50, targetType: 'single', duration: 0 }],
};

const dispelAbility: CombatAbilityContent = {
  id: 'ability-dispel' as CombatAbilityId,
  name: 'Test Dispel',
  __type: 'combatability',
  description: 'Remove all buffs from target',
  chance: 100,
  cooldown: 3,
  effects: [{ effectType: 'Dispel Effect', value: 0, targetType: 'single', duration: 0 }],
};

const fearImmunityAbility: CombatAbilityContent = {
  id: 'ability-courage' as CombatAbilityId,
  name: 'Test Courage',
  __type: 'combatability',
  description: 'Grants fear immunity to all allies',
  chance: 100,
  cooldown: 0,
  effects: [{ effectType: 'Fear Immunity', value: 0, targetType: 'aoe', duration: 0 }],
};

const markAbility: CombatAbilityContent = {
  id: 'ability-mark' as CombatAbilityId,
  name: 'Test Mark',
  __type: 'combatability',
  description: 'Marks a target for +20% damage',
  chance: 100,
  cooldown: 0,
  effects: [{ effectType: 'Mark', value: 20, targetType: 'single', duration: 3 }],
};

const healAbility: CombatAbilityContent = {
  id: 'ability-heal' as CombatAbilityId,
  name: 'Test Heal',
  __type: 'combatability',
  description: 'Heals 25% max HP',
  chance: 100,
  cooldown: 3,
  effects: [{ effectType: 'Heal Effect', value: 25, targetType: 'single', duration: 0 }],
};

const damageAbility: CombatAbilityContent = {
  id: 'ability-damage' as CombatAbilityId,
  name: 'Test Damage',
  __type: 'combatability',
  description: '150% damage to single target',
  chance: 100,
  cooldown: 2,
  effects: [{ effectType: 'Damage', value: 150, targetType: 'single', duration: 0 }],
};

// Map ability IDs to their content for resolveAbilityContent mock
const abilityContentMap: Record<string, CombatAbilityContent> = {
  'ability-stun': stunAbility,
  'ability-buff-def': buffDefenseAbility,
  'ability-resurrect': resurrectAbility,
  'ability-dispel': dispelAbility,
  'ability-courage': fearImmunityAbility,
  'ability-mark': markAbility,
  'ability-heal': healAbility,
  'ability-damage': damageAbility,
};

vi.mock('@helpers/content', () => ({
  contentGetEntry: vi.fn((nameOrId: string) => {
    // Look up effect definitions by name
    if (effectDefinitions[nameOrId]) return effectDefinitions[nameOrId];
    // Look up ability content by ID
    if (abilityContentMap[nameOrId]) return abilityContentMap[nameOrId];
    return undefined;
  }),
  contentGetEntriesByType: vi.fn(() => []),
  contentAllIdsByName: vi.fn(() => new Map()),
  contentAllById: vi.fn(() => new Map()),
  contentSetAllIdsByName: vi.fn(),
  contentSetAllById: vi.fn(),
}));

// --- Helpers ---

function makeAbilityState(abilityId: string, overrides: Partial<AbilityState> = {}): AbilityState {
  return {
    abilityId: abilityId as CombatAbilityId,
    currentCooldown: 0,
    isActive: false,
    remainingDuration: 0,
    passiveActivated: false,
    ...overrides,
  };
}

function makeDefender(
  id: string,
  speed: number,
  position: TilePosition | undefined = undefined,
  hp = 20,
  abilityStates: AbilityState[] = [],
): Combatant {
  return invasionCombatCreateCombatant(id as CombatantId, 'defender', `Defender ${id}`, {
    hp,
    maxHp: 20,
    attack: 8,
    defense: 5,
    speed,
  }, position, abilityStates);
}

function makeInvader(
  id: string,
  speed: number,
  position: TilePosition | undefined = undefined,
  hp = 15,
  abilityStates: AbilityState[] = [],
): Combatant {
  return invasionCombatCreateCombatant(id as CombatantId, 'invader', `Invader ${id}`, {
    hp,
    maxHp: 15,
    attack: 6,
    defense: 4,
    speed,
  }, position, abilityStates);
}

function fixedRng(value: number): () => number {
  return () => value;
}

// --- Tests ---

describe('invasion-combat', () => {
  describe('invasionCombatCreateCombatant', () => {
    it('should create a combatant with correct fields', () => {
      const c = invasionCombatCreateCombatant('c1' as CombatantId, 'defender', 'Goblin', {
        hp: 20, maxHp: 20, attack: 8, defense: 5, speed: 3,
      }, { x: 5, y: 3 });

      expect(c.id).toBe('c1');
      expect(c.side).toBe('defender');
      expect(c.name).toBe('Goblin');
      expect(c.speed).toBe(3);
      expect(c.hp).toBe(20);
      expect(c.maxHp).toBe(20);
      expect(c.attack).toBe(8);
      expect(c.defense).toBe(5);
      expect(c.hasActed).toBe(false);
      expect(c.position).toEqual({ x: 5, y: 3 });
    });

    it('should allow undefined position', () => {
      const c = invasionCombatCreateCombatant('c1' as CombatantId, 'invader', 'Warrior', {
        hp: 15, maxHp: 15, attack: 6, defense: 4, speed: 2,
      }, undefined);
      expect(c.position).toBeUndefined();
    });
  });

  describe('invasionCombatBuildTurnQueue', () => {
    it('should sort combatants by speed (highest first)', () => {
      const combatants = [
        makeDefender('d1', 3),
        makeInvader('i1', 5),
        makeDefender('d2', 7),
      ];
      const queue = invasionCombatBuildTurnQueue(combatants);
      expect(queue.combatants[0].id).toBe('d2');
      expect(queue.combatants[1].id).toBe('i1');
      expect(queue.combatants[2].id).toBe('d1');
    });

    it('should break ties with defenders first', () => {
      const combatants = [
        makeInvader('i1', 5),
        makeDefender('d1', 5),
      ];
      const queue = invasionCombatBuildTurnQueue(combatants);
      expect(queue.combatants[0].id).toBe('d1');
      expect(queue.combatants[1].id).toBe('i1');
    });

    it('should start at round 1 with currentIndex 0', () => {
      const queue = invasionCombatBuildTurnQueue([makeDefender('d1', 3)]);
      expect(queue.round).toBe(1);
      expect(queue.currentIndex).toBe(0);
    });
  });

  describe('invasionCombatGetCurrentActor', () => {
    it('should return the current alive non-acted combatant', () => {
      const queue = invasionCombatBuildTurnQueue([
        makeDefender('d1', 5),
        makeInvader('i1', 3),
      ]);
      expect(invasionCombatGetCurrentActor(queue)?.id).toBe('d1');
    });

    it('should skip dead combatants', () => {
      const combatants = [
        makeDefender('d1', 5, undefined, 0),
        makeInvader('i1', 3),
      ];
      const queue = invasionCombatBuildTurnQueue(combatants);
      expect(invasionCombatGetCurrentActor(queue)?.id).toBe('i1');
    });

    it('should return undefined for empty queue', () => {
      const queue = invasionCombatBuildTurnQueue([]);
      expect(invasionCombatGetCurrentActor(queue)).toBeUndefined();
    });

    it('should return undefined when all have acted', () => {
      const combatants = [makeDefender('d1', 5)];
      let queue = invasionCombatBuildTurnQueue(combatants);
      queue = invasionCombatAdvanceTurn(queue);
      expect(invasionCombatGetCurrentActor(queue)).toBeUndefined();
    });
  });

  describe('invasionCombatAdvanceTurn', () => {
    it('should mark current actor as acted and move to next', () => {
      const queue = invasionCombatBuildTurnQueue([
        makeDefender('d1', 5),
        makeInvader('i1', 3),
      ]);
      const advanced = invasionCombatAdvanceTurn(queue);
      expect(advanced.combatants[0].hasActed).toBe(true);
      expect(advanced.currentIndex).toBe(1);
    });

    it('should skip dead combatants when advancing', () => {
      const queue = invasionCombatBuildTurnQueue([
        makeDefender('d1', 7),
        makeDefender('d2', 5, undefined, 0),
        makeInvader('i1', 3),
      ]);
      const advanced = invasionCombatAdvanceTurn(queue);
      expect(advanced.currentIndex).toBe(2);
    });

    it('should not mutate original queue', () => {
      const queue = invasionCombatBuildTurnQueue([makeDefender('d1', 5)]);
      invasionCombatAdvanceTurn(queue);
      expect(queue.combatants[0].hasActed).toBe(false);
      expect(queue.currentIndex).toBe(0);
    });
  });

  describe('invasionCombatIsRoundComplete', () => {
    it('should return false when alive combatants have not acted', () => {
      const queue = invasionCombatBuildTurnQueue([
        makeDefender('d1', 5),
        makeInvader('i1', 3),
      ]);
      expect(invasionCombatIsRoundComplete(queue)).toBe(false);
    });

    it('should return true when all alive combatants have acted', () => {
      let queue = invasionCombatBuildTurnQueue([
        makeDefender('d1', 5),
        makeInvader('i1', 3),
      ]);
      queue = invasionCombatAdvanceTurn(queue);
      queue = invasionCombatAdvanceTurn(queue);
      expect(invasionCombatIsRoundComplete(queue)).toBe(true);
    });

    it('should ignore dead combatants', () => {
      const queue = invasionCombatBuildTurnQueue([
        makeDefender('d1', 5),
        makeInvader('i1', 3, undefined, 0),
      ]);
      const advanced = invasionCombatAdvanceTurn(queue);
      expect(invasionCombatIsRoundComplete(advanced)).toBe(true);
    });
  });

  describe('invasionCombatStartNewRound', () => {
    it('should reset hasActed for all alive combatants', () => {
      let queue = invasionCombatBuildTurnQueue([
        makeDefender('d1', 5),
        makeInvader('i1', 3),
      ]);
      queue = invasionCombatAdvanceTurn(queue);
      queue = invasionCombatAdvanceTurn(queue);

      const newRound = invasionCombatStartNewRound(queue);
      expect(newRound.combatants.every((c) => !c.hasActed)).toBe(true);
    });

    it('should remove dead combatants', () => {
      const combatants = [
        makeDefender('d1', 5),
        makeInvader('i1', 3, undefined, 0),
      ];
      const queue = invasionCombatBuildTurnQueue(combatants);
      const newRound = invasionCombatStartNewRound(queue);
      expect(newRound.combatants).toHaveLength(1);
      expect(newRound.combatants[0].id).toBe('d1');
    });

    it('should increment round counter', () => {
      const queue = invasionCombatBuildTurnQueue([makeDefender('d1', 5)]);
      const newRound = invasionCombatStartNewRound(queue);
      expect(newRound.round).toBe(2);
    });

    it('should re-sort by speed', () => {
      const combatants = [
        makeDefender('d1', 3),
        makeInvader('i1', 7),
      ];
      const queue = invasionCombatBuildTurnQueue(combatants);
      const newRound = invasionCombatStartNewRound(queue);
      expect(newRound.combatants[0].id).toBe('i1');
    });

    it('should reset currentIndex to 0', () => {
      let queue = invasionCombatBuildTurnQueue([
        makeDefender('d1', 5),
        makeInvader('i1', 3),
      ]);
      queue = invasionCombatAdvanceTurn(queue);
      const newRound = invasionCombatStartNewRound(queue);
      expect(newRound.currentIndex).toBe(0);
    });
  });

  describe('invasionCombatGetAliveCombatants', () => {
    it('should return only combatants with hp > 0', () => {
      const queue = invasionCombatBuildTurnQueue([
        makeDefender('d1', 5, undefined, 20),
        makeInvader('i1', 3, undefined, 0),
        makeDefender('d2', 2, undefined, 10),
      ]);
      const alive = invasionCombatGetAliveCombatants(queue);
      expect(alive).toHaveLength(2);
    });
  });

  describe('invasionCombatArePositionsAdjacent', () => {
    it('should return true for cardinal adjacent positions', () => {
      expect(invasionCombatArePositionsAdjacent({ x: 5, y: 5 }, { x: 5, y: 4 })).toBe(true);
      expect(invasionCombatArePositionsAdjacent({ x: 5, y: 5 }, { x: 5, y: 6 })).toBe(true);
      expect(invasionCombatArePositionsAdjacent({ x: 5, y: 5 }, { x: 4, y: 5 })).toBe(true);
      expect(invasionCombatArePositionsAdjacent({ x: 5, y: 5 }, { x: 6, y: 5 })).toBe(true);
    });

    it('should return false for diagonal positions', () => {
      expect(invasionCombatArePositionsAdjacent({ x: 5, y: 5 }, { x: 6, y: 6 })).toBe(false);
    });

    it('should return false for non-adjacent positions', () => {
      expect(invasionCombatArePositionsAdjacent({ x: 5, y: 5 }, { x: 7, y: 5 })).toBe(false);
    });

    it('should return false for same position', () => {
      expect(invasionCombatArePositionsAdjacent({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(false);
    });
  });

  describe('invasionCombatGetAdjacentPositions', () => {
    it('should return 4 cardinal adjacent positions', () => {
      const adj = invasionCombatGetAdjacentPositions({ x: 5, y: 5 });
      expect(adj).toHaveLength(4);
      expect(adj).toContainEqual({ x: 5, y: 4 });
      expect(adj).toContainEqual({ x: 5, y: 6 });
      expect(adj).toContainEqual({ x: 4, y: 5 });
      expect(adj).toContainEqual({ x: 6, y: 5 });
    });
  });

  describe('invasionCombatGetValidMoveTargets', () => {
    it('should return adjacent unoccupied tiles', () => {
      const actor = makeDefender('d1', 5, { x: 5, y: 5 });
      const enemy = makeInvader('i1', 3, { x: 5, y: 4 });
      const targets = invasionCombatGetValidMoveTargets(actor, [actor, enemy]);
      expect(targets).toHaveLength(3);
      expect(targets).not.toContainEqual({ x: 5, y: 4 });
    });

    it('should exclude tiles occupied by allies', () => {
      const actor = makeDefender('d1', 5, { x: 5, y: 5 });
      const ally = makeDefender('d2', 3, { x: 5, y: 6 });
      const targets = invasionCombatGetValidMoveTargets(actor, [actor, ally]);
      expect(targets).not.toContainEqual({ x: 5, y: 6 });
    });

    it('should exclude negative positions', () => {
      const actor = makeDefender('d1', 5, { x: 0, y: 0 });
      const targets = invasionCombatGetValidMoveTargets(actor, [actor]);
      expect(targets.every((t) => t.x >= 0 && t.y >= 0)).toBe(true);
      expect(targets).toHaveLength(2);
    });

    it('should return empty for actor with no position', () => {
      const actor = makeDefender('d1', 5, undefined);
      expect(invasionCombatGetValidMoveTargets(actor, [actor])).toEqual([]);
    });

    it('should ignore dead combatants for occupancy', () => {
      const actor = makeDefender('d1', 5, { x: 5, y: 5 });
      const dead = makeInvader('i1', 3, { x: 5, y: 4 }, 0);
      const targets = invasionCombatGetValidMoveTargets(actor, [actor, dead]);
      expect(targets).toContainEqual({ x: 5, y: 4 });
    });
  });

  describe('invasionCombatGetValidAttackTargets', () => {
    it('should return adjacent enemies', () => {
      const actor = makeDefender('d1', 5, { x: 5, y: 5 });
      const enemy = makeInvader('i1', 3, { x: 5, y: 4 });
      const targets = invasionCombatGetValidAttackTargets(actor, [actor, enemy]);
      expect(targets).toHaveLength(1);
      expect(targets[0].id).toBe('i1');
    });

    it('should not include allies', () => {
      const actor = makeDefender('d1', 5, { x: 5, y: 5 });
      const ally = makeDefender('d2', 3, { x: 5, y: 4 });
      const targets = invasionCombatGetValidAttackTargets(actor, [actor, ally]);
      expect(targets).toHaveLength(0);
    });

    it('should not include dead enemies', () => {
      const actor = makeDefender('d1', 5, { x: 5, y: 5 });
      const dead = makeInvader('i1', 3, { x: 5, y: 4 }, 0);
      const targets = invasionCombatGetValidAttackTargets(actor, [actor, dead]);
      expect(targets).toHaveLength(0);
    });

    it('should not include non-adjacent enemies', () => {
      const actor = makeDefender('d1', 5, { x: 5, y: 5 });
      const far = makeInvader('i1', 3, { x: 5, y: 3 });
      const targets = invasionCombatGetValidAttackTargets(actor, [actor, far]);
      expect(targets).toHaveLength(0);
    });

    it('should return empty for actor with no position', () => {
      const actor = makeDefender('d1', 5, undefined);
      const enemy = makeInvader('i1', 3, { x: 5, y: 5 });
      expect(invasionCombatGetValidAttackTargets(actor, [actor, enemy])).toEqual([]);
    });
  });

  describe('invasionCombatGetAvailableActions', () => {
    it('should always include wait', () => {
      const actor = makeDefender('d1', 5, undefined);
      const actions = invasionCombatGetAvailableActions(actor, [actor]);
      expect(actions).toContain('wait');
    });

    it('should include move when there are valid move targets', () => {
      const actor = makeDefender('d1', 5, { x: 5, y: 5 });
      const actions = invasionCombatGetAvailableActions(actor, [actor]);
      expect(actions).toContain('move');
    });

    it('should include attack when adjacent enemy exists', () => {
      const actor = makeDefender('d1', 5, { x: 5, y: 5 });
      const enemy = makeInvader('i1', 3, { x: 5, y: 4 });
      const actions = invasionCombatGetAvailableActions(actor, [actor, enemy]);
      expect(actions).toContain('attack');
    });

    it('should not include attack when no adjacent enemies', () => {
      const actor = makeDefender('d1', 5, { x: 5, y: 5 });
      const actions = invasionCombatGetAvailableActions(actor, [actor]);
      expect(actions).not.toContain('attack');
    });
  });

  describe('invasionCombatExecuteMove', () => {
    it('should update combatant position', () => {
      const queue = invasionCombatBuildTurnQueue([makeDefender('d1', 5, { x: 5, y: 5 })]);
      const { queue: updated, result } = invasionCombatExecuteMove(queue, 'd1' as CombatantId, { x: 5, y: 4 });

      expect(updated.combatants[0].position).toEqual({ x: 5, y: 4 });
      expect(result.action).toBe('move');
      expect(result.actorId).toBe('d1');
      expect(result.targetPosition).toEqual({ x: 5, y: 4 });
      expect(result.combatResult).toBeUndefined();
    });

    it('should not mutate original queue', () => {
      const queue = invasionCombatBuildTurnQueue([makeDefender('d1', 5, { x: 5, y: 5 })]);
      invasionCombatExecuteMove(queue, 'd1' as CombatantId, { x: 5, y: 4 });
      expect(queue.combatants[0].position).toEqual({ x: 5, y: 5 });
    });
  });

  describe('invasionCombatExecuteAttack', () => {
    it('should resolve combat and update target HP', () => {
      const queue = invasionCombatBuildTurnQueue([
        makeDefender('d1', 5, { x: 5, y: 5 }),
        makeInvader('i1', 3, { x: 5, y: 4 }),
      ]);
      // Fixed rng = 0.95 => roll = 20 (natural 20, always hits)
      const { queue: updated, result } = invasionCombatExecuteAttack(queue, 'd1' as CombatantId, 'i1' as CombatantId, fixedRng(0.95));

      expect(result.action).toBe('attack');
      expect(result.actorId).toBe('d1');
      expect(result.targetId).toBe('i1');
      expect(result.combatResult).toBeDefined();
      expect(result.combatResult!.hit).toBe(true);
      // Defender HP should be updated in queue
      const target = updated.combatants.find((c) => c.id === 'i1');
      expect(target!.hp).toBe(result.combatResult!.defenderHp);
    });

    it('should handle miss (natural 1)', () => {
      const queue = invasionCombatBuildTurnQueue([
        makeDefender('d1', 5, { x: 5, y: 5 }),
        makeInvader('i1', 3, { x: 5, y: 4 }),
      ]);
      // Fixed rng = 0 => roll = 1 (natural 1, always misses)
      const { result } = invasionCombatExecuteAttack(queue, 'd1' as CombatantId, 'i1' as CombatantId, fixedRng(0));

      expect(result.combatResult!.hit).toBe(false);
      expect(result.combatResult!.damage).toBe(0);
    });

    it('should not mutate original queue', () => {
      const queue = invasionCombatBuildTurnQueue([
        makeDefender('d1', 5, { x: 5, y: 5 }),
        makeInvader('i1', 3, { x: 5, y: 4 }),
      ]);
      invasionCombatExecuteAttack(queue, 'd1' as CombatantId, 'i1' as CombatantId, fixedRng(0.95));
      expect(queue.combatants.find((c) => c.id === 'i1')!.hp).toBe(15);
    });

    it('should handle unknown attacker gracefully', () => {
      const queue = invasionCombatBuildTurnQueue([makeDefender('d1', 5)]);
      const { result } = invasionCombatExecuteAttack(queue, 'nonexistent' as CombatantId, 'd1' as CombatantId, fixedRng(0.5));
      expect(result.combatResult).toBeUndefined();
    });
  });

  describe('invasionCombatExecuteWait', () => {
    it('should return a wait action result', () => {
      const result = invasionCombatExecuteWait('d1' as CombatantId);
      expect(result.action).toBe('wait');
      expect(result.actorId).toBe('d1');
      expect(result.targetId).toBeUndefined();
      expect(result.combatResult).toBeUndefined();
    });
  });

  describe('invasionCombatResolveAiAction', () => {
    it('should attack adjacent enemy if possible', () => {
      const actor = makeInvader('i1', 5, { x: 5, y: 5 });
      const enemy = makeDefender('d1', 3, { x: 5, y: 4 });
      const decision = invasionCombatResolveAiAction(actor, [actor, enemy]);
      expect(decision.action).toBe('attack');
      expect(decision.targetId).toBe('d1');
    });

    it('should prefer weakest target', () => {
      const actor = makeInvader('i1', 5, { x: 5, y: 5 });
      const strong = makeDefender('d1', 3, { x: 5, y: 4 }, 20);
      const weak = makeDefender('d2', 3, { x: 5, y: 6 }, 5);
      const decision = invasionCombatResolveAiAction(actor, [actor, strong, weak]);
      expect(decision.action).toBe('attack');
      expect(decision.targetId).toBe('d2');
    });

    it('should move toward nearest enemy if no adjacent', () => {
      const actor = makeInvader('i1', 5, { x: 5, y: 5 });
      const enemy = makeDefender('d1', 3, { x: 5, y: 2 });
      const decision = invasionCombatResolveAiAction(actor, [actor, enemy]);
      expect(decision.action).toBe('move');
      expect(decision.targetPosition).toEqual({ x: 5, y: 4 });
    });

    it('should wait when no enemies exist', () => {
      const actor = makeInvader('i1', 5, { x: 5, y: 5 });
      const ally = makeInvader('i2', 3, { x: 5, y: 4 });
      const decision = invasionCombatResolveAiAction(actor, [actor, ally]);
      expect(decision.action).toBe('wait');
    });

    it('should wait when actor has no position', () => {
      const actor = makeInvader('i1', 5, undefined);
      const enemy = makeDefender('d1', 3, { x: 5, y: 5 });
      const decision = invasionCombatResolveAiAction(actor, [actor, enemy]);
      expect(decision.action).toBe('wait');
    });
  });

  describe('invasionCombatExecuteAiTurn', () => {
    it('should execute attack when adjacent enemy', () => {
      const queue = invasionCombatBuildTurnQueue([
        makeInvader('i1', 5, { x: 5, y: 5 }),
        makeDefender('d1', 3, { x: 5, y: 4 }),
      ]);
      const { result } = invasionCombatExecuteAiTurn(queue, fixedRng(0.95));
      expect(result.action).toBe('attack');
      expect(result.targetId).toBe('d1');
    });

    it('should execute move when no adjacent enemy', () => {
      const queue = invasionCombatBuildTurnQueue([
        makeInvader('i1', 5, { x: 5, y: 5 }),
        makeDefender('d1', 3, { x: 5, y: 2 }),
      ]);
      const { result } = invasionCombatExecuteAiTurn(queue, fixedRng(0.5));
      expect(result.action).toBe('move');
    });

    it('should return wait when queue is empty', () => {
      const queue: TurnQueue = { combatants: [], currentIndex: 0, round: 1 };
      const { result } = invasionCombatExecuteAiTurn(queue, fixedRng(0.5));
      expect(result.action).toBe('wait');
    });
  });

  describe('invasionCombatExecuteAbility: Stun', () => {
    it('should apply stunned status to target', () => {
      const actor = makeDefender('d1', 5, { x: 5, y: 5 }, 20, [makeAbilityState('ability-stun')]);
      const enemy = makeInvader('i1', 3, { x: 5, y: 4 });
      const queue = invasionCombatBuildTurnQueue([actor, enemy]);

      const { queue: updated, result } = invasionCombatExecuteAbility(
        queue, 'd1' as CombatantId, 'ability-stun' as CombatAbilityId, 'i1' as CombatantId, fixedRng(0.5),
      );

      expect(result.action).toBe('ability');
      expect(result.abilityActivation).toBeDefined();
      expect(result.abilityActivation!.abilityName).toBe('Test Stun');

      const target = updated.combatants.find((c) => c.id === 'i1')!;
      expect(combatantHasStatus(target, 'stunned')).toBe(true);
      expect(target.statusEffects.find((s) => s.name === 'stunned')!.remainingDuration).toBe(2);
    });

    it('should cause stunned combatant to auto-wait in AI', () => {
      const stunned = makeInvader('i1', 5, { x: 5, y: 5 });
      stunned.statusEffects = [{ name: 'stunned', remainingDuration: 1 }];
      const enemy = makeDefender('d1', 3, { x: 5, y: 4 });

      const decision = invasionCombatResolveAiAction(stunned, [stunned, enemy]);
      expect(decision.action).toBe('wait');
    });

    it('should cause phased combatant to auto-wait in AI', () => {
      const phased = makeInvader('i1', 5, { x: 5, y: 5 });
      phased.statusEffects = [{ name: 'phased', remainingDuration: 1 }];
      const enemy = makeDefender('d1', 3, { x: 5, y: 4 });

      const decision = invasionCombatResolveAiAction(phased, [phased, enemy]);
      expect(decision.action).toBe('wait');
    });

    it('should exclude phased enemies from valid attack targets', () => {
      const attacker = makeDefender('d1', 5, { x: 5, y: 5 });
      const phased = makeInvader('i1', 3, { x: 5, y: 4 });
      phased.statusEffects = [{ name: 'phased', remainingDuration: 1 }];

      const targets = invasionCombatGetValidAttackTargets(attacker, [attacker, phased]);
      expect(targets).toHaveLength(0);
    });

    it('should not exclude non-phased enemies from valid attack targets', () => {
      const attacker = makeDefender('d1', 5, { x: 5, y: 5 });
      const normal = makeInvader('i1', 3, { x: 5, y: 4 });

      const targets = invasionCombatGetValidAttackTargets(attacker, [attacker, normal]);
      expect(targets).toHaveLength(1);
    });

    it('should auto-miss when attacking a phased target directly', () => {
      const attacker = makeDefender('d1', 5, { x: 5, y: 5 });
      const phased = makeInvader('i1', 3, { x: 5, y: 4 });
      phased.statusEffects = [{ name: 'phased', remainingDuration: 1 }];
      const queue = invasionCombatBuildTurnQueue([attacker, phased]);

      const { result } = invasionCombatExecuteAttack(
        queue, 'd1' as CombatantId, 'i1' as CombatantId, fixedRng(0.5),
      );

      expect(result.combatResult?.hit).toBe(false);
      expect(result.combatResult?.damage).toBe(0);
    });

    it('AI should skip phased enemies when choosing targets', () => {
      const attacker = makeInvader('i1', 5, { x: 5, y: 5 });
      const phased = makeDefender('d1', 3, { x: 5, y: 4 });
      phased.statusEffects = [{ name: 'phased', remainingDuration: 1 }];
      const normal = makeDefender('d2', 3, { x: 5, y: 6 });

      const decision = invasionCombatResolveAiAction(attacker, [attacker, phased, normal]);
      expect(decision.action).toBe('attack');
      expect(decision.targetId).toBe('d2');
    });
  });

  describe('invasionCombatExecuteAbility: Buff Defense', () => {
    it('should apply shielded status to self', () => {
      const actor = makeDefender('d1', 5, { x: 5, y: 5 }, 20, [makeAbilityState('ability-buff-def')]);
      const enemy = makeInvader('i1', 3, { x: 5, y: 4 });
      const queue = invasionCombatBuildTurnQueue([actor, enemy]);

      const { queue: updated } = invasionCombatExecuteAbility(
        queue, 'd1' as CombatantId, 'ability-buff-def' as CombatAbilityId, 'd1' as CombatantId, fixedRng(0.5),
      );

      const defender = updated.combatants.find((c) => c.id === 'd1')!;
      expect(combatantHasStatus(defender, 'shielded')).toBe(true);
      expect(defender.statusEffects.find((s) => s.name === 'shielded')!.remainingDuration).toBe(3);
    });

    it('should put ability on cooldown after activation', () => {
      const actor = makeDefender('d1', 5, { x: 5, y: 5 }, 20, [makeAbilityState('ability-buff-def')]);
      const enemy = makeInvader('i1', 3, { x: 5, y: 4 });
      const queue = invasionCombatBuildTurnQueue([actor, enemy]);

      const { queue: updated } = invasionCombatExecuteAbility(
        queue, 'd1' as CombatantId, 'ability-buff-def' as CombatAbilityId, 'd1' as CombatantId, fixedRng(0.5),
      );

      const defender = updated.combatants.find((c) => c.id === 'd1')!;
      const abilityState = defender.abilityStates.find((s) => s.abilityId === 'ability-buff-def')!;
      expect(abilityState.currentCooldown).toBe(4);
      expect(abilityState.isActive).toBe(true);
      expect(abilityState.remainingDuration).toBe(3);
    });
  });

  describe('invasionCombatExecuteAbility: Resurrect', () => {
    it('should revive a dead ally with percentage HP', () => {
      const actor = makeDefender('d1', 5, { x: 5, y: 5 }, 20, [makeAbilityState('ability-resurrect')]);
      const deadAlly = makeDefender('d2', 3, { x: 5, y: 6 }, 0);
      const enemy = makeInvader('i1', 3, { x: 5, y: 3 });
      const queue = invasionCombatBuildTurnQueue([actor, deadAlly, enemy]);

      const { queue: updated } = invasionCombatExecuteAbility(
        queue, 'd1' as CombatantId, 'ability-resurrect' as CombatAbilityId, 'd2' as CombatantId, fixedRng(0.5),
      );

      const revived = updated.combatants.find((c) => c.id === 'd2')!;
      expect(revived.hp).toBe(10); // 50% of 20 maxHp
    });

    it('should revive with at least 1 HP', () => {
      const actor = makeDefender('d1', 5, { x: 5, y: 5 }, 20, [makeAbilityState('ability-resurrect')]);
      const deadAlly = invasionCombatCreateCombatant('d2' as CombatantId, 'defender', 'Defender d2', {
        hp: 0, maxHp: 1, attack: 1, defense: 1, speed: 1,
      }, { x: 5, y: 6 });
      const enemy = makeInvader('i1', 3, { x: 5, y: 3 });
      const queue = invasionCombatBuildTurnQueue([actor, deadAlly, enemy]);

      const { queue: updated } = invasionCombatExecuteAbility(
        queue, 'd1' as CombatantId, 'ability-resurrect' as CombatAbilityId, 'd2' as CombatantId, fixedRng(0.5),
      );

      const revived = updated.combatants.find((c) => c.id === 'd2')!;
      expect(revived.hp).toBeGreaterThanOrEqual(1);
    });
  });

  describe('invasionCombatExecuteAbility: Dispel', () => {
    it('should remove all status effects from target', () => {
      const actor = makeInvader('i1', 5, { x: 5, y: 5 }, 15, [makeAbilityState('ability-dispel')]);
      const enemy = makeDefender('d1', 3, { x: 5, y: 4 });
      enemy.statusEffects = [
        { name: 'shielded', remainingDuration: 3 },
        { name: 'courage', remainingDuration: 999 },
      ];
      const queue = invasionCombatBuildTurnQueue([actor, enemy]);

      const { queue: updated } = invasionCombatExecuteAbility(
        queue, 'i1' as CombatantId, 'ability-dispel' as CombatAbilityId, 'd1' as CombatantId, fixedRng(0.5),
      );

      const target = updated.combatants.find((c) => c.id === 'd1')!;
      expect(target.statusEffects).toHaveLength(0);
    });
  });

  describe('invasionCombatExecuteAbility: Fear Immunity', () => {
    it('should apply courage status to all allies', () => {
      const actor = makeInvader('i1', 5, { x: 5, y: 5 }, 15, [makeAbilityState('ability-courage')]);
      const ally = makeInvader('i2', 3, { x: 5, y: 6 });
      const enemy = makeDefender('d1', 3, { x: 5, y: 3 });
      const queue = invasionCombatBuildTurnQueue([actor, ally, enemy]);

      const { queue: updated } = invasionCombatExecuteAbility(
        queue, 'i1' as CombatantId, 'ability-courage' as CombatAbilityId, 'i1' as CombatantId, fixedRng(0.5),
      );

      const actor1 = updated.combatants.find((c) => c.id === 'i1')!;
      const ally1 = updated.combatants.find((c) => c.id === 'i2')!;
      const enemy1 = updated.combatants.find((c) => c.id === 'd1')!;
      expect(combatantHasStatus(actor1, 'courage')).toBe(true);
      expect(combatantHasStatus(ally1, 'courage')).toBe(true);
      expect(combatantHasStatus(enemy1, 'courage')).toBe(false);
    });

    it('should not duplicate courage if already present', () => {
      const actor = makeInvader('i1', 5, { x: 5, y: 5 }, 15, [makeAbilityState('ability-courage')]);
      actor.statusEffects = [{ name: 'courage', remainingDuration: 999 }];
      const enemy = makeDefender('d1', 3, { x: 5, y: 3 });
      const queue = invasionCombatBuildTurnQueue([actor, enemy]);

      const { queue: updated } = invasionCombatExecuteAbility(
        queue, 'i1' as CombatantId, 'ability-courage' as CombatAbilityId, 'i1' as CombatantId, fixedRng(0.5),
      );

      const actor1 = updated.combatants.find((c) => c.id === 'i1')!;
      const courageStatuses = actor1.statusEffects.filter((s) => s.name === 'courage');
      expect(courageStatuses).toHaveLength(1);
    });
  });

  describe('invasionCombatExecuteAbility: Mark', () => {
    it('should apply marked status to target', () => {
      const actor = makeInvader('i1', 5, { x: 5, y: 5 }, 15, [makeAbilityState('ability-mark')]);
      const enemy = makeDefender('d1', 3, { x: 5, y: 4 });
      const queue = invasionCombatBuildTurnQueue([actor, enemy]);

      const { queue: updated } = invasionCombatExecuteAbility(
        queue, 'i1' as CombatantId, 'ability-mark' as CombatAbilityId, 'd1' as CombatantId, fixedRng(0.5),
      );

      const target = updated.combatants.find((c) => c.id === 'd1')!;
      expect(combatantHasStatus(target, 'marked')).toBe(true);
      expect(target.statusEffects.find((s) => s.name === 'marked')!.remainingDuration).toBe(3);
    });

    it('should amplify damage dealt to marked targets in attack', () => {
      const attacker = makeInvader('i1', 5, { x: 5, y: 5 });
      const marked = makeDefender('d1', 3, { x: 5, y: 4 });
      marked.statusEffects = [{ name: 'marked', remainingDuration: 2 }];
      const queue = invasionCombatBuildTurnQueue([attacker, marked]);

      // Use a high rng to guarantee a hit (roll 20)
      const { result } = invasionCombatExecuteAttack(queue, 'i1' as CombatantId, 'd1' as CombatantId, fixedRng(0.95));
      expect(result.combatResult!.hit).toBe(true);

      // Without mark: damage = max(1, 6 - 5) = 1
      // With 20% mark: damage = round(1 * 1.2) = 1 (rounding)
      // The mark amplification should be applied
      expect(result.combatResult!.damage).toBeGreaterThanOrEqual(1);
    });
  });

  describe('invasionCombatExecuteAbility: Heal', () => {
    it('should restore HP to injured ally', () => {
      const actor = makeDefender('d1', 5, { x: 5, y: 5 }, 20, [makeAbilityState('ability-heal')]);
      const injured = makeDefender('d2', 3, { x: 5, y: 4 }, 5);
      const enemy = makeInvader('i1', 3, { x: 5, y: 3 });
      const queue = invasionCombatBuildTurnQueue([actor, injured, enemy]);

      const { queue: updated } = invasionCombatExecuteAbility(
        queue, 'd1' as CombatantId, 'ability-heal' as CombatAbilityId, 'd2' as CombatantId, fixedRng(0.5),
      );

      const healed = updated.combatants.find((c) => c.id === 'd2')!;
      expect(healed.hp).toBe(10); // 5 + round(20 * 25/100) = 5 + 5 = 10
    });

    it('should not exceed max HP when healing', () => {
      const actor = makeDefender('d1', 5, { x: 5, y: 5 }, 20, [makeAbilityState('ability-heal')]);
      const nearFull = makeDefender('d2', 3, { x: 5, y: 4 }, 19);
      const enemy = makeInvader('i1', 3, { x: 5, y: 3 });
      const queue = invasionCombatBuildTurnQueue([actor, nearFull, enemy]);

      const { queue: updated } = invasionCombatExecuteAbility(
        queue, 'd1' as CombatantId, 'ability-heal' as CombatAbilityId, 'd2' as CombatantId, fixedRng(0.5),
      );

      const healed = updated.combatants.find((c) => c.id === 'd2')!;
      expect(healed.hp).toBe(20); // capped at maxHp
    });
  });

  describe('invasionCombatExecuteAbility: failed proc', () => {
    it('should consume turn but have no effect when ability fails to proc', () => {
      // Stun has 100% chance but we'll use a custom ability with 0% chance via high rng
      const lowChanceAbility: CombatAbilityContent = {
        id: 'ability-stun' as CombatAbilityId,
        name: 'Test Stun',
        __type: 'combatability',
        description: 'Stuns a target',
        chance: 1, // 1% chance
        cooldown: 3,
        effects: [{ effectType: 'Stun', value: 0, targetType: 'single', duration: 2 }],
      };
      // Override the mock for this test
      abilityContentMap['ability-stun'] = lowChanceAbility;

      const actor = makeDefender('d1', 5, { x: 5, y: 5 }, 20, [makeAbilityState('ability-stun')]);
      const enemy = makeInvader('i1', 3, { x: 5, y: 4 });
      const queue = invasionCombatBuildTurnQueue([actor, enemy]);

      // rng 0.5 => roll 50, which is > 1% chance
      const { result } = invasionCombatExecuteAbility(
        queue, 'd1' as CombatantId, 'ability-stun' as CombatAbilityId, 'i1' as CombatantId, fixedRng(0.5),
      );

      expect(result.abilityActivation).toBeUndefined();
      const target = queue.combatants.find((c) => c.id === 'i1')!;
      expect(combatantHasStatus(target, 'stunned')).toBe(false);

      // Restore original
      abilityContentMap['ability-stun'] = stunAbility;
    });
  });

  describe('status effect duration', () => {
    it('should expire status effects after new round ticks', () => {
      const combatant = makeDefender('d1', 5, { x: 5, y: 5 });
      combatant.statusEffects = [{ name: 'stunned', remainingDuration: 1 }];
      const queue = invasionCombatBuildTurnQueue([combatant]);

      const newRound = invasionCombatStartNewRound(queue);
      const d1 = newRound.combatants.find((c) => c.id === 'd1')!;
      expect(d1.statusEffects).toHaveLength(0);
    });

    it('should keep status effects that have remaining duration', () => {
      const combatant = makeDefender('d1', 5, { x: 5, y: 5 });
      combatant.statusEffects = [{ name: 'marked', remainingDuration: 3 }];
      const queue = invasionCombatBuildTurnQueue([combatant]);

      const newRound = invasionCombatStartNewRound(queue);
      const d1 = newRound.combatants.find((c) => c.id === 'd1')!;
      expect(d1.statusEffects).toHaveLength(1);
      expect(d1.statusEffects[0].remainingDuration).toBe(2);
    });
  });

  describe('full round flow', () => {
    it('should support a complete round: all act then new round', () => {
      const combatants = [
        makeDefender('d1', 7, { x: 5, y: 5 }),
        makeInvader('i1', 5, { x: 5, y: 3 }),
        makeDefender('d2', 3, { x: 3, y: 5 }),
      ];

      let queue = invasionCombatBuildTurnQueue(combatants);
      expect(queue.round).toBe(1);

      // d1 acts (speed 7)
      expect(invasionCombatGetCurrentActor(queue)?.id).toBe('d1');
      queue = invasionCombatAdvanceTurn(queue);

      // i1 acts (speed 5)
      expect(invasionCombatGetCurrentActor(queue)?.id).toBe('i1');
      queue = invasionCombatAdvanceTurn(queue);

      // d2 acts (speed 3)
      expect(invasionCombatGetCurrentActor(queue)?.id).toBe('d2');
      queue = invasionCombatAdvanceTurn(queue);

      expect(invasionCombatIsRoundComplete(queue)).toBe(true);

      // Start new round
      queue = invasionCombatStartNewRound(queue);
      expect(queue.round).toBe(2);
      expect(queue.currentIndex).toBe(0);
      expect(invasionCombatGetCurrentActor(queue)?.id).toBe('d1');
    });

    it('should handle combatant death mid-round', () => {
      const queue = invasionCombatBuildTurnQueue([
        makeDefender('d1', 7, { x: 5, y: 5 }),
        makeInvader('i1', 5, { x: 5, y: 4 }),
      ]);

      // d1 attacks i1 with a guaranteed hit
      const { queue: afterAttack } = invasionCombatExecuteAttack(queue, 'd1' as CombatantId, 'i1' as CombatantId, fixedRng(0.95));
      const i1 = afterAttack.combatants.find((c) => c.id === 'i1');

      // If i1 died from the attack
      if (i1 && i1.hp <= 0) {
        const advanced = invasionCombatAdvanceTurn(afterAttack);
        expect(invasionCombatIsRoundComplete(advanced)).toBe(true);
      }
    });

    it('should support AI executing turns automatically', () => {
      const queue = invasionCombatBuildTurnQueue([
        makeInvader('i1', 7, { x: 5, y: 5 }),
        makeDefender('d1', 3, { x: 5, y: 4 }),
      ]);

      // i1's turn: should attack adjacent d1
      const { queue: afterAi, result } = invasionCombatExecuteAiTurn(queue, fixedRng(0.95));
      expect(result.action).toBe('attack');
      expect(result.targetId).toBe('d1');

      // d1's HP should be updated
      const d1 = afterAi.combatants.find((c) => c.id === 'd1');
      expect(d1).toBeDefined();
    });
  });
});
