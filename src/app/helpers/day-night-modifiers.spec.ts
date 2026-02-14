import { describe, expect, it, vi } from 'vitest';

const SKELETON_DEF_ID = 'aa200001-0001-0001-0001-000000000001';
const GOBLIN_DEF_ID = 'aa200001-0001-0001-0001-000000000002';

const mockContent = new Map<string, unknown>();
mockContent.set(SKELETON_DEF_ID, { id: SKELETON_DEF_ID, __type: 'inhabitant', type: 'undead', name: 'Skeleton' });
mockContent.set(GOBLIN_DEF_ID, { id: GOBLIN_DEF_ID, __type: 'inhabitant', type: 'creature', name: 'Goblin' });

vi.mock('@helpers/content', () => ({
  contentGetEntry: vi.fn((id: string) => mockContent.get(id) ?? undefined),
}));

import {
  DAY_NIGHT_DAWN_HOUR,
  DAY_NIGHT_DAY_END,
  DAY_NIGHT_DAY_START,
  DAY_NIGHT_DUSK_HOUR,
  dayNightCalculateCreatureProductionModifier,
  dayNightCalculateCreatureProductionModifierPure,
  dayNightFormatMultiplier,
  dayNightGetActiveCreatureModifiers,
  dayNightGetActiveResourceModifiers,
  dayNightGetAllActiveModifiers,
  dayNightGetCreatureModifier,
  dayNightGetPhase,
  dayNightGetPhaseLabel,
  dayNightGetResourceModifier,
} from '@helpers/day-night-modifiers';
import type { InhabitantId, InhabitantInstance, InhabitantInstanceId, PlacedRoomId } from '@interfaces';

function makeInhabitant(
  instanceId: string,
  definitionId: string,
  assignedRoomId: PlacedRoomId | undefined = undefined,
): InhabitantInstance {
  return {
    instanceId: instanceId as InhabitantInstanceId,
    definitionId: definitionId as InhabitantId,
    name: 'Test',
    state: 'normal',
    assignedRoomId,
  };
}

// --- Phase detection ---

describe('dayNightGetPhase', () => {
  it('should return dawn for hour 6', () => {
    expect(dayNightGetPhase(DAY_NIGHT_DAWN_HOUR)).toBe('dawn');
  });

  it('should return dusk for hour 18', () => {
    expect(dayNightGetPhase(DAY_NIGHT_DUSK_HOUR)).toBe('dusk');
  });

  it('should return day for hours 7-17', () => {
    for (let h = DAY_NIGHT_DAY_START; h <= DAY_NIGHT_DAY_END; h++) {
      expect(dayNightGetPhase(h)).toBe('day');
    }
  });

  it('should return night for hours 19-23', () => {
    for (let h = 19; h <= 23; h++) {
      expect(dayNightGetPhase(h)).toBe('night');
    }
  });

  it('should return night for hours 0-5', () => {
    for (let h = 0; h <= 5; h++) {
      expect(dayNightGetPhase(h)).toBe('night');
    }
  });
});

// --- Resource modifiers ---

describe('dayNightGetResourceModifier', () => {
  it('should return +25% food during day', () => {
    expect(dayNightGetResourceModifier(12, 'food')).toBeCloseTo(1.25);
  });

  it('should return 1.0 for food at night', () => {
    expect(dayNightGetResourceModifier(22, 'food')).toBe(1.0);
  });

  it('should return +50% corruption at night', () => {
    expect(dayNightGetResourceModifier(22, 'corruption')).toBeCloseTo(1.50);
  });

  it('should return 1.0 for corruption during day', () => {
    expect(dayNightGetResourceModifier(12, 'corruption')).toBe(1.0);
  });

  it('should return +100% flux at dawn', () => {
    expect(dayNightGetResourceModifier(6, 'flux')).toBeCloseTo(2.0);
  });

  it('should return +100% flux at dusk', () => {
    expect(dayNightGetResourceModifier(18, 'flux')).toBeCloseTo(2.0);
  });

  it('should return 1.0 for flux during day', () => {
    expect(dayNightGetResourceModifier(12, 'flux')).toBe(1.0);
  });

  it('should return 1.0 for flux at night', () => {
    expect(dayNightGetResourceModifier(22, 'flux')).toBe(1.0);
  });

  it('should return 1.0 for unaffected resource types', () => {
    expect(dayNightGetResourceModifier(12, 'crystals')).toBe(1.0);
    expect(dayNightGetResourceModifier(12, 'gold')).toBe(1.0);
    expect(dayNightGetResourceModifier(22, 'research')).toBe(1.0);
  });
});

// --- Active resource modifiers ---

