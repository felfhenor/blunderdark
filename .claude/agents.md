# Agents Knowledge Base

Reusable patterns and learnings for agents working on Blunderdark.

## Core Policies

- **All imports must be at the top of the file** — never place `import` statements in the middle of a file after non-import code (type definitions, constants, `vi.mock()` calls, etc.). In test files, Vitest hoists `vi.mock()` automatically, so imports can and should come before mock setup.
- **NEVER hardcode content UUIDs in TypeScript.** Use `roomRoleFindById(role)` for special rooms, data fields on `RoomContent` for behavior, `contentGetEntriesByType()` for querying. In spec files, define test-local UUID constants.
- **All gamedata UUIDs must be real v4 UUIDs** — generate with `crypto.randomUUID()`.
- **Always use branded ID types, never plain `string`.** Define via `type MyId = Branded<string, 'MyId'>` in interface files. Cast at creation points: `rngUuid<HallwayId>()`, `'test-id' as PlacedRoomId`.
- **NEVER export types from `src/app/helpers/`** — all types live in `src/app/interfaces/`, exported from the barrel (`index.ts`). Interface files may import other interfaces but NEVER from `@helpers/`.
- **Content types use `Content` suffix** — gamedata-backed types in `content-*.ts` are named `XContent` (e.g., `RoomContent`, `InhabitantContent`). The old `XDefinition` suffix is no longer used. Runtime types (instances, state) remain without `Content` suffix.
- **Do NOT import `@helpers/notify` in testable helpers** — causes circular deps through barrel exports. Return data and let components call notify.
- **Do not use `null`** — use `undefined` for optional/missing values.
- **Prefer modals/popups over separate pages** for new features.

## Content Pipeline

- New content types need: (1) `ContentType` union in `identifiable.ts`, (2) `ensureX()` in `content-initializers.ts`, (3) `gamedata/[type]/` YAML folder
- Content retrieved via `contentGetEntry<T>` uses `T & IsContentItem` constraint
- Build script auto-discovers `gamedata/` folders. `public/json/` is gitignored.
- Every content type has `content-{type}.ts` with branded ID + `{Type}Content` type extending `IsContentItem` (and `HasDescription`/`HasSprite`/`HasAnimation` as needed)

### Content Type Reference

| ContentType | Branded ID | Content Type |
|---|---|---|
| `abilityeffect` | `AbilityEffectId` | `AbilityEffectContent` |
| `alchemyrecipe` | `AlchemyRecipeId` | `AlchemyRecipeContent` |
| `breedingrecipe` | `BreedingRecipeId` | `BreedingRecipeContent` |
| `combatability` | `CombatAbilityId` | `CombatAbilityContent` |
| `feature` | `FeatureId` | `FeatureContent` |
| `forgerecipe` | `ForgeRecipeId` | `ForgeRecipeContent` |
| `fusionrecipe` | `FusionRecipeId` | `FusionRecipeContent` |
| `inhabitant` | `InhabitantId` | `InhabitantContent` |
| `invader` | `InvaderId` | `InvaderContent` |
| `invasion` | `InvasionId` | `InvasionContent` |
| `merchanttrade` | `MerchantTradeId` | `MerchantTradeContent` |
| `reputationaction` | `ReputationActionId` | `ReputationActionContent` |
| `reputationeffect` | `ReputationEffectId` | `ReputationEffectContent` |
| `research` | `ResearchId` | `ResearchContent` |
| `room` | `RoomId` | `RoomContent` |
| `roomshape` | `RoomShapeId` | `RoomShapeContent` |
| `seasonalevent` | `SeasonalEventId` | `SeasonalEventContent` |
| `seasonbonus` | `SeasonBonusId` | `SeasonBonusContent` |
| `summonrecipe` | `SummonRecipeId` | `SummonRecipeContent` |
| `synergy` | `SynergyId` | `SynergyContent` |
| `trap` | `TrapId` | `TrapContent` |

## State Management

- Pure helper functions: take state as param, return new state (immutable pattern)
- `computed()` for derived state, `??` for safe defaults
- `updateGamestate()` is async; `signalIndexedDb` auto-persists
- `migrateGameState()` uses `merge()` — but arrays need explicit migration functions (arrays merge by index, not replace)
- When adding fields to `GameStateWorld`: update interface, `defaults.ts`, `worldgen.ts`, and `makeGameState()` in ~16 spec files
- When adding fields to `Floor`: update interface, `defaultFloor()`, `floorMigrate()`, and `makeFloor()` in ~15 spec files

## Grid & Room System

- Grid uses `[y][x]` indexing (row-major)
- `PlacedRoom` links to content via `roomTypeId`; `RoomContent` defines production, adjacency, capacity, fear
- When adding fields to `RoomContent`: update `ensureRoom()` defaults AND mock objects in test files
- When adding fields to `GridTile`: update `gridCreateEmpty()`, all test literals, all GridTile objects in helpers/specs
- Room placement preview: `roomPlacementPreviewShape` + `roomPlacementPreviewPosition` signals → `roomPlacementPreview` computed → `Set<string>` of `"x,y"` keys for O(1) lookup
- Rotation: `Rotation` type `0|1|2|3`, stored on `PlacedRoom`, applied via `roomShapeResolve()`

## Production Formula

`Final = Base * (1 + inhabitantBonus + adjacencyBonus) * stateModifier * envModifier * depthModifier * dayNightMod * seasonMod`

