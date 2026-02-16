import { describe, expect, it, vi } from 'vitest';

vi.mock('@helpers/content', () => {
  const entries = new Map<string, unknown>();

  // --- Room definitions ---

  entries.set('room-shadow-library', {
    id: 'room-shadow-library',
    name: 'Shadow Library',
    __type: 'room',
    description: '',
    shapeId: 'shape-2x1',
    cost: {},
    production: { research: 0.6 },
    requiresWorkers: true,
    adjacencyBonuses: [],
  });

  entries.set('room-throne', {
    id: 'room-throne',
    name: 'Throne Room',
    __type: 'room',
    description: '',
    shapeId: 'shape-2x1',
    cost: {},
    production: { gold: 0.5 },
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
    production: { essence: 0.4 },
    requiresWorkers: false,
    adjacencyBonuses: [],
  });

  entries.set('room-crystal-mine', {
    id: 'room-crystal-mine',
    name: 'Crystal Mine',
    __type: 'room',
    description: '',
    shapeId: 'shape-2x1',
    cost: {},
    production: { crystals: 1.0 },
    requiresWorkers: true,
    adjacencyBonuses: [],
  });

  // --- Shape definitions ---

  entries.set('shape-2x1', {
    id: 'shape-2x1',
    name: 'Test 2x1',
    __type: 'roomshape',
    tiles: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ],
    width: 2,
    height: 1,
  });

  // --- Inhabitant definitions ---

  entries.set('def-lich', {
    id: 'def-lich',
    name: 'Lich',
    __type: 'inhabitant',
    type: 'undead',
    tier: 4,
    description: '',
    cost: {},
    stats: {
      hp: 300,
      attack: 40,
      defense: 30,
      speed: 15,
      workerEfficiency: 1.0,
    },
    traits: [
      {
        id: 'trait-lich-scholarly',
        name: 'Scholarly',
        description: '',
        effectType: 'production_bonus',
        effectValue: 0.4,
        targetResourceType: 'research',
      },
      {
        id: 'trait-lich-undead-master',
        name: 'Undead Master',
        description: '',
        effectType: 'undead_master',
        effectValue: 1,
      },
      {
        id: 'trait-lich-fearless',
        name: 'Fearless',
        description: '',
        effectType: 'fear_immunity',
        effectValue: 1,
      },
      {
        id: 'trait-lich-ancient-knowledge',
        name: 'Ancient Knowledge',
        description: '',
        effectType: 'ancient_knowledge',
        effectValue: 1,
      },
      {
        id: 'trait-lich-throne-scholar',
        name: 'Throne Scholar',
        description: '',
        effectType: 'production_bonus',
        effectValue: 0.1,
        targetResourceType: 'research',
        targetRoomId: 'room-throne',
      },
      {
        id: 'trait-lich-soul-siphon',
        name: 'Soul Siphon',
        description: '',
        effectType: 'production_bonus',
        effectValue: 1.0,
        targetResourceType: 'essence',
        targetRoomId: 'room-soul-well',
      },
      {
        id: 'trait-lich-library-specialist',
        name: 'Library Specialist',
        description: '',
        effectType: 'production_bonus',
        effectValue: 0.2,
        targetResourceType: 'research',
        targetRoomId: 'room-shadow-library',
      },
    ],
    fearTolerance: 99,
    fearModifier: 1,
    foodConsumptionRate: 0,
    stateModifiers: {
      normal: { productionMultiplier: 1.0, foodConsumptionMultiplier: 1.0 },
      scared: {
        productionMultiplier: 1.0,
        foodConsumptionMultiplier: 1.0,
        attackMultiplier: 1.0,
        defenseMultiplier: 1.0,
      },
      hungry: { productionMultiplier: 1.0, foodConsumptionMultiplier: 1.0 },
      starving: { productionMultiplier: 1.0, foodConsumptionMultiplier: 1.0 },
    },
  });

  entries.set('def-skeleton', {
    id: 'def-skeleton',
    name: 'Skeleton',
    __type: 'inhabitant',
    type: 'undead',
    tier: 1,
    description: '',
    cost: {},
    stats: {
      hp: 40,
      attack: 12,
      defense: 15,
      speed: 6,
      workerEfficiency: 0.7,
    },
    traits: [],
    fearTolerance: 4,
    fearModifier: 1,
    foodConsumptionRate: 0,
  });

  entries.set('def-goblin', {
    id: 'def-goblin',
    name: 'Goblin',
    __type: 'inhabitant',
    type: 'creature',
    tier: 1,
    description: '',
    cost: {},
    stats: {
      hp: 30,
      attack: 10,
      defense: 8,
      speed: 12,
      workerEfficiency: 1.0,
    },
    traits: [],
    fearTolerance: 1,
    fearModifier: 0,
    foodConsumptionRate: 2,
  });

  // --- Research nodes ---

  const researchNodes = [
    {
      id: 'research-dark-1',
      name: 'Dark Arts I',
      __type: 'research',
      description: '',
      branch: 'dark',
      tier: 1,
      cost: {},
      prerequisiteResearchIds: [],
      unlocks: [],
    },
    {
      id: 'research-dark-2',
      name: 'Dark Arts II',
      __type: 'research',
      description: '',
      branch: 'dark',
      tier: 2,
      cost: {},
      prerequisiteResearchIds: ['research-dark-1'],
      unlocks: [],
    },
    {
      id: 'research-arcane-1',
      name: 'Arcane Lore I',
      __type: 'research',
      description: '',
      branch: 'arcane',
      tier: 1,
      cost: {},
      prerequisiteResearchIds: [],
      unlocks: [],
    },
    {
      id: 'research-engineering-1',
      name: 'Engineering I',
      __type: 'research',
      description: '',
      branch: 'engineering',
      tier: 1,
      cost: {},
      prerequisiteResearchIds: [],
      unlocks: [],
    },
  ];

  for (const node of researchNodes) {
    entries.set(node.id, node);
  }

  return {
    contentGetEntry: vi.fn((id: string) => entries.get(id)),
    contentGetEntriesByType: vi.fn(() => researchNodes),
    getEntries: vi.fn(),
    contentAllIdsByName: vi.fn(() => new Map()),
  };
});

