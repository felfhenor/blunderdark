import type {
  AbilityEffectDefinition,
  CombatAbility,
  IsContentItem,
} from '@interfaces';
import type {
  InvaderDefinition,
  InvaderInstance,
} from '@interfaces/invader';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// --- Invader Definition IDs ---

const WARRIOR_ID = 'aa900001-0001-0001-0001-000000000001';
const ROGUE_ID = 'aa900001-0001-0001-0001-000000000002';
const MAGE_ID = 'aa900001-0001-0001-0001-000000000003';
const CLERIC_ID = 'aa900001-0001-0001-0001-000000000004';
const PALADIN_ID = 'aa900001-0001-0001-0001-000000000005';
const RANGER_ID = 'aa900001-0001-0001-0001-000000000006';

// --- Ability IDs ---

const SHIELD_WALL_ID = 'ca000001-0000-4000-a000-000000000007';
const DISARM_TRAP_ID = 'ca000001-0000-4000-a000-000000000008';
const BACKSTAB_ID = 'ca000001-0000-4000-a000-000000000009';
const ARCANE_BOLT_ID = 'ca000001-0000-4000-a000-000000000010';
const DISPEL_ID = 'ca000001-0000-4000-a000-000000000011';
const HEAL_ID = 'ca000001-0000-4000-a000-000000000012';
const TURN_UNDEAD_ID = 'ca000001-0000-4000-a000-000000000013';
const SMITE_EVIL_ID = 'ca000001-0000-4000-a000-000000000014';
const AURA_OF_COURAGE_ID = 'ca000001-0000-4000-a000-000000000015';
const SCOUT_ID = 'ca000001-0000-4000-a000-000000000016';
const MARK_TARGET_ID = 'ca000001-0000-4000-a000-000000000017';

// --- Mock content ---

const mockContent = new Map<string, unknown>();

vi.mock('@helpers/content', () => ({
  getEntry: (id: string) => mockContent.get(id) ?? undefined,
  getEntriesByType: vi.fn(() => [...mockContent.values()].filter(
    (v) => (v as IsContentItem).__type === 'invader',
  )),
  getEntries: vi.fn(),
  allIdsByName: vi.fn(() => new Map()),
}));

vi.mock('@helpers/rng', () => ({
  rngUuid: () => 'mock-uuid-' + Math.random().toString(36).slice(2, 8),
}));

// --- Ability effect definitions ---

function makeEffect(
  overrides: Partial<AbilityEffectDefinition>,
): AbilityEffectDefinition {
  return {
    id: 'ae-test',
    name: 'Test Effect',
    __type: 'abilityeffect',
    dealsDamage: false,
    statusName: undefined,
    overrideTargetsHit: undefined,
    ...overrides,
  };
}

function makeAbility(
  overrides: Partial<CombatAbility>,
): CombatAbility {
  return {
    id: 'ca-test',
    name: 'Test Ability',
    __type: 'combatability',
    description: 'test',
    effectType: 'Damage',
    value: 100,
    chance: 100,
    cooldown: 0,
    targetType: 'single',
    duration: 0,
    ...overrides,
  };
}

// --- Standard effect definitions ---

const damageEffect = makeEffect({
  id: 'ae-damage',
  name: 'Damage',
  dealsDamage: true,
});

const healEffect = makeEffect({
  id: 'ae-heal',
  name: 'Heal',
  statusName: 'healing',
});

const disarmEffect = makeEffect({
  id: 'ae-disarm',
  name: 'Disarm',
  statusName: 'disarm',
});

const magicDamageEffect = makeEffect({
  id: 'ae-magic-damage',
  name: 'Magic Damage',
  dealsDamage: true,
});

const dispelEffect = makeEffect({
  id: 'ae-dispel',
  name: 'Dispel',
  statusName: 'dispel',
});

const buffDefenseEffect = makeEffect({
  id: 'ae-buff-defense',
  name: 'Buff Defense',
  statusName: 'shielded',
});

const fearImmunityEffect = makeEffect({
  id: 'ae-fear-immunity',
  name: 'Fear Immunity',
  statusName: 'courage',
});

