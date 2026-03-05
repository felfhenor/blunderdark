import { sortBy } from 'es-toolkit/compat';
import {
  combatAbilityApplyBerserkBuff,
  combatAbilityApplyShieldBuff,
  combatAbilityCheckEvasion,
  combatAbilityTickStates,
  combatAbilityTryActivate,
  getEffectDefinitions,
} from '@helpers/combat-abilities';
import { combatResolve } from '@helpers/combat';
import { contentGetEntry } from '@helpers/content';
import { gridManhattanDistance } from '@helpers/grid-math';
import type { AbilityState, AbilityTargetType, StatusEffect } from '@interfaces/combat';
import type {
  CombatAbilityContent,
  CombatAbilityId,
} from '@interfaces/content-combatability';
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
  abilityStates: AbilityState[] = [],
  statusEffects: StatusEffect[] = [],
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
    abilityStates,
    statusEffects,
  };
}

// --- Turn queue management ---

/**
 * Build a turn queue from combatants, sorted by speed (highest first).
 * Ties broken by defenders first.
 */
export function invasionCombatBuildTurnQueue(combatants: Combatant[]): TurnQueue {
  const sorted = sortBy(combatants, [
    (c) => -c.speed,
    (c) => (c.side === 'defender' ? 0 : 1),
  ]);

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
 * Also ticks ability cooldowns and status effect durations.
 * Returns a new TurnQueue (does not mutate).
 */
export function invasionCombatStartNewRound(queue: TurnQueue): TurnQueue {
  const aliveCombatants = queue.combatants
    .filter((c) => c.hp > 0)
    .map((c) => ({
      ...c,
      hasActed: false,
      abilityStates: combatAbilityTickStates(c.abilityStates),
      statusEffects: c.statusEffects
        .map((s) => ({ ...s, remainingDuration: s.remainingDuration - 1 }))
        .filter((s) => s.remainingDuration > 0),
    }));

  const sorted = sortBy(aliveCombatants, [
    (c) => -c.speed,
    (c) => (c.side === 'defender' ? 0 : 1),
  ]);

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
 * Get ability states that are off cooldown and ready to use.
 */
export function invasionCombatGetReadyAbilities(actor: Combatant): AbilityState[] {
  return actor.abilityStates.filter((s) => s.currentCooldown === 0);
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

  if (invasionCombatGetReadyAbilities(actor).length > 0) {
    actions.unshift('ability');
  }

  return actions;
}

// --- Ability helpers ---

/**
 * Look up the CombatAbilityContent for an ability state's abilityId.
 */
function resolveAbilityContent(abilityId: CombatAbilityId): CombatAbilityContent | undefined {
  return contentGetEntry<CombatAbilityContent>(abilityId);
}

/**
 * Classify an ability's role for AI decision-making.
 * Checks all effects and returns the highest-priority classification.
 */
function classifyAbility(ability: CombatAbilityContent): 'heal' | 'buff' | 'debuff' | 'damage' | 'scout' | 'other' {
  const effectDefs = getEffectDefinitions(ability);
  if (effectDefs.length === 0) return 'other';

  for (const effect of effectDefs) {
    if (effect.statusName === 'healing' || effect.statusName === 'resurrected') return 'heal';
  }
  for (const effect of effectDefs) {
    if (effect.statusName === 'shielded' || effect.statusName === 'courage') return 'buff';
  }
  for (const effect of effectDefs) {
    if (effect.statusName === 'stunned' || effect.statusName === 'marked' || effect.statusName === 'dispel') return 'debuff';
  }
  for (const effect of effectDefs) {
    if (effect.statusName === 'scouting') return 'scout';
  }
  for (const effect of effectDefs) {
    if (effect.dealsDamage) return 'damage';
  }

  return 'other';
}

/**
 * Check if a combatant has a specific status effect.
 */
export function combatantHasStatus(combatant: Combatant, statusName: string): boolean {
  return combatant.statusEffects.some((s) => s.name === statusName);
}

/**
 * Get the value of a mark status effect (damage amplification %).
 * Returns 0 if not marked.
 */
function getMarkAmplification(combatant: Combatant): number {
  if (!combatantHasStatus(combatant, 'marked')) return 0;
  // Default 20% amplification (matching Mark Target's value in YAML)
  return 20;
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
      abilityActivation: undefined,
    },
  };
}

