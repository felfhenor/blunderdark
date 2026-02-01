# PRD: Shadow Library Room

## Introduction
The Shadow Library is a Tier 1 research room that generates Research points, used for unlocking upgrades and advanced features. It uses an L-shaped footprint, supports 1 inhabitant (upgradeable to 3), and has a medium base fear level. Three upgrade paths allow specialization toward research output, capacity, or unique scholarly effects.

## Goals
- Implement a fully functional Shadow Library room with L-shaped layout
- Produce 3 Research per minute as base output
- Support 1 inhabitant with upgradeable capacity to 3
- Implement 3 distinct upgrade paths
- Define and implement adjacency bonuses for the Library

## User Stories

### US-001: Shadow Library Room Definition
**Description:** As a developer, I want the Shadow Library defined in YAML gamedata so that it is available through the content pipeline.

**Acceptance Criteria:**
- [ ] A `shadow-library.yaml` file exists in the appropriate `gamedata/` directory
- [ ] Fields include: id, name, description, shape, baseTiles, baseProduction, maxInhabitants, baseFearLevel, upgradePaths
- [ ] The shape is L-shaped
- [ ] Base fear level is Medium (2)
- [ ] The YAML compiles to valid JSON via `npm run gamedata:build`
- [ ] Typecheck/lint passes

### US-002: L-Shaped Room Placement
**Description:** As a dungeon builder, I want to place the Shadow Library as an L-shaped room on the grid.

**Acceptance Criteria:**
- [ ] The Shadow Library occupies an L-shaped set of tiles
- [ ] The room can be rotated (4 orientations) during placement
- [ ] Placement validates that all tiles are unoccupied
- [ ] Renders correctly on the grid
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Base Research Production
**Description:** As a dungeon builder, I want the Shadow Library to produce 3 Research per minute so that I can unlock upgrades.

**Acceptance Criteria:**
- [ ] The Library produces 3 Research per minute when 1 inhabitant is assigned
- [ ] Production is added to the Research resource pool via ResourceManager
- [ ] Production is visible in the resource display
- [ ] Typecheck/lint passes

### US-004: Limited Inhabitant Capacity
**Description:** As a dungeon builder, I want the Shadow Library to hold only 1 inhabitant (3 when upgraded) reflecting its specialized nature.

**Acceptance Criteria:**
- [ ] Base capacity is 1 inhabitant
- [ ] Attempting to assign a 2nd inhabitant is rejected with feedback
- [ ] After capacity upgrade, limit increases to 3
- [ ] Current/max count displayed on room UI
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-005: Medium Fear Level
**Description:** As a developer, I want the Shadow Library to have medium base fear reflecting its dark, scholarly atmosphere.

**Acceptance Criteria:**
- [ ] Base fear level is Medium (2)
- [ ] Fear level is included in the gamedata definition
- [ ] Some inhabitants may refuse to work here due to fear threshold
- [ ] Typecheck/lint passes

### US-006: Upgrade Path 1 - Arcane Focus
**Description:** As a dungeon builder, I want a research-boosting upgrade path.

**Acceptance Criteria:**
- [ ] Upgrade significantly increases Research production (e.g., +75%)
- [ ] Upgrade has a defined resource cost
- [ ] Mutually exclusive with other paths at this tier
- [ ] Effect applies immediately
- [ ] Typecheck/lint passes

### US-007: Upgrade Path 2 - Expanded Archives
**Description:** As a dungeon builder, I want a capacity upgrade for the Library.

**Acceptance Criteria:**
- [ ] Upgrade increases max inhabitants from 1 to 3
- [ ] Upgrade has a defined resource cost
- [ ] Mutually exclusive with other paths at this tier
- [ ] Typecheck/lint passes

### US-008: Upgrade Path 3 - Forbidden Knowledge
**Description:** As a dungeon builder, I want a specialization upgrade with unique effects.

**Acceptance Criteria:**
- [ ] Upgrade provides a unique effect (e.g., increases fear but greatly boosts production, or unlocks special research)
- [ ] Upgrade has a defined resource cost
- [ ] Mutually exclusive with other paths at this tier
- [ ] Typecheck/lint passes

### US-009: Adjacency Bonuses
**Description:** As a dungeon builder, I want the Shadow Library to benefit from adjacency with complementary rooms.

**Acceptance Criteria:**
- [ ] Library + Mine adjacency: defined bonus (e.g., +15% to both)
- [ ] Library + Library adjacency: defined bonus (e.g., +20% Research each)
- [ ] Bonuses activate via the adjacency bonus system
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The Shadow Library must be defined in YAML gamedata with all required fields.
- FR-2: L-shaped tile layout with rotation support.
- FR-3: Base production of 3 Research/min with 1 inhabitant.
- FR-4: Inhabitant capacity of 1 (base) upgradeable to 3.
- FR-5: Medium fear level (2) as base.
- FR-6: Three mutually exclusive upgrade paths.
- FR-7: Adjacency bonuses defined and integrated.

## Non-Goals (Out of Scope)
- Research spending/unlocking mechanics
- Room placement UI generics
- Production system internals

## Technical Considerations
- Depends on room shape system (Issue #3), room data structure (Issue #5), and production system (Issue #9).
- Medium fear level means some inhabitants may have fear thresholds that prevent assignment.
- The "Forbidden Knowledge" upgrade may interact with fear system in interesting ways (increase fear for more output).

## Success Metrics
- Library produces Research at correct rate
- All 3 upgrade paths work and are mutually exclusive
- Adjacency bonuses activate correctly
- Fear level correctly set and propagated

## Open Questions
- What specific rooms qualify for Library adjacency bonuses beyond Mine and Library?
- Should the Forbidden Knowledge upgrade have lasting consequences beyond fear increase?
- How does Research interact with the upgrade unlock system?