- `productionGetBase(roomTypeId)` returns `{}` for missing rooms
- `productionGetRoomDefinition(roomTypeId)` returns `undefined` — callers must check
- `efficiency.ts` imports from `production.ts` (one-way) — NOT vice versa
- Values in YAML are per-tick; multiply by `GAME_TIME_TICKS_PER_MINUTE` (5) for per-minute

## Inhabitant System

- **Dual location**: `GameStateWorld.inhabitants` (global) and `Floor.inhabitants` (per-floor) — must sync both
- `InhabitantContent`: `restrictionTags`, `rulerBonuses`, `rulerFearLevel`, `fearModifier`, `fearPropagationDistance`, `foodConsumptionRate`, `corruptionGeneration`, `type` (creature/undead/fungal/etc.)
- Optional fields on `InhabitantInstance` (`trained?`, `hungerTicksWithoutFood?`, `mutated?`, `isSummoned?`, etc.) — use `?:` to avoid breaking test mocks. `inhabitantDeserialize()` provides `??` defaults.
- `inhabitantCanAssignToRoom` checks restriction then capacity; rooms with `maxInhabitants: -1` = unlimited
- **Trait effectTypes**: `production_bonus` (with `targetResourceType` and optional `targetRoomId`) — actively consumed in production.ts/efficiency.ts. `attack_bonus` and `defense_bonus` consumed by mimic.ts for combat trait effects. `undead_master` consumed by lich.ts for aura bonuses. `ancient_knowledge` consumed by lich.ts for research revelation. Others are data-only: `trap_bonus`, `versatility`, `damage_reduction`, `detection`, `structural_bonus`, `random_event`, `fire_damage_bonus`, `corruption_reduction`, `corruption_generation`, `regeneration`, `fear_immunity`, `fear_bonus`, `physical_evasion`, `training_bonus`, `combat_priority`, `food_exemption`
- **Room-targeted production traits**: `production_bonus` traits can use `targetRoomId` to restrict the bonus to a specific room (e.g., Soul Siphon applies only in Soul Well). The check is in `productionCalculateInhabitantBonus()` — if `targetRoomId` is set and room ID doesn't match, the trait is skipped.
- **Room-targeted combat traits**: use `targetRoomId` on `defense_bonus`/`attack_bonus` traits for room-conditional combat bonuses (e.g., Treasure Guardian applies only in Treasure Vault). Code in `mimic.ts` resolves room ID via `contentGetEntry`.
- **Fear immunity**: set `fearTolerance: 99` to make inhabitant effectively fearless (stateModifierIsInhabitantScared checks tolerance)
- **Adding new inhabitants**: append to `gamedata/inhabitant/base.yml`, define all 4 stateModifiers (normal/scared/hungry/starving), use `crypto.randomUUID()` for IDs
- **Breeding recipes**: reference inhabitants by name (not UUID) in `parentInhabitantAId`/`parentInhabitantBId`, add to `gamedata/breedingrecipe/base.yml`
- **Inappetent pattern**: set `foodConsumptionRate: 0` — hunger system already skips inhabitants with rate ≤ 0, keeping them permanently in `normal` state. Set hungry/starving stateModifiers to 1.0 (unreachable but required).
- **Room-specific production bonuses**: use multiple `production_bonus` traits with different `targetResourceType` values to make an inhabitant benefit multiple room types (e.g., `crystals` for Crystal Mine, `gold` for Dark Forge, `flux` for Ley Line Nexus)
- **Legendary inhabitants**: use `restrictionTags: ['unique']` + `upkeepCost` + `recruitmentRequirements` on `InhabitantContent`. Upkeep processed per-tick in `legendaryInhabitantUpkeepProcess()`. Aura active only when assigned and not discontented. `discontentedTicks` tracked on `InhabitantInstance`.
- **Aura effectTypes for legendaries**: `aura_attack_bonus`, `aura_corruption_bonus`, `aura_fear_bonus`, `aura_morale_penalty`, `aura_trap_bonus`, `aura_negate_scout`, `aura_reveal_invaders`, `aura_petrify`, `aura_food_bonus`, `aura_gathering_bonus`, `aura_room_regen` — data-only, consumed by `legendaryInhabitantIsAuraActive()` check
- **Legendary YAML**: Dragon and Demon Lord in `gamedata/inhabitant/base.yml`; Beholder, Medusa, Ancient Treant in `gamedata/inhabitant/legendary.yml`
- **Fusion system**: `FusionRecipeContent` in `content-fusionrecipe.ts`, recipes in `gamedata/fusionrecipe/base.yml`, hybrid inhabitants in `gamedata/inhabitant/hybrid.yml`. Lookup via `fusionFindRecipe(creatureAId, creatureBId)` (order-independent). Hybrids use `restrictionTags: ['hybrid']`. Cost always includes `essence`. `InhabitantInstance` already has `isHybrid`/`hybridParentIds` fields.
- **Hybrid stat generation**: `fusionGenerateHybridStats(parentA, parentB)` averages stats (HP/attack/defense/speed floored, workerEfficiency decimal). `fusionApplyStatOverrides(stats, overrides)` applies `Partial<InhabitantStats>` from `InhabitantContent.statOverrides`. `fusionMergeTraits(parentA, parentB, hybrid)` unions parent traits (conflict resolution favors higher-tier parent by effectType+target key) then adds hybrid bonus traits. `fusionCreateHybridInstance()` produces an `InhabitantInstance` with hybrid flags. 5 hybrids in YAML have `statOverrides` demonstrating the override feature.

## Environmental Features System

