import { computed } from '@angular/core';
import { contentGetEntriesByType, contentGetEntry } from '@helpers/content';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type {
  GameState,
  ResearchContent,
  UnlockEffect,
  UnlockedContent,
} from '@interfaces';
import type { CombatAbilityId } from '@interfaces/content-combatability';
import type { InhabitantId } from '@interfaces/content-inhabitant';
import type { RoomId } from '@interfaces/content-room';
import type { UpgradePathId } from '@interfaces/room';
import { Subject } from 'rxjs';

// --- Unlock events ---

const researchUnlockSubject = new Subject<{
  nodeId: string;
  nodeName: string;
  unlocks: UnlockEffect[];
}>();

export const researchUnlock$ = researchUnlockSubject.asObservable();

// --- Query functions ---

/**
 * Check if content of a given type and ID is unlocked.
 */
export function researchUnlockIsUnlocked(
  type: 'room' | 'inhabitant' | 'ability' | 'upgrade',
  id: RoomId | InhabitantId | CombatAbilityId | UpgradePathId,
  unlockedContent?: UnlockedContent,
): boolean {
  const content = unlockedContent ?? gamestate().world.research.unlockedContent;
  switch (type) {
    case 'room':
      return content.rooms.includes(id as RoomId);
    case 'inhabitant':
      return content.inhabitants.includes(id as InhabitantId);
    case 'ability':
      return content.abilities.includes(id as CombatAbilityId);
    case 'upgrade':
      return content.upgrades.includes(id as UpgradePathId);
  }
}

/**
 * Get all passive bonuses of a given type from unlocked content.
 */
export function researchUnlockGetPassiveBonuses(
  bonusType: string,
  unlockedContent?: UnlockedContent,
): number {
  const content = unlockedContent ?? gamestate().world.research.unlockedContent;
  return content.passiveBonuses
    .filter((b) => b.bonusType === bonusType)
    .reduce((sum, b) => sum + b.value, 0);
}

/**
 * Computed signal for unlocked content.
 */
export const researchUnlockedContent = computed<UnlockedContent>(() => {
  return gamestate().world.research.unlockedContent;
});

/**
 * Get the research node name that unlocks a given content ID.
 * Used for UI display ("Requires: [Research Name]").
 */
export function researchUnlockGetRequiredResearchName(
  type: 'room' | 'inhabitant' | 'ability' | 'upgrade',
  id: string,
): string | undefined {
  const allNodes = contentGetEntriesByType<ResearchContent>('research');
  for (const node of allNodes) {
    for (const unlock of node.unlocks) {
      if (
        unlock.type === type &&
        'targetId' in unlock &&
        unlock.targetId === id
      ) {
        return node.name;
      }
    }
  }
  return undefined;
}

/**
 * Check if a room requires research to unlock (i.e., is referenced in any research node's unlocks).
 */
export function researchUnlockIsResearchGated(
  type: 'room' | 'inhabitant' | 'ability' | 'upgrade',
  id: string,
): boolean {
  const allNodes = contentGetEntriesByType<ResearchContent>('research');
  return allNodes.some((node) =>
    node.unlocks.some(
      (unlock) =>
        unlock.type === type && 'targetId' in unlock && unlock.targetId === id,
    ),
  );
}

// --- Apply unlock effects ---

/**
 * Process unlock effects from a completed research node.
 * Returns the updated UnlockedContent.
 */
export function researchUnlockApplyEffects(
  unlocks: UnlockEffect[],
  current: UnlockedContent,
): UnlockedContent {
  const result: UnlockedContent = {
    rooms: [...current.rooms],
    inhabitants: [...current.inhabitants],
    abilities: [...current.abilities],
    upgrades: [...current.upgrades],
    passiveBonuses: [...current.passiveBonuses],
  };

  for (const unlock of unlocks) {
    switch (unlock.type) {
      case 'room':
        if (!result.rooms.includes(unlock.targetId)) {
          result.rooms = [...result.rooms, unlock.targetId];
        }
        break;
      case 'inhabitant':
        if (!result.inhabitants.includes(unlock.targetId)) {
          result.inhabitants = [...result.inhabitants, unlock.targetId];
        }
        break;
      case 'ability':
        if (!result.abilities.includes(unlock.targetId)) {
          result.abilities = [...result.abilities, unlock.targetId];
        }
        break;
      case 'upgrade':
        if (!result.upgrades.includes(unlock.targetId)) {
          result.upgrades = [...result.upgrades, unlock.targetId];
        }
        break;
      case 'passive_bonus':
        result.passiveBonuses = [
          ...result.passiveBonuses,
          {
            bonusType: unlock.bonusType,
            value: unlock.value,
            description: unlock.description,
          },
        ];
        break;
    }
  }

  return result;
}

/**
 * Handle research completion: apply unlock effects to game state.
 * Called when a research node completes (subscribe to researchCompleted$).
 */
export async function researchUnlockOnComplete(nodeId: string): Promise<void> {
  const node = contentGetEntry<ResearchContent>(nodeId);
  if (!node || node.unlocks.length === 0) return;

  await updateGamestate((s) => {
    const updated = researchUnlockApplyEffects(
      node.unlocks,
      s.world.research.unlockedContent,
    );
    return {
      ...s,
      world: {
        ...s.world,
        research: {
          ...s.world.research,
          unlockedContent: updated,
        },
      },
    };
  });

  researchUnlockSubject.next({
    nodeId,
    nodeName: node.name,
    unlocks: node.unlocks,
  });
}

/**
 * Synchronous in-place mutation for research completion during game tick.
 * Called from researchProcess() when a node completes.
 * Applies unlock effects directly to the state being mutated and emits unlock event.
 */
export function researchUnlockProcessCompletion(
  nodeId: string,
  state: GameState,
): void {
  const node = contentGetEntry<ResearchContent>(nodeId);
  if (!node || node.unlocks.length === 0) return;

  state.world.research.unlockedContent = researchUnlockApplyEffects(
    node.unlocks,
    state.world.research.unlockedContent,
  );

  researchUnlockSubject.next({
    nodeId,
    nodeName: node.name,
    unlocks: node.unlocks,
  });
}
