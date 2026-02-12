import { getEntry } from '@helpers/content';
import { rngShuffle, rngUuid } from '@helpers/rng';
import type {
  GameState,
  InhabitantDefinition,
  IsContentItem,
} from '@interfaces';
import type {
  InvasionObjective,
  InvasionResult,
  ObjectiveType,
} from '@interfaces/invasion-objective';
import seedrandom from 'seedrandom';

// --- Room type IDs ---

const ALTAR_ROOM_TYPE_ID = 'aa100001-0001-0001-0001-000000000009';
const TREASURE_VAULT_TYPE_ID = 'aa100001-0001-0001-0001-000000000008';
const SHADOW_LIBRARY_TYPE_ID = 'aa100001-0001-0001-0001-000000000004';
const LEY_LINE_NEXUS_TYPE_ID = 'aa100001-0001-0001-0001-000000000011';
const SOUL_WELL_TYPE_ID = 'aa100001-0001-0001-0001-000000000005';

// --- Helpers ---

function getInhabitantTier(definitionId: string): number {
  const def = getEntry<InhabitantDefinition & IsContentItem>(definitionId);
  return def?.tier ?? 1;
}

// --- Objective definitions ---

type ObjectiveTemplate = {
  type: ObjectiveType;
  name: string;
  description: string;
  isEligible: (state: GameState) => boolean;
  getTargetId: (state: GameState) => string | null;
};

const SECONDARY_OBJECTIVE_TEMPLATES: ObjectiveTemplate[] = [
  {
    type: 'SlayMonster',
    name: 'Slay Monster',
    description: 'Kill a powerful creature defending the dungeon.',
    isEligible: (state) =>
      state.world.inhabitants.some((i) => getInhabitantTier(i.definitionId) >= 2),
    getTargetId: (state) => {
      const target = state.world.inhabitants.find(
        (i) => getInhabitantTier(i.definitionId) >= 2,
      );
      return target?.instanceId ?? null;
    },
  },
  {
    type: 'StealTreasure',
    name: 'Steal Treasure',
    description: 'Loot gold from the dungeon treasury.',
    isEligible: (state) =>
      state.world.floors.some((f) =>
        f.rooms.some((r) => r.roomTypeId === TREASURE_VAULT_TYPE_ID),
      ),
    getTargetId: (state) => {
      for (const floor of state.world.floors) {
        const room = floor.rooms.find(
          (r) => r.roomTypeId === TREASURE_VAULT_TYPE_ID,
        );
        if (room) return room.id;
      }
      return null;
    },
  },
  {
    type: 'DefileLibrary',
    name: 'Defile Library',
    description: 'Destroy forbidden knowledge stored in the shadow library.',
    isEligible: (state) =>
      state.world.floors.some((f) =>
        f.rooms.some((r) => r.roomTypeId === SHADOW_LIBRARY_TYPE_ID),
      ),
    getTargetId: (state) => {
      for (const floor of state.world.floors) {
        const room = floor.rooms.find(
          (r) => r.roomTypeId === SHADOW_LIBRARY_TYPE_ID,
        );
        if (room) return room.id;
      }
      return null;
    },
  },
  {
    type: 'SealPortal',
    name: 'Seal Portal',
    description: 'Seal a dark energy nexus to weaken the dungeon.',
    isEligible: (state) =>
      state.world.floors.some((f) =>
        f.rooms.some(
          (r) =>
            r.roomTypeId === LEY_LINE_NEXUS_TYPE_ID ||
            r.roomTypeId === SOUL_WELL_TYPE_ID,
        ),
      ),
    getTargetId: (state) => {
      for (const floor of state.world.floors) {
        const room = floor.rooms.find(
          (r) =>
            r.roomTypeId === LEY_LINE_NEXUS_TYPE_ID ||
            r.roomTypeId === SOUL_WELL_TYPE_ID,
        );
        if (room) return room.id;
      }
      return null;
    },
  },
  {
    type: 'PlunderVault',
    name: 'Plunder Vault',
    description: 'Break into the treasure vault and carry away riches.',
    isEligible: (state) =>
      state.world.floors.some((f) =>
        f.rooms.some((r) => r.roomTypeId === TREASURE_VAULT_TYPE_ID),
      ),
    getTargetId: (state) => {
      for (const floor of state.world.floors) {
        const room = floor.rooms.find(
          (r) => r.roomTypeId === TREASURE_VAULT_TYPE_ID,
        );
        if (room) return room.id;
      }
      return null;
    },
  },
  {
    type: 'RescuePrisoner',
    name: 'Rescue Prisoner',
    description: 'Free a captive creature from the dungeon.',
    isEligible: (state) => state.world.inhabitants.length > 0,
    getTargetId: (state) => state.world.inhabitants[0]?.instanceId ?? null,
  },
  {
    type: 'ScoutDungeon',
    name: 'Scout Dungeon',
    description: 'Map the dungeon layout for future invasions.',
    isEligible: () => true,
    getTargetId: () => null,
  },
];