- **Content type**: `feature` → `FeatureContent` with `FeatureId` branded type, stored in `gamedata/feature/base.yml`
- **Attachment**: `PlacedRoom.featureIds?: FeatureId[]` — multi-slot array where index = slot index
- **Slot allocation**: `featureGetSlotCount(placedRoom)` — reads `maxFeatures` from the room's content definition
- **Bonus types**: `capacity_bonus`, `fear_reduction`, `production_bonus`, `adjacent_production`, `flat_production`, `corruption_generation`, `combat_bonus`, `teleport_link`
- **Feature helpers** in `features.ts`: prefix `feature` (e.g., `featureGetAllForRoom`, `featureGetForSlot`, `featureAttachToSlot`, `featureRemoveFromSlot`, `featureCalculateFearReduction`)
- **Multi-slot aggregation**: all bonus calculation functions aggregate across all attached features via `featureGetAllForRoom()`
- **Integration points**: fear-level.ts (`featureReduction` in breakdown), room-upgrades.ts (capacity bonus), production.ts (adjacent + production + flat bonuses), corruption.ts (corruption generation), gameloop.ts (sacrifice buff tick-down)
- **Sacrifice system**: `SacrificeBuff` on `PlacedRoom`, Blood Altar consumes Food for temporary production/combat multiplier buff, ticked down in gameloop
- **Fungal Network**: implicit many-to-many links — any room with `teleport_link` bonus can transfer to any other such room; `featureFungalTransfer()` sets `assignedRoomId` + `travelTicksRemaining=0`
- **Feature removal**: `featureRemoveFromSlot()` clears slot entry; clears `sacrificeBuff` only if no `corruption_generation` features remain; `featureRemoveAllFromRoom()` clears entire array + sacrifice buff
- **Grid indicators**: anchor tile shows `◆occupied/total` with Tippy tooltip listing feature names
- **Feature UI**: panel-room-info shows feature slots section with attach/remove per slot; feature selection modal lists all features with cost/bonuses
- **Corruption process gotcha**: `corruptionGenerationProcess` iterates `state.world.floors` — existing tests may not include `floors` in mock state, so use `?? []` defensive pattern

### Functional Features

- **Category**: `'functional'` on `FeatureContent`, defined in `gamedata/feature/functional.yml`
- **Additional bonus types**: `storage_bonus`, `corruption_seal`, `training_xp`, `resource_converter`
- **Storage Expansion**: `storage_bonus` value is added to a global multiplier via `featureCalculateStorageBonusMultiplier(floors)` → `resourceEffectiveMax()` in resources.ts; excludes corruption; used in `productionProcess()`
- **Efficiency Enchantment**: uses existing `production_bonus` type (value: 0.20) — no new code needed
- **Fear Ward**: uses existing `fear_reduction` type (value: 2) — no new code needed
- **Corruption Seal**: `corruption_seal` bonus → `featureGetCorruptionSealedRoomIds(floors)` returns `Set<string>` of sealed room IDs; `corruptionGenerationProcess` filters out sealed rooms before calculating feature corruption
- **Training Station**: `training_xp` bonus → `featureTrainingStationProcess(floors, inhabitants)` grants XP per tick to inhabitants in rooms with this feature; `InhabitantInstance.xp?: number` field
- **Resource Converter**: `resource_converter` bonus (value=efficiency, e.g. 0.75) → `PlacedRoom.convertedOutputResource?: string` stores target; `featureApplyResourceConversion()` redirects all production to target at efficiency rate; UI dropdown in panel-room-info; applied in both `productionCalculateTotal` and `productionCalculateSingleRoom`

### Prestige Features

- **Category**: `'prestige'` on `FeatureContent`, defined in `gamedata/feature/prestige.yml`
- **Additional bonus types**: `speed_multiplier`, `daily_summon`, `undead_respawn`
- **Unique constraint**: `FeatureContent.unique?: boolean` — `featureIsUniquePlaced(floors, featureId)` scans all rooms; panel-room-info checks before attaching
- **Maintenance cost**: `FeatureContent.maintenanceCost?: ResourceCost` — `featureMaintenanceProcess(floors, resources, ticksPerMinute)` deducts per-tick costs; `PlacedRoom.maintenanceActive?: boolean` tracks active/inactive state
- **Elder Runes**: uses existing `production_bonus` (value: 0.50) — no new code needed
- **Time Dilation Field**: `speed_multiplier` bonus → `featureCalculateSpeedMultiplier(placedRoom)` returns multiplier (default 1.0); has `maintenanceCost: { flux: 2 }`; deactivates when flux insufficient
- **Void Gate**: `daily_summon` bonus → `featureVoidGateProcess(floors, currentDay, inhabitants)` summons once per day; `PlacedRoom.voidGateLastSummonDay?: number` tracks last summon day; 70% friendly (added to roster), 30% hostile (damage to room inhabitants)
- **Phylactery**: `undead_respawn` bonus → `featurePhylacteryQueueRespawn(room, deadInhabitant, queue)` + `featurePhylacteryProcess(queue)` tick-based respawn system; `PlacedRoom.phylacteryCharges?: number` (max 3); respawned at 75% stats via negative `mutationBonuses`; 150-tick (30s) respawn delay
- **Dragon's Hoard Core**: uses existing `flat_production` (gold 5/min) + `storage_bonus` (gold 1.0); `unique: true` — only one per dungeon
- **PlacedRoom fields added**: `maintenanceActive?: boolean`, `phylacteryCharges?: number`, `voidGateLastSummonDay?: number`
- **Test mock pattern**: Void Gate/Phylactery tests mock `@helpers/rng` (rngChoice, rngSucceedsChance, rngUuid) alongside `@helpers/content`

## Room-Specific Systems

