import { contentGetEntry } from '@helpers/content';
import { GAME_TIME_TICKS_PER_MINUTE } from '@helpers/game-time';
import { resourceSubtract } from '@helpers/resources';
import { stateModifierGetFoodConsumptionMultiplier } from '@helpers/state-modifiers';
import type {
  GameState,
  InhabitantInstance,
  InhabitantState,
} from '@interfaces';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type {
  HungerWarningEvent,
  HungerWarningLevel,
} from '@interfaces/hunger';
import { Subject } from 'rxjs';

// --- Constants ---

/** Number of ticks in one game hour: 60 minutes * 5 ticks/minute = 300 */
export const HUNGER_TICKS_PER_HOUR = 60 * GAME_TIME_TICKS_PER_MINUTE;

/** Ticks without food before transitioning to 'hungry' (30 game-minutes) */
export const HUNGER_TICKS_TO_HUNGRY = GAME_TIME_TICKS_PER_MINUTE * 30;

/** Ticks without food before transitioning to 'starving' (60 game-minutes) */
export const HUNGER_TICKS_TO_STARVING = GAME_TIME_TICKS_PER_MINUTE * 60;

/** How many ticks of hunger are recovered per tick when food is available */
export const HUNGER_RECOVERY_RATE = 2;

/** Minutes of food remaining to trigger a low food warning */
export const HUNGER_WARNING_MINUTES = 5;

const hungerWarningSubject = new Subject<HungerWarningEvent>();

export const hungerWarning$ = hungerWarningSubject.asObservable();

let lastWarningLevel: HungerWarningLevel | undefined;

// --- Pure helper functions ---

/**
 * Get the per-tick food consumption for a given hourly rate.
 */
export function hungerGetPerTickConsumption(
  foodConsumptionRate: number,
): number {
  return foodConsumptionRate / HUNGER_TICKS_PER_HOUR;
}

/**
 * Determine the hunger state based on ticks without food.
 */
export function hungerCalculateState(hungerTicks: number): InhabitantState {
  if (hungerTicks >= HUNGER_TICKS_TO_STARVING) return 'starving';
  if (hungerTicks >= HUNGER_TICKS_TO_HUNGRY) return 'hungry';
  return 'normal';
}

/**
 * Check if an inhabitant is inappetent (does not consume food).
 */
export function hungerIsInappetent(foodConsumptionRate: number): boolean {
  return foodConsumptionRate <= 0;
}

/**
 * Get the food consumption rate for an inhabitant definition.
 * Returns 0 if not defined (inappetent).
 */
export function hungerGetConsumptionRate(definitionId: string): number {
  const def = contentGetEntry<InhabitantContent>(definitionId);
  return def?.foodConsumptionRate ?? 0;
}

// --- Tick processing ---

/**
 * Calculate total food consumption per tick for all inhabitants.
 * Applies the state-based foodConsumptionMultiplier to each inhabitant's base rate.
 */
export function hungerCalculateTotalConsumption(
  inhabitants: InhabitantInstance[],
): number {
  let total = 0;

  for (const inhabitant of inhabitants) {
    const rate = hungerGetConsumptionRate(inhabitant.definitionId);
    if (rate <= 0) continue;

    const consumptionMultiplier =
      stateModifierGetFoodConsumptionMultiplier(inhabitant);
    const perTick = hungerGetPerTickConsumption(rate) * consumptionMultiplier;
    total += perTick;
  }

  return total;
}

/**
 * Process hunger for all inhabitants.
 * Called each tick inside updateGamestate — mutates state in-place.
 *
 * 1. Calculates total food consumption per tick
 * 2. Deducts food from resources (clamped to 0)
 * 3. Updates hunger ticks and states for each inhabitant
 * 4. Syncs state changes to floor inhabitants
 */
export function hungerProcess(state: GameState): void {
  const inhabitants = state.world.inhabitants;
  if (inhabitants.length === 0) return;

  // Calculate total consumption
  const totalConsumption = hungerCalculateTotalConsumption(inhabitants);

  // Deduct food
  let foodSufficient = true;

  if (totalConsumption > 0) {
    const actualSubtracted = resourceSubtract('food', totalConsumption);
    if (actualSubtracted < totalConsumption) {
      foodSufficient = false;
    }
  }

  // Update hunger states for each inhabitant
  for (const inhabitant of inhabitants) {
    hungerUpdateInhabitant(inhabitant, foodSufficient);
  }

  // Sync state to floor inhabitants
  hungerSyncFloorInhabitants(state);
}

