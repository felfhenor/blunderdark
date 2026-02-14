import type {
  AlchemyRecipeContent,
  BreedingRecipeContent,
  CompositionWeightConfig,
  ContentType,
  ForgeRecipeContent,
  IsContentItem,
  PassiveBonusUnlock,
  ReputationAction,
  ReputationEffectContent,
  ResearchNode,
  RoomShape,
  Season,
  SummonRecipeContent,
  UnlockEffect,
} from '@interfaces';
import type { AbilityEffectContent, AbilityEffectId } from '@interfaces/content-abilityeffect';
import type { CombatAbilityContent, CombatAbilityId } from '@interfaces/content-combatability';
import type { InhabitantContent, InhabitantId } from '@interfaces/content-inhabitant';
import type { InvaderContent, InvaderId } from '@interfaces/content-invader';
import type { InvasionId } from '@interfaces/content-invasion';
import type { ReputationActionId } from '@interfaces/content-reputationaction';
import type { ResearchId } from '@interfaces/content-research';
import type { RoomContent, RoomId } from '@interfaces/content-room';
import type { RoomShapeId } from '@interfaces/content-roomshape';
import type { SeasonBonusContent, SeasonBonusId } from '@interfaces/content-seasonbonus';
import type { SynergyContent, SynergyId } from '@interfaces/content-synergy';
import type { TrapContent, TrapId } from '@interfaces/content-trap';

// eat my ass, typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const initializers: Record<ContentType, (entry: any) => any> = {
  abilityeffect: ensureAbilityEffect,
  alchemyrecipe: ensureAlchemyRecipe,
  breedingrecipe: ensureBreedingRecipe,
  combatability: ensureCombatAbility,
  forgerecipe: ensureForgeRecipe,
  inhabitant: ensureInhabitant,
  invader: ensureInvader,
  invasion: ensureInvasion,
  reputationaction: ensureReputationAction,
  reputationeffect: ensureReputationEffect,
  research: ensureResearch,
  room: ensureRoom,
  roomshape: ensureRoomShape,
  seasonbonus: ensureSeasonBonus,
  summonrecipe: ensureSummonRecipe,
  synergy: ensureSynergy,
  trap: ensureTrap,
};

export function ensureContent<T extends IsContentItem>(content: T): T {
  const init = initializers[content.__type];
  if (!init) return content;
  return init(content) satisfies T;
}

function ensureAlchemyRecipe(
  recipe: Partial<AlchemyRecipeContent & IsContentItem>,
): AlchemyRecipeContent & IsContentItem {
  return {
    id: (recipe.id ?? 'UNKNOWN') as AlchemyRecipeContent['id'],
    name: recipe.name ?? 'UNKNOWN',
    __type: 'alchemyrecipe',
    description: recipe.description ?? '',
    inputCost: recipe.inputCost ?? {},
    outputResource: recipe.outputResource ?? 'flux',
    outputAmount: recipe.outputAmount ?? 1,
    baseTicks: recipe.baseTicks ?? 15,
    tier: recipe.tier ?? 'basic',
  };
}

function ensureBreedingRecipe(
  recipe: Partial<BreedingRecipeContent & IsContentItem>,
): BreedingRecipeContent & IsContentItem {
  return {
    id: (recipe.id ?? 'UNKNOWN') as BreedingRecipeContent['id'],
    name: recipe.name ?? 'UNKNOWN',
    __type: 'breedingrecipe',
    description: recipe.description ?? '',
    parentInhabitantAId: recipe.parentInhabitantAId ?? ('' as InhabitantId),
    parentInhabitantBId: recipe.parentInhabitantBId ?? ('' as InhabitantId),
    resultName: recipe.resultName ?? '',
    statBonuses: recipe.statBonuses ?? {},
    timeMultiplier: recipe.timeMultiplier ?? 1.0,
  };
}

