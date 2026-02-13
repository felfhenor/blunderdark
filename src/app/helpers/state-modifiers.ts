import { contentGetEntry } from '@helpers/content';
import type {
  InhabitantDefinition,
  InhabitantInstance,
  InhabitantState,
  IsContentItem,
  StateModifier,
} from '@interfaces';

// --- Default fallback modifiers (backwards-compatible with old flat STATE_MODIFIERS) ---

const STATE_MODIFIER_DEFAULTS: Record<InhabitantState, StateModifier> = {
  normal: {
    productionMultiplier: 1.0,
    foodConsumptionMultiplier: 1.0,
  },
  scared: {
    productionMultiplier: 0.5,
    foodConsumptionMultiplier: 1.0,
  },
  hungry: {
    productionMultiplier: 0.5,
    foodConsumptionMultiplier: 1.0,
  },
  starving: {
    productionMultiplier: 0.1,
    foodConsumptionMultiplier: 0.5,
  },
};

// --- Scared detection ---

/**
 * Default fear tolerance when not defined on the creature.
 */
export const STATE_MODIFIER_FEAR_TOLERANCE_DEFAULT = 2;

/**
 * Check if an inhabitant is scared based on their fear tolerance and room fear level.
 * An inhabitant is scared when the room's fear level exceeds their tolerance.
 */
export function stateModifierIsInhabitantScared(
  inhabitant: InhabitantInstance,
  roomFearLevel: number,
): boolean {
  const def = contentGetEntry<InhabitantDefinition & IsContentItem>(
    inhabitant.definitionId,
  );
  const tolerance = def?.fearTolerance ?? STATE_MODIFIER_FEAR_TOLERANCE_DEFAULT;
  return roomFearLevel > tolerance;
}

/**
 * Get the fear tolerance for an inhabitant definition.
 * Returns the default if not defined.
 */
export function stateModifierGetFearTolerance(
  definitionId: string,
): number {
  const def = contentGetEntry<InhabitantDefinition & IsContentItem>(definitionId);
  return def?.fearTolerance ?? STATE_MODIFIER_FEAR_TOLERANCE_DEFAULT;
}

// --- State modifier lookup ---

/**
 * Get the state modifier for a specific inhabitant in a given state.
 * Falls back to default modifiers if no per-creature data is defined.
 */
export function stateModifierGet(
  definitionId: string,
  state: InhabitantState,
): StateModifier {
  const def = contentGetEntry<InhabitantDefinition & IsContentItem>(definitionId);
  const creatureModifier = def?.stateModifiers?.[state];
  if (creatureModifier) return creatureModifier;
  return STATE_MODIFIER_DEFAULTS[state];
}

/**
 * Get the production multiplier for a specific inhabitant in its current state.
 */
export function stateModifierGetProductionMultiplier(
  inhabitant: InhabitantInstance,
): number {
  const modifier = stateModifierGet(inhabitant.definitionId, inhabitant.state);
  return modifier.productionMultiplier;
}

/**
 * Get the food consumption multiplier for a specific inhabitant in its current state.
 */
export function stateModifierGetFoodConsumptionMultiplier(
  inhabitant: InhabitantInstance,
): number {
  const modifier = stateModifierGet(inhabitant.definitionId, inhabitant.state);
  return modifier.foodConsumptionMultiplier;
}

/**
 * Get the attack multiplier for a specific inhabitant in its current state.
 * Returns 1.0 if no combat modifier is defined.
 */
export function stateModifierGetAttackMultiplier(
  inhabitant: InhabitantInstance,
): number {
  const modifier = stateModifierGet(inhabitant.definitionId, inhabitant.state);
  return modifier.attackMultiplier ?? 1.0;
}

/**
 * Get the defense multiplier for a specific inhabitant in its current state.
 * Returns 1.0 if no combat modifier is defined.
 */
export function stateModifierGetDefenseMultiplier(
  inhabitant: InhabitantInstance,
): number {
  const modifier = stateModifierGet(inhabitant.definitionId, inhabitant.state);
  return modifier.defenseMultiplier ?? 1.0;
}

// --- Per-creature conditional modifier for production pipeline ---

/**
 * Calculate the combined production modifier for inhabitants assigned to a room.
 * Uses per-creature state modifiers when available, falls back to defaults.
 * This replaces the old flat STATE_MODIFIERS approach.
 */
export function stateModifierCalculatePerCreatureProduction(
  assignedInhabitants: InhabitantInstance[],
): number {
  if (assignedInhabitants.length === 0) return 1.0;

  let totalMultiplier = 0;
  for (const inhabitant of assignedInhabitants) {
    totalMultiplier += stateModifierGetProductionMultiplier(inhabitant);
  }

  return totalMultiplier / assignedInhabitants.length;
}
