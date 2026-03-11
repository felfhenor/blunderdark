# PRD: New Secondary Invasion Objectives

## Introduction

The invasion system currently has 7 secondary objective types that invaders can pursue alongside their primary goal of destroying the altar. This feature adds 10 new secondary objective types to create more strategic variety, force diverse defensive investment, and introduce cross-invasion consequences. Each new objective targets different rooms, creatures, or dungeon milestones, and steals thematically appropriate resources on completion. Two objectives introduce novel post-invasion effects: a food production debuff (PoisonSupply) and invasion schedule acceleration (PlantBeacon).

Additionally, the existing flat per-objective penalty (+10 crystals, +5 essence) is replaced with a diversified per-type penalty map so that every objective type steals thematically relevant resources.

## Goals

- Add 10 new secondary objective types covering crafting rooms, production rooms, high-tier creatures, survival challenges, dungeon penetration, and cross-invasion effects
- Diversify all per-objective defeat penalties (existing + new) so each type steals thematically appropriate resources
- Introduce an InvasionDebuff system for post-invasion effects that persist across game ticks
- Create strategic tension around room placement: more rooms = more potential objective targets
- Ensure new objectives integrate cleanly with existing pathfinding, special invasion types, and the altar debuff system

## User Stories

### US-001: Add new ObjectiveType values and templates
**Description:** As a developer, I need the 10 new objective types defined in the type system and template registry so they can be assigned to invasions.

**Acceptance Criteria:**
- [ ] `ObjectiveType` union in `invasion-objective.ts` includes: `SabotageForge`, `DisruptBreeding`, `BanishSummons`, `PurifyShrine`, `PoisonSupply`, `AssassinateCommander`, `SurviveNTurns`, `ReachDepth`, `PlantBeacon`, `StealBlueprints`
- [ ] Each type has a corresponding entry in `SECONDARY_OBJECTIVE_TEMPLATES` with name, description, `isEligible`, and `getTargetId`
- [ ] Typecheck/lint passes

### US-002: Room-targeted objectives (SabotageForge, DisruptBreeding, BanishSummons, PurifyShrine, PoisonSupply, StealBlueprints)
**Description:** As a player, I want invaders to target my crafting and production rooms so I have to consider room placement defensively.

**Acceptance Criteria:**
- [ ] Dark Forge YAML has `objectiveTypes: [SabotageForge]`
- [ ] Breeding Pits YAML has `objectiveTypes: [DisruptBreeding]`
- [ ] Summoning Circle YAML has `objectiveTypes: [BanishSummons]`
- [ ] Soul Well YAML has `objectiveTypes: [SealPortal, PurifyShrine]`
- [ ] Mushroom Grove YAML has `objectiveTypes: [PoisonSupply]`
- [ ] Underground Lake YAML has `objectiveTypes: [PoisonSupply]`
- [ ] Shadow Library YAML has `objectiveTypes: [DefileLibrary, StealBlueprints]`
- [ ] Each objective is eligible only when its target room exists in the dungeon
- [ ] Each objective's `getTargetId` returns the placed room ID
- [ ] Completing these objectives triggers the standard altar debuff (-15% max HP)
- [ ] Typecheck/lint passes

### US-003: AssassinateCommander objective
**Description:** As a player, I want invaders to sometimes target my strongest (T4+) creatures specifically, creating a reason to protect high-tier inhabitants.

**Acceptance Criteria:**
- [ ] `AssassinateCommander` is eligible only when a T4+ inhabitant exists in the dungeon
- [ ] `getTargetId` returns the instanceId of a T4+ inhabitant
- [ ] Objective completes when the targeted defender is killed during combat (not just when a room is cleared)
- [ ] Progress tracks the target's HP loss percentage (reuses `invasionObjectiveCalculateSlayMonsterProgress`)
- [ ] Completing triggers altar debuff and battle log entry
- [ ] Typecheck/lint passes

### US-004: SurviveNTurns objective
**Description:** As a player, I want an objective that can't be solved by room layout alone - invaders just need to survive long enough, forcing me to invest in combat strength.