All room-specific systems follow the same pattern:
- Room found via `roomRoleFindById('roleName')`
- Process function runs each tick in `updateGamestate`, mutates state in-place
- Jobs/queues stored on `PlacedRoom` or `GameStateWorld`
- Adjacency effects data-driven via `*AdjacencyEffects` field on `RoomContent`
- Upgrade effects handled per-system (tier unlock, speed bonus, capacity, etc.)
- RxJS Subject (`*Completed$`) for cross-cutting notifications
- Mock pattern: `@helpers/content`, `@helpers/room-roles`, `@helpers/room-upgrades`, `@helpers/rng`

| System | File | Role | Base Ticks |
|---|---|---|---|
| Training | `training.ts` | `trainingGrounds` | 25 (5 min) |
| Spawning Pool | `spawning-pool.ts` | `spawningPool` | 25 (5 min) |
| Breeding Pits | `breeding-pits.ts` | `breedingPits` | 25/15 (5/3 min) |
| Summoning Circle | `summoning-circle.ts` | `summoningCircle` | 20 (4 min) |
| Dark Forge | `dark-forge.ts` | `darkForge` | 20 (4 min) |
| Alchemy Lab | `alchemy-lab.ts` | `alchemyLab` | 15 (3 min) |
| Trap Workshop | `trap-workshop.ts` | `trapWorkshop` | 15 (3 min) |
| Torture Chamber | `torture-chamber.ts` | `tortureChamber` | varies |

## Invasion System

- **Invaders**: 6 classes (Warrior, Rogue, Mage, Cleric, Paladin, Ranger) in `gamedata/invader/base.yml`
- `InvaderContent` vs `InvaderInstance` (runtime with HP, status, ability states)
- Abilities: `CombatAbilityContent` entries reference `AbilityEffectContent` by name via `effectType`
- **Composition**: `invasionCompositionCalculateDungeonProfile()` → weights from YAML → `invasionCompositionSelectParty()` (pure function)
- **Triggers**: grace 30 days, escalating intervals (15→10→7 days), ±2 day variance
- **Objectives**: 1 primary (DestroyAltar) + 2 secondary from 7 templates
- **Combat**: turn-based, speed-sorted queue, d20 hit/damage, cardinal adjacency
- **Morale**: party-level 0-100, retreat at 0. Penalties for deaths/traps/fear rooms, bonuses for captures
- **Win/loss priority**: altar_destroyed > objectives_completed > all_invaders_eliminated > morale_broken > turn_limit

## Fear System

- Per-room effective fear: base + inhabitantModifier + upgradeAdjustment - altarAuraReduction + propagatedFear, clamped [0,4]
- Propagation: rooms with source fear ≥3 propagate to adjacent rooms via BFS, attenuates -1/step
- `fearLevelBreakdownMap` computed signal — derived state, not stored

## Other Systems

- **Hunger**: tick-based consumption, states normal→hungry(30min)→starving(60min), recovery 2:1
- **Corruption**: uncapped resource, levels at 0/50/100/200, two pipelines (room production + inhabitant generation)
- **Corruption Effects**: dark upgrade unlock (50), mutations (100), crusade (200)
- **Seasons**: growth/harvest/darkness/storms — resource modifiers, recruitment cost, spawn rate
- **Day/Night**: day(7-17)/night(0-5,19-23)/dawn(6)/dusk(18) — resource and creature-type modifiers
- **Floor Depth**: per-resource modifiers by depth tier
- **Research**: tick-based progress, prerequisite tree, unlock effects (room/inhabitant/ability/upgrade/passive)
- **Synergies**: data-driven from YAML, 5 condition types, floor-scoped, `synergyActiveMap` computed
- **Reputation**: 5 types, level-based effects (production/invasion/unlock), pure functions with optional `allEffects` param
- **Biome Restrictions**: `BIOME_RESTRICTION_MAP` config → `biomeRestrictionCanBuild()`, integrated into placement

## Testing Patterns

- Tests scoped to `src/app/helpers/**/*.spec.ts` only
- Mock helper modules rather than deep gamestate setup
- Use `vi.fn()` for controllable returns, `vi.mock()` before imports (hoisted by vitest)
- For `updateGamestate`: capture updater via `mock.calls[0][0]` and execute
- Partial state mocks: cast through `unknown` first
- RxJS Subject testing: use `vi.spyOn(subject$, 'next')` instead of `.subscribe()`
- `InhabitantState` values: `'normal' | 'scared' | 'hungry' | 'starving'` — never `'idle'`
- `IsContentItem` has `__type` but NOT `__key`
- Mock content collision: don't register abilities by name if effect names overlap — use ID only
- Tests not testing env/depth modifiers: use `depth: 0`, `biome: 'neutral'`

## UI Patterns

