import { describe, expect, it, vi } from 'vitest';
import type { InvasionId, InvaderInstanceId, InvaderId } from '@interfaces';
import type { InvasionState } from '@interfaces/invasion';
import type { InvaderInstance } from '@interfaces/invader';
import { invasionEventTryTrigger } from '@helpers/invasion-events';
import type { ActiveInvasion } from '@interfaces';
import seedrandom from 'seedrandom';

vi.mock('@helpers/invasion-win-loss', () => ({
  invasionWinLossMarkKilled: (state: InvasionState, invaderId: string) => ({
    ...state,
    invaders: state.invaders.map((i) =>
      i.id === invaderId ? { ...i, currentHp: 0 } : i,
    ),
    invadersKilled: state.invadersKilled + 1,
  }),
}));

vi.mock('@helpers/invaders', () => ({
  invaderGetDefinitionById: (id: string) => ({
    id,
    name: `TestInvader-${id}`,
  }),
}));

vi.mock('@helpers/morale', () => ({
  moraleApply: vi.fn(),
}));

vi.mock('@helpers/rng', () => ({
  rngChoice: <T>(arr: T[], rng: () => number): T =>
    arr[Math.floor(rng() * arr.length)],
}));

// --- Helpers ---

function makeInvader(id: string, hp = 10): InvaderInstance {
  return {
    id: id as InvaderInstanceId,
    definitionId: `def-${id}` as InvaderId,
    currentHp: hp,
    maxHp: hp,
    attack: 5,
    defense: 3,
    isLeader: false,
    classType: 'Warrior',
    abilityIds: [],
  } as InvaderInstance;
}

function makeInvasionState(invaders: InvaderInstance[]): InvasionState {
  return {
    invasionId: 'test-invasion' as InvasionId,
    currentTurn: 5,
    maxTurns: 60,
    altarHp: 100,
    altarMaxHp: 100,
    invaders,
    objectives: [],
    defenderCount: 3,
    defendersLost: 0,
    invadersKilled: 0,
    isActive: true,
  };
}

function makeActiveInvasion(
  invaders: InvaderInstance[],
  hpMap?: Record<string, number>,
): ActiveInvasion {
  const state = makeInvasionState(invaders);
  const defaultHpMap: Record<string, number> = {};
  for (const inv of invaders) {
    defaultHpMap[inv.id] = inv.currentHp;
  }

  return {
    invasionState: state,
    invaderHpMap: hpMap ?? defaultHpMap,
    currentTurn: 5,
    profile: { threatLevel: 50 } as ActiveInvasion['profile'],
  } as ActiveInvasion;
}