vi.mock('@helpers/room-shapes', () => ({
  roomShapeResolve: vi.fn((room: unknown) => {
    const r = room as { shapeId: string };
    return {
      id: r.shapeId,
      tiles: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
    };
  }),
  roomShapeGetAbsoluteTiles: vi.fn(
    (_shape: unknown, anchorX: number, anchorY: number) => [
      { x: anchorX, y: anchorY },
      { x: anchorX + 1, y: anchorY },
    ],
  ),
}));

import {
  lichCalculateUndeadMasterBonuses,
  lichGetAncientKnowledgeRevealCount,
  lichGetRevealedResearchNodes,
  lichHasAncientKnowledgeTrait,
  lichHasUndeadMasterTrait,
} from '@helpers/lich';
import { productionCalculateInhabitantBonus } from '@helpers/production';
import { stateModifierIsInhabitantScared } from '@helpers/state-modifiers';
import type {
  Floor,
  InhabitantInstance,
  InhabitantInstanceId,
  PlacedRoom,
  PlacedRoomId,
  RoomId,
  RoomShapeId,
} from '@interfaces';
import type {
  InhabitantContent,
  InhabitantId,
} from '@interfaces/content-inhabitant';
import { contentGetEntry } from '@helpers/content';

const TEST_LICH_DEF_ID = 'def-lich' as InhabitantId;
const TEST_SKELETON_DEF_ID = 'def-skeleton' as InhabitantId;
const TEST_GOBLIN_DEF_ID = 'def-goblin' as InhabitantId;

function getLichDef(): InhabitantContent {
  return contentGetEntry<InhabitantContent>(TEST_LICH_DEF_ID)!;
}

function makeInstance(
  defId: InhabitantId,
  instanceId: string,
  assignedRoomId?: PlacedRoomId,
): InhabitantInstance {
  return {
    instanceId: instanceId as InhabitantInstanceId,
    definitionId: defId,
    name: 'Test',
    state: 'normal',
    assignedRoomId,
  };
}

