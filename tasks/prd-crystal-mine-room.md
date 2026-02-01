# PRD: Crystal Mine Room

## Introduction
The Crystal Mine is a Tier 1 production room that generates Crystals, the primary building resource. It uses an L-shaped footprint, supports up to 2 inhabitants (upgradeable to 4), and has a low base fear level. Three distinct upgrade paths allow specialization. Adjacency bonuses with other Mines, Forges, and Libraries encourage strategic placement.

## Goals
- Implement a fully functional Crystal Mine room with L-shaped layout
- Produce 5 Crystals per minute as base output
- Support 2 inhabitants with upgradeable capacity to 4
- Implement 3 distinct upgrade paths
- Define and implement adjacency bonuses for Mine+Mine, Mine+Forge, Mine+Library

## User Stories

### US-001: Crystal Mine Room Definition
**Description:** As a developer, I want the Crystal Mine defined in YAML gamedata so that it follows the content pipeline and is available at runtime.

**Acceptance Criteria:**
- [ ] A `crystal-mine.yaml` file exists in the appropriate `gamedata/` directory
- [ ] Fields include: id, name, description, shape, baseTiles, baseProduction, maxInhabitants, baseFearLevel, upgradePaths
- [ ] The shape is L-shaped (defined as a list of tile offsets)
- [ ] The YAML compiles to valid JSON via `npm run gamedata:build`
- [ ] Typecheck/lint passes

### US-002: L-Shaped Room Placement
**Description:** As a dungeon builder, I want to place the Crystal Mine as an L-shaped room on the grid so that it occupies the correct tiles.

**Acceptance Criteria:**
- [ ] The Crystal Mine occupies an L-shaped set of tiles (e.g., 3 tiles in a row + 1 tile extending down from one end)
- [ ] The room can be rotated (4 orientations) during placement
- [ ] Placement validates that all L-shaped tiles are unoccupied
- [ ] The room renders correctly on the grid in all orientations
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Base Crystal Production
**Description:** As a dungeon builder, I want the Crystal Mine to produce 5 Crystals per minute so that I have a reliable resource income.

**Acceptance Criteria:**
- [ ] The Mine produces 5 Crystals per minute when at least 1 inhabitant is assigned
- [ ] Production is added to the Crystal resource pool via ResourceManager
- [ ] Production scales linearly with inhabitants (or as defined by the production formula)
- [ ] Production is visible in the resource display
- [ ] Typecheck/lint passes

### US-004: Inhabitant Capacity
**Description:** As a dungeon builder, I want the Crystal Mine to hold up to 2 inhabitants (4 when upgraded) so that I can staff it for production.

**Acceptance Criteria:**
- [ ] Base capacity is 2 inhabitants
- [ ] Attempting to assign a 3rd inhabitant is rejected with feedback
- [ ] After the capacity upgrade, the limit increases to 4
- [ ] Current/max inhabitant count is displayed on the room UI
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-005: Low Fear Level
**Description:** As a developer, I want the Crystal Mine to have a low base fear level so that it does not significantly scare inhabitants.

**Acceptance Criteria:**
- [ ] The Crystal Mine's base fear level is set to Low (1)
- [ ] Fear level is included in the room's gamedata definition
- [ ] Fear level integrates with the fear tracking system when available
- [ ] Typecheck/lint passes

### US-006: Upgrade Path 1 - Efficiency
**Description:** As a dungeon builder, I want an efficiency upgrade path for the Mine that increases Crystal output so that I can maximize production.

**Acceptance Criteria:**
- [ ] Upgrade increases base production (e.g., +50% Crystals/min)
- [ ] Upgrade has a defined Crystal cost
- [ ] Choosing this path locks out the other two paths at this tier
- [ ] The upgrade effect is applied immediately to production
- [ ] Typecheck/lint passes

### US-007: Upgrade Path 2 - Capacity
**Description:** As a dungeon builder, I want a capacity upgrade path for the Mine that increases inhabitant slots so that I can assign more workers.

**Acceptance Criteria:**
- [ ] Upgrade increases max inhabitants from 2 to 4
- [ ] Upgrade has a defined Crystal cost
- [ ] Choosing this path locks out the other two paths at this tier
- [ ] Additional inhabitants can be assigned immediately after upgrade
- [ ] Typecheck/lint passes

### US-008: Upgrade Path 3 - Specialization
**Description:** As a dungeon builder, I want a specialization upgrade path for the Mine that provides a unique bonus so that I can tailor my strategy.

**Acceptance Criteria:**
- [ ] Upgrade provides a unique effect (e.g., reduced fear, bonus to adjacent rooms, secondary resource output)
- [ ] Upgrade has a defined Crystal cost
- [ ] Choosing this path locks out the other two paths at this tier
- [ ] The effect is applied and visible immediately
- [ ] Typecheck/lint passes

### US-009: Adjacency Bonuses
**Description:** As a dungeon builder, I want the Crystal Mine to receive adjacency bonuses from specific room types so that placement strategy matters.

**Acceptance Criteria:**
- [ ] Mine + Mine adjacency: defined bonus (e.g., +10% each)
- [ ] Mine + Forge adjacency: +30% Crystal production
- [ ] Mine + Library adjacency: defined bonus (e.g., +15% with Research side-production)
- [ ] Bonuses are defined in gamedata and activate via the adjacency bonus system
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The Crystal Mine must be defined in YAML gamedata with all required fields.
- FR-2: The room must use an L-shaped tile layout with rotation support.
- FR-3: Base production must be 5 Crystals per minute with at least 1 inhabitant.
- FR-4: Inhabitant capacity must be 2 (base) upgradeable to 4.
- FR-5: Three mutually exclusive upgrade paths must be implemented.
- FR-6: Adjacency bonuses for Mine+Mine, Mine+Forge, Mine+Library must be defined.

## Non-Goals (Out of Scope)
- Room placement UI (handled by earlier issues)
- Production system internals (handled by Issue #9)
- Upgrade UI (handled by Issue #32)
- Inhabitant assignment UI (handled by Issue #13)

## Technical Considerations
- Depends on room shape system (Issue #3), room data structure (Issue #5), and production system (Issue #9).
- The L-shaped tile offsets should be defined relative to an anchor tile (e.g., top-left).
- Rotation of L-shapes means 4 variants of tile offsets need to be precomputed or calculated.
- YAML definition should match the schema generated by `npm run schemas:generate`.
- Adjacency bonuses should reference the bonus system from Issue #22.

## Success Metrics
- Crystal Mine can be placed, staffed, and produces Crystals at the correct rate
- All 3 upgrade paths function correctly and are mutually exclusive
- Adjacency bonuses activate correctly with qualifying adjacent rooms
- Room persists correctly across save/load

## Open Questions
- What are the exact costs for each upgrade path?
- Should the L-shape have a specific orientation preference (e.g., default to a common rotation)?
- What is the exact production formula when multiple inhabitants are assigned?
