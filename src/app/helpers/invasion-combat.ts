import { combatResolve } from '@helpers/combat';
import type {
  ActionResult,
  Combatant,
  CombatantId,
  CombatantSide,
  TilePosition,
  TurnAction,
  TurnQueue,
} from '@interfaces/invasion';

// --- Combatant creation ---

/**
 * Create a combatant for the turn queue.
 */
export function invasionCombatCreateCombatant(
  id: CombatantId,
  side: CombatantSide,
  name: string,
  stats: { hp: number; maxHp: number; attack: number; defense: number; speed: number },
  position: TilePosition | undefined,
): Combatant {
  return {
    id,
    side,
    name,
    speed: stats.speed,
    hp: stats.hp,
    maxHp: stats.maxHp,
    attack: stats.attack,
    defense: stats.defense,
    hasActed: false,
    position,
  };
}

// --- Turn queue management ---

/**
 * Build a turn queue from combatants, sorted by speed (highest first).
 * Ties broken by defenders first.
 */
export function invasionCombatBuildTurnQueue(combatants: Combatant[]): TurnQueue {
  const sorted = [...combatants].sort((a, b) => {
    if (b.speed !== a.speed) return b.speed - a.speed;
    // Defenders go first on ties
    if (a.side === 'defender' && b.side === 'invader') return -1;
    if (a.side === 'invader' && b.side === 'defender') return 1;
    return 0;
  });

  return {
    combatants: sorted,
    currentIndex: 0,
    round: 1,
  };
}

/**
 * Get the current actor in the queue. Returns undefined if queue is empty or all dead.
 */
export function invasionCombatGetCurrentActor(queue: TurnQueue): Combatant | undefined {
  if (queue.combatants.length === 0) return undefined;

  // Find next alive, non-acted combatant from currentIndex
  for (let i = queue.currentIndex; i < queue.combatants.length; i++) {
    const c = queue.combatants[i];
    if (c.hp > 0 && !c.hasActed) return c;
  }

  return undefined;
}

/**
 * Advance to the next actor after the current one acts.
 * Returns a new TurnQueue (does not mutate).
 */
export function invasionCombatAdvanceTurn(queue: TurnQueue): TurnQueue {
  const updated = {
    ...queue,
    combatants: queue.combatants.map((c, i) =>
      i === queue.currentIndex ? { ...c, hasActed: true } : c,
    ),
  };

  // Find next alive, non-acted combatant
  for (let i = updated.currentIndex + 1; i < updated.combatants.length; i++) {
    if (updated.combatants[i].hp > 0 && !updated.combatants[i].hasActed) {
      return { ...updated, currentIndex: i };
    }
  }

  // No more actors this round
  return { ...updated, currentIndex: updated.combatants.length };
}

/**
 * Check if the current round is complete (all alive combatants have acted).
 */
export function invasionCombatIsRoundComplete(queue: TurnQueue): boolean {
  return queue.combatants
    .filter((c) => c.hp > 0)
    .every((c) => c.hasActed);
}

/**
 * Start a new round: reset hasActed, re-sort by speed, increment round counter.
 * Returns a new TurnQueue (does not mutate).
 */
export function invasionCombatStartNewRound(queue: TurnQueue): TurnQueue {
  const aliveCombatants = queue.combatants
    .filter((c) => c.hp > 0)
    .map((c) => ({ ...c, hasActed: false }));

  const sorted = [...aliveCombatants].sort((a, b) => {
    if (b.speed !== a.speed) return b.speed - a.speed;
    if (a.side === 'defender' && b.side === 'invader') return -1;
    if (a.side === 'invader' && b.side === 'defender') return 1;
    return 0;
  });

  return {
    combatants: sorted,
    currentIndex: 0,
    round: queue.round + 1,
  };
}

/**
 * Get alive combatants.
 */
export function invasionCombatGetAliveCombatants(queue: TurnQueue): Combatant[] {
  return queue.combatants.filter((c) => c.hp > 0);
}

// --- Position helpers ---

/**
 * Check if two positions are adjacent (cardinal directions only).
 */