/**
 * Execute an attack action with buff/evasion integration.
 * Checks defender evasion, applies attacker berserk/shield buffs, then resolves combat.
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
        abilityActivation: undefined,
      },
    };
  }

  // Resolve ability content for attacker and defender
  const attackerAbilities = attacker.abilityStates
    .map((s) => resolveAbilityContent(s.abilityId))
    .filter((a): a is CombatAbilityContent => a !== undefined);
  const defenderAbilities = defender.abilityStates
    .map((s) => resolveAbilityContent(s.abilityId))
    .filter((a): a is CombatAbilityContent => a !== undefined);

  // Check defender evasion (passive)
  const evaded = combatAbilityCheckEvasion(defenderAbilities, defender.abilityStates, rng);
  if (evaded) {
    // Mark evasion as activated for first-activation cost
    const updatedCombatants = queue.combatants.map((c) => {
      if (c.id !== defender.id) return c;
      const evasionAbility = defenderAbilities.find((a) => {
        const effects = getEffectDefinitions(a);
        return effects.some((e) => e.overrideTargetsHit === 0);
      });
      if (!evasionAbility) return c;
      const wasActivated = c.abilityStates.find((s) => s.abilityId === evasionAbility.id)?.passiveActivated ?? false;
      if (wasActivated) return c;
      // First activation: mark as activated and consume next turn
      return {
        ...c,
        abilityStates: c.abilityStates.map((s) =>
          s.abilityId === evasionAbility.id ? { ...s, passiveActivated: true } : s,
        ),
        hasActed: true,
      };
    });
    return {
      queue: { ...queue, combatants: updatedCombatants },
      result: {
        action: 'attack',
        actorId,
        targetId,
        targetPosition: defender.position ? { ...defender.position } : undefined,
        combatResult: { hit: false, roll: 0, damage: 0, defenderHp: defender.hp, defenderDead: false },
        abilityActivation: undefined,
      },
    };
  }

  // Apply attacker buffs (berserk, shield)
  const effectiveAttack = combatAbilityApplyBerserkBuff(
    attacker.attack,
    attackerAbilities,
    attacker.abilityStates,
    { attack: attacker.attack, defense: attacker.defense, hp: attacker.hp, maxHp: attacker.maxHp },
  );
  const effectiveDefense = combatAbilityApplyShieldBuff(
    defender.defense,
    defenderAbilities,
    defender.abilityStates,
  );

  // Check mark amplification on defender
  const markAmp = getMarkAmplification(defender);

  const combatResult = combatResolve(
    { attack: effectiveAttack, defense: attacker.defense, hp: attacker.hp, maxHp: attacker.maxHp },
    { attack: defender.attack, defense: effectiveDefense, hp: defender.hp, maxHp: defender.maxHp },
    rng,
  );

  // Apply mark amplification to damage
  if (combatResult.hit && markAmp > 0) {
    const amplifiedDamage = Math.round(combatResult.damage * (1 + markAmp / 100));
    const extraDamage = amplifiedDamage - combatResult.damage;
    combatResult.damage = amplifiedDamage;
    combatResult.defenderHp = Math.max(0, combatResult.defenderHp - extraDamage);
    combatResult.defenderDead = combatResult.defenderHp <= 0;
  }

  // Check berserk first-activation cost on attacker
  let updatedCombatants = queue.combatants.map((c) => {
    if (c.id === targetId) return { ...c, hp: combatResult.defenderHp };
    if (c.id !== actorId) return c;
    // Check if berserk just triggered for first time
    const berserkAbility = attackerAbilities.find((a) => {
      const effects = getEffectDefinitions(a);
      return effects.some((e) => e.statusName === 'berserk');
    });
    if (!berserkAbility) return c;
    const hpPercent = (c.hp / c.maxHp) * 100;
    if (hpPercent > berserkAbility.chance) return c;
    const wasActivated = c.abilityStates.find((s) => s.abilityId === berserkAbility.id)?.passiveActivated ?? false;
    if (wasActivated) return c;
    return {
      ...c,
      abilityStates: c.abilityStates.map((s) =>
        s.abilityId === berserkAbility.id ? { ...s, passiveActivated: true } : s,
      ),
    };
  });

  // Apply target HP update
  updatedCombatants = updatedCombatants.map((c) =>
    c.id === targetId ? { ...c, hp: combatResult.defenderHp } : c,
  );

  return {
    queue: { ...queue, combatants: updatedCombatants },
    result: {
      action: 'attack',
      actorId,
      targetId,
      targetPosition: defender.position ? { ...defender.position } : undefined,
      combatResult,
      abilityActivation: undefined,
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
    abilityActivation: undefined,
  };
}

/**
 * Execute an ability action. Resolves ability activation and applies all effects.
 * Does not mutate inputs.
 */
