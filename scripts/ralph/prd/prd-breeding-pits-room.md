# PRD: Breeding Pits Room

## Introduction
The Breeding Pits is a 3x3 room dedicated to creating hybrid creatures and running mutation experiments. It serves as the dungeon's biological research lab, producing new creature variants by combining existing inhabitants. The room has high fear, supports 4 inhabitants (upgradeable to 6), and benefits from adjacency to Spawning Pool, corruption sources, and Library rooms.

## Goals
- Define the Breeding Pits as a 3x3 square room
- Implement hybrid creature creation from pairs of inhabitants
- Support mutation experimentation on single inhabitants
- Support 4 inhabitants (upgradeable to 6)
- Apply high fear level
- Define adjacency bonuses for Spawning Pool, corruption sources, and Library

## User Stories

### US-001: Breeding Pits YAML Definition
**Description:** As a developer, I want the Breeding Pits defined in YAML gamedata.

**Acceptance Criteria:**
- [ ] A `breeding-pits.yaml` file exists in `gamedata/rooms/`
- [ ] Fields include: id, name, description, shape (3x3 square), fearLevel (high, value 4), maxInhabitants (4), upgradeMaxInhabitants (6), sprite reference
- [ ] Room type tag includes: "biological", "corruption"
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-002: Hybrid Creature Creation
**Description:** As a player, I want to combine two inhabitants to create a hybrid so that I can produce unique defenders.

**Acceptance Criteria:**
- [ ] A "Create Hybrid" action is available in the Breeding Pits
- [ ] Player selects two inhabitants currently assigned to the room
- [ ] Hybrid creation consumes both parent inhabitants
- [ ] The resulting hybrid has stats derived from both parents (average + bonus)
- [ ] Hybrid creature receives one trait from each parent
- [ ] Hybrid recipes are defined in YAML (which combinations produce which results)
- [ ] Creation takes time (5 game-minutes)
- [ ] Typecheck/lint passes

### US-003: Hybrid Recipe Data
**Description:** As a developer, I want hybrid recipes defined in YAML so that combinations are data-driven.

**Acceptance Criteria:**
- [ ] A `hybrid-recipes.yaml` file defines valid creature combinations
- [ ] Each recipe specifies: parent1Type, parent2Type, resultType, statBonuses, inheritedTraits
- [ ] Invalid combinations (no recipe) are rejected with a message
- [ ] At least 5 hybrid recipes are defined
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-004: Mutation Experimentation
**Description:** As a player, I want to mutate a single inhabitant for random stat changes so that I can gamble on improvements.

**Acceptance Criteria:**
- [ ] A "Mutate" action is available in the Breeding Pits
- [ ] Player selects one inhabitant assigned to the room
- [ ] Mutation has 3 possible outcomes: positive (60%), neutral (25%), negative (15%)
- [ ] Positive: +20% to a random stat
- [ ] Neutral: no change, but a cosmetic mutation (flavor text)
- [ ] Negative: -15% to a random stat
- [ ] Mutation takes 3 game-minutes
- [ ] Each inhabitant can only be mutated once (prevents grinding)
- [ ] Typecheck/lint passes

### US-005: Mutation Result Display
**Description:** As a player, I want to see mutation results clearly so that I understand the outcome.

**Acceptance Criteria:**
- [ ] After mutation completes, a result popup shows: outcome (positive/neutral/negative), stat changed, old value, new value
- [ ] Mutated inhabitants have a visual indicator (mutation icon)
- [ ] Mutation history is stored on the inhabitant instance
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-006: Inhabitant Capacity and Upgrade
**Description:** As a player, I want to upgrade the Breeding Pits to hold 6 inhabitants for more experiments.

**Acceptance Criteria:**
- [ ] Base max inhabitants: 4
- [ ] Level 2 upgrade increases max inhabitants to 6
- [ ] Upgrade has a defined resource cost
- [ ] More inhabitants increases hybrid creation and mutation speed
- [ ] Room upgrade integrates with the existing room upgrade system
- [ ] Typecheck/lint passes

### US-007: High Fear Level
**Description:** As a developer, I want the Breeding Pits to have high fear for fear propagation.

**Acceptance Criteria:**
- [ ] Fear level is set to 4 (high) in the YAML definition
- [ ] Fear integrates with the fear propagation system
- [ ] Fear is applied to adjacent hallways and rooms
- [ ] Typecheck/lint passes

