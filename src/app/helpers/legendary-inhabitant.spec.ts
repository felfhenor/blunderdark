import { describe, expect, it, vi } from 'vitest';

vi.mock('@helpers/content', () => {
  const entries = new Map<string, unknown>();

  entries.set('room-treasure-vault', {
    id: 'room-treasure-vault',
    name: 'Treasure Vault',
    __type: 'room',
    description: '',
    shapeId: 'shape-2x1',
    cost: {},
    production: {},
    requiresWorkers: false,
    adjacencyBonuses: [],
  });

  entries.set('room-altar', {
    id: 'room-altar',
    name: 'Altar Room',
    __type: 'room',
    description: '',
    shapeId: 'shape-2x1',
    cost: {},
    production: {},
    requiresWorkers: false,
    adjacencyBonuses: [],
    upgradePaths: [
      { id: 'altar-upgrade-2', upgradeLevel: 2, effects: [] },
      { id: 'altar-upgrade-3', upgradeLevel: 3, effects: [] },
    ],
  });

  entries.set('room-shadow-library', {
    id: 'room-shadow-library',
    name: 'Shadow Library',
    __type: 'room',
    description: '',
    shapeId: 'shape-2x1',
    cost: {},
    production: {},
    requiresWorkers: false,
    adjacencyBonuses: [],
  });

  entries.set('room-soul-well', {
    id: 'room-soul-well',
    name: 'Soul Well',
    __type: 'room',
    description: '',
    shapeId: 'shape-2x1',
    cost: {},
    production: {},
    requiresWorkers: false,
    adjacencyBonuses: [],
  });

  entries.set('room-mushroom-farm', {
    id: 'room-mushroom-farm',
    name: 'Mushroom Farm',
    __type: 'room',
    description: '',
    shapeId: 'shape-2x1',
    cost: {},
    production: {},
    requiresWorkers: false,
    adjacencyBonuses: [],
  });

  const allEntries = [...entries.values()];

  return {
    contentGetEntry: vi.fn((id: string) => entries.get(id)),
    contentGetEntriesByType: vi.fn((type: string) => {
      if (type === 'room') return allEntries;
      return [];
    }),
    contentAllIdsByName: vi.fn(() => new Map()),
  };
});

vi.mock('@helpers/room-upgrades', () => ({
  roomUpgradeGetPaths: vi.fn((roomTypeId: string) => {
    if (roomTypeId === 'room-altar') {
      return [
        { id: 'altar-upgrade-2', upgradeLevel: 2, effects: [] },
        { id: 'altar-upgrade-3', upgradeLevel: 3, effects: [] },
      ];
    }
    return [];
  }),
}));

import {
  legendaryInhabitantCanRecruit,
  legendaryInhabitantIsRecruited,
} from './legendary-inhabitant';
import type { InhabitantContent } from '@interfaces/content-inhabitant';
import type {
  Floor,
  InhabitantInstance,
  InhabitantInstanceId,
  ResourceMap,
} from '@interfaces';
import type { InhabitantId } from '@interfaces/content-inhabitant';
import type { FloorId } from '@interfaces/floor';
import type { PlacedRoomId, RoomId, RoomShapeId } from '@interfaces/room-shape';

const DRAGON_ID = 'legendary-dragon' as InhabitantId;
const DEMON_LORD_ID = 'legendary-demon-lord' as InhabitantId;
const BEHOLDER_ID = 'legendary-beholder' as InhabitantId;
const MEDUSA_ID = 'legendary-medusa' as InhabitantId;
const TREANT_ID = 'legendary-treant' as InhabitantId;

function makeResources(
  overrides?: Partial<Record<string, { current: number; max: number }>>,
): ResourceMap {
  return {
    crystals: { current: 0, max: 500 },
    food: { current: 0, max: 500 },
    gold: { current: 0, max: 1000 },
    flux: { current: 0, max: 200 },
    research: { current: 0, max: 300 },
    essence: { current: 0, max: 200 },
    corruption: { current: 0, max: Number.MAX_SAFE_INTEGER },
    ...overrides,
  } as ResourceMap;
}