function makePlacedRoom(
  id: string,
  roomTypeId: string,
  anchorX: number,
  anchorY: number,
): PlacedRoom {
  return {
    id: id as PlacedRoomId,
    roomTypeId: roomTypeId as RoomId,
    shapeId: 'shape-2x1' as RoomShapeId,
    anchorX,
    anchorY,
  };
}

function makeFloor(
  rooms: PlacedRoom[],
  inhabitants: InhabitantInstance[],
): Floor {
  return {
    depth: 0,
    biome: 'neutral',
    grid: [],
    rooms,
    hallways: [],
    inhabitants,
    traps: [],
    verticalConnections: [],
  } as unknown as Floor;
}

// --- Scholarly trait: +40% research production ---

describe('Lich Scholarly trait: 40% research bonus', () => {
  it('should apply +40% research bonus in Shadow Library', () => {
    const library: PlacedRoom = makePlacedRoom(
      'placed-library',
      'room-shadow-library',
      0,
      0,
    );
    const inhabitants: InhabitantInstance[] = [
      makeInstance(TEST_LICH_DEF_ID, 'lich-1', 'placed-library' as PlacedRoomId),
    ];

    const result = productionCalculateInhabitantBonus(library, inhabitants);
    // Lich: workerEfficiency (1.0 - 1.0) = 0
    // Scholarly: +0.4 (targetResourceType: research, library produces research)
    // Library Specialist: +0.2 (targetRoomId: Shadow Library, matches)
    // Total: 0.6
    expect(result.bonus).toBeCloseTo(0.6);
    expect(result.hasWorkers).toBe(true);
  });

  it('should not apply Scholarly research bonus in non-research room', () => {
    const mine: PlacedRoom = makePlacedRoom(
      'placed-mine',
      'room-crystal-mine',
      0,
      0,
    );
    const inhabitants: InhabitantInstance[] = [
      makeInstance(TEST_LICH_DEF_ID, 'lich-1', 'placed-mine' as PlacedRoomId),
    ];

    const result = productionCalculateInhabitantBonus(mine, inhabitants);
    // Lich: workerEfficiency (1.0 - 1.0) = 0
    // Scholarly: NOT applied (crystal mine doesn't produce research)
    // Room-targeted traits: NOT applied (not matching rooms)
    expect(result.bonus).toBeCloseTo(0);
  });
});

// --- Fearless: Lich never enters Scared state ---

describe('Lich Fearless trait: never scared', () => {
  it('should not be scared at fear level 4', () => {
    const lich = makeInstance(TEST_LICH_DEF_ID, 'lich-1');
    expect(stateModifierIsInhabitantScared(lich, 4)).toBe(false);
  });

  it('should not be scared at fear level 10', () => {
    const lich = makeInstance(TEST_LICH_DEF_ID, 'lich-1');
    expect(stateModifierIsInhabitantScared(lich, 10)).toBe(false);
  });

  it('should not be scared at fear level 50', () => {
    const lich = makeInstance(TEST_LICH_DEF_ID, 'lich-1');
    expect(stateModifierIsInhabitantScared(lich, 50)).toBe(false);
  });

  it('should have fear_immunity trait in definition', () => {
    const def = getLichDef();
    const hasFearImmunity = def.traits.some(
      (t) => t.effectType === 'fear_immunity',
    );
    expect(hasFearImmunity).toBe(true);
  });

  it('should have fearTolerance of 99', () => {
    const def = getLichDef();
    expect(def.fearTolerance).toBe(99);
  });
});

// --- Undead Master: +1 Attack and +1 Defense to nearby undead ---