// --- Objective assignment ---

/**
 * Assign invasion objectives: 1 primary (Destroy Altar) + 2 secondary.
 * Secondary objectives are selected from eligible pool based on game state.
 * Seed ensures deterministic selection.
 */
export function assignInvasionObjectives(
  state: GameState,
  seed: string,
): InvasionObjective[] {
  const rng = seedrandom(seed);
  const objectives: InvasionObjective[] = [];

  // Primary: Destroy Altar
  const altarId = findAltarRoomId(state);
  objectives.push({
    id: rngUuid(),
    type: 'DestroyAltar',
    name: 'Destroy Altar',
    description:
      'Destroy the dungeon altar to cripple the dark lord\'s power.',
    targetId: altarId,
    isPrimary: true,
    isCompleted: false,
    progress: 0,
  });

  // Secondary: select 2 from eligible pool
  const eligible = SECONDARY_OBJECTIVE_TEMPLATES.filter((t) =>
    t.isEligible(state),
  );

  // Shuffle and pick up to 2 unique types
  const shuffled = rngShuffle(eligible, rng);
  const selectedTypes = new Set<ObjectiveType>();

  for (const template of shuffled) {
    if (selectedTypes.size >= 2) break;
    if (selectedTypes.has(template.type)) continue;

    selectedTypes.add(template.type);
    objectives.push({
      id: rngUuid(),
      type: template.type,
      name: template.name,
      description: template.description,
      targetId: template.getTargetId(state),
      isPrimary: false,
      isCompleted: false,
      progress: 0,
    });
  }

  return objectives;
}

function findAltarRoomId(state: GameState): string | null {
  for (const floor of state.world.floors) {
    const altar = floor.rooms.find(
      (r) => r.roomTypeId === ALTAR_ROOM_TYPE_ID,
    );
    if (altar) return altar.id;
  }
  return null;
}

// --- Progress tracking ---

/**
 * Update objective progress. Progress is clamped to 0-100.
 * Returns a new objective (does not mutate).
 */
export function updateObjectiveProgress(
  objective: InvasionObjective,
  progress: number,
): InvasionObjective {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  return {
    ...objective,
    progress: clampedProgress,
    isCompleted: clampedProgress >= 100,
  };
}

/**
 * Calculate SlayMonster progress from HP lost percentage.
 */
export function calculateSlayMonsterProgress(
  currentHp: number,
  maxHp: number,
): number {
  if (maxHp <= 0) return 0;
  return Math.round(((maxHp - currentHp) / maxHp) * 100);
}

/**
 * Calculate StealTreasure progress from gold looted.
 */
export function calculateStealTreasureProgress(
  goldLooted: number,
  goldTarget: number,
): number {
  if (goldTarget <= 0) return 0;
  return Math.min(100, Math.round((goldLooted / goldTarget) * 100));
}

/**
 * Calculate SealPortal progress from turns spent.
 */
export function calculateSealPortalProgress(
  turnsSpent: number,
  turnsRequired: number,
): number {
  if (turnsRequired <= 0) return 0;
  return Math.min(100, Math.round((turnsSpent / turnsRequired) * 100));
}

// --- Victory resolution ---

/**
 * Resolve the outcome of an invasion based on objective completion.
 * - Altar destroyed = defeat (regardless of other outcomes)
 * - All invaders killed with Altar intact = victory
 * - Reward multiplier: 1.0 base, +0.25 per prevented secondary, -0.25 per completed secondary
 */
export function resolveInvasionOutcome(
  objectives: InvasionObjective[],
): InvasionResult {
  const primary = objectives.find((o) => o.isPrimary);
  const secondaries = objectives.filter((o) => !o.isPrimary);
  const altarDestroyed = primary?.isCompleted ?? false;

  const secondariesCompleted = secondaries.filter(
    (o) => o.isCompleted,
  ).length;
  const secondariesTotal = secondaries.length;

  if (altarDestroyed) {
    return {
      outcome: 'defeat',
      altarDestroyed: true,
      secondariesCompleted,
      secondariesTotal,
      rewardMultiplier: 0,
    };
  }

  // Victory: Altar intact
  const preventedCount = secondariesTotal - secondariesCompleted;
  const rewardMultiplier = Math.max(
    0,
    1.0 + preventedCount * 0.25 - secondariesCompleted * 0.25,
  );

  return {
    outcome: 'victory',
    altarDestroyed: false,
    secondariesCompleted,
    secondariesTotal,
    rewardMultiplier: Math.round(rewardMultiplier * 100) / 100,
  };
}