export function invasionCombatExecuteAbility(
  queue: TurnQueue,
  actorId: CombatantId,
  abilityId: CombatAbilityId,
  targetId: CombatantId | undefined,
  rng: () => number,
): { queue: TurnQueue; result: ActionResult } {
  const actor = queue.combatants.find((c) => c.id === actorId);
  const ability = resolveAbilityContent(abilityId);

  if (!actor || !ability) {
    return { queue, result: invasionCombatExecuteWait(actorId) };
  }

  const effectDefs = getEffectDefinitions(ability);
  if (effectDefs.length === 0) {
    return { queue, result: invasionCombatExecuteWait(actorId) };
  }

  const enemies = queue.combatants.filter((c) => c.hp > 0 && c.side !== actor.side);
  const allies = queue.combatants.filter((c) => c.hp > 0 && c.side === actor.side);
  const deadAllies = queue.combatants.filter((c) => c.hp <= 0 && c.side === actor.side);
  const abilityClass = classifyAbility(ability);

  // Determine targets for each effect based on its own targetType
  // For the proc roll, we use the largest target count
  let maxTargetCount = 0;
  for (const abilityEffect of ability.effects) {
    if (abilityEffect.targetType === 'aoe') {
      maxTargetCount = Math.max(maxTargetCount, abilityClass === 'buff' || abilityClass === 'heal' ? allies.length : enemies.length);
    } else {
      maxTargetCount = Math.max(maxTargetCount, 1);
    }
  }

  // Try to activate the ability (proc chance roll)
  const activationResult = combatAbilityTryActivate(
    ability,
    actor.abilityStates,
    { attack: actor.attack, defense: actor.defense, hp: actor.hp, maxHp: actor.maxHp },
    maxTargetCount,
    rng,
  );

  if (!activationResult) {
    // Failed proc — turn consumed, no effect
    const updatedCombatants = queue.combatants.map((c) =>
      c.id === actorId ? { ...c, abilityStates: actor.abilityStates } : c,
    );
    return {
      queue: { ...queue, combatants: updatedCombatants },
      result: {
        action: 'ability',
        actorId,
        targetId,
        targetPosition: undefined,
        combatResult: undefined,
        abilityActivation: undefined,
      },
    };
  }

  // Resolve targets per effect and assign targetIds
  const activation = activationResult.activation;
  for (let i = 0; i < activation.effects.length; i++) {
    const actEffect = activation.effects[i];
    const targets = resolveTargetsForEffect(actEffect, actor, enemies, allies, deadAllies, abilityClass, targetId, queue);
    actEffect.targetIds = targets.map((t) => t.id as string);
  }

  // Apply effects to combatants
  let updatedCombatants = queue.combatants.map((c) =>
    c.id === actorId ? { ...c, abilityStates: activationResult.updatedStates } : c,
  );

  // Apply each effect
  for (let i = 0; i < activation.effects.length; i++) {
    const actEffect = activation.effects[i];
    const abilityEffect = ability.effects[i];
    const effectDef = effectDefs[i];
    if (!effectDef || !abilityEffect) continue;

    const effectTargetIds = new Set(actEffect.targetIds);

    // Apply damage
    if (actEffect.damage > 0) {
      const damagePerTarget = actEffect.damage;
      updatedCombatants = updatedCombatants.map((c) => {
        if (!effectTargetIds.has(c.id as string)) return c;
        let finalDamage = damagePerTarget;
        if (effectDef.dealsDamage && abilityEffect.effectType !== 'Magic Damage') {
          finalDamage = Math.max(1, damagePerTarget - c.defense);
        }
        if (combatantHasStatus(c, 'marked')) {
          finalDamage = Math.round(finalDamage * (1 + getMarkAmplification(c) / 100));
        }
        const newHp = Math.max(0, c.hp - finalDamage);
        return { ...c, hp: newHp };
      });
    }

    // Apply status effects
    if (actEffect.statusApplied && actEffect.statusDuration > 0) {
      updatedCombatants = updatedCombatants.map((c) => {
        if (!effectTargetIds.has(c.id as string)) return c;
        const existing = c.statusEffects.find((s) => s.name === actEffect.statusApplied);
        if (existing) {
          return {
            ...c,
            statusEffects: c.statusEffects.map((s) =>
              s.name === actEffect.statusApplied ? { ...s, remainingDuration: actEffect.statusDuration } : s,
            ),
          };
        }
        return {
          ...c,
          statusEffects: [...c.statusEffects, { name: actEffect.statusApplied!, remainingDuration: actEffect.statusDuration }],
        };
      });
    }

    // Special: Heal (no status, just HP restore)
    if (effectDef.statusName === 'healing') {
      updatedCombatants = updatedCombatants.map((c) => {
        if (!effectTargetIds.has(c.id as string)) return c;
        const healAmount = Math.round(c.maxHp * (abilityEffect.value / 100));
        return { ...c, hp: Math.min(c.maxHp, c.hp + healAmount) };
      });
    }

    // Special: Resurrect
    if (effectDef.statusName === 'resurrected' && deadAllies.length > 0) {
      const reviveTarget = deadAllies[0];
      const reviveHp = Math.round(reviveTarget.maxHp * (abilityEffect.value / 100));
      updatedCombatants = updatedCombatants.map((c) =>
        c.id === reviveTarget.id ? { ...c, hp: Math.max(1, reviveHp) } : c,
      );
    }

    // Special: Dispel (remove all status effects from target)
    if (effectDef.statusName === 'dispel') {
      updatedCombatants = updatedCombatants.map((c) => {
        if (!effectTargetIds.has(c.id as string)) return c;
        return { ...c, statusEffects: [] };
      });
    }

    // Special: Fear Immunity (apply courage to all allies)
    if (effectDef.statusName === 'courage') {
      updatedCombatants = updatedCombatants.map((c) => {
        if (c.side !== actor.side || c.hp <= 0) return c;
        if (c.statusEffects.some((s) => s.name === 'courage')) return c;
        return { ...c, statusEffects: [...c.statusEffects, { name: 'courage', remainingDuration: 999 }] };
      });
    }
  }

  // Find first target for the action result
  const allTargetIds = activation.effects.flatMap((e) => e.targetIds);
  const firstTargetId = allTargetIds.length > 0 ? allTargetIds[0] as CombatantId : undefined;

  return {
    queue: { ...queue, combatants: updatedCombatants },
    result: {
      action: 'ability',
      actorId,
      targetId: firstTargetId,
      targetPosition: undefined,
      combatResult: undefined,
      abilityActivation: activation,
    },
  };
}

