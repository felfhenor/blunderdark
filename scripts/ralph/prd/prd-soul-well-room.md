# PRD: Soul Well Room

## Introduction
The Soul Well is a Tier 1 advanced room with dual functionality: it either produces 1 Skeleton every 3 minutes OR converts Corruption into Essence. It uses a 3x3 square footprint, supports 2 inhabitants (upgradeable to 3), and has a high base fear level. It spreads Corruption to adjacent rooms and has unique synergy effects.

## Goals
- Implement a 3x3 Soul Well room with dual production modes
- Produce 1 Skeleton every 3 minutes OR convert Corruption to Essence
- Support 2 inhabitants with upgradeable capacity to 3
- Implement high fear level and Corruption spread mechanics
- Implement 2 distinct upgrade paths

## User Stories

### US-001: Soul Well Room Definition
**Description:** As a developer, I want the Soul Well defined in YAML gamedata.

**Acceptance Criteria:**
- [ ] A `soul-well.yaml` file exists in the appropriate `gamedata/` directory
- [ ] Fields include: id, name, description, shape (3x3), productionModes, maxInhabitants, baseFearLevel, upgradePaths, adjacencyEffects
- [ ] The YAML compiles to valid JSON via `npm run gamedata:build`
- [ ] Typecheck/lint passes

### US-002: 3x3 Room Placement
**Description:** As a dungeon builder, I want to place the Soul Well as a 3x3 square on the grid.

**Acceptance Criteria:**
- [ ] The Soul Well occupies a 3x3 square of tiles (9 tiles total)
- [ ] Placement validates all 9 tiles are unoccupied
- [ ] Renders correctly on the grid with the Soul Well sprite
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Skeleton Production Mode
**Description:** As a dungeon builder, I want the Soul Well to produce Skeletons periodically so that I can grow my undead workforce.

**Acceptance Criteria:**
- [ ] In Skeleton mode, produces 1 Skeleton every 3 minutes
- [ ] Skeleton is created as a full inhabitant entity with undead type
- [ ] A countdown timer is visible on the room
- [ ] Skeletons appear in the unassigned inhabitant pool
- [ ] Typecheck/lint passes

### US-004: Corruption-to-Essence Conversion Mode
**Description:** As a dungeon builder, I want the Soul Well to convert Corruption into Essence as an alternative production mode.

**Acceptance Criteria:**
- [ ] In Conversion mode, consumes Corruption resource and produces Essence
- [ ] Conversion rate is defined in gamedata (e.g., 10 Corruption = 1 Essence per min)
- [ ] Mode requires at least 1 inhabitant assigned
- [ ] If Corruption runs out, conversion pauses
- [ ] Typecheck/lint passes

### US-005: Production Mode Toggle
**Description:** As a dungeon builder, I want to switch between Skeleton and Conversion modes so that I can adapt to my current needs.

**Acceptance Criteria:**
- [ ] The room UI shows the current mode and a toggle button
- [ ] Switching modes resets any in-progress timer/conversion
- [ ] Only one mode is active at a time
- [ ] Mode persists across save/load
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-006: High Fear Level
**Description:** As a developer, I want the Soul Well to have high base fear reflecting its dark nature.

**Acceptance Criteria:**
- [ ] Base fear level is High (3)
- [ ] Fear affects inhabitant willingness to work nearby
- [ ] Fear propagates to adjacent rooms via the fear propagation system
- [ ] Typecheck/lint passes

### US-007: Corruption Spread Effect
**Description:** As the system, I want the Soul Well to spread Corruption to adjacent rooms.

**Acceptance Criteria:**
- [ ] Adjacent rooms gain a Corruption modifier when the Soul Well is active
- [ ] Corruption spread amount is defined in gamedata
- [ ] Spread updates when the Soul Well is placed or removed
- [ ] Some rooms may benefit from Corruption (synergy)
- [ ] Typecheck/lint passes

### US-008: Upgrade Path 1 - Necrotic Enhancement
**Description:** As a dungeon builder, I want an upgrade that improves Skeleton production.

**Acceptance Criteria:**
- [ ] Upgrade reduces Skeleton spawn time (e.g., 3 min to 2 min)
- [ ] May also increase inhabitant capacity from 2 to 3
- [ ] Mutually exclusive with other path
- [ ] Typecheck/lint passes

### US-009: Upgrade Path 2 - Essence Mastery
**Description:** As a dungeon builder, I want an upgrade that improves Corruption-to-Essence conversion.

**Acceptance Criteria:**
- [ ] Upgrade increases conversion rate or efficiency
- [ ] May reduce Corruption spread as a side effect
- [ ] Mutually exclusive with other path
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The Soul Well must be defined in YAML gamedata with dual production modes.
- FR-2: The room must use a 3x3 square layout.
- FR-3: Skeleton mode: 1 Skeleton every 3 minutes; Conversion mode: Corruption to Essence.
- FR-4: Player must be able to toggle between modes.
- FR-5: High base fear level (3) with Corruption spread to adjacent rooms.
- FR-6: Two mutually exclusive upgrade paths.

## Non-Goals (Out of Scope)
- Skeleton combat abilities
- Corruption as a global mechanic (only local spread here)
- Essence spending mechanics
- Advanced undead types beyond basic Skeleton

## Technical Considerations
- Depends on room shape system (Issue #3), room data structure (Issue #5), inhabitant types (Issue #8), and inhabitant management (Issue #11).
- Dual mode requires a state field on the room (`mode: 'skeleton' | 'conversion'`).
- Corruption spread should interact with the adjacency system (Issue #16).
- Skeleton creation should use the same inhabitant creation pipeline as the Spawning Pool.
- The Essence resource type may need to be added to the ResourceManager if not already present.

## Success Metrics
- Both production modes function correctly at defined rates
- Mode toggle works reliably and persists
- Corruption spreads to adjacent rooms as defined
- Upgrades modify the correct mode's behavior

## Open Questions
- What is the exact Corruption-to-Essence conversion ratio?
- Should Corruption spread affect rooms connected via hallway, or only directly adjacent?
- Can Corruption stack from multiple Soul Wells?