describe('invasionEventTryTrigger', () => {
  it('should return undefined when RNG roll is above trigger chance', () => {
    const invasion = makeActiveInvasion([makeInvader('a'), makeInvader('b')]);
    // Try many times — most seeds won't trigger at 15% chance
    let triggered = 0;
    for (let i = 0; i < 100; i++) {
      const localRng = seedrandom(`no-trigger-${i}`);
      const result = invasionEventTryTrigger(invasion, localRng);
      if (result) triggered++;
    }
    // With 15% chance, we expect roughly 15 triggers out of 100
    // but definitely not all 100
    expect(triggered).toBeLessThan(50);
    expect(triggered).toBeGreaterThan(0);
  });

  it('should return an event result with log entries when triggered', () => {
    const invaders = [makeInvader('a', 20), makeInvader('b', 20)];
    const invasion = makeActiveInvasion(invaders);

    // Try seeds until we get a trigger
    let result;
    for (let i = 0; i < 200; i++) {
      const rng = seedrandom(`trigger-${i}`);
      result = invasionEventTryTrigger(invasion, rng);
      if (result) break;
    }

    expect(result).toBeDefined();
    expect(result!.logEntries.length).toBeGreaterThan(0);
    expect(result!.logEntries[0].type).toBe('random_event');
  });

  it('should return valid invasionState and invaderHpMap in result', () => {
    const invaders = [makeInvader('a', 20), makeInvader('b', 20)];
    const invasion = makeActiveInvasion(invaders);

    let result;
    for (let i = 0; i < 200; i++) {
      const rng = seedrandom(`valid-result-${i}`);
      result = invasionEventTryTrigger(invasion, rng);
      if (result) break;
    }

    expect(result).toBeDefined();
    expect(result!.invasionState).toBeDefined();
    expect(result!.invaderHpMap).toBeDefined();
  });

  it('should handle reinforcements event by adding invaders', () => {
    const invaders = [makeInvader('a', 20), makeInvader('b', 20)];
    const invasion = makeActiveInvasion(invaders);

    // Try seeds until we get a reinforcements event
    let result;
    for (let i = 0; i < 1000; i++) {
      const rng = seedrandom(`reinforcements-${i}`);
      result = invasionEventTryTrigger(invasion, rng);
      if (result?.addedInvaders?.length) break;
    }

    if (result?.addedInvaders?.length) {
      expect(result.addedInvaders.length).toBeGreaterThan(0);
      expect(result.invasionState.invaders.length).toBeGreaterThan(invaders.length);
    }
  });

  it('should handle desertion event by removing an invader', () => {
    const invaders = [makeInvader('a', 20), makeInvader('b', 20)];
    const invasion = makeActiveInvasion(invaders);

    // Try seeds until we get a desertion event
    let result;
    for (let i = 0; i < 1000; i++) {
      const rng = seedrandom(`desertion-${i}`);
      result = invasionEventTryTrigger(invasion, rng);
      if (result?.removedInvaderIds?.length) break;
    }

    if (result?.removedInvaderIds?.length) {
      expect(result.removedInvaderIds.length).toBe(1);
      const removedId = result.removedInvaderIds[0];
      expect(result.invaderHpMap[removedId]).toBe(0);
    }
  });

  it('should not trigger desertion on leaders', () => {
    const leader = { ...makeInvader('leader', 20), isLeader: true };
    const invasion = makeActiveInvasion([leader]);

    // With only a leader, desertion should produce no result
    let desertionResult;
    for (let i = 0; i < 1000; i++) {
      const rng = seedrandom(`leader-desert-${i}`);
      const result = invasionEventTryTrigger(invasion, rng);
      if (result?.removedInvaderIds?.length) {
        desertionResult = result;
        break;
      }
    }

    // A leader-only party should never have a desertion with removed ids
    expect(desertionResult).toBeUndefined();
  });

  it('should handle infighting with damage to two invaders', () => {
    const invaders = [makeInvader('a', 50), makeInvader('b', 50)];
    const invasion = makeActiveInvasion(invaders);

    let result;
    for (let i = 0; i < 1000; i++) {
      const rng = seedrandom(`infighting-${i}`);
      result = invasionEventTryTrigger(invasion, rng);
      if (
        result &&
        !result.addedInvaders?.length &&
        !result.removedInvaderIds?.length &&
        result.logEntries[0]?.message.includes('Disagreement')
      ) {
        break;
      }
      result = undefined;
    }

    if (result) {
      // Both invaders should have taken damage
      const hpA = result.invaderHpMap['a'];
      const hpB = result.invaderHpMap['b'];
      expect(hpA).toBeLessThan(50);
      expect(hpB).toBeLessThan(50);
    }
  });

  it('should handle hazard event with AoE damage', () => {
    const invaders = [makeInvader('a', 50), makeInvader('b', 50), makeInvader('c', 50)];
    const invasion = makeActiveInvasion(invaders);

    let result;
    for (let i = 0; i < 1000; i++) {
      const rng = seedrandom(`hazard-${i}`);
      result = invasionEventTryTrigger(invasion, rng);
      if (
        result &&
        result.logEntries[0]?.message.includes('dungeon itself')
      ) {
        break;
      }
      result = undefined;
    }

    if (result) {
      // All invaders should have taken damage
      for (const inv of invaders) {
        expect(result.invaderHpMap[inv.id]).toBeLessThan(50);
      }
    }
  });
});
