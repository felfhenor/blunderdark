# PRD: Invasion Objectives System

## Introduction
Give invading parties specific objectives beyond simply fighting through the dungeon. Every invasion has a primary objective (Destroy Altar) plus 2 randomly selected secondary objectives. This adds variety to invasions, forces the player to defend multiple points of interest, and creates interesting risk/reward decisions about which objectives to prioritize defending.

## Goals
- Define a primary objective (Destroy Altar) that is always present
- Implement a pool of secondary objective types
- Randomly assign 2 secondary objectives per invasion
- Track objective completion during invasion
- Determine invasion victory/defeat based on objective outcomes

## User Stories

### US-001: Objective Data Model
**Description:** As a developer, I want an objective data model so that objectives can be defined, assigned, and tracked.

**Acceptance Criteria:**
- [ ] Create `InvasionObjective` type with fields: id, type, name, description, targetId (room/inhabitant), isPrimary, isCompleted, progress (0-100)
- [ ] Create `ObjectiveType` enum: DestroyAltar, SlayMonster, RescuePrisoner, StealTreasure, SealPortal, DefileLibrary, PlunderVault, ScoutDungeon
- [ ] Objectives are stored per invasion instance
- [ ] Types defined in `src/app/interfaces/invasion-objective.ts`
- [ ] Typecheck/lint passes

### US-002: Primary Objective - Destroy Altar
**Description:** As a developer, I want the Destroy Altar objective always assigned to invasions so that there is a consistent core threat.

**Acceptance Criteria:**
- [ ] Every invasion receives a "Destroy Altar" primary objective
- [ ] Objective is completed when invaders reach the Altar room and deal enough damage to destroy it
- [ ] Altar has a health pool for invasion purposes (e.g., 100 HP)
- [ ] If Altar is destroyed, the invasion is an immediate loss for the player regardless of other outcomes
- [ ] Unit test verifies primary objective is always present
- [ ] Typecheck/lint passes

### US-003: Secondary Objective - Slay Monster
**Description:** As a developer, I want a Slay Monster objective that targets a specific high-value inhabitant.

**Acceptance Criteria:**
- [ ] Objective targets a random inhabitant of Tier 2 or higher
- [ ] Completed when the targeted inhabitant is killed during the invasion
- [ ] Invaders prioritize moving toward the target's assigned room
- [ ] If the target is unassigned to a room, objective is automatically failed (invalid)
- [ ] Typecheck/lint passes

### US-004: Secondary Objective - Rescue Prisoner
**Description:** As a developer, I want a Rescue Prisoner objective so that invaders try to free captives.

**Acceptance Criteria:**
- [ ] Only available if the dungeon has prisoners (from previous invasions)
- [ ] Objective targets a specific prisoner
- [ ] Completed when an invader reaches the prison room and the prisoner is freed
- [ ] Freed prisoner joins the retreating invader party
- [ ] If no prisoners exist, this objective is excluded from the pool
- [ ] Typecheck/lint passes

### US-005: Secondary Objective - Steal Treasure
**Description:** As a developer, I want a Steal Treasure objective so that invaders target the dungeon's wealth.

**Acceptance Criteria:**
- [ ] Targets a Vault or treasure-containing room
- [ ] Completed when an invader reaches the Vault and loots a defined amount of gold
- [ ] Looted gold is subtracted from the player's reserves
- [ ] Only available if the dungeon has a Vault or significant gold reserves
- [ ] Typecheck/lint passes

### US-006: Secondary Objective - Seal Portal
**Description:** As a developer, I want a Seal Portal objective so that invaders try to cut off dungeon reinforcements.

**Acceptance Criteria:**
- [ ] Targets a Spawning Pool or portal room
- [ ] Completed when an invader spends 2 turns in the target room performing the seal action
- [ ] Sealed portal room cannot recruit new inhabitants for 10 game-minutes after invasion
- [ ] Only available if the dungeon has a portal-type room
- [ ] Typecheck/lint passes

### US-007: Random Objective Assignment
**Description:** As a developer, I want 2 secondary objectives randomly selected per invasion so that each invasion feels different.