const scoutEffect = makeEffect({
  id: 'ae-scout',
  name: 'Scout',
  statusName: 'scouting',
});

const markEffect = makeEffect({
  id: 'ae-mark',
  name: 'Mark',
  statusName: 'marked',
});

// --- Standard ability definitions ---

const shieldWallAbility = makeAbility({
  id: SHIELD_WALL_ID,
  name: 'Shield Wall',
  effectType: 'Buff Defense',
  value: 25,
  cooldown: 4,
  targetType: 'self',
  duration: 2,
});

const disarmTrapAbility = makeAbility({
  id: DISARM_TRAP_ID,
  name: 'Disarm Trap',
  effectType: 'Disarm',
  value: 60,
  cooldown: 0,
  targetType: 'single',
});

const backstabAbility = makeAbility({
  id: BACKSTAB_ID,
  name: 'Backstab',
  effectType: 'Damage',
  value: 200,
  cooldown: 3,
  targetType: 'single',
});

const arcaneBoltAbility = makeAbility({
  id: ARCANE_BOLT_ID,
  name: 'Arcane Bolt',
  effectType: 'Magic Damage',
  value: 150,
  cooldown: 2,
  targetType: 'single',
});

const dispelAbility = makeAbility({
  id: DISPEL_ID,
  name: 'Dispel',
  effectType: 'Dispel',
  value: 0,
  cooldown: 3,
  targetType: 'single',
});

const healAbility = makeAbility({
  id: HEAL_ID,
  name: 'Heal',
  effectType: 'Heal',
  value: 20,
  cooldown: 3,
  targetType: 'single',
});

const turnUndeadAbility = makeAbility({
  id: TURN_UNDEAD_ID,
  name: 'Turn Undead',
  effectType: 'Damage',
  value: 150,
  cooldown: 2,
  targetType: 'aoe',
});

const smiteEvilAbility = makeAbility({
  id: SMITE_EVIL_ID,
  name: 'Smite Evil',
  effectType: 'Damage',
  value: 200,
  cooldown: 2,
  targetType: 'single',
});

const auraOfCourageAbility = makeAbility({
  id: AURA_OF_COURAGE_ID,
  name: 'Aura of Courage',
  effectType: 'Fear Immunity',
  value: 0,
  cooldown: 0,
  targetType: 'aoe',
});

const scoutAbility = makeAbility({
  id: SCOUT_ID,
  name: 'Scout',
  effectType: 'Scout',
  value: 2,
  cooldown: 0,
  targetType: 'self',
});

const markTargetAbility = makeAbility({
  id: MARK_TARGET_ID,
  name: 'Mark Target',
  effectType: 'Mark',
  value: 20,
  cooldown: 0,
  targetType: 'single',
  duration: 3,
});

// --- Invader definitions ---

function makeInvaderDef(
  overrides: Partial<InvaderDefinition & IsContentItem> = {},
): InvaderDefinition & IsContentItem {
  return {
    id: WARRIOR_ID,
    name: 'Warrior',
    __type: 'invader',
    description: 'test warrior',
    invaderClass: 'warrior',
    baseStats: { hp: 30, attack: 8, defense: 7, speed: 3 },
    abilityIds: [SHIELD_WALL_ID],
    sprite: 'invader-warrior',
    ...overrides,
  };
}

const warriorDef = makeInvaderDef();

const rogueDef = makeInvaderDef({
  id: ROGUE_ID,
  name: 'Rogue',
  invaderClass: 'rogue',
  baseStats: { hp: 15, attack: 6, defense: 3, speed: 10 },
  abilityIds: [DISARM_TRAP_ID, BACKSTAB_ID],
  sprite: 'invader-rogue',
});

const mageDef = makeInvaderDef({
  id: MAGE_ID,
  name: 'Mage',
  invaderClass: 'mage',
  baseStats: { hp: 12, attack: 10, defense: 2, speed: 5 },
  abilityIds: [ARCANE_BOLT_ID, DISPEL_ID],
  sprite: 'invader-mage',
});