**Acceptance Criteria:**
- [ ] `SurviveNTurns` is eligible only when the invasion path has 10+ rooms (a veritable gauntlet)
- [ ] Target turn count is 50 (out of 60 max turns) - exported as `INVASION_OBJECTIVE_SURVIVE_N_TURNS_TARGET`
- [ ] Progress auto-increments each invasion tick: `progress = (currentTurn / 50) * 100`
- [ ] No room target (`targetId` is undefined)
- [ ] Completing triggers altar debuff and battle log entry
- [ ] New progress helper: `invasionObjectiveCalculateSurviveNTurnsProgress(currentTurn, targetTurns)`
- [ ] Typecheck/lint passes

### US-005: ReachDepth objective
**Description:** As a player, I want invaders to have a penetration-depth objective that rewards deep, narrow dungeon layouts being risky.

**Acceptance Criteria:**
- [ ] `ReachDepth` is eligible only when the dungeon has 5+ floors
- [ ] At invasion start, after path is computed, `targetId` is set dynamically to the room at 75% of path length
- [ ] Objective completes via the existing room-clear check (targetId matches a room on the path)
- [ ] Completing triggers altar debuff and battle log entry
- [ ] New progress helper: `invasionObjectiveCalculateReachDepthProgress(currentRoomIndex, targetRoomIndex)`
- [ ] Typecheck/lint passes

### US-006: PlantBeacon objective
**Description:** As a player, I want a cross-invasion consequence objective where invaders plant a beacon that makes the next invasion arrive sooner if I fail to stop them.

**Acceptance Criteria:**
- [ ] `PlantBeacon` is eligible only when the dungeon has 5+ floors
- [ ] At invasion start, `targetId` is set dynamically to the room at 60% of path length
- [ ] Objective completes via the existing room-clear check
- [ ] On defeat with PlantBeacon completed: next scheduled invasion day is reduced by 30% of remaining days
- [ ] The schedule reduction is applied in `invasionRewardApplyDefeat` after standard penalties
- [ ] If next invasion day is undefined, beacon has no schedule effect
- [ ] Completing triggers altar debuff and battle log entry
- [ ] Typecheck/lint passes

### US-007: Diversified per-objective currency penalties
**Description:** As a player, I want each completed objective to steal thematically appropriate resources instead of a flat crystals + essence amount, so different objectives have different strategic weight.

**Acceptance Criteria:**
- [ ] New `OBJECTIVE_PENALTY_MAP` maps every `ObjectiveType` to a `Partial<Record<ResourceType, number>>`
- [ ] Penalty values per type:
  - SabotageForge: 15 crystals, 10 gold
  - DisruptBreeding: 15 essence, 5 food
  - BanishSummons: 15 flux, 5 essence
  - PurifyShrine: 10 corruption, 10 essence
  - PoisonSupply: 20 food
  - StealBlueprints: 15 research, 5 crystals
  - AssassinateCommander: 10 essence, 10 gold
  - SurviveNTurns: 10 crystals, 10 gold
  - ReachDepth: 15 gold, 5 crystals
  - PlantBeacon: 5 crystals
  - StealTreasure: 15 gold, 5 crystals
  - DefileLibrary: 10 research, 5 essence
  - SealPortal: 10 flux, 5 essence
  - PlunderVault: 20 gold
  - SlayMonster: 10 crystals, 5 essence
  - RescuePrisoner: 5 crystals, 5 essence
  - ScoutDungeon: 5 crystals
- [ ] `DetailedInvasionResult` gains a `completedObjectiveTypes: ObjectiveType[]` field
- [ ] `invasionRewardCalculateDefensePenalties` uses the per-type map instead of flat values
- [ ] Old flat penalty code (`+10 crystals, +5 essence per objective`) is removed
- [ ] Typecheck/lint passes

### US-008: PoisonSupply post-invasion food production debuff
**Description:** As a player, I want PoisonSupply to have a lasting effect - reducing my food production for several days after the invasion - creating meaningful post-invasion recovery pressure.

