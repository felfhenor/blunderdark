import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { InvaderInstance } from '@interfaces/invader';

vi.mock('@helpers/invaders', () => ({
  invaderGetDefinitionById: vi.fn(),
}));

import {
  MORALE_INITIAL,
  MORALE_MIN,
  MORALE_MAX,
  MORALE_ALLY_DEATH_PENALTY,
  MORALE_CLERIC_DEATH_PENALTY,
  MORALE_PALADIN_DEATH_PENALTY,
  MORALE_TRAP_TRIGGER_PENALTY,
  MORALE_FEAR_GLYPH_PENALTY,
  MORALE_HIGH_FEAR_ROOM_PENALTY,
  MORALE_HIGH_FEAR_ROOM_THRESHOLD,
  MORALE_ROOM_CAPTURE_BONUS,
  MORALE_HIGH_VALUE_ROOM_CAPTURE_BONUS,
  moraleClamp,
  moraleCalculateAllyDeathPenalty,
  moraleCalculateTrapPenalty,
  moraleCalculateFearRoomPenalty,
  moraleCalculateRoomCaptureBonus,
  moraleApplyDelta,
  moralePartyHasPaladinAura,
  moraleCurrent,
  moraleEventLog,
  moraleIsRetreating,
  moraleInit,
  moraleApply,
  moraleApplyAllyDeath,
  moraleApplyTrapTrigger,
  moraleApplyFearRoomEntry,
  moraleApplyRoomCapture,
} from '@helpers/morale';
import { invaderGetDefinitionById } from '@helpers/invaders';

const mockInvaderGetDefinitionById = vi.mocked(invaderGetDefinitionById);

// --- Test helpers ---

function makeInvader(
  id: string,
  hp = 10,
  statusEffects: InvaderInstance['statusEffects'] = [],
): InvaderInstance {
  return {
    id,
    definitionId: `def-${id}`,
    currentHp: hp,
    maxHp: hp,
    statusEffects,
    abilityStates: [],
  };
}