const clericDef = makeInvaderDef({
  id: CLERIC_ID,
  name: 'Cleric',
  invaderClass: 'cleric',
  baseStats: { hp: 20, attack: 4, defense: 8, speed: 4 },
  abilityIds: [HEAL_ID, TURN_UNDEAD_ID],
  sprite: 'invader-cleric',
});

const paladinDef = makeInvaderDef({
  id: PALADIN_ID,
  name: 'Paladin',
  invaderClass: 'paladin',
  baseStats: { hp: 28, attack: 7, defense: 9, speed: 2 },
  abilityIds: [SMITE_EVIL_ID, AURA_OF_COURAGE_ID],
  sprite: 'invader-paladin',
});

const rangerDef = makeInvaderDef({
  id: RANGER_ID,
  name: 'Ranger',
  invaderClass: 'ranger',
  baseStats: { hp: 18, attack: 7, defense: 4, speed: 9 },
  abilityIds: [SCOUT_ID, MARK_TARGET_ID],
  sprite: 'invader-ranger',
});

const allInvaderDefs = [warriorDef, rogueDef, mageDef, clericDef, paladinDef, rangerDef];

// --- Helper to make an invader instance ---

function makeInvaderInstance(
  overrides: Partial<InvaderInstance> = {},
): InvaderInstance {
  return {
    id: 'inv-1',
    definitionId: WARRIOR_ID,
    currentHp: 30,
    maxHp: 30,
    statusEffects: [],
    abilityStates: [
      { abilityId: SHIELD_WALL_ID, currentCooldown: 0, isActive: false, remainingDuration: 0 },
    ],
    ...overrides,
  };
}

// --- Setup ---

beforeEach(() => {
  mockContent.clear();

  // Register all invader definitions
  for (const def of allInvaderDefs) {
    mockContent.set(def.id, def);
  }

  // Register effect definitions (by name for effectType lookup)
  mockContent.set('Damage', damageEffect);
  mockContent.set('Heal', healEffect);
  mockContent.set('Disarm', disarmEffect);
  mockContent.set('Magic Damage', magicDamageEffect);
  mockContent.set('Dispel', dispelEffect);
  mockContent.set('Buff Defense', buffDefenseEffect);
  mockContent.set('Fear Immunity', fearImmunityEffect);
  mockContent.set('Scout', scoutEffect);
  mockContent.set('Mark', markEffect);

  // Register ability definitions (by ID only — name keys would collide with effects)
  const allAbilities = [
    shieldWallAbility, disarmTrapAbility, backstabAbility, arcaneBoltAbility,
    dispelAbility, healAbility, turnUndeadAbility, smiteEvilAbility,
    auraOfCourageAbility, scoutAbility, markTargetAbility,
  ];
  for (const ability of allAbilities) {
    mockContent.set(ability.id, ability);
  }
});

// --- Import after mocks ---

const {
  getAllInvaderDefinitions,
  getInvaderDefinitionById,
  createInvaderInstance,
  resolveInvaderAbility,
  applyCooldown,
  tickCooldowns,
  applyStatusEffect,
  tickStatusEffects,
  hasStatusEffect,
  clearStatusEffects,
  applyHealing,
} = await import('@helpers/invaders');

// ============================================================
// US-001: Invader definitions & types
// ============================================================

