import { describe, expect, it, vi } from 'vitest';
import type { InvasionId, InvasionObjectiveId, InvaderInstanceId, InvaderId } from '@interfaces';
import type { InvasionState } from '@interfaces/invasion';
import type { InvaderInstance } from '@interfaces/invader';
import type { InvasionObjective } from '@interfaces/invasion-objective';
import {
  INVASION_WIN_LOSS_ALTAR_MAX_HP,
  INVASION_WIN_LOSS_MAX_TURNS,
  INVASION_WIN_LOSS_SECONDARY_OBJECTIVES_FOR_VICTORY,
  invasionWinLossAdvanceTurn,
  invasionWinLossAreAllEliminated,
  invasionWinLossAreSecondaryObjectivesCompleted,
  invasionWinLossCheckEnd,
  invasionWinLossCreateHistoryEntry,
  invasionWinLossCreateState,
  invasionWinLossDamageAltar,
  invasionWinLossEnd,
  invasionWinLossIsAltarDestroyed,
  invasionWinLossIsTurnLimitReached,
  invasionWinLossMarkKilled,
  invasionWinLossRecordDefenderLoss,
  invasionWinLossResolveDetailedResult,
} from '@helpers/invasion-win-loss';

vi.mock('@helpers/rng', () => ({
  rngUuid: () => 'test-uuid',
}));