function makeFloor(rooms: { roomTypeId: string; appliedUpgradePathId?: string }[] = []): Floor {
  return {
    id: 'floor-1' as FloorId,
    name: 'Floor 1',
    depth: 0,
    biome: 'neutral',
    grid: [],
    rooms: rooms.map((r, i) => ({
      id: `room-placed-${i}` as PlacedRoomId,
      roomTypeId: r.roomTypeId as RoomId,
      shapeId: 'shape-2x1' as RoomShapeId,
      anchorX: 0,
      anchorY: i,
      ...(r.appliedUpgradePathId ? { appliedUpgradePathId: r.appliedUpgradePathId } : {}),
    })),
    hallways: [],
    inhabitants: [],
    connections: [],
    traps: [],
  } as unknown as Floor;
}

function makeInhabitant(defId: InhabitantId, name: string): InhabitantInstance {
  return {
    instanceId: `inst-${name}` as InhabitantInstanceId,
    definitionId: defId,
    name,
    state: 'normal',
    assignedRoomId: undefined,
  };
}

function makeDragonDef(): InhabitantContent {
  return {
    id: DRAGON_ID,
    name: 'Dragon',
    __type: 'inhabitant',
    description: 'A mighty dragon',
    type: 'creature',
    tier: 4,
    cost: { gold: 500, flux: 200 },
    stats: { hp: 500, attack: 70, defense: 60, speed: 20, workerEfficiency: 1 },
    traits: [],
    restrictionTags: ['unique'],
    rulerBonuses: {},
    rulerFearLevel: 4,
    fearTolerance: 99,
    fearModifier: 2,
    fearPropagationDistance: 2,
    foodConsumptionRate: 5,
    upkeepCost: { gold: 10, food: 8 },
    recruitmentRequirements: [
      {
        requirementType: 'room',
        targetName: 'Treasure Vault',
        description: 'Requires a Treasure Vault.',
      },
      {
        requirementType: 'resource',
        targetName: 'gold',
        value: 500,
        description: 'Requires 500 gold.',
      },
      {
        requirementType: 'resource',
        targetName: 'flux',
        value: 200,
        description: 'Requires 200 flux.',
      },
    ],
  } as InhabitantContent;
}

function makeDemonLordDef(): InhabitantContent {
  return {
    id: DEMON_LORD_ID,
    name: 'Demon Lord',
    __type: 'inhabitant',
    description: 'An abyssal lord',
    type: 'undead',
    tier: 4,
    cost: { gold: 300, corruption: 500 },
    stats: { hp: 400, attack: 75, defense: 50, speed: 25, workerEfficiency: 1 },
    traits: [],
    restrictionTags: ['unique'],
    rulerBonuses: {},
    rulerFearLevel: 5,
    fearTolerance: 99,
    upkeepCost: { gold: 8, corruption: 5 },
    recruitmentRequirements: [
      {
        requirementType: 'room_level',
        targetName: 'Altar Room',
        value: 3,
        description: 'Requires Altar Room level 3.',
      },
      {
        requirementType: 'resource',
        targetName: 'gold',
        value: 300,
        description: 'Requires 300 gold.',
      },
      {
        requirementType: 'resource',
        targetName: 'corruption',
        value: 500,
        description: 'Requires 500 corruption.',
      },
    ],
  } as InhabitantContent;
}