**Acceptance Criteria:**
- [ ] New `InvasionDebuff` type: `{ type: 'food_production_penalty'; multiplier: number; expiresOnDay: number }`
- [ ] `GameStateWorld` gains an `invasionDebuff: InvasionDebuff | undefined` field (default `undefined`; max 1 active debuff)
- [ ] On defeat with PoisonSupply completed: set the debuff to `multiplier: 0.5` (50% reduction) and `expiresOnDay: currentDay + 10`, replacing any existing debuff
- [ ] The debuff applies dungeon-wide to ALL food production (all food-producing rooms)
- [ ] Production calculation in `production.ts` checks active debuffs and applies the food multiplier
- [ ] Expired debuffs are cleaned up daily in the game loop (same pattern as threat decay)
- [ ] Save migration v4->v5 adds `invasionDebuffs: []` to existing saves
- [ ] Typecheck/lint passes

### US-009: Update special invasion paired objectives
**Description:** As a developer, I need the special invasion configs to include new objective types where thematically appropriate.

**Acceptance Criteria:**
- [ ] `raid.pairedObjectives` includes `'PoisonSupply'`: `['StealTreasure', 'PlunderVault', 'PoisonSupply']`
- [ ] `bounty_hunter.pairedObjectives` includes `'AssassinateCommander'`: `['SlayMonster', 'AssassinateCommander']`
- [ ] `shadow_rift.pairedObjectives` includes `'BanishSummons'`: `['SealPortal', 'DefileLibrary', 'BanishSummons']`
- [ ] `crusade.pairedObjectives` includes `'PurifyShrine'`: `['SealPortal', 'DefileLibrary', 'PurifyShrine']`
- [ ] Typecheck/lint passes

### US-010: Tests for new objectives
**Description:** As a developer, I need comprehensive tests for all new objective types to prevent regressions.

**Acceptance Criteria:**
- [ ] Test that each new room-targeted objective is eligible only when its room exists
- [ ] Test that each new room-targeted objective is ineligible when its room is absent
- [ ] Test AssassinateCommander eligible only with T4+ inhabitants, not T3 or below
- [ ] Test SurviveNTurns eligible only with 10+ rooms on path (mock via state)
- [ ] Test ReachDepth and PlantBeacon eligible only with 5+ floors
- [ ] Test `invasionObjectiveCalculateSurviveNTurnsProgress` returns correct percentages
- [ ] Test `invasionObjectiveCalculateReachDepthProgress` returns correct percentages
- [ ] Test diversified penalty map produces correct per-type resource losses
- [ ] Test that existing objective types still produce correct penalties
- [ ] All existing tests continue to pass
- [ ] Typecheck/lint passes

## Functional Requirements

- FR-1: Add 10 new values to the `ObjectiveType` union type
- FR-2: Add 10 new entries to `SECONDARY_OBJECTIVE_TEMPLATES` with eligibility checks and target resolution
- FR-3: Add `objectiveTypes` arrays to 7 room YAML definitions (Dark Forge, Breeding Pits, Summoning Circle, Soul Well, Mushroom Grove, Underground Lake, Shadow Library)
- FR-4: `AssassinateCommander` eligibility requires at least one T4+ inhabitant; `getTargetId` returns the first T4+ inhabitant's instanceId
- FR-5: `SurviveNTurns` eligibility requires 10+ rooms on the invasion path; progress auto-increments per tick toward target of 50 turns
- FR-6: `ReachDepth` eligibility requires 5+ dungeon floors; `targetId` set dynamically at invasion start to the room at 75% of path length
- FR-7: `PlantBeacon` eligibility requires 5+ dungeon floors; `targetId` set dynamically at invasion start to the room at 60% of path length
- FR-8: On defeat, completed PlantBeacon reduces `nextInvasionDay` by 30% of remaining days until next scheduled invasion; this effect is shown in the invasion results screen
- FR-9: On defeat, completed PoisonSupply sets the single `InvasionDebuff` on `GameStateWorld.invasionDebuffs` with 50% food production penalty lasting 10 days (replaces any existing debuff; max 1 active debuff at a time)
- FR-10: Active food production debuffs apply dungeon-wide to all food-producing rooms in `productionCalculateTotal`
- FR-11: Expired debuffs are cleaned up once per day in the game loop
- FR-12: `OBJECTIVE_PENALTY_MAP` replaces the flat +10 crystals / +5 essence penalty with per-type resource losses for ALL objective types (existing and new)
- FR-13: `DetailedInvasionResult` includes `completedObjectiveTypes: ObjectiveType[]` populated from completed secondary objectives
- FR-14: Special invasion configs update `pairedObjectives` to include thematic new types
- FR-15: `AssassinateCommander` objective completion check runs when a defender is killed during combat, not just on room clear
- FR-16: `SurviveNTurns` progress check runs each invasion tick, applying altar debuff when the threshold is reached
- FR-17: Save migration v4->v5 initializes `invasionDebuffs: []` on existing saves
- FR-18: `ReachDepth` and `PlantBeacon` dynamic targetId assignment happens after path computation during invasion start, before objectives are finalized