describe('Lich Undead Master aura', () => {
  it('should have undead_master trait', () => {
    const def = getLichDef();
    expect(lichHasUndeadMasterTrait(def)).toBe(true);
  });

  it('should apply bonuses to undead in same room', () => {
    const room = makePlacedRoom('room-1', 'room-shadow-library', 0, 0);
    const lich = makeInstance(
      TEST_LICH_DEF_ID,
      'lich-1',
      'room-1' as PlacedRoomId,
    );
    const skeleton = makeInstance(
      TEST_SKELETON_DEF_ID,
      'skeleton-1',
      'room-1' as PlacedRoomId,
    );

    const floor = makeFloor([room], [lich, skeleton]);
    const bonuses = lichCalculateUndeadMasterBonuses(floor);

    const skeletonBonus = bonuses.get('skeleton-1');
    expect(skeletonBonus).toBeDefined();
    expect(skeletonBonus!.attackBonus).toBe(1);
    expect(skeletonBonus!.defenseBonus).toBe(1);
  });

  it('should apply bonuses to undead in adjacent room', () => {
    // Room at (0,0) and adjacent room at (2,0) - touching via tile (1,0) to (2,0)
    const lichRoom = makePlacedRoom('room-1', 'room-shadow-library', 0, 0);
    const skeletonRoom = makePlacedRoom('room-2', 'room-crystal-mine', 2, 0);

    const lich = makeInstance(
      TEST_LICH_DEF_ID,
      'lich-1',
      'room-1' as PlacedRoomId,
    );
    const skeleton = makeInstance(
      TEST_SKELETON_DEF_ID,
      'skeleton-1',
      'room-2' as PlacedRoomId,
    );

    const floor = makeFloor([lichRoom, skeletonRoom], [lich, skeleton]);
    const bonuses = lichCalculateUndeadMasterBonuses(floor);

    const skeletonBonus = bonuses.get('skeleton-1');
    expect(skeletonBonus).toBeDefined();
    expect(skeletonBonus!.attackBonus).toBe(1);
    expect(skeletonBonus!.defenseBonus).toBe(1);
  });

  it('should NOT apply bonuses to non-undead creatures', () => {
    const room = makePlacedRoom('room-1', 'room-shadow-library', 0, 0);
    const lich = makeInstance(
      TEST_LICH_DEF_ID,
      'lich-1',
      'room-1' as PlacedRoomId,
    );
    const goblin = makeInstance(
      TEST_GOBLIN_DEF_ID,
      'goblin-1',
      'room-1' as PlacedRoomId,
    );

    const floor = makeFloor([room], [lich, goblin]);
    const bonuses = lichCalculateUndeadMasterBonuses(floor);

    expect(bonuses.has('goblin-1')).toBe(false);
  });

  it('should NOT apply bonuses to the Lich itself', () => {
    const room = makePlacedRoom('room-1', 'room-shadow-library', 0, 0);
    const lich = makeInstance(
      TEST_LICH_DEF_ID,
      'lich-1',
      'room-1' as PlacedRoomId,
    );

    const floor = makeFloor([room], [lich]);
    const bonuses = lichCalculateUndeadMasterBonuses(floor);

    expect(bonuses.has('lich-1')).toBe(false);
  });

  it('should NOT apply bonuses to undead in non-adjacent rooms', () => {
    // Rooms far apart: (0,0) and (10,10) - not adjacent
    const lichRoom = makePlacedRoom('room-1', 'room-shadow-library', 0, 0);
    const farRoom = makePlacedRoom('room-2', 'room-crystal-mine', 10, 10);

    const lich = makeInstance(
      TEST_LICH_DEF_ID,
      'lich-1',
      'room-1' as PlacedRoomId,
    );
    const skeleton = makeInstance(
      TEST_SKELETON_DEF_ID,
      'skeleton-1',
      'room-2' as PlacedRoomId,
    );

    const floor = makeFloor([lichRoom, farRoom], [lich, skeleton]);
    const bonuses = lichCalculateUndeadMasterBonuses(floor);

    expect(bonuses.has('skeleton-1')).toBe(false);
  });

  it('should return empty map when no Lich is present', () => {
    const room = makePlacedRoom('room-1', 'room-shadow-library', 0, 0);
    const skeleton = makeInstance(
      TEST_SKELETON_DEF_ID,
      'skeleton-1',
      'room-1' as PlacedRoomId,
    );

    const floor = makeFloor([room], [skeleton]);
    const bonuses = lichCalculateUndeadMasterBonuses(floor);

    expect(bonuses.size).toBe(0);
  });

  it('should return empty map when Lich is unassigned', () => {
    const room = makePlacedRoom('room-1', 'room-shadow-library', 0, 0);
    const lich = makeInstance(TEST_LICH_DEF_ID, 'lich-1', undefined);
    const skeleton = makeInstance(
      TEST_SKELETON_DEF_ID,
      'skeleton-1',
      'room-1' as PlacedRoomId,
    );

    const floor = makeFloor([room], [lich, skeleton]);
    const bonuses = lichCalculateUndeadMasterBonuses(floor);

    expect(bonuses.size).toBe(0);
  });
});

