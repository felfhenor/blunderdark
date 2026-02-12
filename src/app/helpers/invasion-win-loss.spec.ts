import { describe, expect, it, vi } from 'vitest';
import type { InvasionState } from '@interfaces/invasion';
import type { InvaderInstance } from '@interfaces/invader';
import type { InvasionObjective } from '@interfaces/invasion-objective';
import {
  ALTAR_MAX_HP,
  MAX_INVASION_TURNS,
  SECONDARY_OBJECTIVES_FOR_VICTORY,
  advanceInvasionTurn,
  areAllInvadersEliminated,
  areSecondaryObjectivesCompleted,
  checkInvasionEnd,
  createHistoryEntry,
  createInvasionState,
  damageAltar,
  endInvasion,
  isAltarDestroyed,
  isTurnLimitReached,
  markInvaderKilled,
  recordDefenderLoss,
  resolveDetailedResult,
} from '@helpers/invasion-win-loss';

vi.mock('@helpers/rng', () => ({
  rngUuid: () => 'test-uuid',
}));

vi.mock('@helpers/invasion-objectives', () => ({
  resolveInvasionOutcome: (objectives: InvasionObjective[]) => {
    const primary = objectives.find((o) => o.isPrimary);
    const secondaries = objectives.filter((o) => !o.isPrimary);
    const altarDestroyed = primary?.isCompleted ?? false;
    const completedCount = secondaries.filter((o) => o.isCompleted).length;

    if (altarDestroyed) {
      return {
        outcome: 'defeat',
        altarDestroyed: true,
        secondariesCompleted: completedCount,
        secondariesTotal: secondaries.length,
        rewardMultiplier: 0,
      };
    }

    const prevented = secondaries.length - completedCount;
    return {
      outcome: 'victory',
      altarDestroyed: false,
      secondariesCompleted: completedCount,
      secondariesTotal: secondaries.length,
      rewardMultiplier: Math.max(0, 1.0 + prevented * 0.25 - completedCount * 0.25),
    };
  },
}));

// --- Helpers ---

function makeInvader(id: string, hp = 10): InvaderInstance {
  return {
    id,
    definitionId: 'def-1',
    currentHp: hp,
    maxHp: hp,
    statusEffects: [],
    abilityStates: [],
  };
}

function makePrimaryObjective(completed = false): InvasionObjective {
  return {
    id: 'obj-primary',
    type: 'DestroyAltar',
    name: 'Destroy Altar',
    description: 'Destroy the altar.',
    targetId: 'altar-room-1',
    isPrimary: true,
    isCompleted: completed,
    progress: completed ? 100 : 0,
  };
}

function makeSecondaryObjective(
  type: InvasionObjective['type'],
  completed = false,
): InvasionObjective {
  return {
    id: `obj-${type}`,
    type,
    name: type,
    description: `${type} objective.`,
    targetId: undefined,
    isPrimary: false,
    isCompleted: completed,
    progress: completed ? 100 : 0,
  };
}

function makeInvasionState(overrides: Partial<InvasionState> = {}): InvasionState {
  return {
    invasionId: 'inv-1',
    currentTurn: 0,
    maxTurns: MAX_INVASION_TURNS,
    altarHp: ALTAR_MAX_HP,
    altarMaxHp: ALTAR_MAX_HP,
    invaders: [makeInvader('inv-a'), makeInvader('inv-b')],
    objectives: [
      makePrimaryObjective(),
      makeSecondaryObjective('StealTreasure'),
      makeSecondaryObjective('SlayMonster'),
    ],
    defenderCount: 5,
    defendersLost: 0,
    invadersKilled: 0,
    isActive: true,
    ...overrides,
  };
}

// --- Tests ---