/**
 * Update a single inhabitant's hunger state.
 * Inappetent inhabitants (foodConsumptionRate <= 0) are always 'normal'.
 */
function hungerUpdateInhabitant(
  inhabitant: InhabitantInstance,
  foodSufficient: boolean,
): void {
  const rate = hungerGetConsumptionRate(inhabitant.definitionId);

  // Inappetent: always normal
  if (hungerIsInappetent(rate)) {
    if (inhabitant.state === 'hungry' || inhabitant.state === 'starving') {
      inhabitant.state = 'normal';
    }
    inhabitant.hungerTicksWithoutFood = 0;
    return;
  }

  const currentTicks = inhabitant.hungerTicksWithoutFood ?? 0;

  if (foodSufficient) {
    // Recovering: decrement hunger ticks
    inhabitant.hungerTicksWithoutFood = Math.max(
      0,
      currentTicks - HUNGER_RECOVERY_RATE,
    );
  } else {
    // Starving: increment hunger ticks
    inhabitant.hungerTicksWithoutFood = currentTicks + 1;
  }

  // Update state based on ticks
  const newState = hungerCalculateState(inhabitant.hungerTicksWithoutFood);
  // Only change state if it's a hunger-related state or normal
  // Don't override 'scared' state if it was set by fear system
  if (inhabitant.state !== 'scared') {
    inhabitant.state = newState;
  }
}

/**
 * Sync hunger state from world.inhabitants to floor.inhabitants.
 * The production system reads from floor.inhabitants, so state changes
 * must be reflected there.
 */
function hungerSyncFloorInhabitants(state: GameState): void {
  const stateMap = new Map<
    string,
    { state: InhabitantState; hungerTicksWithoutFood: number }
  >();

  for (const inhabitant of state.world.inhabitants) {
    stateMap.set(inhabitant.instanceId, {
      state: inhabitant.state,
      hungerTicksWithoutFood: inhabitant.hungerTicksWithoutFood ?? 0,
    });
  }

  for (const floor of state.world.floors) {
    for (const floorInhabitant of floor.inhabitants) {
      const updated = stateMap.get(floorInhabitant.instanceId);
      if (updated) {
        floorInhabitant.state = updated.state;
        floorInhabitant.hungerTicksWithoutFood = updated.hungerTicksWithoutFood;
      }
    }
  }
}

// --- Warning processing ---

/**
 * Determine the current warning level based on food and consumption.
 * Pure function for testability.
 */
export function hungerGetWarningLevel(
  foodCurrent: number,
  totalConsumptionPerTick: number,
): HungerWarningLevel | undefined {
  if (totalConsumptionPerTick <= 0) return undefined;

  if (foodCurrent <= 0) return 'critical';

  const ticksOfFoodRemaining = foodCurrent / totalConsumptionPerTick;
  const warningThresholdTicks =
    HUNGER_WARNING_MINUTES * GAME_TIME_TICKS_PER_MINUTE;

  if (ticksOfFoodRemaining < warningThresholdTicks) return 'low';

  return undefined;
}

/**
 * Process food depletion warnings.
 * Should be called after hungerProcess within the same tick.
 * Emits events via hungerWarning$ observable.
 */
export function hungerProcessWarnings(state: GameState): void {
  const totalConsumption = hungerCalculateTotalConsumption(
    state.world.inhabitants,
  );
  const currentLevel = hungerGetWarningLevel(
    state.world.resources.food.current,
    totalConsumption,
  );

  if (currentLevel === undefined) {
    lastWarningLevel = undefined;
    return;
  }

  // Only emit if level changed
  if (currentLevel !== lastWarningLevel) {
    hungerWarningSubject.next({
      level: currentLevel,
      foodRemaining: state.world.resources.food.current,
      consumptionPerTick: totalConsumption,
    });
  }

  lastWarningLevel = currentLevel;
}

/**
 * Reset the warning tracking state. Used for testing.
 */
export function hungerResetWarnings(): void {
  lastWarningLevel = undefined;
}