describe('Invader definitions', () => {
  it('should load all 6 invader classes', () => {
    const invaders = getAllInvaderDefinitions();
    expect(invaders).toHaveLength(6);
  });

  it('all invader classes have valid stats (all > 0)', () => {
    for (const def of allInvaderDefs) {
      const loaded = getInvaderDefinitionById(def.id);
      expect(loaded).toBeDefined();
      expect(loaded!.baseStats.hp).toBeGreaterThan(0);
      expect(loaded!.baseStats.attack).toBeGreaterThan(0);
      expect(loaded!.baseStats.defense).toBeGreaterThan(0);
      expect(loaded!.baseStats.speed).toBeGreaterThan(0);
    }
  });

  it('Warrior has high HP and attack', () => {
    const warrior = getInvaderDefinitionById(WARRIOR_ID)!;
    expect(warrior.invaderClass).toBe('warrior');
    expect(warrior.baseStats.hp).toBe(30);
    expect(warrior.baseStats.attack).toBe(8);
    expect(warrior.abilityIds).toContain(SHIELD_WALL_ID);
  });

  it('Rogue has high speed and two abilities', () => {
    const rogue = getInvaderDefinitionById(ROGUE_ID)!;
    expect(rogue.invaderClass).toBe('rogue');
    expect(rogue.baseStats.speed).toBe(10);
    expect(rogue.abilityIds).toContain(DISARM_TRAP_ID);
    expect(rogue.abilityIds).toContain(BACKSTAB_ID);
  });

  it('Mage has high attack and magic abilities', () => {
    const mage = getInvaderDefinitionById(MAGE_ID)!;
    expect(mage.invaderClass).toBe('mage');
    expect(mage.baseStats.attack).toBe(10);
    expect(mage.abilityIds).toContain(ARCANE_BOLT_ID);
    expect(mage.abilityIds).toContain(DISPEL_ID);
  });

  it('Cleric has high defense and healing/anti-undead abilities', () => {
    const cleric = getInvaderDefinitionById(CLERIC_ID)!;
    expect(cleric.invaderClass).toBe('cleric');
    expect(cleric.baseStats.defense).toBe(8);
    expect(cleric.abilityIds).toContain(HEAL_ID);
    expect(cleric.abilityIds).toContain(TURN_UNDEAD_ID);
  });

  it('Paladin has high HP/defense and anti-corruption abilities', () => {
    const paladin = getInvaderDefinitionById(PALADIN_ID)!;
    expect(paladin.invaderClass).toBe('paladin');
    expect(paladin.baseStats.hp).toBe(28);
    expect(paladin.baseStats.defense).toBe(9);
    expect(paladin.abilityIds).toContain(SMITE_EVIL_ID);
    expect(paladin.abilityIds).toContain(AURA_OF_COURAGE_ID);
  });

  it('Ranger has high speed and scouting abilities', () => {
    const ranger = getInvaderDefinitionById(RANGER_ID)!;
    expect(ranger.invaderClass).toBe('ranger');
    expect(ranger.baseStats.speed).toBe(9);
    expect(ranger.abilityIds).toContain(SCOUT_ID);
    expect(ranger.abilityIds).toContain(MARK_TARGET_ID);
  });
});

// ============================================================
// US-002: Instance creation and ability resolution
// ============================================================

describe('createInvaderInstance', () => {
  it('creates an instance with correct HP and empty status effects', () => {
    const instance = createInvaderInstance(warriorDef);
    expect(instance.definitionId).toBe(WARRIOR_ID);
    expect(instance.currentHp).toBe(30);
    expect(instance.maxHp).toBe(30);
    expect(instance.statusEffects).toEqual([]);
  });

  it('initializes ability states with zero cooldown', () => {
    const instance = createInvaderInstance(rogueDef);
    expect(instance.abilityStates).toHaveLength(2);
    for (const state of instance.abilityStates) {
      expect(state.currentCooldown).toBe(0);
      expect(state.isActive).toBe(false);
    }
  });

  it('creates unique IDs for each instance', () => {
    const a = createInvaderInstance(warriorDef);
    const b = createInvaderInstance(warriorDef);
    expect(a.id).not.toBe(b.id);
  });
});