// --- Ancient Knowledge: reveals hidden research nodes ---

describe('Lich Ancient Knowledge trait', () => {
  it('should have ancient_knowledge trait', () => {
    const def = getLichDef();
    expect(lichHasAncientKnowledgeTrait(def)).toBe(true);
  });

  it('should return reveal count of 1 when Lich exists', () => {
    const inhabitants = [makeInstance(TEST_LICH_DEF_ID, 'lich-1')];
    const count = lichGetAncientKnowledgeRevealCount(inhabitants);
    expect(count).toBe(1);
  });

  it('should return reveal count of 0 when no Lich exists', () => {
    const inhabitants = [makeInstance(TEST_GOBLIN_DEF_ID, 'goblin-1')];
    const count = lichGetAncientKnowledgeRevealCount(inhabitants);
    expect(count).toBe(0);
  });

  it('should return reveal count of 0 for empty inhabitants', () => {
    const count = lichGetAncientKnowledgeRevealCount([]);
    expect(count).toBe(0);
  });

  it('should reveal one node per branch when Lich is present', () => {
    const inhabitants = [makeInstance(TEST_LICH_DEF_ID, 'lich-1')];
    const revealed = lichGetRevealedResearchNodes(inhabitants, []);

    // Should reveal one per branch: dark, arcane, engineering
    expect(revealed).toHaveLength(3);

    const branches = revealed.map((n) => n.branch);
    expect(branches).toContain('dark');
    expect(branches).toContain('arcane');
    expect(branches).toContain('engineering');
  });

  it('should prefer lowest-tier node in each branch', () => {
    const inhabitants = [makeInstance(TEST_LICH_DEF_ID, 'lich-1')];
    const revealed = lichGetRevealedResearchNodes(inhabitants, []);

    const darkNode = revealed.find((n) => n.branch === 'dark');
    expect(darkNode).toBeDefined();
    expect(darkNode!.tier).toBe(1);
  });

  it('should exclude already completed nodes', () => {
    const inhabitants = [makeInstance(TEST_LICH_DEF_ID, 'lich-1')];
    const completed = ['research-dark-1', 'research-arcane-1', 'research-engineering-1'];
    const revealed = lichGetRevealedResearchNodes(inhabitants, completed);

    // dark-1 completed, so dark-2 is revealed; arcane-1 and engineering-1 completed, no more in those branches
    const darkNode = revealed.find((n) => n.branch === 'dark');
    expect(darkNode).toBeDefined();
    expect(darkNode!.id).toBe('research-dark-2');

    // Arcane and engineering have no remaining nodes
    expect(revealed.find((n) => n.branch === 'arcane')).toBeUndefined();
    expect(revealed.find((n) => n.branch === 'engineering')).toBeUndefined();
  });

  it('should return empty array when no Lich exists', () => {
    const inhabitants = [makeInstance(TEST_GOBLIN_DEF_ID, 'goblin-1')];
    const revealed = lichGetRevealedResearchNodes(inhabitants, []);
    expect(revealed).toHaveLength(0);
  });
});

// --- Throne Room: +10% dungeon-wide Research ---