describe('invasion-win-loss', () => {
  describe('constants', () => {
    it('should have altar max HP of 100', () => {
      expect(ALTAR_MAX_HP).toBe(100);
    });

    it('should have max invasion turns of 30', () => {
      expect(MAX_INVASION_TURNS).toBe(30);
    });

    it('should require 2 secondary objectives for invader victory', () => {
      expect(SECONDARY_OBJECTIVES_FOR_VICTORY).toBe(2);
    });
  });

  describe('createInvasionState', () => {
    it('should create initial state with correct defaults', () => {
      const invaders = [makeInvader('a'), makeInvader('b')];
      const objectives = [makePrimaryObjective(), makeSecondaryObjective('StealTreasure')];

      const state = createInvasionState(invaders, objectives, 3);

      expect(state.invasionId).toBe('test-uuid');
      expect(state.currentTurn).toBe(0);
      expect(state.maxTurns).toBe(MAX_INVASION_TURNS);
      expect(state.altarHp).toBe(ALTAR_MAX_HP);
      expect(state.altarMaxHp).toBe(ALTAR_MAX_HP);
      expect(state.invaders).toHaveLength(2);
      expect(state.objectives).toHaveLength(2);
      expect(state.defenderCount).toBe(3);
      expect(state.defendersLost).toBe(0);
      expect(state.invadersKilled).toBe(0);
      expect(state.isActive).toBe(true);
    });

    it('should not share references with input arrays', () => {
      const invaders = [makeInvader('a')];
      const objectives = [makePrimaryObjective()];

      const state = createInvasionState(invaders, objectives, 1);
      invaders.push(makeInvader('b'));
      objectives.push(makeSecondaryObjective('StealTreasure'));

      expect(state.invaders).toHaveLength(1);
      expect(state.objectives).toHaveLength(1);
    });
  });

  describe('areAllInvadersEliminated', () => {
    it('should return false when invaders have HP', () => {
      const state = makeInvasionState();
      expect(areAllInvadersEliminated(state)).toBe(false);
    });

    it('should return true when all invaders have 0 HP', () => {
      const state = makeInvasionState({
        invaders: [makeInvader('a', 0), makeInvader('b', 0)],
      });
      expect(areAllInvadersEliminated(state)).toBe(true);
    });

    it('should return false when some invaders are alive', () => {
      const state = makeInvasionState({
        invaders: [makeInvader('a', 0), makeInvader('b', 5)],
      });
      expect(areAllInvadersEliminated(state)).toBe(false);
    });

    it('should return true for empty invader list', () => {
      const state = makeInvasionState({ invaders: [] });
      expect(areAllInvadersEliminated(state)).toBe(true);
    });
  });

  describe('isAltarDestroyed', () => {
    it('should return false when altar has HP', () => {
      const state = makeInvasionState({ altarHp: 50 });
      expect(isAltarDestroyed(state)).toBe(false);
    });

    it('should return true when altar HP is 0', () => {
      const state = makeInvasionState({ altarHp: 0 });
      expect(isAltarDestroyed(state)).toBe(true);
    });

    it('should return true when altar HP is negative', () => {
      const state = makeInvasionState({ altarHp: -10 });
      expect(isAltarDestroyed(state)).toBe(true);
    });
  });

  describe('areSecondaryObjectivesCompleted', () => {
    it('should return false when no secondaries completed', () => {
      const state = makeInvasionState();
      expect(areSecondaryObjectivesCompleted(state)).toBe(false);
    });

    it('should return false when only 1 secondary completed', () => {
      const state = makeInvasionState({
        objectives: [
          makePrimaryObjective(),
          makeSecondaryObjective('StealTreasure', true),
          makeSecondaryObjective('SlayMonster', false),
        ],
      });
      expect(areSecondaryObjectivesCompleted(state)).toBe(false);
    });

    it('should return true when 2 secondaries completed', () => {
      const state = makeInvasionState({
        objectives: [
          makePrimaryObjective(),
          makeSecondaryObjective('StealTreasure', true),
          makeSecondaryObjective('SlayMonster', true),
        ],
      });
      expect(areSecondaryObjectivesCompleted(state)).toBe(true);
    });

    it('should not count primary objective', () => {
      const state = makeInvasionState({
        objectives: [
          makePrimaryObjective(true),
          makeSecondaryObjective('StealTreasure', true),
          makeSecondaryObjective('SlayMonster', false),
        ],
      });
      expect(areSecondaryObjectivesCompleted(state)).toBe(false);
    });
  });

  describe('isTurnLimitReached', () => {
    it('should return false before turn limit', () => {
      const state = makeInvasionState({ currentTurn: 29 });
      expect(isTurnLimitReached(state)).toBe(false);
    });

    it('should return true at turn limit', () => {
      const state = makeInvasionState({ currentTurn: 30 });
      expect(isTurnLimitReached(state)).toBe(true);
    });

    it('should return true past turn limit', () => {
      const state = makeInvasionState({ currentTurn: 35 });
      expect(isTurnLimitReached(state)).toBe(true);
    });
  });

  describe('checkInvasionEnd', () => {
    it('should return null when invasion is ongoing', () => {
      const state = makeInvasionState();
      expect(checkInvasionEnd(state)).toBeUndefined();
    });

    it('should return null when invasion is already inactive', () => {
      const state = makeInvasionState({ isActive: false, altarHp: 0 });
      expect(checkInvasionEnd(state)).toBeUndefined();
    });

    it('should return altar_destroyed when altar HP is 0', () => {
      const state = makeInvasionState({ altarHp: 0 });
      expect(checkInvasionEnd(state)).toBe('altar_destroyed');
    });

    it('should return objectives_completed when 2 secondaries done', () => {
      const state = makeInvasionState({
        objectives: [
          makePrimaryObjective(),
          makeSecondaryObjective('StealTreasure', true),
          makeSecondaryObjective('SlayMonster', true),
        ],
      });
      expect(checkInvasionEnd(state)).toBe('objectives_completed');
    });

    it('should return all_invaders_eliminated when all dead', () => {
      const state = makeInvasionState({
        invaders: [makeInvader('a', 0), makeInvader('b', 0)],
      });
      expect(checkInvasionEnd(state)).toBe('all_invaders_eliminated');
    });

    it('should return turn_limit_reached at max turns', () => {
      const state = makeInvasionState({ currentTurn: 30 });
      expect(checkInvasionEnd(state)).toBe('turn_limit_reached');
    });

    it('should prioritize altar_destroyed over all_invaders_eliminated', () => {
      const state = makeInvasionState({
        altarHp: 0,
        invaders: [makeInvader('a', 0)],
      });
      expect(checkInvasionEnd(state)).toBe('altar_destroyed');
    });

    it('should prioritize altar_destroyed over turn_limit_reached', () => {
      const state = makeInvasionState({
        altarHp: 0,
        currentTurn: 30,
      });
      expect(checkInvasionEnd(state)).toBe('altar_destroyed');
    });

    it('should prioritize objectives_completed over all_invaders_eliminated', () => {
      const state = makeInvasionState({
        invaders: [makeInvader('a', 0)],
        objectives: [
          makePrimaryObjective(),
          makeSecondaryObjective('StealTreasure', true),
          makeSecondaryObjective('SlayMonster', true),
        ],
      });
      expect(checkInvasionEnd(state)).toBe('objectives_completed');
    });

    it('should prioritize all_invaders_eliminated over turn_limit_reached', () => {
      const state = makeInvasionState({
        invaders: [makeInvader('a', 0)],
        currentTurn: 30,
      });
      expect(checkInvasionEnd(state)).toBe('all_invaders_eliminated');
    });
  });

  describe('damageAltar', () => {
    it('should reduce altar HP by damage amount', () => {
      const state = makeInvasionState();
      const result = damageAltar(state, 25);
      expect(result.altarHp).toBe(75);
    });

    it('should clamp altar HP to 0', () => {
      const state = makeInvasionState({ altarHp: 10 });
      const result = damageAltar(state, 50);
      expect(result.altarHp).toBe(0);
    });

    it('should update DestroyAltar objective progress', () => {
      const state = makeInvasionState();
      const result = damageAltar(state, 40);
      const altarObj = result.objectives.find((o) => o.type === 'DestroyAltar');
      expect(altarObj?.progress).toBe(40);
      expect(altarObj?.isCompleted).toBe(false);
    });

    it('should mark DestroyAltar as completed at 0 HP', () => {
      const state = makeInvasionState();
      const result = damageAltar(state, 100);
      const altarObj = result.objectives.find((o) => o.type === 'DestroyAltar');
      expect(altarObj?.progress).toBe(100);
      expect(altarObj?.isCompleted).toBe(true);
    });

    it('should not mutate original state', () => {
      const state = makeInvasionState();
      damageAltar(state, 50);
      expect(state.altarHp).toBe(ALTAR_MAX_HP);
    });

    it('should not modify non-DestroyAltar objectives', () => {
      const state = makeInvasionState();
      const result = damageAltar(state, 50);
      const secondary = result.objectives.find((o) => o.type === 'StealTreasure');
      expect(secondary?.progress).toBe(0);
    });
  });

  describe('advanceInvasionTurn', () => {
    it('should increment turn counter', () => {
      const state = makeInvasionState({ currentTurn: 5 });
      const result = advanceInvasionTurn(state);
      expect(result.currentTurn).toBe(6);
    });

    it('should not mutate original state', () => {
      const state = makeInvasionState({ currentTurn: 5 });
      advanceInvasionTurn(state);
      expect(state.currentTurn).toBe(5);
    });
  });

  describe('markInvaderKilled', () => {
    it('should set invader HP to 0 and increment kill counter', () => {
      const state = makeInvasionState();
      const result = markInvaderKilled(state, 'inv-a');
      const invader = result.invaders.find((i) => i.id === 'inv-a');
      expect(invader?.currentHp).toBe(0);
      expect(result.invadersKilled).toBe(1);
    });

    it('should not modify other invaders', () => {
      const state = makeInvasionState();
      const result = markInvaderKilled(state, 'inv-a');
      const other = result.invaders.find((i) => i.id === 'inv-b');
      expect(other?.currentHp).toBe(10);
    });

    it('should not double-count already dead invaders', () => {
      const state = makeInvasionState({
        invaders: [makeInvader('a', 0), makeInvader('b', 10)],
        invadersKilled: 1,
      });
      const result = markInvaderKilled(state, 'a');
      expect(result.invadersKilled).toBe(1);
    });

    it('should return same state for unknown invader', () => {
      const state = makeInvasionState();
      const result = markInvaderKilled(state, 'nonexistent');
      expect(result).toBe(state);
    });

    it('should not mutate original state', () => {
      const state = makeInvasionState();
      markInvaderKilled(state, 'inv-a');
      expect(state.invadersKilled).toBe(0);
      expect(state.invaders[0].currentHp).toBe(10);
    });
  });

  describe('recordDefenderLoss', () => {
    it('should increment defenders lost counter', () => {
      const state = makeInvasionState({ defendersLost: 2 });
      const result = recordDefenderLoss(state);
      expect(result.defendersLost).toBe(3);
    });

    it('should not mutate original state', () => {
      const state = makeInvasionState();
      recordDefenderLoss(state);
      expect(state.defendersLost).toBe(0);
    });
  });

  describe('endInvasion', () => {
    it('should set isActive to false', () => {
      const state = makeInvasionState();
      const result = endInvasion(state);
      expect(result.isActive).toBe(false);
    });

    it('should not mutate original state', () => {
      const state = makeInvasionState();
      endInvasion(state);
      expect(state.isActive).toBe(true);
    });
  });

  describe('resolveDetailedResult', () => {
    it('should produce victory result when invaders eliminated', () => {
      const state = makeInvasionState({
        invaders: [makeInvader('a', 0)],
        invadersKilled: 1,
        currentTurn: 15,
        defenderCount: 5,
        defendersLost: 1,
      });

      const result = resolveDetailedResult(state, 42, 'all_invaders_eliminated');

      expect(result.invasionId).toBe('inv-1');
      expect(result.day).toBe(42);
      expect(result.outcome).toBe('victory');
      expect(result.endReason).toBe('all_invaders_eliminated');
      expect(result.turnsTaken).toBe(15);
      expect(result.invaderCount).toBe(1);
      expect(result.invadersKilled).toBe(1);
      expect(result.defenderCount).toBe(5);
      expect(result.defendersLost).toBe(1);
      expect(result.objectivesCompleted).toBe(0);
      expect(result.objectivesTotal).toBe(2);
      expect(result.rewardMultiplier).toBe(1.5);
    });

    it('should produce defeat result when altar destroyed', () => {
      const state = makeInvasionState({
        altarHp: 0,
        objectives: [
          makePrimaryObjective(true),
          makeSecondaryObjective('StealTreasure'),
          makeSecondaryObjective('SlayMonster'),
        ],
        currentTurn: 10,
      });

      const result = resolveDetailedResult(state, 50, 'altar_destroyed');

      expect(result.outcome).toBe('defeat');
      expect(result.endReason).toBe('altar_destroyed');
      expect(result.rewardMultiplier).toBe(0);
    });

    it('should count completed secondary objectives', () => {
      const state = makeInvasionState({
        objectives: [
          makePrimaryObjective(),
          makeSecondaryObjective('StealTreasure', true),
          makeSecondaryObjective('SlayMonster', false),
        ],
        invaders: [makeInvader('a', 0)],
        invadersKilled: 1,
        currentTurn: 20,
      });

      const result = resolveDetailedResult(state, 60, 'all_invaders_eliminated');

      expect(result.objectivesCompleted).toBe(1);
      expect(result.objectivesTotal).toBe(2);
      expect(result.rewardMultiplier).toBe(1.0);
    });

    it('should produce victory on turn limit', () => {
      const state = makeInvasionState({
        currentTurn: 30,
      });

      const result = resolveDetailedResult(state, 70, 'turn_limit_reached');

      expect(result.outcome).toBe('victory');
      expect(result.endReason).toBe('turn_limit_reached');
      expect(result.turnsTaken).toBe(30);
    });
  });

  describe('createHistoryEntry', () => {
    it('should create history entry from detailed result', () => {
      const result: ReturnType<typeof resolveDetailedResult> = {
        invasionId: 'inv-1',
        day: 42,
        outcome: 'victory',
        endReason: 'all_invaders_eliminated',
        turnsTaken: 15,
        invaderCount: 5,
        invadersKilled: 5,
        defenderCount: 3,
        defendersLost: 1,
        objectivesCompleted: 0,
        objectivesTotal: 2,
        rewardMultiplier: 1.5,
      };

      const entry = createHistoryEntry(result);

      expect(entry.day).toBe(42);
      expect(entry.type).toBe('scheduled');
      expect(entry.outcome).toBe('victory');
      expect(entry.endReason).toBe('all_invaders_eliminated');
      expect(entry.invaderCount).toBe(5);
      expect(entry.invadersKilled).toBe(5);
      expect(entry.defenderCount).toBe(3);
      expect(entry.defendersLost).toBe(1);
      expect(entry.turnsTaken).toBe(15);
    });

    it('should create defeat history entry', () => {
      const result: ReturnType<typeof resolveDetailedResult> = {
        invasionId: 'inv-2',
        day: 50,
        outcome: 'defeat',
        endReason: 'altar_destroyed',
        turnsTaken: 10,
        invaderCount: 8,
        invadersKilled: 3,
        defenderCount: 5,
        defendersLost: 4,
        objectivesCompleted: 1,
        objectivesTotal: 2,
        rewardMultiplier: 0,
      };

      const entry = createHistoryEntry(result);

      expect(entry.outcome).toBe('defeat');
      expect(entry.endReason).toBe('altar_destroyed');
    });
  });

  describe('full invasion flow', () => {
    it('should support a complete defender victory flow', () => {
      const invaders = [makeInvader('a', 5), makeInvader('b', 5)];
      const objectives = [
        makePrimaryObjective(),
        makeSecondaryObjective('StealTreasure'),
        makeSecondaryObjective('SlayMonster'),
      ];

      let state = createInvasionState(invaders, objectives, 3);

      // Turn 1: kill first invader
      state = advanceInvasionTurn(state);
      state = markInvaderKilled(state, 'a');
      expect(checkInvasionEnd(state)).toBeUndefined();

      // Turn 2: kill second invader
      state = advanceInvasionTurn(state);
      state = markInvaderKilled(state, 'b');
      const endReason = checkInvasionEnd(state);
      expect(endReason).toBe('all_invaders_eliminated');

      // Resolve
      state = endInvasion(state);
      const result = resolveDetailedResult(state, 35, endReason!);
      expect(result.outcome).toBe('victory');
      expect(result.turnsTaken).toBe(2);
      expect(result.invadersKilled).toBe(2);
    });

    it('should support a complete invader victory flow (altar destroyed)', () => {
      const invaders = [makeInvader('a', 20)];
      const objectives = [
        makePrimaryObjective(),
        makeSecondaryObjective('StealTreasure'),
        makeSecondaryObjective('SlayMonster'),
      ];

      let state = createInvasionState(invaders, objectives, 3);

      // Turns of altar damage
      for (let i = 0; i < 10; i++) {
        state = advanceInvasionTurn(state);
        state = damageAltar(state, 10);
      }

      const endReason = checkInvasionEnd(state);
      expect(endReason).toBe('altar_destroyed');

      state = endInvasion(state);
      const result = resolveDetailedResult(state, 40, endReason!);
      expect(result.outcome).toBe('defeat');
      expect(result.endReason).toBe('altar_destroyed');
      expect(result.turnsTaken).toBe(10);
    });

    it('should support turn limit defender victory', () => {
      const invaders = [makeInvader('a', 999)];
      const objectives = [
        makePrimaryObjective(),
        makeSecondaryObjective('StealTreasure'),
        makeSecondaryObjective('SlayMonster'),
      ];

      let state = createInvasionState(invaders, objectives, 3);

      // Advance to turn limit
      for (let i = 0; i < MAX_INVASION_TURNS; i++) {
        state = advanceInvasionTurn(state);
      }

      const endReason = checkInvasionEnd(state);
      expect(endReason).toBe('turn_limit_reached');

      state = endInvasion(state);
      const result = resolveDetailedResult(state, 45, endReason!);
      expect(result.outcome).toBe('victory');
      expect(result.turnsTaken).toBe(MAX_INVASION_TURNS);
    });
  });
});
