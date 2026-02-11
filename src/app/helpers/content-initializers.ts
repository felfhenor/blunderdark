import { defaultStats } from '@helpers/defaults';
import type {
  ContentType,
  HeroContent,
  HeroId,
  InhabitantDefinition,
  IsContentItem,
  ItemContent,
  ItemId,
  MonsterContent,
  MonsterId,
  PetContent,
  PetId,
  ReputationAction,
  ResearchNode,
  RoomDefinition,
  RoomShape,
  StageContent,
  StageId,
  StatBlock,
  TrinketContent,
  TrinketId,
  WeaponContent,
  WeaponId,
} from '@interfaces';

// eat my ass, typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const initializers: Record<ContentType, (entry: any) => any> = {
  hero: ensureHero,
  inhabitant: ensureInhabitant,
  item: ensureItem,
  monster: ensureMonster,
  pet: ensurePet,
  reputationaction: ensureReputationAction,
  research: ensureResearch,
  room: ensureRoom,
  roomshape: ensureRoomShape,
  stage: ensureStage,
  trinket: ensureTrinket,
  weapon: ensureWeapon,
};

function ensureStats(statblock: Partial<StatBlock> = {}): Required<StatBlock> {
  return Object.assign({}, defaultStats(), statblock);
}

export function ensureContent<T extends IsContentItem>(content: T): T {
  return initializers[content.__type](content) satisfies T;
}

function ensureHero(hero: Partial<HeroContent>): Required<HeroContent> {
  return {
    id: hero.id ?? ('UNKNOWN' as HeroId),
    name: hero.name ?? 'UNKNOWN',
    description: hero.description ?? 'UNKNOWN',
    __type: 'hero',
    sprite: hero.sprite ?? 'UNKNOWN',
    frames: hero.frames ?? 4,
    baseStats: ensureStats(hero.baseStats),
    statsPerLevel: ensureStats(hero.statsPerLevel),
    startingWeaponIds: hero.startingWeaponIds ?? [],
  };
}

function ensureItem(item: Partial<ItemContent>): Required<ItemContent> {
  return {
    id: item.id ?? ('UNKNOWN' as ItemId),
    name: item.name ?? 'UNKNOWN',
    __type: 'item',
    description: item.description ?? 'UNKNOWN',
    sprite: item.sprite ?? 'UNKNOWN',
    baseStats: ensureStats(item.baseStats),
    statsPerLevel: ensureStats(item.statsPerLevel),
  };
}

function ensureMonster(
  monster: Partial<MonsterContent>,
): Required<MonsterContent> {
  return {
    id: monster.id ?? ('UNKNOWN' as MonsterId),
    name: monster.name ?? 'UNKNOWN',
    __type: 'monster',
    description: monster.description ?? 'UNKNOWN',
    sprite: monster.sprite ?? 'UNKNOWN',
    frames: monster.frames ?? 4,
    baseStats: ensureStats(monster.baseStats),
    statsPerLevel: ensureStats(monster.statsPerLevel),
  };
}

function ensurePet(pet: Partial<PetContent>): Required<PetContent> {
  return {
    id: pet.id ?? ('UNKNOWN' as PetId),
    name: pet.name ?? 'UNKNOWN',
    __type: 'pet',
    description: pet.description ?? 'UNKNOWN',
    sprite: pet.sprite ?? 'UNKNOWN',
    frames: pet.frames ?? 4,
    baseStats: ensureStats(pet.baseStats),
    statsPerLevel: ensureStats(pet.statsPerLevel),
    itemIds: pet.itemIds ?? [],
  };
}

function ensureStage(stage: Partial<StageContent>): Required<StageContent> {
  return {
    id: stage.id ?? ('UNKNOWN' as StageId),
    name: stage.name ?? 'UNKNOWN',
    __type: 'stage',
    description: stage.description ?? 'UNKNOWN',
  };
}

