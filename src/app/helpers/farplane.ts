import { contentGetEntry } from '@helpers/content';
import { inhabitantAdd } from '@helpers/inhabitants';
import { notify } from '@helpers/notify';
import { recruitmentIsRosterFull } from '@helpers/recruitment';
import { researchUnlockGetPassiveBonusWithMastery } from '@helpers/research-unlocks';
import { resourceCanAfford, resourcePayCost } from '@helpers/resources';
import { rngUuid } from '@helpers/rng';
import { findRoomByRole } from '@helpers/room-lookup';
import { roomRoleFindById } from '@helpers/room-roles';
import { roomUpgradeGetAppliedEffects } from '@helpers/room-upgrades';
import { gamestate, updateGamestate } from '@helpers/state-game';
import type {
  FarplaneSoul,
  FarplaneSoulId,
  GameState,
  InhabitantInstance,
  InhabitantInstanceId,
  ResourceCost,
  ResourceType,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';

// --- Constants ---

export const FARPLANE_BASE_SOUL_CAPACITY = 5;
export const FARPLANE_COST_MULTIPLIER = 0.5;

// --- Capacity ---

/**
 * Calculate total soul capacity for the Farplane room.
 * Base capacity + room upgrade soulCapacityBonus effects + research passive bonus.
 */
export function farplaneGetSoulCapacity(): number {
  let capacity = FARPLANE_BASE_SOUL_CAPACITY;

  const found = findRoomByRole('farplane');
  if (found) {
    const effects = roomUpgradeGetAppliedEffects(found.room);
    for (const effect of effects) {
      if (effect.type === 'soulCapacityBonus') {
        capacity += effect.value;
      }
    }
  }

  const researchBonus = researchUnlockGetPassiveBonusWithMastery(
    'farplaneSoulCapacity',
  );
  capacity += Math.floor(researchBonus);

  return capacity;
}

// --- Soul Capture ---

/**
 * Capture souls of killed defenders during an invasion defeat.
 * Must be called BEFORE defenders are removed from state.world.inhabitants.
 * Mutates state in-place.
 */
export function farplaneCaptureDefenderSouls(
  state: GameState,
  killedDefenderIds: InhabitantInstanceId[],
): void {
  if (killedDefenderIds.length === 0) return;

  const farplaneTypeId = roomRoleFindById('farplane');
  if (!farplaneTypeId) return;

  // Check if a farplane room is actually placed
  let hasRoom = false;
  for (const floor of state.world.floors) {
    if (floor.rooms.some((r) => r.roomTypeId === farplaneTypeId)) {
      hasRoom = true;
      break;
    }
  }
  if (!hasRoom) return;

  const capacity = farplaneGetSoulCapacity();

  let capturedCount = 0;

  for (const defenderId of killedDefenderIds) {
    const instance = state.world.inhabitants.find(
      (i) => i.instanceId === defenderId,
    );
    if (!instance) continue;

    const soul: FarplaneSoul = {
      soulId: rngUuid<FarplaneSoulId>(),
      definitionId: instance.definitionId,
      instanceName: instance.name,
      instanceStatBonuses: instance.instanceStatBonuses,
      mutated: instance.mutated,
      mutationTraitIds: instance.mutationTraitIds,
      instanceTraitIds: instance.instanceTraitIds,
      isHybrid: instance.isHybrid,
      hybridParentIds: instance.hybridParentIds,
      isSummoned: instance.isSummoned,
      capturedAtTick: state.clock.numTicks,
    };

    state.world.farplaneSouls.push(soul);
    capturedCount++;
  }

  if (capturedCount > 0) {
    const soulWord = capturedCount === 1 ? 'soul was' : 'souls were';
    notify('Farplane', `${capturedCount} ${soulWord} captured in the Farplane`);
  }

  // Evict oldest souls if over capacity
  if (state.world.farplaneSouls.length > capacity) {
    // Sort by capturedAtTick ascending, keep the newest
    state.world.farplaneSouls.sort(
      (a, b) => a.capturedAtTick - b.capturedAtTick,
    );
    state.world.farplaneSouls = state.world.farplaneSouls.slice(
      state.world.farplaneSouls.length - capacity,
    );
  }
}

// --- Cost Calculation ---

/**
 * Calculate the re-recruitment cost for a soul (50% of original, rounded up, min 1).
 */
export function farplaneGetRecruitCost(definitionId: string): ResourceCost {
  const def = contentGetEntry<InhabitantContent>(definitionId);
  if (!def?.cost) return {};

  const halved: ResourceCost = {};
  for (const [type, amount] of Object.entries(def.cost)) {
    if (!amount) continue;
    halved[type as ResourceType] = Math.max(
      1,
      Math.ceil(amount * FARPLANE_COST_MULTIPLIER),
    );
  }
  return halved;
}

// --- Re-recruitment ---

/**
 * Re-recruit a soul from the Farplane.
 * Restores the inhabitant with all preserved attributes.
 */
export async function farplaneRecruitSoul(
  soulId: FarplaneSoulId,
): Promise<{ success: boolean; error?: string }> {
  if (recruitmentIsRosterFull()) {
    return { success: false, error: 'Roster is full' };
  }

  const state = gamestate();
  const soul = state.world.farplaneSouls.find((s) => s.soulId === soulId);
  if (!soul) {
    return { success: false, error: 'Soul not found' };
  }

  const cost = farplaneGetRecruitCost(soul.definitionId);
  if (!resourceCanAfford(cost)) {
    return { success: false, error: 'Not enough resources' };
  }

  const paid = await resourcePayCost(cost);
  if (!paid) {
    return { success: false, error: 'Not enough resources' };
  }

  const instance: InhabitantInstance = {
    instanceId: rngUuid<InhabitantInstanceId>(),
    definitionId: soul.definitionId,
    name: soul.instanceName,
    state: 'normal',
    assignedRoomId: undefined,
    instanceStatBonuses: soul.instanceStatBonuses,
    mutated: soul.mutated,
    mutationTraitIds: soul.mutationTraitIds,
    instanceTraitIds: soul.instanceTraitIds,
    isHybrid: soul.isHybrid,
    hybridParentIds: soul.hybridParentIds,
    isSummoned: soul.isSummoned,
  };

  await inhabitantAdd(instance);

  // Remove soul from farplane
  await updateGamestate((s) => {
    s.world.farplaneSouls = s.world.farplaneSouls.filter(
      (fs) => fs.soulId !== soulId,
    );
    return s;
  });

  return { success: true };
}