**Acceptance Criteria:**
- [ ] Create `assignInvasionObjectives(state: GameState, seed: number): InvasionObjective[]` helper
- [ ] Always includes Destroy Altar as primary
- [ ] Selects 2 secondary objectives from the eligible pool
- [ ] Objectives are only eligible if their prerequisites are met (e.g., Rescue Prisoner requires prisoners)
- [ ] Seed ensures deterministic selection for the same game state
- [ ] No duplicate objective types in the same invasion
- [ ] Unit test verifies 1 primary + 2 secondary objectives
- [ ] Unit test verifies ineligible objectives are excluded
- [ ] Typecheck/lint passes

### US-008: Objective Progress Tracking
**Description:** As a developer, I want objective progress tracked during the invasion so that partial completion is visible.

**Acceptance Criteria:**
- [ ] Each objective has a progress value (0-100%)
- [ ] Progress updates as invaders move toward or interact with objective targets
- [ ] Slay Monster: progress = target HP lost percentage
- [ ] Steal Treasure: progress = gold looted / gold target
- [ ] Seal Portal: progress = turns spent / turns required
- [ ] Progress is exposed as a signal for reactive UI updates
- [ ] Typecheck/lint passes

### US-009: Objective Display UI
**Description:** As a player, I want to see the current invasion objectives so that I know what invaders are trying to accomplish.

**Acceptance Criteria:**
- [ ] An objectives panel is displayed during invasion mode
- [ ] Shows primary objective prominently at the top
- [ ] Shows 2 secondary objectives below with progress bars
- [ ] Completed objectives show a checkmark; failed show an X
- [ ] Objective targets are highlighted on the dungeon map
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-010: Victory Condition Resolution
**Description:** As a developer, I want invasion outcomes determined by objective completion so that defense is strategic.

**Acceptance Criteria:**
- [ ] If Altar is destroyed: invasion is a total defeat
- [ ] If invaders retreat or are all killed with Altar intact: invasion is a defense success
- [ ] Secondary objective completion by invaders reduces defense rewards
- [ ] Preventing all secondary objectives grants bonus rewards
- [ ] Create `resolveInvasionOutcome(objectives: InvasionObjective[]): InvasionResult` helper
- [ ] Unit test verifies all victory/defeat conditions
- [ ] Typecheck/lint passes

### US-011: Objective System Unit Tests
**Description:** As a developer, I want comprehensive tests for the objective system.

**Acceptance Criteria:**
- [ ] Test: Primary objective always assigned
- [ ] Test: Exactly 2 secondary objectives assigned
- [ ] Test: Ineligible objectives excluded
- [ ] Test: No duplicate objective types
- [ ] Test: Altar destruction = defeat
- [ ] Test: All invaders killed with Altar intact = victory
- [ ] Test: Objective progress updates correctly
- [ ] Tests placed in `src/app/helpers/invasion-objectives.spec.ts`
- [ ] All tests pass with `npm run test`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Every invasion must have exactly 1 primary objective (Destroy Altar).
- FR-2: Every invasion must have exactly 2 secondary objectives selected from the eligible pool.
- FR-3: Objective progress must be tracked and displayed during invasions.
- FR-4: Altar destruction must result in immediate invasion defeat.
- FR-5: Secondary objective completion must affect invasion rewards.

## Non-Goals (Out of Scope)
- Player-assigned counter-objectives
- Objective difficulty scaling
- Multi-invasion story arcs or quest chains
- Invader AI decision-making about which objective to pursue (handled by pathfinding)
- More than 2 secondary objectives per invasion

## Technical Considerations
- Depends on invasion trigger/win-loss system (Issue #45) for integration
- Objective types in `src/app/interfaces/invasion-objective.ts`
- Objective logic helper in `src/app/helpers/invasion-objectives.ts`
- Objective eligibility depends on current game state (rooms, prisoners, resources)
- Objective targeting requires room/inhabitant lookup from game state
- Use seeded PRNG for objective selection
- Objective display component in `src/app/components/invasion-objectives/`

## Success Metrics
- Every invasion has varied objectives
- Players adjust their defense strategy based on visible objectives
- Objective tracking is accurate and responsive
- Victory/defeat conditions are clear and consistent

## Open Questions
- Should players receive advance warning about invasion objectives?
- Can invaders switch to a different secondary objective if the first becomes impossible?
- Should secondary objective difficulty scale with dungeon level?
- Are there rare/legendary objectives for special invasion events?