describe('resolveInvaderAbility', () => {
  it('returns null when ability is on cooldown', () => {
    const invader = makeInvaderInstance({
      abilityStates: [
        { abilityId: SHIELD_WALL_ID, currentCooldown: 3, isActive: false, remainingDuration: 0 },
      ],
    });
    const result = resolveInvaderAbility(invader, shieldWallAbility, ['target-1']);
    expect(result).toBeUndefined();
  });

  it('returns null when ability state is missing', () => {
    const invader = makeInvaderInstance({ abilityStates: [] });
    const result = resolveInvaderAbility(invader, shieldWallAbility, ['target-1']);
    expect(result).toBeUndefined();
  });

  it('Shield Wall targets self and returns defense buff', () => {
    const invader = makeInvaderInstance();
    const result = resolveInvaderAbility(invader, shieldWallAbility, ['enemy-1']);
    expect(result).toBeDefined();
    expect(result!.effectType).toBe('Buff Defense');
    expect(result!.value).toBe(25);
    expect(result!.duration).toBe(2);
    expect(result!.targetIds).toEqual([invader.id]);
    expect(result!.cooldownApplied).toBe(4);
  });

  it('Backstab deals double damage based on rogue attack', () => {
    const invader = makeInvaderInstance({
      definitionId: ROGUE_ID,
      abilityStates: [
        { abilityId: BACKSTAB_ID, currentCooldown: 0, isActive: false, remainingDuration: 0 },
      ],
    });
    const result = resolveInvaderAbility(invader, backstabAbility, ['target-1']);
    expect(result).toBeDefined();
    // Rogue attack = 6, value = 200% → 6 * 2 = 12
    expect(result!.value).toBe(12);
    expect(result!.targetIds).toEqual(['target-1']);
  });

  it('Arcane Bolt deals magic damage based on mage attack', () => {
    const invader = makeInvaderInstance({
      definitionId: MAGE_ID,
      abilityStates: [
        { abilityId: ARCANE_BOLT_ID, currentCooldown: 0, isActive: false, remainingDuration: 0 },
      ],
    });
    const result = resolveInvaderAbility(invader, arcaneBoltAbility, ['target-1']);
    expect(result).toBeDefined();
    // Mage attack = 10, value = 150% → 10 * 1.5 = 15
    expect(result!.value).toBe(15);
    expect(result!.effectType).toBe('Magic Damage');
  });

  it('Turn Undead deals AOE damage to all targets', () => {
    const invader = makeInvaderInstance({
      definitionId: CLERIC_ID,
      abilityStates: [
        { abilityId: TURN_UNDEAD_ID, currentCooldown: 0, isActive: false, remainingDuration: 0 },
      ],
    });
    const targets = ['undead-1', 'undead-2', 'undead-3'];
    const result = resolveInvaderAbility(invader, turnUndeadAbility, targets);
    expect(result).toBeDefined();
    // Cleric attack = 4, value = 150% → 4 * 1.5 = 6
    expect(result!.value).toBe(6);
    expect(result!.targetIds).toEqual(targets);
  });

  it('Aura of Courage targets all allies', () => {
    const invader = makeInvaderInstance({
      definitionId: PALADIN_ID,
      abilityStates: [
        { abilityId: AURA_OF_COURAGE_ID, currentCooldown: 0, isActive: false, remainingDuration: 0 },
      ],
    });
    const allies = ['ally-1', 'ally-2'];
    const result = resolveInvaderAbility(invader, auraOfCourageAbility, allies);
    expect(result).toBeDefined();
    expect(result!.effectType).toBe('Fear Immunity');
    expect(result!.targetIds).toEqual(allies);
  });

  it('Scout targets self with rooms-to-reveal value', () => {
    const invader = makeInvaderInstance({
      definitionId: RANGER_ID,
      abilityStates: [
        { abilityId: SCOUT_ID, currentCooldown: 0, isActive: false, remainingDuration: 0 },
      ],
    });
    const result = resolveInvaderAbility(invader, scoutAbility, ['target-1']);
    expect(result).toBeDefined();
    expect(result!.effectType).toBe('Scout');
    expect(result!.value).toBe(2);
    expect(result!.targetIds).toEqual([invader.id]);
  });

  it('Mark Target applies damage amplification with duration', () => {
    const invader = makeInvaderInstance({
      definitionId: RANGER_ID,
      abilityStates: [
        { abilityId: MARK_TARGET_ID, currentCooldown: 0, isActive: false, remainingDuration: 0 },
      ],
    });
    const result = resolveInvaderAbility(invader, markTargetAbility, ['target-1']);
    expect(result).toBeDefined();
    expect(result!.effectType).toBe('Mark');
    expect(result!.value).toBe(20);
    expect(result!.duration).toBe(3);
    expect(result!.targetIds).toEqual(['target-1']);
  });

  it('Dispel returns dispel effect with zero value', () => {
    const invader = makeInvaderInstance({
      definitionId: MAGE_ID,
      abilityStates: [
        { abilityId: DISPEL_ID, currentCooldown: 0, isActive: false, remainingDuration: 0 },
      ],
    });
    const result = resolveInvaderAbility(invader, dispelAbility, ['target-1']);
    expect(result).toBeDefined();
    expect(result!.effectType).toBe('Dispel');
    expect(result!.value).toBe(0);
    expect(result!.targetIds).toEqual(['target-1']);
  });
});