describe('dayNightGetActiveResourceModifiers', () => {
  it('should return food modifier during day', () => {
    const mods = dayNightGetActiveResourceModifiers(12);
    expect(mods).toHaveLength(1);
    expect(mods[0].resourceType).toBe('food');
    expect(mods[0].multiplier).toBeCloseTo(1.25);
  });

  it('should return corruption modifier at night', () => {
    const mods = dayNightGetActiveResourceModifiers(22);
    expect(mods).toHaveLength(1);
    expect(mods[0].resourceType).toBe('corruption');
    expect(mods[0].multiplier).toBeCloseTo(1.50);
  });

  it('should return flux modifier at dawn', () => {
    const mods = dayNightGetActiveResourceModifiers(6);
    expect(mods).toHaveLength(1);
    expect(mods[0].resourceType).toBe('flux');
  });

  it('should return flux modifier at dusk', () => {
    const mods = dayNightGetActiveResourceModifiers(18);
    expect(mods).toHaveLength(1);
    expect(mods[0].resourceType).toBe('flux');
  });
});

// --- Creature modifiers ---

describe('dayNightGetCreatureModifier', () => {
  it('should return -10% for undead during day', () => {
    expect(dayNightGetCreatureModifier(12, 'undead')).toBeCloseTo(0.90);
  });

  it('should return +30% for undead at night', () => {
    expect(dayNightGetCreatureModifier(22, 'undead')).toBeCloseTo(1.30);
  });

  it('should return 1.0 for undead at dawn', () => {
    expect(dayNightGetCreatureModifier(6, 'undead')).toBe(1.0);
  });

  it('should return 1.0 for undead at dusk', () => {
    expect(dayNightGetCreatureModifier(18, 'undead')).toBe(1.0);
  });

  it('should return 1.0 for non-undead creature types', () => {
    expect(dayNightGetCreatureModifier(12, 'creature')).toBe(1.0);
    expect(dayNightGetCreatureModifier(22, 'creature')).toBe(1.0);
    expect(dayNightGetCreatureModifier(12, 'fungal')).toBe(1.0);
  });
});

// --- Active creature modifiers ---

describe('dayNightGetActiveCreatureModifiers', () => {
  it('should return undead penalty during day', () => {
    const mods = dayNightGetActiveCreatureModifiers(12);
    expect(mods).toHaveLength(1);
    expect(mods[0].creatureType).toBe('undead');
    expect(mods[0].multiplier).toBeCloseTo(0.90);
  });

  it('should return undead bonus at night', () => {
    const mods = dayNightGetActiveCreatureModifiers(22);
    expect(mods).toHaveLength(1);
    expect(mods[0].creatureType).toBe('undead');
    expect(mods[0].multiplier).toBeCloseTo(1.30);
  });

  it('should return no creature modifiers at dawn', () => {
    expect(dayNightGetActiveCreatureModifiers(6)).toHaveLength(0);
  });

  it('should return no creature modifiers at dusk', () => {
    expect(dayNightGetActiveCreatureModifiers(18)).toHaveLength(0);
  });
});

// --- Pure creature production modifier ---

describe('dayNightCalculateCreatureProductionModifierPure', () => {
  it('should return 1.0 for empty creature list', () => {
    expect(dayNightCalculateCreatureProductionModifierPure(12, [])).toBe(1.0);
  });

  it('should return 0.90 for all-undead room during day', () => {
    expect(dayNightCalculateCreatureProductionModifierPure(12, ['undead', 'undead'])).toBeCloseTo(0.90);
  });

  it('should return 1.30 for all-undead room at night', () => {
    expect(dayNightCalculateCreatureProductionModifierPure(22, ['undead', 'undead'])).toBeCloseTo(1.30);
  });

  it('should return 1.0 for all non-undead during day', () => {
    expect(dayNightCalculateCreatureProductionModifierPure(12, ['creature', 'creature'])).toBe(1.0);
  });

  it('should return weighted modifier for mixed room during day', () => {
    // 2 creatures (1.0 each) + 1 undead (0.90) = (1.0 + 1.0 + 0.90) / 3 = 0.967
    const result = dayNightCalculateCreatureProductionModifierPure(12, ['creature', 'creature', 'undead']);
    expect(result).toBeCloseTo((1.0 + 1.0 + 0.90) / 3);
  });

  it('should return weighted modifier for mixed room at night', () => {
    // 1 creature (1.0) + 1 undead (1.30) = (1.0 + 1.30) / 2 = 1.15
    const result = dayNightCalculateCreatureProductionModifierPure(22, ['creature', 'undead']);
    expect(result).toBeCloseTo(1.15);
  });

  it('should return 1.0 at dawn for any creature types', () => {
    expect(dayNightCalculateCreatureProductionModifierPure(6, ['undead', 'creature'])).toBe(1.0);
  });
});