function ensureForgeRecipe(
  recipe: Partial<ForgeRecipeContent & IsContentItem>,
): ForgeRecipeContent & IsContentItem {
  return {
    id: (recipe.id ?? 'UNKNOWN') as ForgeRecipeContent['id'],
    name: recipe.name ?? 'UNKNOWN',
    __type: 'forgerecipe',
    description: recipe.description ?? '',
    category: recipe.category ?? 'equipment',
    cost: recipe.cost ?? {},
    timeMultiplier: recipe.timeMultiplier ?? 1.0,
    statBonuses: recipe.statBonuses ?? {},
    tier: recipe.tier ?? 'basic',
  };
}

function ensureReputationAction(
  action: Partial<ReputationAction & IsContentItem>,
): ReputationAction & IsContentItem {
  return {
    id: action.id ?? ('UNKNOWN' as ReputationActionId),
    name: action.name ?? 'UNKNOWN',
    __type: 'reputationaction',
    description: action.description ?? '',
    reputationRewards: action.reputationRewards ?? {},
  };
}

function ensureReputationEffect(
  effect: Partial<ReputationEffectContent & IsContentItem>,
): ReputationEffectContent & IsContentItem {
  return {
    id: (effect.id ?? 'UNKNOWN') as ReputationEffectContent['id'],
    name: effect.name ?? 'UNKNOWN',
    __type: 'reputationeffect',
    description: effect.description ?? '',
    reputationType: effect.reputationType ?? 'terror',
    minimumLevel: effect.minimumLevel ?? 'high',
    effectType: effect.effectType ?? 'modify_production',
    effectValue: effect.effectValue ?? 0,
    targetId: effect.targetId ?? undefined,
  };
}

function ensureResearch(
  node: Partial<ResearchNode & IsContentItem>,
): ResearchNode & IsContentItem {
  return {
    id: node.id ?? ('UNKNOWN' as ResearchId),
    name: node.name ?? 'UNKNOWN',
    __type: 'research',
    description: node.description ?? '',
    branch: node.branch ?? 'dark',
    cost: node.cost ?? {},
    prerequisiteResearchIds: node.prerequisiteResearchIds ?? [],
    unlocks: (node.unlocks ?? []).map(ensureUnlockEffect),
    tier: node.tier ?? 1,
    requiredTicks: node.requiredTicks ?? 50,
  };
}

function ensureUnlockEffect(
  effect: Partial<UnlockEffect>,
): UnlockEffect {
  const type = effect.type ?? 'room';
  if (type === 'passive_bonus') {
    return {
      type: 'passive_bonus',
      bonusType: (effect as Partial<PassiveBonusUnlock>).bonusType ?? '',
      value: (effect as Partial<PassiveBonusUnlock>).value ?? 0,
      description: (effect as Partial<PassiveBonusUnlock>).description ?? '',
    };
  }
  return {
    type,
    targetId: (effect as { targetId?: string }).targetId ?? '',
  } as UnlockEffect;
}

function ensureRoom(
  room: Partial<RoomContent>,
): RoomContent {
  return {
    id: room.id ?? ('UNKNOWN' as RoomId),
    name: room.name ?? 'UNKNOWN',
    __type: 'room',
    description: room.description ?? '',
    shapeId: room.shapeId ?? ('' as RoomShapeId),
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
    spawnRate: room.spawnRate ?? undefined,
    spawnType: room.spawnType ?? undefined,
    spawnCapacity: room.spawnCapacity ?? undefined,
    breedingAdjacencyEffects: room.breedingAdjacencyEffects ?? undefined,
    summoningAdjacencyEffects: room.summoningAdjacencyEffects ?? undefined,
    forgingAdjacencyEffects: room.forgingAdjacencyEffects ?? undefined,
    alchemyAdjacencyEffects: room.alchemyAdjacencyEffects ?? undefined,
    tortureAdjacencyEffects: room.tortureAdjacencyEffects ?? undefined,
  };
}

function ensureSummonRecipe(
  recipe: Partial<SummonRecipeContent & IsContentItem>,
): SummonRecipeContent & IsContentItem {
  return {
    id: (recipe.id ?? 'UNKNOWN') as SummonRecipeContent['id'],
    name: recipe.name ?? 'UNKNOWN',
    __type: 'summonrecipe',
    description: recipe.description ?? '',
    resultInhabitantId: recipe.resultInhabitantId ?? ('' as InhabitantId),
    summonType: recipe.summonType ?? 'permanent',
    duration: recipe.duration ?? undefined,
    cost: recipe.cost ?? {},
    timeMultiplier: recipe.timeMultiplier ?? 1.0,
    statBonuses: recipe.statBonuses ?? {},
    tier: recipe.tier ?? 'rare',
  };
}