describe('legendaryInhabitantCanRecruit', () => {
  describe('uniqueness constraint', () => {
    it('should reject recruitment if legendary already exists', () => {
      const def = makeDragonDef();
      const inhabitants = [makeInhabitant(DRAGON_ID, 'Dragon')];
      const floors = [makeFloor([{ roomTypeId: 'room-treasure-vault' }])];
      const resources = makeResources({
        gold: { current: 1000, max: 1000 },
        flux: { current: 500, max: 500 },
      });

      const result = legendaryInhabitantCanRecruit(def, inhabitants, floors, resources);

      expect(result.allowed).toBe(false);
      expect(result.missingRequirements).toHaveLength(1);
      expect(result.missingRequirements[0].met).toBe(false);
      expect(result.missingRequirements[0].requirement.description).toContain('already been recruited');
    });

    it('should allow recruiting a different legendary when one already exists', () => {
      const def = makeDragonDef();
      const inhabitants = [makeInhabitant(BEHOLDER_ID, 'Beholder')];
      const floors = [makeFloor([{ roomTypeId: 'room-treasure-vault' }])];
      const resources = makeResources({
        gold: { current: 1000, max: 1000 },
        flux: { current: 500, max: 500 },
      });

      const result = legendaryInhabitantCanRecruit(def, inhabitants, floors, resources);

      expect(result.allowed).toBe(true);
    });
  });

  describe('room requirements', () => {
    it('should fail when required room is not placed', () => {
      const def = makeDragonDef();
      const floors = [makeFloor([])];
      const resources = makeResources({
        gold: { current: 1000, max: 1000 },
        flux: { current: 500, max: 500 },
      });

      const result = legendaryInhabitantCanRecruit(def, [], floors, resources);

      expect(result.allowed).toBe(false);
      const roomCheck = result.missingRequirements.find(
        (c) => c.requirement.requirementType === 'room',
      );
      expect(roomCheck?.met).toBe(false);
    });

    it('should pass when required room exists on any floor', () => {
      const def = makeDragonDef();
      const floors = [
        makeFloor([]),
        makeFloor([{ roomTypeId: 'room-treasure-vault' }]),
      ];
      const resources = makeResources({
        gold: { current: 1000, max: 1000 },
        flux: { current: 500, max: 500 },
      });

      const result = legendaryInhabitantCanRecruit(def, [], floors, resources);

      expect(result.allowed).toBe(true);
    });
  });

  describe('room_level requirements', () => {
    it('should fail when room exists but has insufficient level', () => {
      const def = makeDemonLordDef();
      const floors = [makeFloor([{ roomTypeId: 'room-altar' }])];
      const resources = makeResources({
        gold: { current: 1000, max: 1000 },
        corruption: { current: 1000, max: Number.MAX_SAFE_INTEGER },
      });

      const result = legendaryInhabitantCanRecruit(def, [], floors, resources);

      expect(result.allowed).toBe(false);
      const levelCheck = result.missingRequirements.find(
        (c) => c.requirement.requirementType === 'room_level',
      );
      expect(levelCheck?.met).toBe(false);
    });

    it('should pass when room meets the required level', () => {
      const def = makeDemonLordDef();
      const floors = [
        makeFloor([
          { roomTypeId: 'room-altar', appliedUpgradePathId: 'altar-upgrade-3' },
        ]),
      ];
      const resources = makeResources({
        gold: { current: 1000, max: 1000 },
        corruption: { current: 1000, max: Number.MAX_SAFE_INTEGER },
      });

      const result = legendaryInhabitantCanRecruit(def, [], floors, resources);

      expect(result.allowed).toBe(true);
    });

    it('should fail when room does not exist at all for room_level check', () => {
      const def = makeDemonLordDef();
      const floors = [makeFloor([])];
      const resources = makeResources({
        gold: { current: 1000, max: 1000 },
        corruption: { current: 1000, max: Number.MAX_SAFE_INTEGER },
      });

      const result = legendaryInhabitantCanRecruit(def, [], floors, resources);

      expect(result.allowed).toBe(false);
    });
  });

  describe('resource requirements', () => {
    it('should fail when resources are insufficient', () => {
      const def = makeDragonDef();
      const floors = [makeFloor([{ roomTypeId: 'room-treasure-vault' }])];
      const resources = makeResources({
        gold: { current: 100, max: 1000 },
        flux: { current: 50, max: 200 },
      });

      const result = legendaryInhabitantCanRecruit(def, [], floors, resources);

      expect(result.allowed).toBe(false);
      const goldCheck = result.missingRequirements.find(
        (c) => c.requirement.targetName === 'gold',
      );
      expect(goldCheck?.met).toBe(false);
      const fluxCheck = result.missingRequirements.find(
        (c) => c.requirement.targetName === 'flux',
      );
      expect(fluxCheck?.met).toBe(false);
    });

    it('should pass when all resources are available', () => {
      const def = makeDragonDef();
      const floors = [makeFloor([{ roomTypeId: 'room-treasure-vault' }])];
      const resources = makeResources({
        gold: { current: 500, max: 1000 },
        flux: { current: 200, max: 200 },
      });

      const result = legendaryInhabitantCanRecruit(def, [], floors, resources);

      expect(result.allowed).toBe(true);
    });

    it('should pass when resources exactly meet the requirement', () => {
      const def = makeDragonDef();
      const floors = [makeFloor([{ roomTypeId: 'room-treasure-vault' }])];
      const resources = makeResources({
        gold: { current: 500, max: 1000 },
        flux: { current: 200, max: 200 },
      });

      const result = legendaryInhabitantCanRecruit(def, [], floors, resources);

      expect(result.allowed).toBe(true);
      expect(result.missingRequirements.every((c) => c.met)).toBe(true);
    });
  });

  describe('multiple requirements combined', () => {
    it('should report all unmet requirements when multiple fail', () => {
      const def = makeDragonDef();
      const floors = [makeFloor([])]; // no Treasure Vault
      const resources = makeResources({
        gold: { current: 100, max: 1000 }, // insufficient
        flux: { current: 50, max: 200 }, // insufficient
      });

      const result = legendaryInhabitantCanRecruit(def, [], floors, resources);

      expect(result.allowed).toBe(false);
      const unmet = result.missingRequirements.filter((c) => !c.met);
      expect(unmet.length).toBe(3); // room + 2 resources
    });

    it('should allow recruitment when all requirements are met', () => {
      const def = makeDragonDef();
      const floors = [makeFloor([{ roomTypeId: 'room-treasure-vault' }])];
      const resources = makeResources({
        gold: { current: 600, max: 1000 },
        flux: { current: 300, max: 500 },
      });

      const result = legendaryInhabitantCanRecruit(def, [], floors, resources);

      expect(result.allowed).toBe(true);
      expect(result.missingRequirements.every((c) => c.met)).toBe(true);
    });
  });

  describe('no recruitment requirements', () => {
    it('should allow recruitment when def has no requirements', () => {
      const def = makeDragonDef();
      def.recruitmentRequirements = undefined;

      const result = legendaryInhabitantCanRecruit(def, [], [makeFloor()], makeResources());

      expect(result.allowed).toBe(true);
      expect(result.missingRequirements).toHaveLength(0);
    });
  });
});

describe('legendaryInhabitantIsRecruited', () => {
  it('should return true when inhabitant with matching defId exists', () => {
    const inhabitants = [makeInhabitant(DRAGON_ID, 'Dragon')];
    expect(legendaryInhabitantIsRecruited(DRAGON_ID, inhabitants)).toBe(true);
  });

  it('should return false when no matching inhabitant exists', () => {
    const inhabitants = [makeInhabitant(BEHOLDER_ID, 'Beholder')];
    expect(legendaryInhabitantIsRecruited(DRAGON_ID, inhabitants)).toBe(false);
  });

  it('should return false for empty inhabitants array', () => {
    expect(legendaryInhabitantIsRecruited(DRAGON_ID, [])).toBe(false);
  });
});