// ============================================================
// US-003: Specific ability tests
// ============================================================

describe('Rogue disarm', () => {
  it('returns success (value=1) on successful roll', () => {
    const invader = makeInvaderInstance({
      definitionId: ROGUE_ID,
      abilityStates: [
        { abilityId: DISARM_TRAP_ID, currentCooldown: 0, isActive: false, remainingDuration: 0 },
      ],
    });
    // rng returns 0.3 → roll = 30 → 30 <= 60 → success
    const result = resolveInvaderAbility(invader, disarmTrapAbility, ['trap-1'], () => 0.3);
    expect(result).toBeDefined();
    expect(result!.effectType).toBe('Disarm');
    expect(result!.value).toBe(1);
  });

  it('returns failure (value=0) on failed roll', () => {
    const invader = makeInvaderInstance({
      definitionId: ROGUE_ID,
      abilityStates: [
        { abilityId: DISARM_TRAP_ID, currentCooldown: 0, isActive: false, remainingDuration: 0 },
      ],
    });
    // rng returns 0.8 → roll = 80 → 80 > 60 → failure
    const result = resolveInvaderAbility(invader, disarmTrapAbility, ['trap-1'], () => 0.8);
    expect(result).toBeDefined();
    expect(result!.value).toBe(0);
  });
});

describe('Cleric heal', () => {
  it('restores correct HP amount (20% of max HP)', () => {
    const invader = makeInvaderInstance({
      definitionId: CLERIC_ID,
      currentHp: 10,
      maxHp: 20,
      abilityStates: [
        { abilityId: HEAL_ID, currentCooldown: 0, isActive: false, remainingDuration: 0 },
      ],
    });
    const result = resolveInvaderAbility(invader, healAbility, ['ally-1']);
    expect(result).toBeDefined();
    // maxHp = 20, value = 20% → 20 * 0.2 = 4
    expect(result!.value).toBe(4);
    expect(result!.effectType).toBe('Heal');
  });

  it('applyHealing caps at maxHp', () => {
    const invader = makeInvaderInstance({
      currentHp: 28,
      maxHp: 30,
    });
    const healed = applyHealing(invader, 10);
    expect(healed.currentHp).toBe(30);
  });

  it('applyHealing adds correct amount', () => {
    const invader = makeInvaderInstance({
      currentHp: 10,
      maxHp: 30,
    });
    const healed = applyHealing(invader, 6);
    expect(healed.currentHp).toBe(16);
  });
});