- **No inline styles** — use Tailwind classes or CSS custom properties (`[style.--my-var]` + `var(--my-var)`)
- **CSS variables** for DaisyUI 5 theme colors: `var(--color-primary)`, `var(--color-secondary)`, `var(--color-accent)`, `var(--color-info)`, `var(--color-success)`, `var(--color-warning)`, `var(--color-error)`, `var(--color-neutral)`. These resolve to full `oklch(...)` values and work directly as CSS colors. Do NOT use the old daisyUI 4 format (`oklch(var(--p))`, `oklch(var(--su))`, etc.) — those variables no longer exist.
- **Tooltips**: `@ngneat/helipopper` (`[tp]="templateRef"` or `[tp]="'text'"`, `[tpDelay]="250"`, `[tpClassName]="'game-tooltip'"`)
- **SweetAlert2**: `[swal]="templateRef"` on button + `<swal>` with `(confirm)`
- **Panel components**: card pattern (`card bg-base-100 shadow-xl` → `card-body p-4` → `card-title text-sm`), conditionally render via computed signal + `@if`
- **Keyboard shortcuts**: `@ngneat/hotkeys` with `[hotkeys]`, `isGlobal`, `(hotkey)`
- **Build mode mutual exclusion**: each mode has enter/exit signals; `enterX()` calls `exitY()` (one-way imports to avoid circular deps)
- **Gap values must be multiples of 2** — use `gap-2`, `gap-4`, `gap-6`, etc. Never use odd values like `gap-1`, `gap-3`, `gap-5`
- **Section dividers** — section headers within cards/panels use the daisyUI divider pattern: `<div class="divider my-2 text-xs opacity-60">Label</div>`. Remove trailing colons from labels. Do NOT use `<h4>` with `font-semibold opacity-70 mb-1` for section dividers.
- **Icons over entities/emoji** — use `<app-icon name="tablerXxx" />` (`IconComponent`) instead of HTML entities (`&check;`, `&times;`, etc.) or emoji. Available icons are registered in `ICON_ALL` (`src/app/helpers/icons.ts`). If unsure which icon to use, ask the user.

## Naming Conventions

### Helper Functions

Prefix = camelCase of file name. Functions: `prefix + Suffix`. Constants: `PREFIX_SUFFIX`.

Examples: `floor.ts` → `floorCurrent`, `production.ts` → `productionCalculateTotal`, `icons.ts` → `ICON_ALL`

Types/interfaces, non-exported functions, logging functions, and `ensureContent` are exempt.

Observable subjects keep prefix + `$` suffix: `notifyNotification$`, `reputationAward$`.

### File-to-Prefix Table

| File | Prefix | SCREAMING |
|---|---|---|
| `adjacency.ts` | `adjacency` | `ADJACENCY` |
| `altar-room.ts` | `altarRoom` | `ALTAR_ROOM` |
| `assignment.ts` | `assignment` | `ASSIGNMENT` |
| `biome-restrictions.ts` | `biomeRestriction` | `BIOME_RESTRICTION` |
| `breeding-pits.ts` | `breeding` | `BREEDING` |
| `combat.ts` | `combat` | `COMBAT` |
| `combat-abilities.ts` | `combatAbility` | `COMBAT_ABILITY` |
| `connections.ts` | `connection` | `CONNECTION` |
| `content.ts` | `content` | `CONTENT` |
| `corruption.ts` | `corruption` | `CORRUPTION` |
| `corruption-thresholds.ts` | `corruptionThreshold` | `CORRUPTION_THRESHOLD` |
| `dark-forge.ts` | `darkForge` | `DARK_FORGE` |
| `day-night-modifiers.ts` | `dayNight` | `DAY_NIGHT` |
| `defaults.ts` | `default` | `DEFAULT` |
| `efficiency.ts` | `efficiency` | `EFFICIENCY` |
| `fear-level.ts` | `fearLevel` | `FEAR_LEVEL` |
| `features.ts` | `feature` | `FEATURE` |
| `floor.ts` | `floor` | `FLOOR` |
| `fusion.ts` | `fusion` | `FUSION` |
| `floor-modifiers.ts` | `floorModifier` | `FLOOR_MODIFIER` |
| `game-events.ts` | `gameEvent` | `GAME_EVENT` |
| `game-time.ts` | `gameTime` | `GAME_TIME` |
| `gameloop.ts` | `gameloop` | `GAMELOOP` |
| `grid.ts` | `grid` | `GRID` |
| `hallway-placement.ts` | `hallwayPlacement` | `HALLWAY_PLACEMENT` |
| `hallways.ts` | `hallway` | `HALLWAY` |
| `hunger.ts` | `hunger` | `HUNGER` |
| `inhabitants.ts` | `inhabitant` | `INHABITANT` |
| `invaders.ts` | `invader` | `INVADER` |
| `invasion-combat.ts` | `invasionCombat` | `INVASION_COMBAT` |
| `invasion-composition.ts` | `invasionComposition` | `INVASION_COMPOSITION` |
| `invasion-objectives.ts` | `invasionObjective` | `INVASION_OBJECTIVE` |
| `invasion-rewards.ts` | `invasionReward` | `INVASION_REWARD` |
| `invasion-triggers.ts` | `invasionTrigger` | `INVASION_TRIGGER` |
| `invasion-win-loss.ts` | `invasionWinLoss` | `INVASION_WIN_LOSS` |
| `morale.ts` | `morale` | `MORALE` |
| `pathfinding.ts` | `pathfinding` | `PATHFINDING` |
| `production.ts` | `production` | `PRODUCTION` |
| `production-modifiers.ts` | `productionModifier` | `PRODUCTION_MODIFIER` |
| `recruitment.ts` | `recruitment` | `RECRUITMENT` |
| `reputation.ts` | `reputation` | `REPUTATION` |
| `reputation-effects.ts` | `reputationEffect` | `REPUTATION_EFFECT` |
| `resources.ts` | `resource` | `RESOURCE` |
| `rng.ts` | `rng` | `RNG` |
| `room-placement.ts` | `roomPlacement` | `ROOM_PLACEMENT` |
| `room-removal.ts` | `roomRemoval` | `ROOM_REMOVAL` |
| `room-roles.ts` | `roomRole` | `ROOM_ROLE` |
| `room-shapes.ts` | `roomShape` | `ROOM_SHAPE` |
| `room-upgrades.ts` | `roomUpgrade` | `ROOM_UPGRADE` |
| `season.ts` | `season` | `SEASON` |
| `season-bonuses.ts` | `seasonBonus` | `SEASON_BONUS` |
| `spawning-pool.ts` | `spawningPool` | `SPAWNING_POOL` |
| `state-game.ts` | `gamestate` | `GAMESTATE` |
| `state-modifiers.ts` | `stateModifier` | `STATE_MODIFIER` |
| `summoning-circle.ts` | `summoning` | `SUMMONING` |
| `synergy.ts` | `synergy` | `SYNERGY` |
| `throne-room.ts` | `throneRoom` | `THRONE_ROOM` |
| `training.ts` | `training` | `TRAINING` |
| `trap-workshop.ts` | `trapWorkshop` | `TRAP_WORKSHOP` |
| `traps.ts` | `trap` | `TRAP` |

