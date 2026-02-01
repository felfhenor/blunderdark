# PRD: Vertical Connections (Stairs)

## Introduction
Stairs connect adjacent floors, allowing inhabitants and resources to move between them. A staircase occupies one tile and must be placed at matching grid coordinates on both the source and destination floors. Building stairs costs 20 Crystals and creates a two-way connection.

## Goals
- Implement stair placement as a tile/feature type
- Connect floor N to floor N+1 or N-1
- Enforce same grid coordinate requirement on both floors
- Allow inhabitants to traverse between connected floors
- Display visual indicators on both connected floors

## User Stories

### US-001: Stair Data Model
**Description:** As a developer, I want a data model for stairs so that vertical connections are tracked in the game state.

**Acceptance Criteria:**
- [ ] Define `Stair` type: id, floorDepthA, floorDepthB, gridPosition (x, y)
- [ ] Stairs connect exactly two adjacent floors (depth N and N+1)
- [ ] Both ends of the stair share the same grid coordinates
- [ ] Store stairs in the FloorService or a dedicated VerticalConnectionService
- [ ] Typecheck/lint passes

### US-002: Stair Placement
**Description:** As a player, I want to place stairs on a tile so that I can connect adjacent floors.

**Acceptance Criteria:**
- [ ] Player selects "Build Stairs" action and clicks a tile
- [ ] Stair can only be placed on an empty/valid tile
- [ ] The corresponding tile on the adjacent floor must also be empty
- [ ] Placement costs 20 Crystals (deducted on placement)
- [ ] If the adjacent floor doesn't exist, placement is blocked with a message
- [ ] Typecheck/lint passes

### US-003: Stair Placement Validation
**Description:** As a developer, I want stair placement to be validated so that invalid stairs cannot be created.

**Acceptance Criteria:**
- [ ] Validate: target tile is empty on current floor
- [ ] Validate: matching tile on adjacent floor is empty
- [ ] Validate: adjacent floor exists
- [ ] Validate: player has 20 Crystals
- [ ] Validate: no existing stair at this position
- [ ] Show error message for each validation failure
- [ ] Typecheck/lint passes

### US-004: Inhabitant Floor Traversal
**Description:** As a player, I want inhabitants to move between floors via stairs so that my workforce can access all levels.

**Acceptance Criteria:**
- [ ] Inhabitants can be assigned to rooms on any floor connected by stairs
- [ ] Movement between floors takes time (e.g., 1 game minute per floor traversed)
- [ ] Inhabitants path to the nearest stair, traverse, then path to destination
- [ ] Resources flow between floors through stair connections
- [ ] Typecheck/lint passes

### US-005: Stair Visual Indicators
**Description:** As a player, I want to see visual indicators showing where stairs are so that I can find floor connections.

**Acceptance Criteria:**
- [ ] Stair tile has a distinct visual (stair icon/sprite)
- [ ] Show "Up" or "Down" indicator based on connection direction
- [ ] Stair is visible on both connected floors
- [ ] Hovering/clicking a stair shows which floor it connects to
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-006: Stair Removal
**Description:** As a player, I want to remove stairs so that I can reorganize my dungeon layout.

**Acceptance Criteria:**
- [ ] Player can demolish a stair (removes from both floors)
- [ ] Demolition refunds partial resources (e.g., 10 Crystals)
- [ ] Cannot demolish if inhabitants are currently traversing the stair
- [ ] Confirmation dialog before demolition
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Stairs must connect two adjacent floors at the same grid coordinates.
- FR-2: Building stairs must cost 20 Crystals.
- FR-3: Placement must validate both the source and destination tiles.
- FR-4: Inhabitants must be able to traverse stairs to move between floors.
- FR-5: Stairs must be visually indicated on both connected floors.

## Non-Goals (Out of Scope)
- Elevators or portals (covered by #49)
- Multi-floor skip (stairs only connect adjacent floors)
- Stair upgrades or capacity limits
- Combat movement through stairs during invasions

## Technical Considerations
- Depends on Floor Creation System (#46) and Room Placement (#7)
- Stair placement interacts with the grid system on two floors simultaneously
- Consider a `VerticalConnectionService` that manages all vertical connections (stairs, elevators, portals)
- Stair sprites needed in `gameassets/`
- Inhabitant pathfinding needs to be extended to consider cross-floor paths

## Success Metrics
- Stairs can be placed and removed without data corruption
- Inhabitants traverse floors correctly via stairs
- Both floor ends show the stair visually
- Placement validation prevents all invalid configurations

## Open Questions
- Can invaders use stairs during invasions?
- Should stairs have a capacity limit (how many inhabitants can use at once)?
- Should stair cost scale with depth?