## Non-Goals

- No UI changes to the invasion warning panel or battle log (existing UI displays new objectives automatically via the existing objective rendering)
- No new special invasion types (only updating existing pairedObjectives)
- No changes to the altar debuff amount per objective (stays at 15%)
- No changes to the primary DestroyAltar objective
- No changes to pathfinding logic (ReachDepth/PlantBeacon use existing room-clear completion)
- Maximum 1 active invasion debuff at a time; a new debuff replaces any existing one (no stacking)
- No visual indicator for active invasion debuffs in the UI (can be added later)
- PoisonSupply debuff does NOT apply on victory - only on defeat
- Battle results screen shows total resource losses, not per-objective breakdown (for now)

## Technical Considerations

- **Room-based objectives** leverage the existing `objectiveTypes` field on `RoomContent` and the data-driven `invasionObjectiveGetTypeMap()` cache. Adding new types to room YAML is sufficient; no code changes needed for room-target resolution.
- **SurviveNTurns** requires a new code path in the invasion tick loop since it has no room target and auto-progresses. Must check every tick, not just on room clear.
- **ReachDepth and PlantBeacon** need their `targetId` set dynamically after the invasion path is computed. This is a new pattern - current objectives have static targets from game state. The assignment must happen in the invasion start function after pathfinding.
- **AssassinateCommander** needs a kill-check hook in the combat resolution section of `invasion-process.ts`, similar to how SlayMonster would track HP but triggering on defender death.
- **SurviveNTurns eligibility** depends on the invasion path length (10+ rooms), which is not available during `invasionObjectiveAssign` since the path hasn't been computed yet. Two options: (a) use floor count as a proxy (e.g., 3+ floors likely means 10+ rooms), or (b) assign objectives after path computation and filter out ineligible ones. Option (b) is cleaner but requires restructuring the invasion start sequence. Option (a) is simpler - use a heuristic like `total placed rooms across all floors >= 10`. The implementation should decide which approach fits best.
- **InvasionDebuff system** is intentionally minimal - a single debuff slot (max 1 active) with a typed debuff object and expiry day. A new debuff replaces any existing one. The active debuff acts as a soft cooldown on invasions - ideally no invasion should arrive while a debuff is active, though this is not a hard constraint. Can be extended later for other debuff types beyond food production.
- **Save migration** follows the existing pattern: increment `SAVE_VERSION` to 5, add a v4->v5 migration that sets `invasionDebuffs: []` on `world`.
- **Production debuff application** should happen in `productionCalculateTotal` as a late-stage multiplier on food output, after all other bonuses/modifiers are calculated.

## Success Metrics

- All 10 new objective types appear correctly in invasions when their eligibility conditions are met
- Per-type penalties produce thematically distinct resource losses
- PoisonSupply debuff visibly reduces food production for 10 days post-defeat
- PlantBeacon visibly accelerates the next invasion schedule post-defeat
- All existing tests pass without modification (or with minimal mock updates)
- New tests cover all 10 objective types' eligibility and progress calculations
- Lint, typecheck, and build pass cleanly

## Resolved Questions

- **Max debuffs:** Maximum 1 active debuff at a time. New debuffs replace existing ones. Acts as a soft cooldown - ideally no invasion arrives while a debuff is active.
- **Resource display:** Show total resource losses only for now, not per-objective breakdown.
- **SurviveNTurns near-miss:** If all invaders die on turn 49, the objective is prevented. They did not succeed.
- **PlantBeacon visibility:** Yes, the schedule acceleration effect is shown in the invasion results screen.