describe('Lich Throne Room interaction: +10% Research', () => {
  it('should apply Throne Scholar bonus only in Throne Room', () => {
    const throne: PlacedRoom = makePlacedRoom(
      'placed-throne',
      'room-throne',
      0,
      0,
    );
    const inhabitants: InhabitantInstance[] = [
      makeInstance(TEST_LICH_DEF_ID, 'lich-1', 'placed-throne' as PlacedRoomId),
    ];

    const result = productionCalculateInhabitantBonus(throne, inhabitants);
    // Throne Room produces gold, not research.
    // Scholarly: NOT applied (no research production)
    // Throne Scholar: has targetRoomId = 'room-throne' AND targetResourceType = 'research'
    //   BUT Throne Room doesn't produce research, so this bonus doesn't apply through production
    // Library Specialist: NOT applied (wrong room)
    // Soul Siphon: NOT applied (wrong room, wrong resource)
    // workerEfficiency: (1.0 - 1.0) = 0
    expect(result.bonus).toBeCloseTo(0);
  });
});

// --- Shadow Library: total +60% Research (Scholarly + Library Specialist) ---

describe('Lich Shadow Library interaction: total +60% Research', () => {
  it('should apply Scholarly (+40%) and Library Specialist (+20%) in Shadow Library', () => {
    const library: PlacedRoom = makePlacedRoom(
      'placed-library',
      'room-shadow-library',
      0,
      0,
    );
    const inhabitants: InhabitantInstance[] = [
      makeInstance(TEST_LICH_DEF_ID, 'lich-1', 'placed-library' as PlacedRoomId),
    ];

    const result = productionCalculateInhabitantBonus(library, inhabitants);
    // Scholarly: +0.4 (research production present)
    // Library Specialist: +0.2 (targetRoomId matches Shadow Library)
    // workerEfficiency: (1.0 - 1.0) = 0
    // Total: 0.6 (60%)
    expect(result.bonus).toBeCloseTo(0.6);
    expect(result.hasWorkers).toBe(true);
  });

  it('should not apply Library Specialist in non-library research room', () => {
    // If there were another room producing research, Library Specialist should not apply
    const throne: PlacedRoom = makePlacedRoom(
      'placed-throne',
      'room-throne',
      0,
      0,
    );
    const inhabitants: InhabitantInstance[] = [
      makeInstance(TEST_LICH_DEF_ID, 'lich-1', 'placed-throne' as PlacedRoomId),
    ];

    const result = productionCalculateInhabitantBonus(throne, inhabitants);
    // Throne Room produces gold, not research
    // No research-related traits apply
    expect(result.bonus).toBeCloseTo(0);
  });
});

// --- Soul Well: doubles Soul Essence generation ---

describe('Lich Soul Well interaction: double essence', () => {
  it('should apply Soul Siphon (+100% essence) in Soul Well', () => {
    const soulWell: PlacedRoom = makePlacedRoom(
      'placed-soul-well',
      'room-soul-well',
      0,
      0,
    );
    const inhabitants: InhabitantInstance[] = [
      makeInstance(
        TEST_LICH_DEF_ID,
        'lich-1',
        'placed-soul-well' as PlacedRoomId,
      ),
    ];

    const result = productionCalculateInhabitantBonus(soulWell, inhabitants);
    // Soul Siphon: +1.0 (targetRoomId = Soul Well, targetResourceType = essence, room produces essence)
    // Scholarly: NOT applied (Soul Well doesn't produce research)
    // workerEfficiency: (1.0 - 1.0) = 0
    expect(result.bonus).toBeCloseTo(1.0);
    expect(result.hasWorkers).toBe(true);
  });

  it('should not apply Soul Siphon in non-Soul-Well room', () => {
    const library: PlacedRoom = makePlacedRoom(
      'placed-library',
      'room-shadow-library',
      0,
      0,
    );
    const inhabitants: InhabitantInstance[] = [
      makeInstance(TEST_LICH_DEF_ID, 'lich-1', 'placed-library' as PlacedRoomId),
    ];

    const result = productionCalculateInhabitantBonus(library, inhabitants);
    // In Shadow Library: only Scholarly (+0.4) and Library Specialist (+0.2) apply
    // Soul Siphon: NOT applied (not Soul Well)
    expect(result.bonus).toBeCloseTo(0.6);
  });
});
