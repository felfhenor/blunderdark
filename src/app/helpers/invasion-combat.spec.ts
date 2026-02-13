import { describe, expect, it } from 'vitest';
import type { Combatant, TilePosition, TurnQueue } from '@interfaces/invasion';
import {
  invasionCombatAdvanceTurn,
  invasionCombatArePositionsAdjacent,
  invasionCombatBuildTurnQueue,
  invasionCombatCreateCombatant,
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

// --- Helpers ---

function makeDefender(
  id: string,
  speed: number,
  position: TilePosition | undefined = undefined,
  hp = 20,
): Combatant {
  return invasionCombatCreateCombatant(id, 'defender', `Defender ${id}`, {
    hp,
    maxHp: 20,
    attack: 8,
    defense: 5,
    speed,
  }, position);
}

function makeInvader(
  id: string,
  speed: number,
  position: TilePosition | undefined = undefined,
  hp = 15,
): Combatant {
  return invasionCombatCreateCombatant(id, 'invader', `Invader ${id}`, {
    hp,
    maxHp: 15,
    attack: 6,
    defense: 4,
    speed,
  }, position);
}

function fixedRng(value: number): () => number {
  return () => value;
}

// --- Tests ---

describe('invasion-combat', () => {
  describe('invasionCombatCreateCombatant', () => {
    it('should create a combatant with correct fields', () => {
      const c = invasionCombatCreateCombatant('c1', 'defender', 'Goblin', {
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
      const c = invasionCombatCreateCombatant('c1', 'invader', 'Warrior', {
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
      const { queue: updated, result } = invasionCombatExecuteMove(queue, 'd1', { x: 5, y: 4 });

      expect(updated.combatants[0].position).toEqual({ x: 5, y: 4 });
      expect(result.action).toBe('move');
      expect(result.actorId).toBe('d1');
      expect(result.targetPosition).toEqual({ x: 5, y: 4 });
      expect(result.combatResult).toBeUndefined();
    });

    it('should not mutate original queue', () => {
      const queue = invasionCombatBuildTurnQueue([makeDefender('d1', 5, { x: 5, y: 5 })]);
      invasionCombatExecuteMove(queue, 'd1', { x: 5, y: 4 });
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
      const { queue: updated, result } = invasionCombatExecuteAttack(queue, 'd1', 'i1', fixedRng(0.95));

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
      const { result } = invasionCombatExecuteAttack(queue, 'd1', 'i1', fixedRng(0));

      expect(result.combatResult!.hit).toBe(false);
      expect(result.combatResult!.damage).toBe(0);
    });

    it('should not mutate original queue', () => {
      const queue = invasionCombatBuildTurnQueue([
        makeDefender('d1', 5, { x: 5, y: 5 }),
        makeInvader('i1', 3, { x: 5, y: 4 }),
      ]);
      invasionCombatExecuteAttack(queue, 'd1', 'i1', fixedRng(0.95));
      expect(queue.combatants.find((c) => c.id === 'i1')!.hp).toBe(15);
    });

    it('should handle unknown attacker gracefully', () => {
      const queue = invasionCombatBuildTurnQueue([makeDefender('d1', 5)]);
      const { result } = invasionCombatExecuteAttack(queue, 'nonexistent', 'd1', fixedRng(0.5));
      expect(result.combatResult).toBeUndefined();
    });
  });

  describe('invasionCombatExecuteWait', () => {
    it('should return a wait action result', () => {
      const result = invasionCombatExecuteWait('d1');
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
      const { queue: afterAttack } = invasionCombatExecuteAttack(queue, 'd1', 'i1', fixedRng(0.95));
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
