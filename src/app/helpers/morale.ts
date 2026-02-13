import { signal } from '@angular/core';
import { invaderGetDefinitionById } from '@helpers/invaders';
import type { InvaderClassType, InvaderInstance } from '@interfaces/invader';

// --- Constants ---

export const MORALE_INITIAL = 100;
export const MORALE_MIN = 0;
export const MORALE_MAX = 100;

export const MORALE_ALLY_DEATH_PENALTY = -10;
export const MORALE_CLERIC_DEATH_PENALTY = -15;
export const MORALE_PALADIN_DEATH_PENALTY = -15;

export const MORALE_TRAP_TRIGGER_PENALTY = -5;
export const MORALE_FEAR_GLYPH_PENALTY = -10;

export const MORALE_HIGH_FEAR_ROOM_PENALTY = -15;
export const MORALE_HIGH_FEAR_ROOM_THRESHOLD = 3;

export const MORALE_ROOM_CAPTURE_BONUS = 10;
export const MORALE_HIGH_VALUE_ROOM_CAPTURE_BONUS = 15;

// --- Types ---

export type MoraleEventType =
  | 'ally_death'
  | 'trap_trigger'
  | 'high_fear_room'
  | 'room_capture';

export type MoraleEvent = {
  turn: number;
  eventType: MoraleEventType;
  delta: number;
  newValue: number;
  description: string;
};

// --- Signals ---

export const moraleCurrent = signal(MORALE_INITIAL);
export const moraleEventLog = signal<MoraleEvent[]>([]);
export const moraleIsRetreating = signal(false);

// --- Pure calculation functions ---

/**
 * Clamp a morale value to [MORALE_MIN, MORALE_MAX].
 */
export function moraleClamp(value: number): number {
  return Math.max(MORALE_MIN, Math.min(MORALE_MAX, value));
}

/**
 * Calculate the morale penalty for an ally death based on invader class.
 * Cleric and Paladin deaths incur a larger penalty (-15), others -10.
 */
export function moraleCalculateAllyDeathPenalty(
  invaderClass: InvaderClassType,
): number {
  if (invaderClass === 'cleric') return MORALE_CLERIC_DEATH_PENALTY;
  if (invaderClass === 'paladin') return MORALE_PALADIN_DEATH_PENALTY;
  return MORALE_ALLY_DEATH_PENALTY;
}

/**
 * Calculate the morale penalty for a trap trigger.
 * Fear Glyph traps deal a larger penalty (-10), others -5.
 */
export function moraleCalculateTrapPenalty(isFearGlyph: boolean): number {
  return isFearGlyph ? MORALE_FEAR_GLYPH_PENALTY : MORALE_TRAP_TRIGGER_PENALTY;
}

/**
 * Calculate the morale penalty for entering a high-fear room.
 * Returns -15 if fear >= 3, or 0 if negated by Paladin Aura of Courage.
 */
export function moraleCalculateFearRoomPenalty(
  roomFearLevel: number,
  hasPaladinAura: boolean,
): number {
  if (hasPaladinAura) return 0;
  if (roomFearLevel >= MORALE_HIGH_FEAR_ROOM_THRESHOLD) {
    return MORALE_HIGH_FEAR_ROOM_PENALTY;
  }
  return 0;
}

/**
 * Calculate the morale bonus for capturing a room.
 * High-value rooms (Vault, Library) give +15, others +10.
 */
export function moraleCalculateRoomCaptureBonus(
  isHighValue: boolean,
): number {
  return isHighValue
    ? MORALE_HIGH_VALUE_ROOM_CAPTURE_BONUS
    : MORALE_ROOM_CAPTURE_BONUS;
}

/**
 * Apply a morale delta to the current value and clamp.
 * Pure function — returns the new morale value.
 */
export function moraleApplyDelta(current: number, delta: number): number {
  return moraleClamp(current + delta);
}

/**
 * Check if any invader in the party has the 'courage' status effect (Paladin Aura).
 */
export function moralePartyHasPaladinAura(invaders: InvaderInstance[]): boolean {
  return invaders.some(
    (inv) =>
      inv.currentHp > 0 &&
      inv.statusEffects.some((s) => s.name === 'courage'),
  );
}

/**
 * Look up the invader class for a given invader instance.
 * Returns the class type or undefined if the definition is missing.
 */
export function moraleGetInvaderClass(
  invader: InvaderInstance,
): InvaderClassType | undefined {
  const def = invaderGetDefinitionById(invader.definitionId);
  return def?.invaderClass;
}

// --- Signal mutation functions ---

/**
 * Initialize morale for a new invasion. Resets to 100 and clears event log.
 */
export function moraleInit(): void {
  moraleCurrent.set(MORALE_INITIAL);
  moraleEventLog.set([]);
  moraleIsRetreating.set(false);
}

/**
 * Apply a morale event: update current morale signal, add to event log.
 * Returns the new morale value.
 */
export function moraleApply(
  eventType: MoraleEventType,
  delta: number,
  turn: number,
  description: string,
): number {
  const current = moraleCurrent();
  const newValue = moraleApplyDelta(current, delta);
  moraleCurrent.set(newValue);

  const event: MoraleEvent = {
    turn,
    eventType,
    delta,
    newValue,
    description,
  };
  moraleEventLog.update((log) => [...log, event]);

  if (newValue <= MORALE_MIN) {
    moraleIsRetreating.set(true);
  }

  return newValue;
}

/**
 * Apply morale penalty for an ally death during invasion.
 * Looks up invader class to determine penalty amount.
 */
export function moraleApplyAllyDeath(
  invader: InvaderInstance,
  turn: number,
): number {
  const invaderClass = moraleGetInvaderClass(invader);
  const penalty = moraleCalculateAllyDeathPenalty(invaderClass ?? 'warrior');
  const classLabel =
    invaderClass === 'cleric' || invaderClass === 'paladin'
      ? `${invaderClass.charAt(0).toUpperCase() + invaderClass.slice(1)} fallen`
      : 'Ally fallen';
  return moraleApply('ally_death', penalty, turn, classLabel);
}

/**
 * Apply morale penalty for a trap trigger during invasion.
 */
export function moraleApplyTrapTrigger(
  isFearGlyph: boolean,
  turn: number,
): number {
  const penalty = moraleCalculateTrapPenalty(isFearGlyph);
  const desc = isFearGlyph ? 'Fear Glyph triggered' : 'Trap triggered';
  return moraleApply('trap_trigger', penalty, turn, desc);
}

/**
 * Apply morale penalty for entering a high-fear room.
 * Returns the new morale value, or current value if no penalty applied.
 */
export function moraleApplyFearRoomEntry(
  roomFearLevel: number,
  invaders: InvaderInstance[],
  turn: number,
): number {
  const hasPaladinAura = moralePartyHasPaladinAura(invaders);
  const penalty = moraleCalculateFearRoomPenalty(roomFearLevel, hasPaladinAura);
  if (penalty === 0) return moraleCurrent();
  return moraleApply('high_fear_room', penalty, turn, 'Entered terrifying room');
}

/**
 * Apply morale bonus for capturing a room.
 */
export function moraleApplyRoomCapture(
  isHighValue: boolean,
  turn: number,
): number {
  const bonus = moraleCalculateRoomCaptureBonus(isHighValue);
  const desc = isHighValue ? 'Captured high-value room' : 'Room captured';
  return moraleApply('room_capture', bonus, turn, desc);
}
