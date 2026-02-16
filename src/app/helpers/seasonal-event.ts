import { computed } from '@angular/core';
import { contentGetEntriesByType } from '@helpers/content';
import { gamestate, updateGamestate } from '@helpers/state-game';
import { notify } from '@helpers/notify';
import { resourceEffectiveMax } from '@helpers/resources';
import type {
  ActiveSeasonalEffect,
  GameState,
  PendingSeasonalEvent,
  ResourceType,
  Season,
  SeasonalEventState,
} from '@interfaces';
import type {
  EventEffect,
  SeasonalEventContent,
  SeasonalEventId,
} from '@interfaces/content-seasonalevent';
import { Subject } from 'rxjs';
import type { PRNG } from 'seedrandom';
import { rngRandom } from '@helpers/rng';

// --- Constants ---

export const SEASONAL_EVENT_TRIGGER_CHANCE = 30;

// --- Events ---

export type SeasonalEventEvent =
  | { type: 'triggered'; eventId: SeasonalEventId }
  | { type: 'dismissed'; eventId: SeasonalEventId }
  | { type: 'choice_made'; eventId: SeasonalEventId; choiceIndex: number };

const seasonalEventSubject = new Subject<SeasonalEventEvent>();
export const seasonalEventEvent$ = seasonalEventSubject.asObservable();

// --- Computed signals ---

export const seasonalEventPending = computed(
  () => gamestate().world.seasonalEvent.pendingEvent,
);

export const seasonalEventActiveEffects = computed(
  () => gamestate().world.seasonalEvent.activeEffects,
);

// --- Pure helpers ---

export function seasonalEventGetEligible(
  allEvents: SeasonalEventContent[],
  season: Season,
  triggeredIds: SeasonalEventId[],
): SeasonalEventContent[] {
  return allEvents.filter(
    (e) => e.season === season && !triggeredIds.includes(e.id),
  );
}

export function seasonalEventSelectWeighted(
  eligible: SeasonalEventContent[],
  rng?: PRNG,
): SeasonalEventContent | undefined {
  if (eligible.length === 0) return undefined;

  const random = rng ?? rngRandom();
  let totalWeight = 0;
  for (const event of eligible) {
    totalWeight += event.weight;
  }

  const roll = random() * totalWeight;
  let cumulative = 0;
  for (const event of eligible) {
    cumulative += event.weight;
    if (roll < cumulative) return event;
  }

  return eligible[eligible.length - 1];
}

export function seasonalEventCheckCycleReset(
  seasonalEvent: SeasonalEventState,
  currentCycle: number,
): boolean {
  if (currentCycle > seasonalEvent.lastSeasonCycleForReset) {
    seasonalEvent.triggeredEventIds = [];
    seasonalEvent.lastSeasonCycleForReset = currentCycle;
    return true;
  }
  return false;
}

export function seasonalEventTickActiveEffects(
  effects: ActiveSeasonalEffect[],
): ActiveSeasonalEffect[] {
  const updated: ActiveSeasonalEffect[] = [];
  for (const effect of effects) {
    const remaining = effect.remainingDays - 1;
    if (remaining > 0) {
      updated.push({ ...effect, remainingDays: remaining });
    }
  }
  return updated;
}

export function seasonalEventGetProductionModifier(
  activeEffects: ActiveSeasonalEffect[],
  resourceType: ResourceType,
): number {
  let modifier = 1.0;
  for (const effect of activeEffects) {
    if (effect.resourceType === resourceType) {
      modifier *= effect.multiplier;
    }
  }
  return modifier;
}

// --- Effect application ---