## Victory System

- **Evaluation engine**: `victory.ts` — `victoryProcess()` called each tick in gameloop, runs day tracking every tick but full condition checks only every `VICTORY_CHECK_INTERVAL` (60) ticks
- **Condition checks**: `victory-conditions.ts` — individual check functions prefixed `victoryConditionCheck*`, dispatched by conditionId via switch in `victoryConditionEvaluateSingle()`
- **Signals**: `victoryAchievedPathId` (readonly), `victoryProgressMap` (readonly), `victoryIsAchieved` (computed)
- **Day tracking**: peaceful day counter + zero corruption day counter, both reset on violation, checked once per day transition
- **Content type**: `victorypath` in `gamedata/victorypath/paths.yml`, `VictoryPathContent` with `VictoryCondition[]`
- **State**: `VictoryProgress` on `GameStateWorld.victoryProgress` — tracks counters, defense wins, achieved path
- **Testing pattern**: mock `@helpers/victory-conditions` when testing `victory.ts` engine; mock `@helpers/content` when testing individual conditions
- **Victory screen**: `PanelVictoryComponent` modal on game-play page — auto-shows via `effect()` watching `victoryIsAchieved()`, pauses game, shows path info + conditions with progress + stats, allows Continue Playing or Return to Menu
- **Victory progress UI**: `VictoryMenuComponent` → `VictoryPathCardComponent` → `VictoryConditionRowComponent` composable hierarchy; `victoryCalculatePathCompletionPercent()` pure function for weighted % (tested); closest path highlighted via max completion %; DaisyUI `radial-progress` for per-path %; `progress` element for per-condition bars; Helipopper tooltips on condition rows with checkType-specific hints

| File | Prefix | SCREAMING |
|---|---|---|
| `victory.ts` | `victory` | `VICTORY` |
| `victory-conditions.ts` | `victoryCondition` | `VICTORY_CONDITION` |

## Merchant System

- **Content type**: `merchanttrade` in `gamedata/merchanttrade/trades.yml`, `MerchantTradeContent` with `MerchantTradeId` branded type
- **Runtime state**: `MerchantState` on `GameStateWorld.merchant` — `isPresent`, `arrivalDay`, `departureDayRemaining`, `inventory: TradeOffer[]`
- **TradeOffer**: lightweight reference `{ tradeId: MerchantTradeId, stock: number }` — look up content for display data
- **Arrival**: merchant arrives on first day of Harvest season, stays `MERCHANT_VISIT_DURATION` (3) days
- **Day tracking**: module-level `merchantLastProcessedDay` var, reset via `merchantResetLastProcessedDay()` in tests
- **Process**: `merchantProcess(state)` called each tick in gameloop — checks day transition, handles arrival/departure
- **Trade execution**: `merchantExecuteTrade(tradeId)` — pays cost via `resourcePayCost()`, grants rewards, decrements stock
- **Events**: `merchantEvent$` Subject emits `{ type: 'arrival' | 'departure' }` — subscribe in components for notifications
- **UI**: `PanelMerchantComponent` in sidebar — shows card when merchant present, opens modal with trade interface; tabs for All/Buy/Sell/Special categories

| File | Prefix | SCREAMING |
|---|---|---|
| `merchant.ts` | `merchant` | `MERCHANT` |

## Seasonal Events System

- **Content type**: `seasonalevent` in `gamedata/seasonalevent/`, `SeasonalEventContent` with `SeasonalEventId` branded type
- **Runtime state**: `SeasonalEventState` on `GameStateWorld.seasonalEvent` — `triggeredEventIds`, `activeEffects`, `pendingEvent`, `lastSeasonCycleForReset`
- **Effect types**: `resource_gain`, `resource_loss`, `production_modifier` — defined in `EventEffect` type
- **Choices**: `EventChoice` with label, description, and effects array — events with choices require player interaction
- **Day tracking**: module-level `seasonalEventLastProcessedDay` var, reset via `seasonalEventResetLastProcessedDay()` in tests
- **Process**: `seasonalEventProcess(state)` called each tick in gameloop — checks day transition, rolls 30% trigger chance, selects weighted random event
- **Cycle reset**: triggered event IDs reset when `totalSeasonCycles` advances, preventing repeat events within a season cycle
- **Production integration**: `seasonalEventGetProductionModifier(activeEffects, resourceType)` returns cumulative multiplier; passed as `activeSeasonalEffects` param to `productionCalculateTotal`/`productionCalculateSingleRoom`/`productionCalculateBreakdowns`
- **UI**: `PanelSeasonalEventComponent` — shows active effects card + modal when event pending; auto-opens via `effect()` watching `seasonalEventPending()`
- **Season process**: `seasonProcess(state)` in `season.ts` handles day advancement in gameloop (separate from `seasonAdvanceGameDay` which uses `updateGamestate`)