// --- Creature production modifier with content lookup ---

describe('dayNightCalculateCreatureProductionModifier', () => {
  const ROOM_ID = 'room-001' as PlacedRoomId;

  it('should return 1.0 for room with no assigned inhabitants', () => {
    const inhabitants = [
      makeInhabitant('i1', SKELETON_DEF_ID, 'other-room' as PlacedRoomId),
    ];
    expect(dayNightCalculateCreatureProductionModifier(12, inhabitants, ROOM_ID)).toBe(1.0);
  });

  it('should return 0.90 for room with only undead during day', () => {
    const inhabitants = [
      makeInhabitant('i1', SKELETON_DEF_ID, ROOM_ID),
    ];
    expect(dayNightCalculateCreatureProductionModifier(12, inhabitants, ROOM_ID)).toBeCloseTo(0.90);
  });

  it('should return 1.30 for room with only undead at night', () => {
    const inhabitants = [
      makeInhabitant('i1', SKELETON_DEF_ID, ROOM_ID),
    ];
    expect(dayNightCalculateCreatureProductionModifier(22, inhabitants, ROOM_ID)).toBeCloseTo(1.30);
  });

  it('should return weighted modifier for mixed room', () => {
    const inhabitants = [
      makeInhabitant('i1', GOBLIN_DEF_ID, ROOM_ID),
      makeInhabitant('i2', SKELETON_DEF_ID, ROOM_ID),
    ];
    // day: (1.0 + 0.90) / 2 = 0.95
    expect(dayNightCalculateCreatureProductionModifier(12, inhabitants, ROOM_ID)).toBeCloseTo(0.95);
  });

  it('should only consider inhabitants assigned to the room', () => {
    const inhabitants = [
      makeInhabitant('i1', SKELETON_DEF_ID, ROOM_ID),
      makeInhabitant('i2', SKELETON_DEF_ID, 'other-room' as PlacedRoomId),
      makeInhabitant('i3', GOBLIN_DEF_ID, ROOM_ID),
    ];
    // Only i1 (undead) and i3 (creature) in this room: (0.90 + 1.0) / 2 = 0.95
    expect(dayNightCalculateCreatureProductionModifier(12, inhabitants, ROOM_ID)).toBeCloseTo(0.95);
  });
});

// --- Combined active modifiers ---

describe('dayNightGetAllActiveModifiers', () => {
  it('should return day phase with food modifier and undead penalty', () => {
    const result = dayNightGetAllActiveModifiers(12);
    expect(result.phase).toBe('day');
    expect(result.resourceModifiers).toHaveLength(1);
    expect(result.creatureModifiers).toHaveLength(1);
  });

  it('should return night phase with corruption modifier and undead bonus', () => {
    const result = dayNightGetAllActiveModifiers(22);
    expect(result.phase).toBe('night');
    expect(result.resourceModifiers).toHaveLength(1);
    expect(result.creatureModifiers).toHaveLength(1);
  });

  it('should return dawn phase with flux modifier and no creature modifiers', () => {
    const result = dayNightGetAllActiveModifiers(6);
    expect(result.phase).toBe('dawn');
    expect(result.resourceModifiers).toHaveLength(1);
    expect(result.creatureModifiers).toHaveLength(0);
  });

  it('should return dusk phase with flux modifier and no creature modifiers', () => {
    const result = dayNightGetAllActiveModifiers(18);
    expect(result.phase).toBe('dusk');
    expect(result.resourceModifiers).toHaveLength(1);
    expect(result.creatureModifiers).toHaveLength(0);
  });
});

// --- Format helpers ---

describe('dayNightFormatMultiplier', () => {
  it('should format bonus as positive percentage', () => {
    expect(dayNightFormatMultiplier(1.25)).toBe('+25%');
  });

  it('should format penalty as negative percentage', () => {
    expect(dayNightFormatMultiplier(0.90)).toBe('-10%');
  });

  it('should format 2.0 as +100%', () => {
    expect(dayNightFormatMultiplier(2.0)).toBe('+100%');
  });

  it('should format 1.50 as +50%', () => {
    expect(dayNightFormatMultiplier(1.50)).toBe('+50%');
  });
});

describe('dayNightGetPhaseLabel', () => {
  it('should return correct labels', () => {
    expect(dayNightGetPhaseLabel('day')).toBe('Day');
    expect(dayNightGetPhaseLabel('night')).toBe('Night');
    expect(dayNightGetPhaseLabel('dawn')).toBe('Dawn');
    expect(dayNightGetPhaseLabel('dusk')).toBe('Dusk');
  });
});