function ensureSynergy(
  synergy: Partial<SynergyContent>,
): SynergyContent {
  return {
    id: synergy.id ?? ('UNKNOWN' as SynergyId),
    name: synergy.name ?? 'UNKNOWN',
    __type: 'synergy',
    description: synergy.description ?? '',
    conditions: synergy.conditions ?? [],
    effects: synergy.effects ?? [],
  };
}

function ensureInhabitant(
  inhabitant: Partial<InhabitantContent>,
): InhabitantContent {
  return {
    id: inhabitant.id ?? ('UNKNOWN' as InhabitantId),
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
    fearModifier: inhabitant.fearModifier ?? 0,
    fearPropagationDistance: inhabitant.fearPropagationDistance ?? 1,
    foodConsumptionRate: inhabitant.foodConsumptionRate ?? 0,
    corruptionGeneration: inhabitant.corruptionGeneration ?? 0,
  };
}

function ensureInvader(
  invader: Partial<InvaderContent>,
): InvaderContent {
  return {
    id: invader.id ?? ('UNKNOWN' as InvaderId),
    name: invader.name ?? 'UNKNOWN',
    __type: 'invader',
    description: invader.description ?? '',
    invaderClass: invader.invaderClass ?? 'warrior',
    baseStats: invader.baseStats ?? { hp: 0, attack: 0, defense: 0, speed: 0 },
    combatAbilityIds: invader.combatAbilityIds ?? [],
    sprite: invader.sprite ?? 'UNKNOWN',
  };
}

function ensureRoomShape(
  shape: Partial<RoomShape & IsContentItem>,
): RoomShape & IsContentItem {
  return {
    id: shape.id ?? ('UNKNOWN' as RoomShapeId),
    name: shape.name ?? 'UNKNOWN',
    __type: 'roomshape',
    tiles: shape.tiles ?? [],
    width: shape.width ?? 0,
    height: shape.height ?? 0,
  };
}

function ensureAbilityEffect(
  effect: Partial<AbilityEffectContent>,
): AbilityEffectContent {
  return {
    id: (effect.id ?? 'UNKNOWN') as AbilityEffectId,
    name: effect.name ?? 'UNKNOWN',
    __type: 'abilityeffect',
    dealsDamage: effect.dealsDamage ?? false,
    statusName: effect.statusName ?? undefined,
    overrideTargetsHit: effect.overrideTargetsHit ?? undefined,
  };
}

function ensureCombatAbility(ability: Partial<CombatAbilityContent>): CombatAbilityContent {
  return {
    id: (ability.id ?? 'UNKNOWN') as CombatAbilityId,
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
  trap: Partial<TrapContent>,
): TrapContent {
  return {
    id: trap.id ?? ('UNKNOWN' as TrapId),
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

const defaultWeights = {
  warrior: 17,
  rogue: 17,
  mage: 17,
  cleric: 17,
  paladin: 16,
  ranger: 16,
};

function ensureInvasion(
  config: Partial<CompositionWeightConfig & IsContentItem>,
): CompositionWeightConfig & IsContentItem {
  return {
    id: config.id ?? ('UNKNOWN' as InvasionId),
    name: config.name ?? 'UNKNOWN',
    __type: 'invasion',
    balanced: config.balanced ?? { ...defaultWeights },
    highCorruption: config.highCorruption ?? { ...defaultWeights },
    highWealth: config.highWealth ?? { ...defaultWeights },
    highKnowledge: config.highKnowledge ?? { ...defaultWeights },
  };
}

function ensureSeasonBonus(
  bonus: Partial<SeasonBonusContent>,
): SeasonBonusContent {
  return {
    id: bonus.id ?? ('UNKNOWN' as SeasonBonusId),
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