| File | Prefix | SCREAMING |
|---|---|---|
| `seasonal-event.ts` | `seasonalEvent` | `SEASONAL_EVENT` |

## Save System

- **SaveData wrapper**: `SaveData` type in `save.ts` (interfaces) wraps `GameState` with `formatVersion`, `savedAt`, `playtimeSeconds`, `checksum`
- **Serialize**: `saveSerialize(state?)` — deep clones gamestate, computes checksum, returns `SaveData`
- **Deserialize**: `saveDeserialize(saveData)` — calls `gamestateSet()` then `migrateGameState()`
- **Validate**: `saveValidate(data)` — checks structure (top-level + nested gameState fields), returns `{ valid, errors, warnings }`
- **Checksum**: `saveComputeChecksum(saveData)` — DJB2 hash of JSON with checksum field zeroed, returns `v1:{hash36}`; `saveVerifyChecksum(saveData)` to verify
- **Legacy parse**: `saveParseLegacy(data)` — detects raw `GameState` (no wrapper) vs `SaveData` format, wraps raw into `SaveData` for backward compatibility
- **Export**: `.grdh` files now contain `SaveData` (not raw `GameState`); import detects both formats via `saveParseLegacy`
- **Persistence**: auto-save via `signalIndexedDb` (every `debugSaveInterval` ticks); manual save via `gamestateSave()`; `gamestateFormatForSave()` is just `structuredClone`
- **Migration**: `migrateGameState()` uses `merge(defaultGameState(), state)` — fills in missing fields; explicit handlers for resources and floors

| File | Prefix | SCREAMING |
|---|---|---|
| `save.ts` | `save` | `SAVE` |

## Autosave System

- **Real-time timer**: `autosave.ts` uses `setInterval` (not game ticks) for periodic saves; `autosaveStart()` / `autosaveStop()` / `autosaveReset()` manage the timer
- **Pre-invasion**: `autosaveCheckPreInvasion(warningActive)` called from gameloop after tick; triggers save on warning false→true transition; tracks previous state via module-level variable
- **Quit save**: `autosaveInstallBeforeUnload()` / `autosaveRemoveBeforeUnload()` — registered in game-play component lifecycle
- **Error handling**: `autosaveEvent$` Subject emits `{ type: 'success' | 'error', message? }` — components subscribe and call notify; avoids importing notify directly (circular dep prevention)
- **UI indicator**: `autosaveIsSaving` signal; `AUTOSAVE_MIN_DISPLAY_MS` (1000ms) ensures indicator shows for at least 1 second
- **Options**: `autosaveEnabled` (boolean, default true) and `autosaveIntervalMinutes` (`AutosaveInterval` = 1|3|5|10, default 5) in `GameOptions`; changing settings calls `autosaveReset()` to restart timer
- **Integration**: game-play component starts timer + installs beforeunload in `ngOnInit`; cleans up via `DestroyRef.onDestroy()`; subscribes to `autosaveEvent$` with `takeUntilDestroyed`
- **Testing**: mock `@helpers/state-game`, `@helpers/state-options`, `@helpers/logging`; use `vi.useFakeTimers()` for interval tests; use `mockImplementationOnce` (not `mockImplementation`) to avoid state leaking between tests; cast mock implementations as `typeof optionsGet` to satisfy generic type

| File | Prefix | SCREAMING |
|---|---|---|
| `autosave.ts` | `autosave` | `AUTOSAVE` |

## Save Slots System

- **Types**: `SaveSlotId` = `'autosave' | 'slot-1' | 'slot-2' | 'slot-3'`; `SaveSlotMeta` stores metadata (timestamp, dungeonName, playtime, floorCount, roomCount, dayNumber, isEmpty); `SaveSlotMetaIndex` = `Record<SaveSlotId, SaveSlotMeta>`
- **Storage layer**: `save-slots-storage.ts` wraps IndexedDB with `saveSlotStorageGet/Put/Delete` — separate module for mockability
- **IndexedDB keys**: save data stored at `saveslot:{slotId}`, metadata index at `saveslot-meta`
- **Signal state**: `saveSlotMetaIndex` signal holds current meta for reactive UI; refreshed from DB via `saveSlotRefreshMeta()`
- **CRUD**: `saveSlotWrite(slotId, saveData?)` serializes current gamestate if no data provided; `saveSlotRead(slotId)` returns `SaveData | undefined`; `saveSlotDelete(slotId)` clears data + resets meta
- **Autosave integration**: `autosavePerform()` and `onBeforeUnload()` both call `saveSlotWrite('autosave')` fire-and-forget
- **UI**: `PanelSaveSlotsComponent` — standalone, OnPush, uses `swalConfirm()` helper for confirmation dialogs via dynamic `import('sweetalert2')`
- **Testing**: mock `@helpers/save-slots-storage` with in-memory `Map<string, unknown>` for IndexedDB simulation; mock `@helpers/save`, `@helpers/state-game`, `@helpers/logging`

| File | Prefix | SCREAMING |
|---|---|---|
| `save-slots.ts` | `saveSlot` | `SAVE_SLOT` |
| `save-slots-storage.ts` | `saveSlotStorage` | `SAVE_SLOT_STORAGE` |

## Save File Versioning

