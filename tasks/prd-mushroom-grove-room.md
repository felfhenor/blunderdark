# PRD: Mushroom Grove Room

## Introduction
The Mushroom Grove is a Tier 1 food production room that generates Food, a critical resource for keeping inhabitants fed. It uses a T-shaped footprint, supports up to 3 inhabitants (upgradeable to 5), and has a low base fear level that can be removed with an upgrade. Adjacency bonuses with Water and Dark rooms encourage thematic placement.

## Goals
- Implement a fully functional Mushroom Grove room with T-shaped layout
- Produce 8 Food per minute as base output
- Support 3 inhabitants with upgradeable capacity to 5
- Implement 3 distinct upgrade paths including fear removal
- Define and implement adjacency bonuses for Grove+Water and Grove+Dark rooms

## User Stories

### US-001: Mushroom Grove Room Definition
**Description:** As a developer, I want the Mushroom Grove defined in YAML gamedata so that it is available through the content pipeline.

**Acceptance Criteria:**
- [ ] A `mushroom-grove.yaml` file exists in the appropriate `gamedata/` directory
- [ ] Fields include: id, name, description, shape, baseTiles, baseProduction, maxInhabitants, baseFearLevel, upgradePaths
- [ ] The shape is T-shaped (defined as a list of tile offsets)
- [ ] The YAML compiles to valid JSON via `npm run gamedata:build`
- [ ] Typecheck/lint passes

### US-002: T-Shaped Room Placement
**Description:** As a dungeon builder, I want to place the Mushroom Grove as a T-shaped room on the grid.

**Acceptance Criteria:**
- [ ] The Mushroom Grove occupies a T-shaped set of tiles (e.g., 3 tiles in a row + 1 tile extending from the center)
- [ ] The room can be rotated (4 orientations) during placement
- [ ] Placement validates that all T-shaped tiles are unoccupied
- [ ] The room renders correctly on the grid in all orientations
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Base Food Production
**Description:** As a dungeon builder, I want the Mushroom Grove to produce 8 Food per minute so that I can sustain my inhabitants.

**Acceptance Criteria:**
- [ ] The Grove produces 8 Food per minute when at least 1 inhabitant is assigned
- [ ] Production is added to the Food resource pool via ResourceManager
- [ ] Production is visible in the resource display
- [ ] Typecheck/lint passes

### US-004: Inhabitant Capacity
**Description:** As a dungeon builder, I want the Mushroom Grove to hold up to 3 inhabitants (5 when upgraded).

**Acceptance Criteria:**
- [ ] Base capacity is 3 inhabitants
- [ ] Attempting to assign a 4th inhabitant is rejected with feedback
- [ ] After capacity upgrade, the limit increases to 5
- [ ] Current/max inhabitant count is displayed on the room UI
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-005: Low Fear Level with Removal Upgrade
**Description:** As a dungeon builder, I want the Grove to have low base fear that can be upgraded to zero so that sensitive inhabitants can work comfortably.

**Acceptance Criteria:**
- [ ] Base fear level is Low (1)
- [ ] One upgrade path includes fear removal (sets fear to None/0)
- [ ] Fear integrates with the fear tracking system
- [ ] Typecheck/lint passes

### US-006: Upgrade Path 1 - Bountiful Harvest
**Description:** As a dungeon builder, I want a harvest upgrade that increases food output.

**Acceptance Criteria:**
- [ ] Upgrade increases base Food production (e.g., +50%)
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Effect applies immediately
- [ ] Typecheck/lint passes

### US-007: Upgrade Path 2 - Expanded Growth
**Description:** As a dungeon builder, I want a growth upgrade that increases inhabitant capacity.

**Acceptance Criteria:**
- [ ] Upgrade increases max inhabitants from 3 to 5
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-008: Upgrade Path 3 - Tranquil Garden
**Description:** As a dungeon builder, I want a tranquility upgrade that removes fear from the Grove.

**Acceptance Criteria:**
- [ ] Upgrade sets the room's fear level to None (0)
- [ ] Also reduces fear in adjacent rooms by a small amount
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-009: Adjacency Bonuses
**Description:** As a dungeon builder, I want the Mushroom Grove to receive adjacency bonuses from Water and Dark rooms.

**Acceptance Criteria:**
- [ ] Grove + Water room adjacency: +40% Food production
- [ ] Grove + Dark room adjacency: defined bonus (e.g., +15%)
- [ ] Bonuses are defined in gamedata and activate via the adjacency bonus system
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The Mushroom Grove must be defined in YAML gamedata with all required fields.
- FR-2: The room must use a T-shaped tile layout with rotation support.
- FR-3: Base production must be 8 Food per minute with at least 1 inhabitant.
- FR-4: Inhabitant capacity must be 3 (base) upgradeable to 5.
- FR-5: Three mutually exclusive upgrade paths must be implemented, including fear removal.
- FR-6: Adjacency bonuses for Grove+Water and Grove+Dark rooms must be defined.

## Non-Goals (Out of Scope)
- Food consumption mechanics (handled by Issue #35)
- Room placement UI generics (handled by earlier issues)
- Production system internals (handled by Issue #9)

## Technical Considerations
- Depends on room shape system (Issue #3), room data structure (Issue #5), and production system (Issue #9).
- T-shaped tile offsets should be defined relative to an anchor tile.
- The "Tranquil Garden" upgrade interacts with the fear system (Issue #33); if fear is not yet implemented, the data should be defined but the effect can be deferred.
- YAML definition should match the schema generated by `npm run schemas:generate`.

## Success Metrics
- Mushroom Grove produces Food at the correct rate when staffed
- All 3 upgrade paths function correctly and are mutually exclusive
- Adjacency bonuses activate with Water and Dark rooms
- Fear removal upgrade correctly sets fear to zero

## Open Questions
- What specific Dark room types qualify for the adjacency bonus?
- Does the Tranquil Garden fear reduction affect rooms connected via hallway, or only directly adjacent?
- What is the exact production scaling per additional inhabitant?