export function seasonalEventApplyEffects(
  state: GameState,
  effects: EventEffect[],
): void {
  for (const effect of effects) {
    const resource = state.world.resources[effect.resourceType];
    if (!resource) continue;

    switch (effect.type) {
      case 'resource_gain': {
        if (effect.amount) {
          const effectiveMax = resourceEffectiveMax(
            resource.max,
            effect.resourceType,
            state.world.floors,
          );
          const available = effectiveMax - resource.current;
          resource.current += Math.min(effect.amount, available);
        }
        break;
      }
      case 'resource_loss': {
        if (effect.amount) {
          resource.current = Math.max(0, resource.current - effect.amount);
        } else if (effect.percentage) {
          const loss = Math.floor(
            resource.current * (effect.percentage / 100),
          );
          resource.current = Math.max(0, resource.current - loss);
        }
        break;
      }
      case 'production_modifier': {
        if (effect.multiplier && effect.durationDays) {
          const pending = state.world.seasonalEvent.pendingEvent;
          state.world.seasonalEvent.activeEffects.push({
            eventId: pending?.eventId ?? ('' as SeasonalEventId),
            resourceType: effect.resourceType,
            multiplier: effect.multiplier,
            remainingDays: effect.durationDays,
            description: effect.description,
          });
        }
        break;
      }
    }
  }
}

// --- Dismiss / Choice ---

export async function seasonalEventDismiss(): Promise<void> {
  const pending = gamestate().world.seasonalEvent.pendingEvent;
  if (!pending) return;

  const allEvents =
    contentGetEntriesByType<SeasonalEventContent>('seasonalevent');
  const event = allEvents.find((e) => e.id === pending.eventId);
  if (!event) return;

  await updateGamestate((state) => {
    if (event.effects.length > 0) {
      seasonalEventApplyEffects(state, event.effects);
    }
    state.world.seasonalEvent.pendingEvent = undefined;
    return state;
  });

  seasonalEventSubject.next({ type: 'dismissed', eventId: pending.eventId });
}

export async function seasonalEventMakeChoice(
  choiceIndex: number,
): Promise<void> {
  const pending = gamestate().world.seasonalEvent.pendingEvent;
  if (!pending) return;

  const allEvents =
    contentGetEntriesByType<SeasonalEventContent>('seasonalevent');
  const event = allEvents.find((e) => e.id === pending.eventId);
  if (!event) return;

  const choice = event.choices[choiceIndex];
  if (!choice) return;

  await updateGamestate((state) => {
    seasonalEventApplyEffects(state, choice.effects);
    state.world.seasonalEvent.pendingEvent = undefined;
    return state;
  });

  seasonalEventSubject.next({
    type: 'choice_made',
    eventId: pending.eventId,
    choiceIndex,
  });
}

// --- State field for day tracking ---

let seasonalEventLastProcessedDay = 0;

export function seasonalEventResetLastProcessedDay(): void {
  seasonalEventLastProcessedDay = 0;
}

// --- Process function (called from gameloop) ---

export function seasonalEventProcess(state: GameState): void {
  const currentDay = state.clock.day;

  if (currentDay <= seasonalEventLastProcessedDay) return;
  seasonalEventLastProcessedDay = currentDay;

  const seasonalEvent = state.world.seasonalEvent;

  // Check for cycle reset
  seasonalEventCheckCycleReset(
    seasonalEvent,
    state.world.season.totalSeasonCycles,
  );

  // Tick active effects
  seasonalEvent.activeEffects = seasonalEventTickActiveEffects(
    seasonalEvent.activeEffects,
  );

  // Don't trigger new events if one is already pending
  if (seasonalEvent.pendingEvent) return;

  // Roll for event trigger (30% chance per day)
  const rng = rngRandom();
  const roll = rng() * 100;
  if (roll > SEASONAL_EVENT_TRIGGER_CHANCE) return;

  // Find eligible events for current season
  const allEvents =
    contentGetEntriesByType<SeasonalEventContent>('seasonalevent');
  const eligible = seasonalEventGetEligible(
    allEvents,
    state.world.season.currentSeason,
    seasonalEvent.triggeredEventIds,
  );

  if (eligible.length === 0) return;

  // Select weighted random event
  const selected = seasonalEventSelectWeighted(eligible, rng);
  if (!selected) return;

  // Set pending event
  const pending: PendingSeasonalEvent = {
    eventId: selected.id,
    triggeredOnDay: currentDay,
  };
  seasonalEvent.pendingEvent = pending;
  seasonalEvent.triggeredEventIds.push(selected.id);

  notify('SeasonalEvent', `Seasonal Event: ${selected.name}`);
  seasonalEventSubject.next({ type: 'triggered', eventId: selected.id });
}