/**
 * Resolve targets for a single activation effect based on its targetType.
 */
function resolveTargetsForEffect(
  actEffect: { targetType: AbilityTargetType },
  actor: Combatant,
  enemies: Combatant[],
  allies: Combatant[],
  deadAllies: Combatant[],
  abilityClass: 'heal' | 'buff' | 'debuff' | 'damage' | 'scout' | 'other',
  targetId: CombatantId | undefined,
  queue: TurnQueue,
): Combatant[] {
  if (actEffect.targetType === 'self') {
    return [actor];
  }

  if (actEffect.targetType === 'aoe') {
    return abilityClass === 'buff' || abilityClass === 'heal' ? allies : enemies;
  }

  // single target
  // Check for resurrect — target dead allies
  if (deadAllies.length > 0) {
    const isResurrect = enemies.length === 0 && deadAllies.length > 0;
    if (isResurrect) return [deadAllies[0]];
  }

  if (abilityClass === 'heal') {
    const target = allies.find((c) => c.id === targetId);
    return target ? [target] : [];
  }

  const target = enemies.find((c) => c.id === targetId) ?? queue.combatants.find((c) => c.id === targetId);
  return target ? [target] : [];
}

// --- AI decision making ---

/**
 * Determine the best AI action for a combatant.
 * Priority: stunned → heal → buff → debuff → damage ability → scout → attack → move → wait
 */
