import { invasionWinLossMarkKilled } from '@helpers/invasion-win-loss';
import { invaderGetDefinitionById } from '@helpers/invaders';
import { moraleApply } from '@helpers/morale';
import { rngChoice } from '@helpers/rng';
import type {
  ActiveInvasion,
  BattleLogEntry,
  InvasionState,
} from '@interfaces';
import type { InvaderInstance } from '@interfaces/invader';
import type { PRNG } from 'seedrandom';

// --- Constants ---

const EVENT_TRIGGER_CHANCE = 0.15;

type InvasionEventType = 'infighting' | 'reinforcements' | 'desertion' | 'hazard';

type InvasionEventResult = {
  invasionState: InvasionState;
  invaderHpMap: Record<string, number>;
  logEntries: BattleLogEntry[];
  addedInvaders?: InvaderInstance[];
  removedInvaderIds?: string[];
};

// --- Event handlers ---

function eventInfighting(
  invasionState: InvasionState,
  invaderHpMap: Record<string, number>,
  turn: number,
  threatLevel: number,
  rng: PRNG,
): InvasionEventResult {
  const living = invasionState.invaders.filter(
    (i) => i.currentHp > 0 && (invaderHpMap[i.id] ?? 0) > 0,
  );
  if (living.length < 2) {
    return { invasionState, invaderHpMap, logEntries: [] };
  }

  const shuffled = [...living];
  // Pick 2 random invaders
  const idx1 = Math.floor(rng() * shuffled.length);
  let idx2 = Math.floor(rng() * (shuffled.length - 1));
  if (idx2 >= idx1) idx2++;

  const inv1 = shuffled[idx1];
  const inv2 = shuffled[idx2];
  const def1 = invaderGetDefinitionById(inv1.definitionId);
  const def2 = invaderGetDefinitionById(inv2.definitionId);

  const baseDmg = Math.max(1, Math.ceil(5 * (1 + threatLevel / 100)));
  const newHpMap = { ...invaderHpMap };
  let newState = invasionState;

  const logEntries: BattleLogEntry[] = [];

  // Apply damage to both
  const newHp1 = Math.max(0, (newHpMap[inv1.id] ?? 0) - baseDmg);
  const newHp2 = Math.max(0, (newHpMap[inv2.id] ?? 0) - baseDmg);
  newHpMap[inv1.id] = newHp1;
  newHpMap[inv2.id] = newHp2;

  if (newHp1 <= 0) {
    newState = invasionWinLossMarkKilled(newState, inv1.id);
  }
  if (newHp2 <= 0) {
    newState = invasionWinLossMarkKilled(newState, inv2.id);
  }

  // Morale penalty
  moraleApply('infighting', 3, turn, 'Infighting');

  logEntries.push({
    turn,
    type: 'random_event',
    message: `Disagreement breaks out among the invaders! ${def1?.name ?? 'Invader'} and ${def2?.name ?? 'Invader'} take ${baseDmg} damage each.`,
  });

  return { invasionState: newState, invaderHpMap: newHpMap, logEntries };
}

function eventReinforcements(
  invasionState: InvasionState,
  invaderHpMap: Record<string, number>,
  turn: number,
  threatLevel: number,
  rng: PRNG,
): InvasionEventResult {
  const living = invasionState.invaders.filter(
    (i) => i.currentHp > 0 && (invaderHpMap[i.id] ?? 0) > 0,
  );
  if (living.length === 0) {
    return { invasionState, invaderHpMap, logEntries: [] };
  }

  const count = threatLevel > 60 ? 2 : 1;
  const addedInvaders: InvaderInstance[] = [];
  const newHpMap = { ...invaderHpMap };
  const newState = { ...invasionState, invaders: [...invasionState.invaders] };

  for (let i = 0; i < count; i++) {
    // Clone a random existing living invader as a reinforcement
    const template = rngChoice(living, rng);
    const newId = `reinf-${turn}-${i}`;
    const reinforcement: InvaderInstance = {
      ...template,
      id: newId as InvaderInstance['id'],
      currentHp: template.maxHp,
      isLeader: false,
    };
    newState.invaders.push(reinforcement);
    newHpMap[newId] = reinforcement.currentHp;
    addedInvaders.push(reinforcement);
  }

  const logEntries: BattleLogEntry[] = [{
    turn,
    type: 'random_event',
    message: `Reinforcements arrive to bolster the invasion! (${count} new invader${count > 1 ? 's' : ''})`,
  }];

  return {
    invasionState: newState,
    invaderHpMap: newHpMap,
    logEntries,
    addedInvaders,
  };
}

