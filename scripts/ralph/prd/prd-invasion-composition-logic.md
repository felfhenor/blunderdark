# PRD: Invasion Composition Logic

## Introduction
Implement the logic that determines which invader types appear in each invasion and how many. The composition of invading parties should respond to the player's dungeon profile -- a dungeon dripping with corruption attracts Paladins and Clerics, while a treasure-heavy dungeon draws Rogues and Thieves. This creates a feedback loop where the player's strategic choices influence the threats they face.

## Goals
- Map dungeon profile attributes (Corruption, Wealth, Knowledge) to invader class weightings
- Scale party size (3-15 invaders) based on dungeon size and threat level
- Ensure balanced dungeons receive mixed parties
- Make composition deterministic given the same dungeon state (for reproducibility)
- Provide a composition preview so players can anticipate invasions

## User Stories

### US-001: Dungeon Profile Calculation
**Description:** As a developer, I want a function that calculates the dungeon's profile from its current state so that invasion composition can be derived.

**Acceptance Criteria:**
- [ ] Create `calculateDungeonProfile(state: GameState): DungeonProfile` in helpers
- [ ] DungeonProfile includes: corruption (0-100), wealth (0-100), knowledge (0-100), size (room count), threatLevel (derived aggregate)
- [ ] Corruption is derived from corruption-generating rooms and inhabitants
- [ ] Wealth is derived from treasure rooms, vaults, and gold reserves
- [ ] Knowledge is derived from libraries, research rooms, and completed research
- [ ] Function is pure for testability
- [ ] Typecheck/lint passes

### US-002: Invader Weight Mapping
**Description:** As a developer, I want a mapping from dungeon profile to invader class weights so that composition reflects dungeon characteristics.

**Acceptance Criteria:**
- [ ] High Corruption (>60): Paladin weight +3, Cleric weight +2
- [ ] High Wealth (>60): Rogue weight +3, Warrior weight +1
- [ ] High Knowledge (>60): Mage weight +3, Ranger weight +1
- [ ] Balanced profile (all <40): Equal weights for all classes
- [ ] Weights are defined in YAML configuration for easy tuning
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-003: Party Size Scaling
**Description:** As a developer, I want party size to scale with dungeon size so that larger dungeons face bigger threats.

**Acceptance Criteria:**
- [ ] Minimum party size: 3 invaders
- [ ] Maximum party size: 15 invaders
- [ ] Party size formula factors in: room count, floor count, threat level
- [ ] Small dungeon (1-10 rooms): 3-5 invaders
- [ ] Medium dungeon (11-25 rooms): 6-10 invaders
- [ ] Large dungeon (26+ rooms): 11-15 invaders
- [ ] Unit tests verify scaling at boundary values
- [ ] Typecheck/lint passes

### US-004: Composition Generation Function
**Description:** As a developer, I want a function that generates a specific invader party from weights and size so that each invasion is composed correctly.

**Acceptance Criteria:**
- [ ] Create `generateInvasionParty(profile: DungeonProfile, seed: number): InvaderInstance[]` in helpers
- [ ] Uses weighted random selection based on profile-derived weights
- [ ] Seed parameter ensures deterministic output for the same inputs
- [ ] Generated party always includes at least one Warrior (party needs a frontliner)
- [ ] No single class exceeds 50% of the party
- [ ] Returns fully instantiated InvaderInstance objects with max HP
- [ ] Typecheck/lint passes

### US-005: Balanced Dungeon Mixed Party
**Description:** As a developer, I want balanced dungeons to receive mixed parties so that no single defense strategy always works.

**Acceptance Criteria:**
- [ ] When all profile attributes are below 40, weights are equal for all classes
- [ ] Mixed parties contain at least 3 different invader classes
- [ ] Unit test verifies that balanced profiles produce diverse parties
- [ ] Typecheck/lint passes

### US-006: Composition Preview Signal
**Description:** As a player, I want to see a preview of the likely invasion composition so that I can prepare defenses.

**Acceptance Criteria:**
- [ ] A `computed()` signal derives the likely next invasion composition from current dungeon profile
- [ ] Preview shows class distribution as percentages or counts
- [ ] Preview updates reactively when dungeon profile changes (rooms built, research completed)
- [ ] Typecheck/lint passes

### US-007: Composition Preview UI
**Description:** As a player, I want a UI element showing the invasion forecast so that I can plan my defenses.

**Acceptance Criteria:**
- [ ] A component displays the invasion composition preview
- [ ] Shows icons and counts for each expected invader class
- [ ] Includes total party size estimate
- [ ] Uses OnPush change detection
- [ ] Component uses Angular Signals for reactivity
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-008: Composition Unit Tests
**Description:** As a developer, I want comprehensive tests for the composition logic.

**Acceptance Criteria:**
- [ ] Test: High corruption profile produces >40% Paladin+Cleric
- [ ] Test: High wealth profile produces >40% Rogue
- [ ] Test: High knowledge profile produces >40% Mage
- [ ] Test: Balanced profile produces at least 3 different classes
- [ ] Test: Party size respects min (3) and max (15) bounds
- [ ] Test: Same seed produces identical parties
- [ ] Test: No single class exceeds 50% of party
- [ ] Tests placed in `src/app/helpers/invasion-composition.spec.ts`
- [ ] All tests pass with `npm run test`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must calculate a dungeon profile from current game state.
- FR-2: Invader class weights must be derived from the dungeon profile.
- FR-3: Party size must scale between 3 and 15 based on dungeon size.
- FR-4: Composition must be seeded for deterministic generation.
- FR-5: Players must be able to preview the expected invasion composition.

## Non-Goals (Out of Scope)
- Named/boss invaders with unique identities
- Invasion scheduling or timing logic (handled by Issue #45)
- Multi-wave invasions within a single event
- Player influence on invasion composition (e.g., lures or deterrents)

## Technical Considerations
- Depends on Dungeon Profile/Reputation (Issue #44, #54) for profile data
- Depends on Multiple Invader Types (Issue #81) for invader class definitions
- Profile calculation should be a `computed()` signal in the game state service
- Weight configuration in `gamedata/invasion/composition-weights.yaml`
- Composition helper in `src/app/helpers/invasion-composition.ts`
- Use a seeded PRNG (e.g., `mulberry32`) for deterministic composition
- Types in `src/app/interfaces/invasion.ts`

## Success Metrics
- Invasion composition visibly responds to dungeon profile changes
- Party size scales appropriately with dungeon growth
- Players report feeling that invasions are tailored to their dungeon
- All composition tests pass

## Open Questions
- Should there be a minimum threat level before composition weighting kicks in?
- How frequently should the composition preview update (every tick, on dungeon change)?
- Should the player be able to see exact invader stats in the preview or just class counts?
- Does party size factor in the player's total defender strength for balance?