export function invasionCombatResolveAiAction(
  actor: Combatant,
  allCombatants: Combatant[],
): { action: TurnAction; targetId: CombatantId | undefined; targetPosition: TilePosition | undefined; abilityId: CombatAbilityId | undefined } {
  // 0. Stunned combatants auto-wait
  if (combatantHasStatus(actor, 'stunned')) {
    return { action: 'wait', targetId: undefined, targetPosition: undefined, abilityId: undefined };
  }

  const readyAbilities = invasionCombatGetReadyAbilities(actor);
  const enemies = allCombatants.filter((c) => c.hp > 0 && c.side !== actor.side);
  const allies = allCombatants.filter((c) => c.hp > 0 && c.side === actor.side);
  const deadAllies = allCombatants.filter((c) => c.hp <= 0 && c.side === actor.side);

  // Evaluate ready abilities
  for (const state of readyAbilities) {
    const ability = resolveAbilityContent(state.abilityId);
    if (!ability) continue;
    const effectDefs = getEffectDefinitions(ability);
    if (effectDefs.length === 0) continue;
    const abilityClass = classifyAbility(ability);

    // Skip passives (evasion, berserk) — they trigger automatically, not via AI choice
    if (effectDefs.some((e) => e.overrideTargetsHit === 0)) continue; // evasion
    if (effectDefs.some((e) => e.statusName === 'berserk')) continue; // berserk

    // Skip disarm — handled at room entry, not during combat
    if (effectDefs.some((e) => e.statusName === 'disarm')) continue;

    // 1. Heal — if any ally below 50% HP
    if (abilityClass === 'heal' && effectDefs.some((e) => e.statusName === 'healing')) {
      const injuredAlly = sortBy(
        allies.filter((c) => c.hp / c.maxHp < 0.5),
        [(c) => c.hp / c.maxHp],
      )[0];
      if (injuredAlly) {
        return { action: 'ability', targetId: injuredAlly.id, targetPosition: undefined, abilityId: state.abilityId };
      }
    }

    // Resurrect — if any dead ally
    if (effectDefs.some((e) => e.statusName === 'resurrected') && deadAllies.length > 0) {
      return { action: 'ability', targetId: deadAllies[0].id, targetPosition: undefined, abilityId: state.abilityId };
    }
  }

  // 2. Buff self — if ready and not already active
  for (const state of readyAbilities) {
    const ability = resolveAbilityContent(state.abilityId);
    if (!ability) continue;
    const abilityClass = classifyAbility(ability);
    if (abilityClass !== 'buff') continue;
    const effectDefs = getEffectDefinitions(ability);
    if (effectDefs.length === 0) continue;
    // Skip berserk (passive)
    if (effectDefs.some((e) => e.statusName === 'berserk')) continue;
    // Skip if already has any of the buff statuses
    const alreadyBuffed = effectDefs.some((e) => e.statusName && combatantHasStatus(actor, e.statusName));
    if (alreadyBuffed) continue;

    return { action: 'ability', targetId: actor.id, targetPosition: undefined, abilityId: state.abilityId };
  }

  // 3. Debuff enemy — stun, mark, dispel
  for (const state of readyAbilities) {
    const ability = resolveAbilityContent(state.abilityId);
    if (!ability) continue;
    const abilityClass = classifyAbility(ability);
    if (abilityClass !== 'debuff') continue;
    if (enemies.length === 0) continue;

    const effectDefs = getEffectDefinitions(ability);
    // Determine which status this debuff applies
    const hasStun = effectDefs.some((e) => e.statusName === 'stunned');
    const hasMark = effectDefs.some((e) => e.statusName === 'marked');
    const statusToCheck = hasStun ? 'stunned' : hasMark ? 'marked' : '';
    const target = enemies.find((e) => !combatantHasStatus(e, statusToCheck));
    if (target) {
      return { action: 'ability', targetId: target.id, targetPosition: undefined, abilityId: state.abilityId };
    }
  }

  // 4. Damage ability — prefer AOE when multiple targets, prefer targets with enough HP
  for (const state of readyAbilities) {
    const ability = resolveAbilityContent(state.abilityId);
    if (!ability) continue;
    const effectDefs = getEffectDefinitions(ability);
    if (!effectDefs.some((e) => e.dealsDamage)) continue;
    if (enemies.length === 0) continue;

    // Check if any effect is AOE
    const hasAoe = ability.effects.some((e) => e.targetType === 'aoe');
    if (hasAoe) {
      return { action: 'ability', targetId: enemies[0].id, targetPosition: undefined, abilityId: state.abilityId };
    }
    // Single target: pick highest HP enemy (don't waste on nearly dead)
    const bestTarget = sortBy(enemies, [(e) => -e.hp])[0];
    if (bestTarget) {
      return { action: 'ability', targetId: bestTarget.id, targetPosition: undefined, abilityId: state.abilityId };
    }
  }

  // 5. Scout — use if ready and not yet used
  for (const state of readyAbilities) {
    const ability = resolveAbilityContent(state.abilityId);
    if (!ability) continue;
    const effectDefs = getEffectDefinitions(ability);
    if (!effectDefs.some((e) => e.statusName === 'scouting')) continue;
    return { action: 'ability', targetId: actor.id, targetPosition: undefined, abilityId: state.abilityId };
  }

  // 6. Attack adjacent enemy if possible
  const attackTargets = invasionCombatGetValidAttackTargets(actor, allCombatants);
  if (attackTargets.length > 0) {
    // Attack the weakest target
    const weakest = attackTargets.reduce((a, b) => (a.hp <= b.hp ? a : b));
    return { action: 'attack', targetId: weakest.id, targetPosition: undefined, abilityId: undefined };
  }

  // 7. Move toward nearest enemy
  if (enemies.length > 0 && actor.position) {
    const moveTargets = invasionCombatGetValidMoveTargets(actor, allCombatants);
    if (moveTargets.length > 0) {
      const nearestEnemy = findNearestEnemy(actor.position, enemies);
      if (nearestEnemy?.position) {
        const bestMove = findBestMoveToward(moveTargets, nearestEnemy.position);
        if (bestMove) {
          return { action: 'move', targetId: undefined, targetPosition: bestMove, abilityId: undefined };
        }
      }
    }
  }

  // 8. Wait
  return { action: 'wait', targetId: undefined, targetPosition: undefined, abilityId: undefined };
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

    case 'ability':
      if (decision.abilityId) {
        return invasionCombatExecuteAbility(queue, actor.id, decision.abilityId, decision.targetId, rng);
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

function findNearestEnemy(
  position: TilePosition,
  enemies: Combatant[],
): Combatant | undefined {
  let nearest: Combatant | undefined = undefined;
  let nearestDist = Infinity;

  for (const enemy of enemies) {
    if (!enemy.position) continue;
    const dist = gridManhattanDistance(position.x, position.y, enemy.position.x, enemy.position.y);
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
    const dist = gridManhattanDistance(target.x, target.y, goal.x, goal.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = target;
    }
  }

  return best;
}