function eventDesertion(
  invasionState: InvasionState,
  invaderHpMap: Record<string, number>,
  turn: number,
  threatLevel: number,
  rng: PRNG,
): InvasionEventResult {
  const living = invasionState.invaders.filter(
    (i) => i.currentHp > 0 && (invaderHpMap[i.id] ?? 0) > 0 && !i.isLeader,
  );
  if (living.length === 0) {
    return { invasionState, invaderHpMap, logEntries: [] };
  }

  const idx = Math.floor(rng() * living.length);
  const deserter = living[idx];
  const deserterDef = invaderGetDefinitionById(deserter.definitionId);

  const newHpMap = { ...invaderHpMap };
  newHpMap[deserter.id] = 0;
  const newState = invasionWinLossMarkKilled(invasionState, deserter.id);

  const logEntries: BattleLogEntry[] = [{
    turn,
    type: 'random_event',
    message: `${deserterDef?.name ?? 'An invader'} loses nerve and flees the dungeon!`,
  }];

  // High threat: additional morale penalty
  if (threatLevel > 60) {
    moraleApply('desertion', 5, turn, 'Desertion');
  }

  return {
    invasionState: newState,
    invaderHpMap: newHpMap,
    logEntries,
    removedInvaderIds: [deserter.id],
  };
}

function eventHazard(
  invasionState: InvasionState,
  invaderHpMap: Record<string, number>,
  turn: number,
  threatLevel: number,
): InvasionEventResult {
  const living = invasionState.invaders.filter(
    (i) => i.currentHp > 0 && (invaderHpMap[i.id] ?? 0) > 0,
  );
  if (living.length === 0) {
    return { invasionState, invaderHpMap, logEntries: [] };
  }

  const damage = Math.ceil(3 * (1 + threatLevel / 200));
  const newHpMap = { ...invaderHpMap };
  let newState = invasionState;

  for (const inv of living) {
    const newHp = Math.max(0, (newHpMap[inv.id] ?? 0) - damage);
    newHpMap[inv.id] = newHp;
    if (newHp <= 0) {
      newState = invasionWinLossMarkKilled(newState, inv.id);
    }
  }

  const logEntries: BattleLogEntry[] = [{
    turn,
    type: 'random_event',
    message: `The dungeon itself lashes out at the intruders! All invaders take ${damage} damage.`,
  }];

  return { invasionState: newState, invaderHpMap: newHpMap, logEntries };
}

// --- Event type registry ---

const EVENT_HANDLERS: Record<InvasionEventType, (
  state: InvasionState,
  hpMap: Record<string, number>,
  turn: number,
  threatLevel: number,
  rng: PRNG,
) => InvasionEventResult> = {
  infighting: eventInfighting,
  reinforcements: eventReinforcements,
  desertion: eventDesertion,
  hazard: (state, hpMap, turn, threatLevel) => eventHazard(state, hpMap, turn, threatLevel),
};

const EVENT_TYPES: InvasionEventType[] = ['infighting', 'reinforcements', 'desertion', 'hazard'];

// --- Main trigger function ---

/**
 * Try to trigger a random mid-invasion event.
 * Called once per room entry with a 15% trigger chance.
 * Returns the event result, or undefined if no event triggered.
 */
export function invasionEventTryTrigger(
  invasion: ActiveInvasion,
  rng: PRNG,
): InvasionEventResult | undefined {
  // Roll for trigger
  if (rng() >= EVENT_TRIGGER_CHANCE) return undefined;

  // Pick a random event type
  const eventType = EVENT_TYPES[Math.floor(rng() * EVENT_TYPES.length)];
  const handler = EVENT_HANDLERS[eventType];

  return handler(
    invasion.invasionState,
    invasion.invaderHpMap,
    invasion.currentTurn,
    invasion.profile.threatLevel,
    rng,
  );
}