### US-008: Adjacency Bonus - Spawning Pool
**Description:** As a developer, I want the Breeding Pits to benefit from Spawning Pool adjacency.

**Acceptance Criteria:**
- [ ] When adjacent to a Spawning Pool, hybrid creation time is reduced by 25%
- [ ] Adjacency is detected using the existing adjacency system
- [ ] Bonus is recalculated when rooms are added or removed
- [ ] Unit test verifies time reduction
- [ ] Typecheck/lint passes

### US-009: Adjacency Bonus - Corruption Source
**Description:** As a developer, I want corruption adjacency to improve mutation outcomes.

**Acceptance Criteria:**
- [ ] When adjacent to a corruption-generating room, positive mutation chance increases from 60% to 70%
- [ ] Negative mutation chance decreases from 15% to 10%
- [ ] Adjacency is detected using the existing adjacency system
- [ ] Unit test verifies modified probabilities
- [ ] Typecheck/lint passes

### US-010: Adjacency Bonus - Library
**Description:** As a developer, I want Library adjacency to grant bonus research from experiments.

**Acceptance Criteria:**
- [ ] When adjacent to a Library (Shadow Library or similar), each mutation grants +5 research points
- [ ] Hybrid creation grants +10 research points with Library adjacency
- [ ] Adjacency is detected using the existing adjacency system
- [ ] Unit test verifies research point grants
- [ ] Typecheck/lint passes

### US-011: Breeding Pits UI
**Description:** As a player, I want a clear UI for the Breeding Pits showing available actions.

**Acceptance Criteria:**
- [ ] Clicking the Breeding Pits shows: current inhabitants, available actions (Create Hybrid, Mutate)
- [ ] Hybrid creation shows valid combinations from assigned inhabitants
- [ ] Invalid combinations are grayed out with a tooltip explaining why
- [ ] Active experiments show a progress bar and time remaining
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-012: Breeding Pits Unit Tests
**Description:** As a developer, I want comprehensive tests for the Breeding Pits mechanics.

**Acceptance Criteria:**
- [ ] Test: Hybrid creation consumes both parents
- [ ] Test: Hybrid stats are correctly calculated from parents
- [ ] Test: Invalid hybrid combination is rejected
- [ ] Test: Mutation positive/neutral/negative rates match expectations
- [ ] Test: Each inhabitant can only be mutated once
- [ ] Test: Spawning Pool adjacency reduces hybrid time by 25%
- [ ] Test: Corruption adjacency modifies mutation probabilities
- [ ] Test: Library adjacency grants research points
- [ ] Tests placed in `src/app/helpers/rooms/breeding-pits.spec.ts`
- [ ] All tests pass with `npm run test`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The Breeding Pits must be a 3x3 square room with high fear.
- FR-2: Hybrid creature creation must consume two parent inhabitants and produce one hybrid.
- FR-3: Mutation must have weighted random outcomes (60% positive, 25% neutral, 15% negative).
- FR-4: The room must support 4 inhabitants, upgradeable to 6.
- FR-5: Adjacency bonuses must apply for Spawning Pool, corruption sources, and Library.

## Non-Goals (Out of Scope)
- Cross-species hybrid evolution chains
- Mutation reversal or curing
- Breeding Pits defense capabilities during invasions
- Visual creature appearance changes from mutations
- Automated/queued breeding operations

## Technical Considerations
- Depends on room shape system (Issue #3) for 3x3 placement
- Depends on room data structure (Issue #5) for room definition
- Depends on corruption system (Issue #54) for corruption adjacency detection
- Hybrid recipes in `gamedata/rooms/hybrid-recipes.yaml`
- Breeding logic helper in `src/app/helpers/rooms/breeding-pits.ts`
- Mutation state stored on inhabitant instances in game state
- Use seeded RNG for mutation outcome testing
- Hybrid stat calculation: `(parent1Stat + parent2Stat) / 2 + bonus`

## Success Metrics
- Hybrid creation produces valid creatures with correct stats
- Mutation outcomes follow defined probability distributions
- Adjacency bonuses apply correctly
- Players engage with the breeding system as a meaningful progression mechanic

## Open Questions
- How many hybrid recipes should exist at launch?
- Can hybrids themselves be used as parents for further hybridization?
- Should mutation outcomes be previewed before committing?
- Does the Breeding Pits have a corruption generation rate of its own?
