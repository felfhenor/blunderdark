import { defaultStats } from '@helpers/defaults';
import type {
  AbilityEffectDefinition,
  CombatAbility,
  CompositionWeightConfig,
  ContentType,
  HeroContent,
  HeroId,
  InhabitantDefinition,
  InvaderDefinition,
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
  Season,
  SeasonBonusDefinition,
  StageContent,
  StageId,
  StatBlock,
  SynergyDefinition,
  TrapDefinition,
  TrinketContent,
  TrinketId,
  WeaponContent,
  WeaponId,
} from '@interfaces';

// eat my ass, typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const initializers: Record<ContentType, (entry: any) => any> = {
  abilityeffect: ensureAbilityEffect,
  combatability: ensureCombatAbility,
  hero: ensureHero,
  inhabitant: ensureInhabitant,
  invader: ensureInvader,
  invasion: ensureInvasion,
  item: ensureItem,
  monster: ensureMonster,
  pet: ensurePet,
  reputationaction: ensureReputationAction,
  research: ensureResearch,
  room: ensureRoom,
  roomshape: ensureRoomShape,
  seasonbonus: ensureSeasonBonus,
  stage: ensureStage,
  synergy: ensureSynergy,
  trap: ensureTrap,
  trinket: ensureTrinket,
  weapon: ensureWeapon,
};

function ensureStats(statblock: Partial<StatBlock> = {}): Required<StatBlock> {
  return Object.assign({}, defaultStats(), statblock);
}

export function ensureContent<T extends IsContentItem>(content: T): T {
  const init = initializers[content.__type];
  if (!init) return content;
  return init(content) satisfies T;
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
    prerequisiteResearchIds: node.prerequisiteResearchIds ?? [],
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
    adjacencyBonuses: (room.adjacencyBonuses ?? []).map((b) => ({
      adjacentRoomType: b.adjacentRoomType ?? '',
      bonus: b.bonus ?? 0,
      description: b.description ?? '',
    })),
    isUnique: room.isUnique ?? false,
    removable: room.removable ?? true,
    maxInhabitants: room.maxInhabitants ?? -1,
    inhabitantRestriction: room.inhabitantRestriction ?? undefined,
    fearLevel: room.fearLevel ?? 0,
    fearReductionAura: room.fearReductionAura ?? 0,
    upgradePaths: room.upgradePaths ?? [],
    autoPlace: room.autoPlace ?? false,
    role: room.role ?? undefined,
    timeOfDayBonus: room.timeOfDayBonus ?? undefined,
    biomeBonuses: room.biomeBonuses ?? undefined,
    invasionProfile: room.invasionProfile ?? undefined,
    objectiveTypes: room.objectiveTypes ?? undefined,
    trainingAdjacencyEffects: room.trainingAdjacencyEffects ?? undefined,
    throneAdjacencyEffects: room.throneAdjacencyEffects ?? undefined,
  };
}

function ensureSynergy(
  synergy: Partial<SynergyDefinition & IsContentItem>,
): SynergyDefinition & IsContentItem {
  return {
    id: synergy.id ?? 'UNKNOWN',
    name: synergy.name ?? 'UNKNOWN',
    __type: 'synergy',
    description: synergy.description ?? '',
    conditions: synergy.conditions ?? [],
    effects: synergy.effects ?? [],
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

function ensureInvader(
  invader: Partial<InvaderDefinition & IsContentItem>,
): InvaderDefinition & IsContentItem {
  return {
    id: invader.id ?? 'UNKNOWN',
    name: invader.name ?? 'UNKNOWN',
    __type: 'invader',
    description: invader.description ?? '',
    invaderClass: invader.invaderClass ?? 'warrior',
    baseStats: invader.baseStats ?? { hp: 0, attack: 0, defense: 0, speed: 0 },
    abilityIds: invader.abilityIds ?? [],
    sprite: invader.sprite ?? 'UNKNOWN',
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

function ensureAbilityEffect(
  effect: Partial<AbilityEffectDefinition>,
): AbilityEffectDefinition {
  return {
    id: effect.id ?? 'UNKNOWN',
    name: effect.name ?? 'UNKNOWN',
    __type: 'abilityeffect',
    dealsDamage: effect.dealsDamage ?? false,
    statusName: effect.statusName ?? undefined,
    overrideTargetsHit: effect.overrideTargetsHit ?? undefined,
  };
}

function ensureCombatAbility(
  ability: Partial<CombatAbility>,
): CombatAbility {
  return {
    id: ability.id ?? 'UNKNOWN',
    name: ability.name ?? 'UNKNOWN',
    __type: 'combatability',
    description: ability.description ?? '',
    effectType: ability.effectType ?? '',
    value: ability.value ?? 0,
    chance: ability.chance ?? 0,
    cooldown: ability.cooldown ?? 0,
    targetType: ability.targetType ?? 'single',
    duration: ability.duration ?? 0,
  };
}

function ensureTrap(
  trap: Partial<TrapDefinition & IsContentItem>,
): TrapDefinition & IsContentItem {
  return {
    id: trap.id ?? 'UNKNOWN',
    name: trap.name ?? 'UNKNOWN',
    __type: 'trap',
    description: trap.description ?? '',
    effectType: trap.effectType ?? 'physical',
    damage: trap.damage ?? 0,
    duration: trap.duration ?? 0,
    charges: trap.charges ?? 1,
    craftCost: trap.craftCost ?? {},
    triggerChance: trap.triggerChance ?? 0.5,
    canBeDisarmed: trap.canBeDisarmed ?? true,
    sprite: trap.sprite ?? 'UNKNOWN',
  };
}

const defaultWeights = { warrior: 17, rogue: 17, mage: 17, cleric: 17, paladin: 16, ranger: 16 };

function ensureInvasion(
  config: Partial<CompositionWeightConfig & IsContentItem>,
): CompositionWeightConfig & IsContentItem {
  return {
    id: config.id ?? 'UNKNOWN',
    name: config.name ?? 'UNKNOWN',
    __type: 'invasion',
    balanced: config.balanced ?? { ...defaultWeights },
    highCorruption: config.highCorruption ?? { ...defaultWeights },
    highWealth: config.highWealth ?? { ...defaultWeights },
    highKnowledge: config.highKnowledge ?? { ...defaultWeights },
  };
}

function ensureSeasonBonus(
  bonus: Partial<SeasonBonusDefinition & IsContentItem>,
): SeasonBonusDefinition & IsContentItem {
  return {
    id: bonus.id ?? 'UNKNOWN',
    name: bonus.name ?? 'UNKNOWN',
    __type: 'seasonbonus',
    season: bonus.season ?? ('growth' as Season),
    description: bonus.description ?? '',
    resourceModifiers: (bonus.resourceModifiers ?? []).map((m) => ({
      resourceType: m.resourceType ?? '',
      multiplier: m.multiplier ?? 1.0,
      description: m.description ?? '',
    })),
    recruitmentCostMultiplier: bonus.recruitmentCostMultiplier ?? 1.0,
    flags: bonus.flags ?? [],
  };
}
