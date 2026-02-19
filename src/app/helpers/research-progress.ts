import { computed } from '@angular/core';
import { contentGetEntriesByType, contentGetEntry } from '@helpers/content';
import { researchUnlockProcessCompletion } from '@helpers/research-unlocks';
import { resourceCanAfford, resourcePayCost } from '@helpers/resources';
import { gamestate, updateGamestate } from '@helpers/state-game';
import { throneRoomGetRulerBonusValue } from '@helpers/throne-room';
import type {
  GameState,
  ResearchId,
  ResearchContent,
  ResearchState,
} from '@interfaces';
import type { RoomContent } from '@interfaces/content-room';
import { Subject } from 'rxjs';

/** Base progress per tick before modifiers */
export const RESEARCH_BASE_PROGRESS_PER_TICK = 1;

/** Flat research speed bonus per Library room that produces research */
export const RESEARCH_LIBRARY_BONUS_PER_ROOM = 0.1;

// --- Research completion events ---

const researchCompletedSubject = new Subject<{
  nodeId: string;
  nodeName: string;
}>();

export const researchCompleted$ = researchCompletedSubject.asObservable();

// --- Pure helper functions ---

/**
 * Check if all prerequisites for a research node are completed.
 */
export function researchArePrerequisitesMet(
  node: ResearchContent,
  completedNodes: string[],
): boolean {
  return node.prerequisiteResearchIds.every((id) =>
    completedNodes.includes(id),
  );
}

/**
 * Check if a research node can be started.
 * Returns { canStart, error? } for UI feedback.
 */
export function researchCanStart(
  nodeId: ResearchId,
  research: ResearchState,
): { canStart: boolean; error?: string } {
  if (research.activeResearch) {
    return { canStart: false, error: 'Another research is already active' };
  }

  const node = contentGetEntry<ResearchContent>(nodeId);
  if (!node) {
    return { canStart: false, error: 'Research node not found' };
  }

  if (research.completedNodes.includes(nodeId)) {
    return { canStart: false, error: 'Research already completed' };
  }

  if (!researchArePrerequisitesMet(node, research.completedNodes)) {
    return {
      canStart: false,
      error: 'Prerequisites not met',
    };
  }

  if (!resourceCanAfford(node.cost)) {
    return { canStart: false, error: 'Insufficient resources' };
  }

  return { canStart: true };
}

/**
 * Start research on a node. Validates prerequisites and deducts resources.
 */
export async function researchStart(
  nodeId: ResearchId,
): Promise<{ success: boolean; error?: string }> {
  const state = gamestate();
  const validation = researchCanStart(nodeId, state.world.research);
  if (!validation.canStart) {
    return { success: false, error: validation.error };
  }

  const node = contentGetEntry<ResearchContent>(nodeId)!;

  const paid = await resourcePayCost(node.cost);
  if (!paid) {
    return { success: false, error: 'Failed to deduct resources' };
  }

  await updateGamestate((s) => ({
    ...s,
    world: {
      ...s.world,
      research: {
        ...s.world.research,
        activeResearch: nodeId,
        activeResearchProgress: 0,
        activeResearchStartTick: s.clock.numTicks,
      },
    },
  }));

  return { success: true };
}

/**
 * Cancel active research. Progress is lost, resources are NOT refunded.
 */
export async function researchCancel(): Promise<boolean> {
  const state = gamestate();
  if (!state.world.research.activeResearch) {
    return false;
  }

  await updateGamestate((s) => ({
    ...s,
    world: {
      ...s.world,
      research: {
        ...s.world.research,
        activeResearch: undefined,
        activeResearchProgress: 0,
        activeResearchStartTick: 0,
      },
    },
  }));

  return true;
}

/**
 * Calculate the research speed modifier from Library rooms and ruler bonuses.
 * Returns the total multiplier: base * (1 + sum of bonuses).
 */
export function researchCalculateSpeedModifier(
  floors: GameState['world']['floors'],
): number {
  let bonus = 0;

  // Library room bonus: rooms that produce 'research' resource
  const rooms = contentGetEntriesByType<RoomContent>('room');
  const researchRoomTypeIds = new Set(
    rooms
      .filter((r) => r.production && r.production['research'])
      .map((r) => r.id),
  );

  for (const floor of floors) {
    for (const room of floor.rooms) {
      if (researchRoomTypeIds.has(room.roomTypeId)) {
        bonus += RESEARCH_LIBRARY_BONUS_PER_ROOM;
      }
    }
  }

  // Ruler bonus (researchSpeed from throne room ruler)
  const rulerBonus = throneRoomGetRulerBonusValue(floors, 'researchSpeed');
  bonus += rulerBonus;

  return 1 + bonus;
}

/**
 * Computed signal for current research speed modifier.
 */
export const researchSpeedModifier = computed(() => {
  const state = gamestate();
  return researchCalculateSpeedModifier(state.world.floors);
});

/**
 * Process research progress each tick. Called inside updateGamestate.
 * Mutates state in-place (same pattern as productionProcess, trainingProcess).
 */
export function researchProcess(state: GameState, numTicks = 1): void {
  const research = state.world.research;
  if (!research.activeResearch) return;

  const node = contentGetEntry<ResearchContent>(research.activeResearch);
  if (!node) return;

  const speedModifier = researchCalculateSpeedModifier(state.world.floors);
  const progressPerTick = RESEARCH_BASE_PROGRESS_PER_TICK * speedModifier;

  research.activeResearchProgress += progressPerTick * numTicks;

  if (research.activeResearchProgress >= node.requiredTicks) {
    research.completedNodes = [
      ...research.completedNodes,
      research.activeResearch,
    ];

    const completedNodeId = research.activeResearch;
    const completedNodeName = node.name;

    research.activeResearch = undefined;
    research.activeResearchProgress = 0;
    research.activeResearchStartTick = 0;

    researchUnlockProcessCompletion(completedNodeId, state);

    researchCompletedSubject.next({
      nodeId: completedNodeId,
      nodeName: completedNodeName,
    });
  }
}