function ensureTrinket(
  trinket: Partial<TrinketContent>,
): Required<TrinketContent> {
  return {
    id: trinket.id ?? ('UNKNOWN' as TrinketId),
    name: trinket.name ?? 'UNKNOWN',
    __type: 'trinket',
    description: trinket.description ?? 'UNKNOWN',
    sprite: trinket.sprite ?? 'UNKNOWN',
    baseStats: ensureStats(trinket.baseStats),
    upgradeableStats: trinket.upgradeableStats ?? [],
  };
}

function ensureWeapon(weapon: Partial<WeaponContent>): Required<WeaponContent> {
  return {
    id: weapon.id ?? ('UNKNOWN' as WeaponId),
    name: weapon.name ?? 'UNKNOWN',
    __type: 'weapon',
    description: weapon.description ?? 'UNKNOWN',
    sprite: weapon.sprite ?? 'UNKNOWN',
    baseStats: ensureStats(weapon.baseStats),
    upgradeableStats: weapon.upgradeableStats ?? [],
  };
}

function ensureReputationAction(
  action: Partial<ReputationAction & IsContentItem>,
): ReputationAction & IsContentItem {
  return {
    id: action.id ?? 'UNKNOWN',
    name: action.name ?? 'UNKNOWN',
    __type: 'reputationaction',
    description: action.description ?? '',
    reputationRewards: action.reputationRewards ?? {},
  };
}

function ensureResearch(
  node: Partial<ResearchNode & IsContentItem>,
): ResearchNode & IsContentItem {
  return {
    id: node.id ?? 'UNKNOWN',
    name: node.name ?? 'UNKNOWN',
    __type: 'research',
    description: node.description ?? '',
    branch: node.branch ?? 'dark',
    cost: node.cost ?? {},
    prerequisites: node.prerequisites ?? [],
    unlocks: node.unlocks ?? [],
    tier: node.tier ?? 1,
  };
}

function ensureRoom(
  room: Partial<RoomDefinition & IsContentItem>,
): RoomDefinition & IsContentItem {
  return {
    id: room.id ?? 'UNKNOWN',
    name: room.name ?? 'UNKNOWN',
    __type: 'room',
    description: room.description ?? '',
    shapeId: room.shapeId ?? '',
    cost: room.cost ?? {},
    production: room.production ?? {},
    requiresWorkers: room.requiresWorkers ?? false,
    adjacencyBonuses: room.adjacencyBonuses ?? [],
    isUnique: room.isUnique ?? false,
    maxInhabitants: room.maxInhabitants ?? -1,
    inhabitantRestriction: room.inhabitantRestriction ?? null,
    fearLevel: room.fearLevel ?? 0,
  };
}

function ensureInhabitant(
  inhabitant: Partial<InhabitantDefinition & IsContentItem>,
): InhabitantDefinition & IsContentItem {
  return {
    id: inhabitant.id ?? 'UNKNOWN',
    name: inhabitant.name ?? 'UNKNOWN',
    __type: 'inhabitant',
    type: inhabitant.type ?? '',
    tier: inhabitant.tier ?? 1,
    description: inhabitant.description ?? '',
    cost: inhabitant.cost ?? {},
    stats: inhabitant.stats ?? {
      hp: 0,
      attack: 0,
      defense: 0,
      speed: 0,
      workerEfficiency: 1.0,
    },
    traits: inhabitant.traits ?? [],
    restrictionTags: inhabitant.restrictionTags ?? [],
    rulerBonuses: inhabitant.rulerBonuses ?? {},
    rulerFearLevel: inhabitant.rulerFearLevel ?? 0,
  };
}

function ensureRoomShape(
  shape: Partial<RoomShape & IsContentItem>,
): RoomShape & IsContentItem {
  return {
    id: shape.id ?? 'UNKNOWN',
    name: shape.name ?? 'UNKNOWN',
    __type: 'roomshape',
    tiles: shape.tiles ?? [],
    width: shape.width ?? 0,
    height: shape.height ?? 0,
  };
}