export function invasionCombatArePositionsAdjacent(
  a: TilePosition,
  b: TilePosition,
): boolean {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

/**
 * Get cardinal adjacent positions.
 */
export function invasionCombatGetAdjacentPositions(pos: TilePosition): TilePosition[] {
  return [
    { x: pos.x, y: pos.y - 1 },
    { x: pos.x, y: pos.y + 1 },
    { x: pos.x - 1, y: pos.y },
    { x: pos.x + 1, y: pos.y },
  ];
}

// --- Action validation ---

/**
 * Get valid move targets for an actor (adjacent unoccupied tiles).
 */
export function invasionCombatGetValidMoveTargets(
  actor: Combatant,
  allCombatants: Combatant[],
): TilePosition[] {
  if (!actor.position) return [];

  const occupiedPositions = new Set(
    allCombatants
      .filter((c) => c.hp > 0 && c.id !== actor.id && c.position)
      .map((c) => `${c.position!.x},${c.position!.y}`),
  );

  return invasionCombatGetAdjacentPositions(actor.position).filter(
    (pos) => pos.x >= 0 && pos.y >= 0 && !occupiedPositions.has(`${pos.x},${pos.y}`),
  );
}

/**
 * Get valid attack targets for an actor (adjacent enemies).
 */
export function invasionCombatGetValidAttackTargets(
  actor: Combatant,
  allCombatants: Combatant[],
): Combatant[] {
  if (!actor.position) return [];

  return allCombatants.filter(
    (c) =>
      c.hp > 0 &&
      c.side !== actor.side &&
      c.position !== undefined &&
      invasionCombatArePositionsAdjacent(actor.position!, c.position),
  );
}

/**
 * Get available actions for a combatant.
 */
export function invasionCombatGetAvailableActions(
  actor: Combatant,
  allCombatants: Combatant[],
): TurnAction[] {
  const actions: TurnAction[] = ['wait'];

  if (invasionCombatGetValidMoveTargets(actor, allCombatants).length > 0) {
    actions.unshift('move');
  }

  if (invasionCombatGetValidAttackTargets(actor, allCombatants).length > 0) {
    actions.unshift('attack');
  }

  // Ability is available if there's an ability system; placeholder for now
  // Will be enabled when ability targeting is wired up

  return actions;
}

// --- Action execution ---

/**
 * Execute a move action. Returns updated queue and action result.
 * Does not mutate inputs.
 */
export function invasionCombatExecuteMove(
  queue: TurnQueue,
  actorId: CombatantId,
  target: TilePosition,
): { queue: TurnQueue; result: ActionResult } {
  const updatedCombatants = queue.combatants.map((c) =>
    c.id === actorId ? { ...c, position: { ...target } } : c,
  );

  return {
    queue: { ...queue, combatants: updatedCombatants },
    result: {
      action: 'move',
      actorId,
      targetId: undefined,
      targetPosition: { ...target },
      combatResult: undefined,
    },
  };
}

/**
 * Execute an attack action. Returns updated queue and action result.
 * Delegates to combat system for damage resolution.
 * Does not mutate inputs.
 */
export function invasionCombatExecuteAttack(
  queue: TurnQueue,
  actorId: CombatantId,
  targetId: CombatantId,
  rng: () => number,
): { queue: TurnQueue; result: ActionResult } {
  const attacker = queue.combatants.find((c) => c.id === actorId);
  const defender = queue.combatants.find((c) => c.id === targetId);

  if (!attacker || !defender) {
    return {
      queue,
      result: {
        action: 'attack',
        actorId,
        targetId,
        targetPosition: undefined,
        combatResult: undefined,
      },
    };
  }

  const combatResult = combatResolve(
    { attack: attacker.attack, defense: attacker.defense, hp: attacker.hp, maxHp: attacker.maxHp },
    { attack: defender.attack, defense: defender.defense, hp: defender.hp, maxHp: defender.maxHp },
    rng,
  );

  const updatedCombatants = queue.combatants.map((c) =>
    c.id === targetId
      ? { ...c, hp: combatResult.defenderHp }
      : c,
  );

  return {
    queue: { ...queue, combatants: updatedCombatants },
    result: {
      action: 'attack',
      actorId,
      targetId,
      targetPosition: defender.position ? { ...defender.position } : undefined,
      combatResult,
    },
  };
}

/**
 * Execute a wait action. Returns action result.
 */
export function invasionCombatExecuteWait(actorId: CombatantId): ActionResult {
  return {
    action: 'wait',
    actorId,
    targetId: undefined,
    targetPosition: undefined,
    combatResult: undefined,
  };
}

// --- AI decision making ---

/**
 * Determine the best AI action for an invader.
 * Priority: Attack adjacent defender > Move toward nearest defender > Wait.
 */
export function invasionCombatResolveAiAction(
  actor: Combatant,
  allCombatants: Combatant[],
): { action: TurnAction; targetId: CombatantId | undefined; targetPosition: TilePosition | undefined } {
  // 1. Attack adjacent defender if possible
  const attackTargets = invasionCombatGetValidAttackTargets(actor, allCombatants);
  if (attackTargets.length > 0) {
    // Attack the weakest target
    const weakest = attackTargets.reduce((a, b) => (a.hp <= b.hp ? a : b));
    return { action: 'attack', targetId: weakest.id, targetPosition: undefined };
  }

  // 2. Move toward nearest enemy
  const enemies = allCombatants.filter(
    (c) => c.hp > 0 && c.side !== actor.side && c.position !== undefined,
  );
  if (enemies.length > 0 && actor.position) {
    const moveTargets = invasionCombatGetValidMoveTargets(actor, allCombatants);
    if (moveTargets.length > 0) {
      // Find closest enemy and move toward them
      const nearestEnemy = findNearestEnemy(actor.position, enemies);
      if (nearestEnemy?.position) {
        const bestMove = findBestMoveToward(
          moveTargets,
          nearestEnemy.position,
        );
        if (bestMove) {
          return { action: 'move', targetId: undefined, targetPosition: bestMove };
        }
      }
    }
  }

  // 3. Wait
  return { action: 'wait', targetId: undefined, targetPosition: undefined };
}

/**
 * Execute an AI turn: determine action and apply it.
 * Returns updated queue and action result.
 */
export function invasionCombatExecuteAiTurn(
  queue: TurnQueue,
  rng: () => number,
): { queue: TurnQueue; result: ActionResult } {
  const actor = invasionCombatGetCurrentActor(queue);
  if (!actor) {
    return {
      queue,
      result: invasionCombatExecuteWait('unknown' as CombatantId),
    };
  }

  const decision = invasionCombatResolveAiAction(actor, queue.combatants);

  switch (decision.action) {
    case 'attack':
      if (decision.targetId) {
        return invasionCombatExecuteAttack(queue, actor.id, decision.targetId, rng);
      }
      return { queue, result: invasionCombatExecuteWait(actor.id) };

    case 'move':
      if (decision.targetPosition) {
        return invasionCombatExecuteMove(queue, actor.id, decision.targetPosition);
      }
      return { queue, result: invasionCombatExecuteWait(actor.id) };

    default:
      return { queue, result: invasionCombatExecuteWait(actor.id) };
  }
}

// --- Internal helpers ---

function manhattanDistance(a: TilePosition, b: TilePosition): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function findNearestEnemy(
  position: TilePosition,
  enemies: Combatant[],
): Combatant | undefined {
  let nearest: Combatant | undefined = undefined;
  let nearestDist = Infinity;

  for (const enemy of enemies) {
    if (!enemy.position) continue;
    const dist = manhattanDistance(position, enemy.position);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = enemy;
    }
  }

  return nearest;
}

function findBestMoveToward(
  moveTargets: TilePosition[],
  goal: TilePosition,
): TilePosition | undefined {
  let best: TilePosition | undefined = undefined;
  let bestDist = Infinity;

  for (const target of moveTargets) {
    const dist = manhattanDistance(target, goal);
    if (dist < bestDist) {
      bestDist = dist;
      best = target;
    }
  }

  return best;
}
