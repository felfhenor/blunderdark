import { describe, expect, it } from 'vitest';
import {
  defaultCorruptionEffectState,
  defaultFloor,
  defaultGameState,
  defaultInvasionSchedule,
  defaultMerchantState,
  defaultReputationState,
  defaultResearchState,
  defaultResources,
  defaultSeasonState,
  defaultUnlockedContent,
  defaultVictoryProgress,
} from '@helpers/defaults';

describe('defaultResources', () => {
  it('should have all 7 resource types', () => {
    const resources = defaultResources();
    const keys = Object.keys(resources);
    expect(keys).toHaveLength(7);
    expect(keys).toContain('crystals');
    expect(keys).toContain('food');
    expect(keys).toContain('gold');
    expect(keys).toContain('flux');
    expect(keys).toContain('research');
    expect(keys).toContain('essence');
    expect(keys).toContain('corruption');
  });

  it('should start with some food and gold', () => {
    const resources = defaultResources();
    expect(resources.food.current).toBe(50);
    expect(resources.gold.current).toBe(100);
  });

  it('should start other currencies at 0', () => {
    const resources = defaultResources();
    expect(resources.crystals.current).toBe(0);
    expect(resources.flux.current).toBe(0);
    expect(resources.research.current).toBe(0);
    expect(resources.essence.current).toBe(0);
    expect(resources.corruption.current).toBe(0);
  });

  it('should have correct max values', () => {
    const resources = defaultResources();
    expect(resources.gold.max).toBe(1000);
    expect(resources.crystals.max).toBe(500);
    expect(resources.food.max).toBe(500);
    expect(resources.flux.max).toBe(200);
    expect(resources.research.max).toBe(300);
    expect(resources.essence.max).toBe(200);
    expect(resources.corruption.max).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('should return a new object each call', () => {
    const a = defaultResources();
    const b = defaultResources();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

describe('defaultSeasonState', () => {
  it('should start in growth season on day 1', () => {
    const season = defaultSeasonState();
    expect(season.currentSeason).toBe('growth');
    expect(season.dayInSeason).toBe(1);
    expect(season.totalSeasonCycles).toBe(0);
  });
});

describe('defaultReputationState', () => {
  it('should start with all 5 reputation types at 0', () => {
    const rep = defaultReputationState();
    expect(rep.terror).toBe(0);
    expect(rep.wealth).toBe(0);
    expect(rep.knowledge).toBe(0);
    expect(rep.harmony).toBe(0);
    expect(rep.chaos).toBe(0);
  });
});

describe('defaultResearchState', () => {
  it('should have no completed nodes', () => {
    const research = defaultResearchState();
    expect(research.completedNodes).toEqual([]);
    expect(research.activeResearch).toBeUndefined();
    expect(research.activeResearchProgress).toBe(0);
    expect(research.activeResearchStartTick).toBe(0);
  });

  it('should have empty unlocked content', () => {
    const research = defaultResearchState();
    const unlocked = research.unlockedContent;
    expect(unlocked.rooms).toEqual([]);
    expect(unlocked.inhabitants).toEqual([]);
    expect(unlocked.abilities).toEqual([]);
    expect(unlocked.roomupgrades).toEqual([]);
    expect(unlocked.passiveBonuses).toEqual([]);
    expect(unlocked.featureFlags).toEqual([]);
    expect(unlocked.roomfeatures).toEqual([]);
    expect(unlocked.biomes).toEqual([]);
  });
});

describe('defaultUnlockedContent', () => {
  it('should have all 8 unlock categories as empty arrays', () => {
    const unlocked = defaultUnlockedContent();
    expect(Object.keys(unlocked)).toHaveLength(8);
    for (const arr of Object.values(unlocked)) {
      expect(arr).toEqual([]);
    }
  });
});

describe('defaultFloor', () => {
  it('should default to depth 1 and neutral biome', () => {
    const floor = defaultFloor();
    expect(floor.depth).toBe(1);
    expect(floor.biome).toBe('neutral');
    expect(floor.name).toBe('Floor 1');
  });

  it('should use specified depth and biome', () => {
    const floor = defaultFloor(3, 'volcanic');
    expect(floor.depth).toBe(3);
    expect(floor.biome).toBe('volcanic');
    expect(floor.name).toBe('Floor 3');
  });

  it('should start with empty rooms, hallways, inhabitants, connections, traps', () => {
    const floor = defaultFloor();
    expect(floor.rooms).toEqual([]);
    expect(floor.hallways).toEqual([]);
    expect(floor.inhabitants).toEqual([]);
    expect(floor.connections).toEqual([]);
    expect(floor.traps).toEqual([]);
  });

  it('should have a valid grid', () => {
    const floor = defaultFloor();
    expect(floor.grid).toBeDefined();
    expect(floor.grid.length).toBeGreaterThan(0);
  });

  it('should generate unique IDs per call', () => {
    const a = defaultFloor();
    const b = defaultFloor();
    expect(a.id).not.toBe(b.id);
  });
});

describe('defaultInvasionSchedule', () => {
  it('should have grace period ending on day 5', () => {
    const schedule = defaultInvasionSchedule();
    expect(schedule.gracePeriodEnd).toBe(5);
  });

  it('should have no scheduled invasion or history', () => {
    const schedule = defaultInvasionSchedule();
    expect(schedule.nextInvasionDay).toBeUndefined();
    expect(schedule.nextInvasionVariance).toBe(0);
    expect(schedule.invasionHistory).toEqual([]);
    expect(schedule.pendingSpecialInvasions).toEqual([]);
  });

  it('should have warning inactive and not dismissed', () => {
    const schedule = defaultInvasionSchedule();
    expect(schedule.warningActive).toBe(false);
    expect(schedule.warningDismissed).toBe(false);
  });
});

describe('defaultCorruptionEffectState', () => {
  it('should start with all empty tracking structures', () => {
    const state = defaultCorruptionEffectState();
    expect(state.firedOneTimeEffects).toEqual([]);
    expect(state.lastIntervalValues).toEqual({});
    expect(state.lastTriggerTimes).toEqual({});
    expect(state.retriggeredEffects).toEqual({});
  });
});

describe('defaultVictoryProgress', () => {
  it('should start with all counters at 0', () => {
    const progress = defaultVictoryProgress();
    expect(progress.consecutivePeacefulDays).toBe(0);
    expect(progress.lastPeacefulCheckDay).toBe(0);
    expect(progress.consecutiveZeroCorruptionDays).toBe(0);
    expect(progress.lastZeroCorruptionCheckDay).toBe(0);
    expect(progress.totalInvasionDefenseWins).toBe(0);
    expect(progress.lastEvaluationTick).toBe(0);
  });
});

describe('defaultMerchantState', () => {
  it('should start with merchant not present', () => {
    const merchant = defaultMerchantState();
    expect(merchant.isPresent).toBe(false);
    expect(merchant.arrivalDay).toBe(0);
    expect(merchant.departureDayRemaining).toBe(0);
    expect(merchant.inventory).toEqual([]);
  });
});

describe('defaultGameState', () => {
  it('should have meta with version 1 and not setup', () => {
    const state = defaultGameState();
    expect(state.meta.version).toBe(1);
    expect(state.meta.isSetup).toBe(false);
    expect(state.meta.isPaused).toBe(false);
    expect(state.meta.createdAt).toBeGreaterThan(0);
  });

  it('should start on day 1, hour 0, minute 0', () => {
    const state = defaultGameState();
    expect(state.clock.day).toBe(1);
    expect(state.clock.hour).toBe(0);
    expect(state.clock.minute).toBe(0);
    expect(state.clock.numTicks).toBe(0);
  });

  it('should have one default floor', () => {
    const state = defaultGameState();
    expect(state.world.floors).toHaveLength(1);
    expect(state.world.currentFloorIndex).toBe(0);
  });

  it('should start with empty inventories and collections', () => {
    const state = defaultGameState();
    expect(state.world.inhabitants).toEqual([]);
    expect(state.world.hallways).toEqual([]);
    expect(state.world.trapInventory).toEqual([]);
    expect(state.world.forgeInventory).toEqual([]);
    expect(state.world.alchemyConversions).toEqual([]);
    expect(state.world.prisoners).toEqual([]);
    expect(state.world.traitRunes).toEqual([]);
    expect(state.world.interrogationBuffs).toEqual([]);
    expect(state.world.farplaneSouls).toEqual([]);
  });

  it('should start with 0 player threat', () => {
    const state = defaultGameState();
    expect(state.world.playerThreat).toBe(0);
  });

  it('should generate unique game IDs per call', () => {
    const a = defaultGameState();
    const b = defaultGameState();
    expect(a.gameId).not.toBe(b.gameId);
  });
});
