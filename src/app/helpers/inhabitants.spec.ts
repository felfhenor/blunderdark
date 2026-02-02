import type { GameState, InhabitantInstance } from '@interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockInhabitants: InhabitantInstance[];

vi.mock('@helpers/state-game', () => {
  return {
    gamestate: () => ({
      world: { inhabitants: mockInhabitants },
    }),
    updateGamestate: vi.fn(async (fn: (state: GameState) => GameState) => {
      const fakeState = {
        world: { inhabitants: mockInhabitants },
      } as GameState;
      const result = fn(fakeState);
      mockInhabitants = result.world.inhabitants;
    }),
  };
});

const {
  allInhabitants,
  getInhabitant,
  addInhabitant,
  removeInhabitant,
  serializeInhabitants,
  deserializeInhabitants,
} = await import('@helpers/inhabitants');

function createTestInhabitant(
  overrides: Partial<InhabitantInstance> = {},
): InhabitantInstance {
  return {
    instanceId: 'inst-001',
    definitionId: '7f716f6e-3742-496b-8277-875c180b0d94',
    name: 'Goblin Worker',
    state: 'normal',
    assignedRoomId: null,
    ...overrides,
  };
}

describe('inhabitant management', () => {
  beforeEach(() => {
    mockInhabitants = [];
  });

  it('should add an inhabitant', async () => {
    const goblin = createTestInhabitant();
    await addInhabitant(goblin);
    expect(mockInhabitants).toHaveLength(1);
    expect(mockInhabitants[0].name).toBe('Goblin Worker');
  });

  it('should remove an inhabitant by instanceId', async () => {
    mockInhabitants = [
      createTestInhabitant({ instanceId: 'inst-001' }),
      createTestInhabitant({ instanceId: 'inst-002', name: 'Kobold Scout' }),
    ];
    await removeInhabitant('inst-001');
    expect(mockInhabitants).toHaveLength(1);
    expect(mockInhabitants[0].instanceId).toBe('inst-002');
  });

  it('should get all inhabitants', () => {
    mockInhabitants = [
      createTestInhabitant({ instanceId: 'inst-001' }),
      createTestInhabitant({ instanceId: 'inst-002' }),
    ];
    const all = allInhabitants();
    expect(all()).toHaveLength(2);
  });

  it('should get a specific inhabitant by instanceId', () => {
    mockInhabitants = [
      createTestInhabitant({ instanceId: 'inst-001', name: 'Goblin' }),
    ];
    const found = getInhabitant('inst-001');
    expect(found()?.name).toBe('Goblin');
  });

  it('should return undefined for non-existent inhabitant', () => {
    mockInhabitants = [];
    const found = getInhabitant('nonexistent');
    expect(found()).toBeUndefined();
  });
});

describe('inhabitant serialization', () => {
  it('should round-trip an inhabitant with all fields populated', () => {
    const original: InhabitantInstance = {
      instanceId: 'inst-001',
      definitionId: '7f716f6e-3742-496b-8277-875c180b0d94',
      name: 'Goblin Miner',
      state: 'scared',
      assignedRoomId: 'room-abc',
    };

    const serialized = serializeInhabitants([original]);
    const json = JSON.stringify(serialized);
    const parsed = JSON.parse(json) as InhabitantInstance[];
    const deserialized = deserializeInhabitants(parsed);

    expect(deserialized).toHaveLength(1);
    expect(deserialized[0]).toEqual(original);
  });

  it('should round-trip multiple inhabitants', () => {
    const inhabitants: InhabitantInstance[] = [
      createTestInhabitant({ instanceId: 'inst-001', state: 'normal' }),
      createTestInhabitant({
        instanceId: 'inst-002',
        name: 'Skeleton Guard',
        state: 'hungry',
        assignedRoomId: 'room-xyz',
      }),
    ];

    const serialized = serializeInhabitants(inhabitants);
    const json = JSON.stringify(serialized);
    const parsed = JSON.parse(json) as InhabitantInstance[];
    const deserialized = deserializeInhabitants(parsed);

    expect(deserialized).toEqual(inhabitants);
  });

  it('should handle missing optional fields during deserialization', () => {
    const partial = [
      {
        instanceId: 'inst-001',
        definitionId: 'def-001',
        name: 'Old Goblin',
      },
    ] as unknown as InhabitantInstance[];

    const deserialized = deserializeInhabitants(partial);

    expect(deserialized[0].state).toBe('normal');
    expect(deserialized[0].assignedRoomId).toBeNull();
  });

  it('should not mutate the original array during serialization', () => {
    const original = [createTestInhabitant()];
    const serialized = serializeInhabitants(original);
    serialized[0].name = 'Modified';
    expect(original[0].name).toBe('Goblin Worker');
  });
});