describe('morale', () => {
  beforeEach(() => {
    moraleInit();
    mockInvaderGetDefinitionById.mockReset();
  });

  // --- Constants ---

  describe('constants', () => {
    it('MORALE_INITIAL should be 100', () => {
      expect(MORALE_INITIAL).toBe(100);
    });

    it('MORALE_MIN should be 0', () => {
      expect(MORALE_MIN).toBe(0);
    });

    it('MORALE_MAX should be 100', () => {
      expect(MORALE_MAX).toBe(100);
    });
  });

  // --- moraleClamp ---

  describe('moraleClamp', () => {
    it('should clamp to MORALE_MIN when below 0', () => {
      expect(moraleClamp(-50)).toBe(0);
    });

    it('should clamp to MORALE_MAX when above 100', () => {
      expect(moraleClamp(150)).toBe(100);
    });

    it('should return value unchanged when within range', () => {
      expect(moraleClamp(50)).toBe(50);
    });

    it('should return 0 for exactly 0', () => {
      expect(moraleClamp(0)).toBe(0);
    });

    it('should return 100 for exactly 100', () => {
      expect(moraleClamp(100)).toBe(100);
    });
  });

  // --- moraleCalculateAllyDeathPenalty ---

  describe('moraleCalculateAllyDeathPenalty', () => {
    it('should return -10 for warrior', () => {
      expect(moraleCalculateAllyDeathPenalty('warrior')).toBe(MORALE_ALLY_DEATH_PENALTY);
    });

    it('should return -10 for rogue', () => {
      expect(moraleCalculateAllyDeathPenalty('rogue')).toBe(MORALE_ALLY_DEATH_PENALTY);
    });

    it('should return -10 for mage', () => {
      expect(moraleCalculateAllyDeathPenalty('mage')).toBe(MORALE_ALLY_DEATH_PENALTY);
    });

    it('should return -10 for ranger', () => {
      expect(moraleCalculateAllyDeathPenalty('ranger')).toBe(MORALE_ALLY_DEATH_PENALTY);
    });

    it('should return -15 for cleric', () => {
      expect(moraleCalculateAllyDeathPenalty('cleric')).toBe(MORALE_CLERIC_DEATH_PENALTY);
    });

    it('should return -15 for paladin', () => {
      expect(moraleCalculateAllyDeathPenalty('paladin')).toBe(MORALE_PALADIN_DEATH_PENALTY);
    });
  });

  // --- moraleCalculateTrapPenalty ---

  describe('moraleCalculateTrapPenalty', () => {
    it('should return -5 for normal traps', () => {
      expect(moraleCalculateTrapPenalty(false)).toBe(MORALE_TRAP_TRIGGER_PENALTY);
    });

    it('should return -10 for Fear Glyph', () => {
      expect(moraleCalculateTrapPenalty(true)).toBe(MORALE_FEAR_GLYPH_PENALTY);
    });
  });

  // --- moraleCalculateFearRoomPenalty ---

  describe('moraleCalculateFearRoomPenalty', () => {
    it('should return -15 for high fear room (fear >= 3)', () => {
      expect(moraleCalculateFearRoomPenalty(3, false)).toBe(MORALE_HIGH_FEAR_ROOM_PENALTY);
    });

    it('should return -15 for very high fear room (fear 4)', () => {
      expect(moraleCalculateFearRoomPenalty(4, false)).toBe(MORALE_HIGH_FEAR_ROOM_PENALTY);
    });

    it('should return 0 for low fear room (fear < 3)', () => {
      expect(moraleCalculateFearRoomPenalty(2, false)).toBe(0);
    });

    it('should return 0 for zero fear room', () => {
      expect(moraleCalculateFearRoomPenalty(0, false)).toBe(0);
    });

    it('should return 0 when Paladin Aura negates fear', () => {
      expect(moraleCalculateFearRoomPenalty(4, true)).toBe(0);
    });

    it('threshold should be 3', () => {
      expect(MORALE_HIGH_FEAR_ROOM_THRESHOLD).toBe(3);
    });
  });

  // --- moraleCalculateRoomCaptureBonus ---

  describe('moraleCalculateRoomCaptureBonus', () => {
    it('should return +10 for normal room capture', () => {
      expect(moraleCalculateRoomCaptureBonus(false)).toBe(MORALE_ROOM_CAPTURE_BONUS);
    });

    it('should return +15 for high-value room capture', () => {
      expect(moraleCalculateRoomCaptureBonus(true)).toBe(MORALE_HIGH_VALUE_ROOM_CAPTURE_BONUS);
    });
  });

  // --- moraleApplyDelta ---

  describe('moraleApplyDelta', () => {
    it('should add positive delta', () => {
      expect(moraleApplyDelta(50, 20)).toBe(70);
    });

    it('should subtract negative delta', () => {
      expect(moraleApplyDelta(50, -20)).toBe(30);
    });

    it('should clamp at 0', () => {
      expect(moraleApplyDelta(10, -50)).toBe(0);
    });

    it('should clamp at 100', () => {
      expect(moraleApplyDelta(90, 20)).toBe(100);
    });
  });

  // --- moralePartyHasPaladinAura ---

  describe('moralePartyHasPaladinAura', () => {
    it('should return false for empty party', () => {
      expect(moralePartyHasPaladinAura([])).toBe(false);
    });

    it('should return false when no invader has courage status', () => {
      const invaders = [makeInvader('a'), makeInvader('b')];
      expect(moralePartyHasPaladinAura(invaders)).toBe(false);
    });

    it('should return true when an alive invader has courage status', () => {
      const invaders = [
        makeInvader('a'),
        makeInvader('b', 10, [{ name: 'courage', remainingDuration: 5 }]),
      ];
      expect(moralePartyHasPaladinAura(invaders)).toBe(true);
    });

    it('should return false when only dead invaders have courage status', () => {
      const invaders = [
        makeInvader('a'),
        makeInvader('b', 0, [{ name: 'courage', remainingDuration: 5 }]),
      ];
      expect(moralePartyHasPaladinAura(invaders)).toBe(false);
    });
  });

  // --- moraleInit ---

  describe('moraleInit', () => {
    it('should reset morale to 100', () => {
      moraleCurrent.set(50);
      moraleInit();
      expect(moraleCurrent()).toBe(MORALE_INITIAL);
    });

    it('should clear event log', () => {
      moraleEventLog.set([{
        turn: 1,
        eventType: 'ally_death',
        delta: -10,
        newValue: 90,
        description: 'test',
      }]);
      moraleInit();
      expect(moraleEventLog()).toEqual([]);
    });

    it('should reset retreating flag', () => {
      moraleIsRetreating.set(true);
      moraleInit();
      expect(moraleIsRetreating()).toBe(false);
    });
  });

  // --- moraleApply ---

  describe('moraleApply', () => {
    it('should update morale signal', () => {
      moraleApply('ally_death', -10, 1, 'Ally fallen');
      expect(moraleCurrent()).toBe(90);
    });

    it('should add event to log', () => {
      moraleApply('ally_death', -10, 1, 'Ally fallen');
      const log = moraleEventLog();
      expect(log).toHaveLength(1);
      expect(log[0]).toEqual({
        turn: 1,
        eventType: 'ally_death',
        delta: -10,
        newValue: 90,
        description: 'Ally fallen',
      });
    });

    it('should return the new morale value', () => {
      const result = moraleApply('trap_trigger', -5, 2, 'Trap triggered');
      expect(result).toBe(95);
    });

    it('should clamp at 0', () => {
      moraleCurrent.set(5);
      const result = moraleApply('ally_death', -10, 1, 'Ally fallen');
      expect(result).toBe(0);
    });

    it('should cap at 100', () => {
      moraleCurrent.set(95);
      const result = moraleApply('room_capture', 10, 1, 'Room captured');
      expect(result).toBe(100);
    });

    it('should set retreating flag when morale reaches 0', () => {
      moraleCurrent.set(5);
      moraleApply('ally_death', -10, 1, 'Ally fallen');
      expect(moraleIsRetreating()).toBe(true);
    });

    it('should not set retreating flag when morale is above 0', () => {
      moraleApply('ally_death', -10, 1, 'Ally fallen');
      expect(moraleIsRetreating()).toBe(false);
    });

    it('should accumulate multiple events in log', () => {
      moraleApply('ally_death', -10, 1, 'Ally fallen');
      moraleApply('trap_trigger', -5, 2, 'Trap triggered');
      moraleApply('room_capture', 10, 3, 'Room captured');
      expect(moraleEventLog()).toHaveLength(3);
    });
  });

  // --- moraleApplyAllyDeath ---

  describe('moraleApplyAllyDeath', () => {
    it('should apply -10 for warrior death', () => {
      mockInvaderGetDefinitionById.mockReturnValue({
        id: 'def-a',
        name: 'Warrior',
        description: '',
        invaderClass: 'warrior',
        baseStats: { hp: 10, attack: 5, defense: 3, speed: 2 },
        combatAbilityIds: [],
        sprite: '',
        __type: 'invader',
      } as never);

      moraleApplyAllyDeath(makeInvader('a'), 1);
      expect(moraleCurrent()).toBe(90);
    });

    it('should apply -15 for cleric death', () => {
      mockInvaderGetDefinitionById.mockReturnValue({
        id: 'def-a',
        name: 'Cleric',
        description: '',
        invaderClass: 'cleric',
        baseStats: { hp: 10, attack: 5, defense: 3, speed: 2 },
        combatAbilityIds: [],
        sprite: '',
        __type: 'invader',
      } as never);

      moraleApplyAllyDeath(makeInvader('a'), 1);
      expect(moraleCurrent()).toBe(85);
    });

    it('should apply -15 for paladin death', () => {
      mockInvaderGetDefinitionById.mockReturnValue({
        id: 'def-a',
        name: 'Paladin',
        description: '',
        invaderClass: 'paladin',
        baseStats: { hp: 10, attack: 5, defense: 3, speed: 2 },
        combatAbilityIds: [],
        sprite: '',
        __type: 'invader',
      } as never);

      moraleApplyAllyDeath(makeInvader('a'), 1);
      expect(moraleCurrent()).toBe(85);
    });
  });

  // --- moraleApplyTrapTrigger ---

  describe('moraleApplyTrapTrigger', () => {
    it('should apply -5 for normal trap', () => {
      moraleApplyTrapTrigger(false, 1);
      expect(moraleCurrent()).toBe(95);
    });

    it('should apply -10 for Fear Glyph', () => {
      moraleApplyTrapTrigger(true, 1);
      expect(moraleCurrent()).toBe(90);
    });
  });

  // --- moraleApplyFearRoomEntry ---

  describe('moraleApplyFearRoomEntry', () => {
    it('should apply -15 for high fear room (fear >= 3)', () => {
      const invaders = [makeInvader('a')];
      moraleApplyFearRoomEntry(3, invaders, 1);
      expect(moraleCurrent()).toBe(85);
    });

    it('should not apply penalty for low fear room', () => {
      const invaders = [makeInvader('a')];
      moraleApplyFearRoomEntry(2, invaders, 1);
      expect(moraleCurrent()).toBe(100);
    });

    it('should not apply penalty when Paladin Aura is active', () => {
      const invaders = [
        makeInvader('a'),
        makeInvader('b', 10, [{ name: 'courage', remainingDuration: 5 }]),
      ];
      moraleApplyFearRoomEntry(4, invaders, 1);
      expect(moraleCurrent()).toBe(100);
    });
  });

  // --- moraleApplyRoomCapture ---

  describe('moraleApplyRoomCapture', () => {
    it('should apply +10 for normal room capture', () => {
      moraleCurrent.set(80);
      moraleApplyRoomCapture(false, 1);
      expect(moraleCurrent()).toBe(90);
    });

    it('should apply +15 for high-value room capture', () => {
      moraleCurrent.set(80);
      moraleApplyRoomCapture(true, 1);
      expect(moraleCurrent()).toBe(95);
    });

    it('should cap at 100', () => {
      moraleCurrent.set(95);
      moraleApplyRoomCapture(false, 1);
      expect(moraleCurrent()).toBe(100);
    });
  });

  // --- Zero morale triggers retreat ---

  describe('zero morale triggers retreat', () => {
    it('should set retreating when accumulated penalties reach 0', () => {
      // Start at 100, apply 10 ally deaths of -10 each
      for (let i = 0; i < 10; i++) {
        moraleApply('ally_death', -10, i + 1, 'Ally fallen');
      }
      expect(moraleCurrent()).toBe(0);
      expect(moraleIsRetreating()).toBe(true);
    });

    it('should set retreating on single large penalty to 0', () => {
      moraleCurrent.set(10);
      moraleApply('high_fear_room', -15, 1, 'Terrified');
      expect(moraleCurrent()).toBe(0);
      expect(moraleIsRetreating()).toBe(true);
    });
  });
});