- **Version constant**: `SAVE_VERSION` in `save-migrations.ts` — increment when changing save format. `SAVE_FORMAT_VERSION` in `save.ts` re-exports for backward compat.
- **Migration pipeline**: `saveMigrationRun(saveData)` returns `SaveMigrationResult` with success/error/isNewerVersion; chains registered migrations sequentially from source version to `SAVE_VERSION`
- **Migration registry**: `saveMigrations` Map keyed by source version — each function transforms v(N) → v(N+1). Register new migrations with `saveMigrations.set(N, fn)`
- **Deserialize returns result**: `saveDeserialize()` returns `SaveMigrationResult` (not void) — callers must check `result.success` and `result.isNewerVersion`
- **Force load**: `saveDeserializeForceLoad(saveData)` bypasses migration for newer-version saves — loads directly via `gamestateSet` + `migrateGameState`
- **Version detection**: `saveMigrationDetectVersion(saveData)` reads `formatVersion` field; treats missing/invalid as version 1 (legacy)
- **Newer version handling**: UI shows SweetAlert confirm dialog with "Try to Load Anyway" / "Cancel" options
- **Test pattern**: mock `@helpers/save-migrations` when testing `save.ts`; mock `@helpers/logging` when testing `save-migrations.ts`; use `as unknown as Record<string, unknown>` for `GameStateWorld` casts in migration tests
- **NotificationCategory**: `'Warning'` added for `notifyWarning()` function

| File | Prefix | SCREAMING |
|---|---|---|
| `save-migrations.ts` | `saveMigration` | `SAVE_MIGRATION` |

## Camera System

- **Helper**: `camera.ts` — signal-based camera state for grid pan/zoom
- **Grid layout**: 20×64px tiles + 19×1px gaps = `CAMERA_GRID_TOTAL` (1299px)
- **Viewport wrapper**: `div.grid-viewport` wraps the grid-container in `grid.component.html`; has `overflow: hidden`
- **Transform**: `transform: translate(x, y) scale(zoom)` on `.grid-container` with `transform-origin: 0 0`
- **Zoom**: cursor-centered via inverse-transform math; effective min zoom = `min(vpWidth/gridTotal, vpHeight/gridTotal)` floored at 0.3
- **Bounds**: auto-centers grid when smaller than viewport; clamps to edges when larger
- **Drag panning**: threshold of 5px before drag activates; `wasDragging` flag prevents tile click after drag
- **Keyboard**: WASD/arrows via host bindings; checks `target.tagName` to skip when input/textarea focused; checks `uiIsAnyModalOpen()`
- **Reset**: `cameraReset()` animates via `.camera-animating` CSS class (transition 0.3s); clears via `setTimeout`
- **ResizeObserver**: tracks viewport size; cleaned up via `DestroyRef`
- **Game-play layout**: parent div uses `overflow-hidden` (not `overflow-auto`) since camera manages scrolling
- **Lint**: `AfterViewInit` and `ElementRef` from Angular core must use `type` imports when only used as type constraints

| File | Prefix | SCREAMING |
|---|---|---|
| `camera.ts` | `camera` | `CAMERA` |

## Side Tab Rail System

- **Component**: `SideTabRailComponent` in `src/app/components/side-tab-rail/` — fixed-position rail on left edge with overlay panel
- **Type**: `SideTabDefinition` in `src/app/interfaces/side-tab.ts` — id, label, condition (Signal<boolean>), isModal, templateRef
- **State**: `activePanel` signal in `GamePlayComponent` persisted via `signalLocalStorage`
- **Pattern**: each panel uses an `<ng-template #name>` in game-play.component.html, referenced via `viewChild('name', { read: TemplateRef })`
- **Conditions**: `hasRoomOfRole(role)` method checks all floors for room type existence; `merchantIsPresent` signal for merchant; `hasSelectedRoom`/`hasSelectedHallway` for contextual panels
- **Auto-open**: `effect()` in constructor watches tile selection and sets activePanel to 'room-info' or 'hallway-info'
- **Auto-close**: `effect()` in SideTabRailComponent clears activePanel when condition becomes false
- **Modal tabs**: `isModal: true` tabs emit `modalTabClick` output instead of opening overlay (Research, Fusion, Victory)
- **Z-index**: rail at z-index 30 (above PIXI canvas, below modals)

## Workflow Requirements

- **Prettier on save**: After editing any `.html` or `.ts` file, run `npx prettier --write <file>` on it before committing to ensure it conforms to codebase formatting standards.
- **Verify UI changes in browser**: After making UI changes, use the `dev-browser` skill to double-check the result visually in the browser.
- **Check for running dev server**: Before starting a local server with `npm start`, check if one is already running on `localhost:9766` (the default game port/host).
- **Window API access**: Every exported function in `src/app/helpers/` is available at runtime on the `window.api` object (e.g., `window.api.someHelperFunction()`).

## Misc Gotchas

- `Record<string, number>` properties require bracket notation in strict mode (`bonuses['attack']`)
- `GAME_TIME_TICKS_PER_MINUTE = 5` — each tick = 12 seconds game time
- Season type: `'growth' | 'harvest' | 'darkness' | 'storms'` (not spring/summer)
- `GameStateWorld` has legacy top-level `grid` — always use `floorCurrent()?.grid`
- Module-level constants must be BEFORE `@Component` decorator
- `Object.entries()` on `Partial<Record<string, number>>` returns `[string, number | undefined][]`
- Research YAML uses `prerequisiteResearchIds` key (auto-resolved by `rewriteDataIds`)
- Generic rooms only need YAML changes — placement/production/adjacency/upgrades are fully data-driven
- Vertical transport: stairs (5 ticks/floor), elevators (3), portals (0) — BFS connectivity, Dijkstra travel time
- Pathfinding uses Dijkstra (not A*) — Manhattan heuristic is inadmissible for hallway-connected rooms
- `findLastIndex` unavailable — use manual reverse loop