describe('Cooldown prevents ability reuse', () => {
  it('ability is blocked when on cooldown', () => {
    const invader = makeInvaderInstance({
      abilityStates: [
        { abilityId: SHIELD_WALL_ID, currentCooldown: 2, isActive: false, remainingDuration: 0 },
      ],
    });
    const result = resolveInvaderAbility(invader, shieldWallAbility, ['target-1']);
    expect(result).toBeUndefined();
  });

  it('applyCooldown sets cooldown on the correct ability', () => {
    const invader = makeInvaderInstance({
      abilityStates: [
        { abilityId: SHIELD_WALL_ID, currentCooldown: 0, isActive: false, remainingDuration: 0 },
      ],
    });
    const updated = applyCooldown(invader, SHIELD_WALL_ID, 4);
    expect(updated.abilityStates[0].currentCooldown).toBe(4);
  });

  it('tickCooldowns decrements cooldowns by 1', () => {
    const invader = makeInvaderInstance({
      abilityStates: [
        { abilityId: SHIELD_WALL_ID, currentCooldown: 3, isActive: false, remainingDuration: 0 },
      ],
    });
    const ticked = tickCooldowns(invader);
    expect(ticked.abilityStates[0].currentCooldown).toBe(2);
  });

  it('tickCooldowns does not go below 0', () => {
    const invader = makeInvaderInstance({
      abilityStates: [
        { abilityId: SHIELD_WALL_ID, currentCooldown: 0, isActive: false, remainingDuration: 0 },
      ],
    });
    const ticked = tickCooldowns(invader);
    expect(ticked.abilityStates[0].currentCooldown).toBe(0);
  });

  it('ability works again after cooldown expires', () => {
    let invader = makeInvaderInstance({
      abilityStates: [
        { abilityId: SHIELD_WALL_ID, currentCooldown: 1, isActive: false, remainingDuration: 0 },
      ],
    });
    // Still on cooldown
    expect(resolveInvaderAbility(invader, shieldWallAbility, ['t'])).toBeUndefined();
    // Tick down
    invader = tickCooldowns(invader);
    expect(invader.abilityStates[0].currentCooldown).toBe(0);
    // Now it should work
    const result = resolveInvaderAbility(invader, shieldWallAbility, ['t']);
    expect(result).toBeDefined();
  });
});

describe('Paladin Smite Evil', () => {
  it('deals bonus damage to targets (200% of paladin attack)', () => {
    const invader = makeInvaderInstance({
      definitionId: PALADIN_ID,
      abilityStates: [
        { abilityId: SMITE_EVIL_ID, currentCooldown: 0, isActive: false, remainingDuration: 0 },
      ],
    });
    const result = resolveInvaderAbility(invader, smiteEvilAbility, ['corrupted-1']);
    expect(result).toBeDefined();
    // Paladin attack = 7, value = 200% → 7 * 2 = 14
    expect(result!.value).toBe(14);
    expect(result!.effectType).toBe('Damage');
    expect(result!.targetIds).toEqual(['corrupted-1']);
    expect(result!.cooldownApplied).toBe(2);
  });
});

// ============================================================
// Status effect helpers
// ============================================================

describe('Status effects', () => {
  it('applyStatusEffect adds a new status', () => {
    const invader = makeInvaderInstance();
    const updated = applyStatusEffect(invader, 'shielded', 2);
    expect(updated.statusEffects).toHaveLength(1);
    expect(updated.statusEffects[0]).toEqual({ name: 'shielded', remainingDuration: 2 });
  });

  it('applyStatusEffect refreshes existing status duration', () => {
    const invader = makeInvaderInstance({
      statusEffects: [{ name: 'shielded', remainingDuration: 1 }],
    });
    const updated = applyStatusEffect(invader, 'shielded', 3);
    expect(updated.statusEffects).toHaveLength(1);
    expect(updated.statusEffects[0].remainingDuration).toBe(3);
  });

  it('hasStatusEffect returns true when status is present', () => {
    const invader = makeInvaderInstance({
      statusEffects: [{ name: 'courage', remainingDuration: 1 }],
    });
    expect(hasStatusEffect(invader, 'courage')).toBe(true);
    expect(hasStatusEffect(invader, 'marked')).toBe(false);
  });

  it('tickStatusEffects decrements duration and removes expired', () => {
    const invader = makeInvaderInstance({
      statusEffects: [
        { name: 'shielded', remainingDuration: 2 },
        { name: 'marked', remainingDuration: 1 },
      ],
    });
    const ticked = tickStatusEffects(invader);
    expect(ticked.statusEffects).toHaveLength(1);
    expect(ticked.statusEffects[0]).toEqual({ name: 'shielded', remainingDuration: 1 });
  });

  it('clearStatusEffects removes all statuses', () => {
    const invader = makeInvaderInstance({
      statusEffects: [
        { name: 'shielded', remainingDuration: 2 },
        { name: 'courage', remainingDuration: 5 },
      ],
    });
    const cleared = clearStatusEffects(invader);
    expect(cleared.statusEffects).toEqual([]);
  });
});