vi.mock('@helpers/invasion-objectives', () => ({
  invasionObjectiveResolveOutcome: (objectives: InvasionObjective[]) => {
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
    id: id as InvaderInstanceId,
    definitionId: 'def-1' as InvaderId,
    currentHp: hp,
    maxHp: hp,
    statusEffects: [],
    abilityStates: [],
  };
}

function makePrimaryObjective(completed = false): InvasionObjective {
  return {
    id: 'obj-primary' as InvasionObjectiveId,
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
    id: `obj-${type}` as InvasionObjectiveId,
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
    invasionId: 'inv-1' as InvasionId,
    currentTurn: 0,
    maxTurns: INVASION_WIN_LOSS_MAX_TURNS,
    altarHp: INVASION_WIN_LOSS_ALTAR_MAX_HP,
    altarMaxHp: INVASION_WIN_LOSS_ALTAR_MAX_HP,
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
      expect(INVASION_WIN_LOSS_ALTAR_MAX_HP).toBe(100);
    });

    it('should have max invasion turns of 30', () => {
      expect(INVASION_WIN_LOSS_MAX_TURNS).toBe(30);
    });

    it('should require 2 secondary objectives for invader victory', () => {
      expect(INVASION_WIN_LOSS_SECONDARY_OBJECTIVES_FOR_VICTORY).toBe(2);
    });
  });

  describe('invasionWinLossCreateState', () => {
    it('should create initial state with correct defaults', () => {
      const invaders = [makeInvader('a'), makeInvader('b')];
      const objectives = [makePrimaryObjective(), makeSecondaryObjective('StealTreasure')];

      const state = invasionWinLossCreateState(invaders, objectives, 3);

      expect(state.invasionId).toBe('test-uuid');
      expect(state.currentTurn).toBe(0);
      expect(state.maxTurns).toBe(INVASION_WIN_LOSS_MAX_TURNS);
      expect(state.altarHp).toBe(INVASION_WIN_LOSS_ALTAR_MAX_HP);
      expect(state.altarMaxHp).toBe(INVASION_WIN_LOSS_ALTAR_MAX_HP);
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

      const state = invasionWinLossCreateState(invaders, objectives, 1);
      invaders.push(makeInvader('b'));
      objectives.push(makeSecondaryObjective('StealTreasure'));

      expect(state.invaders).toHaveLength(1);
      expect(state.objectives).toHaveLength(1);
    });
  });

  describe('invasionWinLossAreAllEliminated', () => {
    it('should return false when invaders have HP', () => {
      const state = makeInvasionState();
      expect(invasionWinLossAreAllEliminated(state)).toBe(false);
    });

    it('should return true when all invaders have 0 HP', () => {
      const state = makeInvasionState({
        invaders: [makeInvader('a', 0), makeInvader('b', 0)],
      });
      expect(invasionWinLossAreAllEliminated(state)).toBe(true);
    });

    it('should return false when some invaders are alive', () => {
      const state = makeInvasionState({
        invaders: [makeInvader('a', 0), makeInvader('b', 5)],
      });
      expect(invasionWinLossAreAllEliminated(state)).toBe(false);
    });

    it('should return true for empty invader list', () => {
      const state = makeInvasionState({ invaders: [] });
      expect(invasionWinLossAreAllEliminated(state)).toBe(true);
    });
  });

  describe('invasionWinLossIsAltarDestroyed', () => {
    it('should return false when altar has HP', () => {
      const state = makeInvasionState({ altarHp: 50 });
      expect(invasionWinLossIsAltarDestroyed(state)).toBe(false);
    });

    it('should return true when altar HP is 0', () => {
      const state = makeInvasionState({ altarHp: 0 });
      expect(invasionWinLossIsAltarDestroyed(state)).toBe(true);
    });

    it('should return true when altar HP is negative', () => {
      const state = makeInvasionState({ altarHp: -10 });
      expect(invasionWinLossIsAltarDestroyed(state)).toBe(true);
    });
  });

  describe('invasionWinLossAreSecondaryObjectivesCompleted', () => {
    it('should return false when no secondaries completed', () => {
      const state = makeInvasionState();
      expect(invasionWinLossAreSecondaryObjectivesCompleted(state)).toBe(false);
    });

    it('should return false when only 1 secondary completed', () => {
      const state = makeInvasionState({
        objectives: [
          makePrimaryObjective(),
          makeSecondaryObjective('StealTreasure', true),
          makeSecondaryObjective('SlayMonster', false),
        ],
      });
      expect(invasionWinLossAreSecondaryObjectivesCompleted(state)).toBe(false);
    });

    it('should return true when 2 secondaries completed', () => {
      const state = makeInvasionState({
        objectives: [
          makePrimaryObjective(),
          makeSecondaryObjective('StealTreasure', true),
          makeSecondaryObjective('SlayMonster', true),
        ],
      });
      expect(invasionWinLossAreSecondaryObjectivesCompleted(state)).toBe(true);
    });

    it('should not count primary objective', () => {
      const state = makeInvasionState({
        objectives: [
          makePrimaryObjective(true),
          makeSecondaryObjective('StealTreasure', true),
          makeSecondaryObjective('SlayMonster', false),
        ],
      });
      expect(invasionWinLossAreSecondaryObjectivesCompleted(state)).toBe(false);
    });
  });

  describe('invasionWinLossIsTurnLimitReached', () => {
    it('should return false before turn limit', () => {
      const state = makeInvasionState({ currentTurn: 29 });
      expect(invasionWinLossIsTurnLimitReached(state)).toBe(false);
    });

    it('should return true at turn limit', () => {
      const state = makeInvasionState({ currentTurn: 30 });
      expect(invasionWinLossIsTurnLimitReached(state)).toBe(true);
    });

    it('should return true past turn limit', () => {
      const state = makeInvasionState({ currentTurn: 35 });
      expect(invasionWinLossIsTurnLimitReached(state)).toBe(true);
    });
  });

  describe('invasionWinLossCheckEnd', () => {
    it('should return null when invasion is ongoing', () => {
      const state = makeInvasionState();
      expect(invasionWinLossCheckEnd(state)).toBeUndefined();
    });

    it('should return null when invasion is already inactive', () => {
      const state = makeInvasionState({ isActive: false, altarHp: 0 });
      expect(invasionWinLossCheckEnd(state)).toBeUndefined();
    });

    it('should return altar_destroyed when altar HP is 0', () => {
      const state = makeInvasionState({ altarHp: 0 });
      expect(invasionWinLossCheckEnd(state)).toBe('altar_destroyed');
    });

    it('should return objectives_completed when 2 secondaries done', () => {
      const state = makeInvasionState({
        objectives: [
          makePrimaryObjective(),
          makeSecondaryObjective('StealTreasure', true),
          makeSecondaryObjective('SlayMonster', true),
        ],
      });
      expect(invasionWinLossCheckEnd(state)).toBe('objectives_completed');
    });

    it('should return all_invaders_eliminated when all dead', () => {
      const state = makeInvasionState({
        invaders: [makeInvader('a', 0), makeInvader('b', 0)],
      });
      expect(invasionWinLossCheckEnd(state)).toBe('all_invaders_eliminated');
    });

    it('should return turn_limit_reached at max turns', () => {
      const state = makeInvasionState({ currentTurn: 30 });
      expect(invasionWinLossCheckEnd(state)).toBe('turn_limit_reached');
    });

    it('should prioritize altar_destroyed over all_invaders_eliminated', () => {
      const state = makeInvasionState({
        altarHp: 0,
        invaders: [makeInvader('a', 0)],
      });
      expect(invasionWinLossCheckEnd(state)).toBe('altar_destroyed');
    });

    it('should prioritize altar_destroyed over turn_limit_reached', () => {
      const state = makeInvasionState({
        altarHp: 0,
        currentTurn: 30,
      });
      expect(invasionWinLossCheckEnd(state)).toBe('altar_destroyed');
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
      expect(invasionWinLossCheckEnd(state)).toBe('objectives_completed');
    });

    it('should prioritize all_invaders_eliminated over turn_limit_reached', () => {
      const state = makeInvasionState({
        invaders: [makeInvader('a', 0)],
        currentTurn: 30,
      });
      expect(invasionWinLossCheckEnd(state)).toBe('all_invaders_eliminated');
    });
  });

  describe('invasionWinLossDamageAltar', () => {
    it('should reduce altar HP by damage amount', () => {
      const state = makeInvasionState();
      const result = invasionWinLossDamageAltar(state, 25);
      expect(result.altarHp).toBe(75);
    });

    it('should clamp altar HP to 0', () => {
      const state = makeInvasionState({ altarHp: 10 });
      const result = invasionWinLossDamageAltar(state, 50);
      expect(result.altarHp).toBe(0);
    });

    it('should update DestroyAltar objective progress', () => {
      const state = makeInvasionState();
      const result = invasionWinLossDamageAltar(state, 40);
      const altarObj = result.objectives.find((o) => o.type === 'DestroyAltar');
      expect(altarObj?.progress).toBe(40);
      expect(altarObj?.isCompleted).toBe(false);
    });

    it('should mark DestroyAltar as completed at 0 HP', () => {
      const state = makeInvasionState();
      const result = invasionWinLossDamageAltar(state, 100);
      const altarObj = result.objectives.find((o) => o.type === 'DestroyAltar');
      expect(altarObj?.progress).toBe(100);
      expect(altarObj?.isCompleted).toBe(true);
    });

    it('should not mutate original state', () => {
      const state = makeInvasionState();
      invasionWinLossDamageAltar(state, 50);
      expect(state.altarHp).toBe(INVASION_WIN_LOSS_ALTAR_MAX_HP);
    });

    it('should not modify non-DestroyAltar objectives', () => {
      const state = makeInvasionState();
      const result = invasionWinLossDamageAltar(state, 50);
      const secondary = result.objectives.find((o) => o.type === 'StealTreasure');
      expect(secondary?.progress).toBe(0);
    });
  });

  describe('invasionWinLossAdvanceTurn', () => {
    it('should increment turn counter', () => {
      const state = makeInvasionState({ currentTurn: 5 });
      const result = invasionWinLossAdvanceTurn(state);
      expect(result.currentTurn).toBe(6);
    });

    it('should not mutate original state', () => {
      const state = makeInvasionState({ currentTurn: 5 });
      invasionWinLossAdvanceTurn(state);
      expect(state.currentTurn).toBe(5);
    });
  });

  describe('invasionWinLossMarkKilled', () => {
    it('should set invader HP to 0 and increment kill counter', () => {
      const state = makeInvasionState();
      const result = invasionWinLossMarkKilled(state, 'inv-a');
      const invader = result.invaders.find((i) => i.id === 'inv-a');
      expect(invader?.currentHp).toBe(0);
      expect(result.invadersKilled).toBe(1);
    });

    it('should not modify other invaders', () => {
      const state = makeInvasionState();
      const result = invasionWinLossMarkKilled(state, 'inv-a');
      const other = result.invaders.find((i) => i.id === 'inv-b');
      expect(other?.currentHp).toBe(10);
    });

    it('should not double-count already dead invaders', () => {
      const state = makeInvasionState({
        invaders: [makeInvader('a', 0), makeInvader('b', 10)],
        invadersKilled: 1,
      });
      const result = invasionWinLossMarkKilled(state, 'a');
      expect(result.invadersKilled).toBe(1);
    });

    it('should return same state for unknown invader', () => {
      const state = makeInvasionState();
      const result = invasionWinLossMarkKilled(state, 'nonexistent');
      expect(result).toBe(state);
    });

    it('should not mutate original state', () => {
      const state = makeInvasionState();
      invasionWinLossMarkKilled(state, 'inv-a');
      expect(state.invadersKilled).toBe(0);
      expect(state.invaders[0].currentHp).toBe(10);
    });
  });

  describe('invasionWinLossRecordDefenderLoss', () => {
    it('should increment defenders lost counter', () => {
      const state = makeInvasionState({ defendersLost: 2 });
      const result = invasionWinLossRecordDefenderLoss(state);
      expect(result.defendersLost).toBe(3);
    });

    it('should not mutate original state', () => {
      const state = makeInvasionState();
      invasionWinLossRecordDefenderLoss(state);
      expect(state.defendersLost).toBe(0);
    });
  });

  describe('invasionWinLossEnd', () => {
    it('should set isActive to false', () => {
      const state = makeInvasionState();
      const result = invasionWinLossEnd(state);
      expect(result.isActive).toBe(false);
    });

    it('should not mutate original state', () => {
      const state = makeInvasionState();
      invasionWinLossEnd(state);
      expect(state.isActive).toBe(true);
    });
  });

  describe('invasionWinLossResolveDetailedResult', () => {
    it('should produce victory result when invaders eliminated', () => {
      const state = makeInvasionState({
        invaders: [makeInvader('a', 0)],
        invadersKilled: 1,
        currentTurn: 15,
        defenderCount: 5,
        defendersLost: 1,
      });

      const result = invasionWinLossResolveDetailedResult(state, 42, 'all_invaders_eliminated');

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

      const result = invasionWinLossResolveDetailedResult(state, 50, 'altar_destroyed');

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

      const result = invasionWinLossResolveDetailedResult(state, 60, 'all_invaders_eliminated');

      expect(result.objectivesCompleted).toBe(1);
      expect(result.objectivesTotal).toBe(2);
      expect(result.rewardMultiplier).toBe(1.0);
    });

    it('should produce victory on turn limit', () => {
      const state = makeInvasionState({
        currentTurn: 30,
      });

      const result = invasionWinLossResolveDetailedResult(state, 70, 'turn_limit_reached');

      expect(result.outcome).toBe('victory');
      expect(result.endReason).toBe('turn_limit_reached');
      expect(result.turnsTaken).toBe(30);
    });
  });

  describe('invasionWinLossCreateHistoryEntry', () => {
    it('should create history entry from detailed result', () => {
      const result: ReturnType<typeof invasionWinLossResolveDetailedResult> = {
        invasionId: 'inv-1' as InvasionId,
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

      const entry = invasionWinLossCreateHistoryEntry(result);

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
      const result: ReturnType<typeof invasionWinLossResolveDetailedResult> = {
        invasionId: 'inv-2' as InvasionId,
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

      const entry = invasionWinLossCreateHistoryEntry(result);

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

      let state = invasionWinLossCreateState(invaders, objectives, 3);

      // Turn 1: kill first invader
      state = invasionWinLossAdvanceTurn(state);
      state = invasionWinLossMarkKilled(state, 'a');
      expect(invasionWinLossCheckEnd(state)).toBeUndefined();

      // Turn 2: kill second invader
      state = invasionWinLossAdvanceTurn(state);
      state = invasionWinLossMarkKilled(state, 'b');
      const endReason = invasionWinLossCheckEnd(state);
      expect(endReason).toBe('all_invaders_eliminated');

      // Resolve
      state = invasionWinLossEnd(state);
      const result = invasionWinLossResolveDetailedResult(state, 35, endReason!);
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

      let state = invasionWinLossCreateState(invaders, objectives, 3);

      // Turns of altar damage
      for (let i = 0; i < 10; i++) {
        state = invasionWinLossAdvanceTurn(state);
        state = invasionWinLossDamageAltar(state, 10);
      }

      const endReason = invasionWinLossCheckEnd(state);
      expect(endReason).toBe('altar_destroyed');

      state = invasionWinLossEnd(state);
      const result = invasionWinLossResolveDetailedResult(state, 40, endReason!);
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

      let state = invasionWinLossCreateState(invaders, objectives, 3);

      // Advance to turn limit
      for (let i = 0; i < INVASION_WIN_LOSS_MAX_TURNS; i++) {
        state = invasionWinLossAdvanceTurn(state);
      }

      const endReason = invasionWinLossCheckEnd(state);
      expect(endReason).toBe('turn_limit_reached');

      state = invasionWinLossEnd(state);
      const result = invasionWinLossResolveDetailedResult(state, 45, endReason!);
      expect(result.outcome).toBe('victory');
      expect(result.turnsTaken).toBe(INVASION_WIN_LOSS_MAX_TURNS);
    });
  });
});
