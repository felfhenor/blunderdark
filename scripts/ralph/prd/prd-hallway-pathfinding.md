# PRD: Hallway Pathfinding

## Introduction
Hallway pathfinding provides the algorithmic foundation for connecting non-adjacent rooms via hallways. Using A* pathfinding on the dungeon grid, the system calculates the shortest valid path between two rooms, avoiding occupied tiles. This path data is used by the hallway placement tool to preview and build hallways.

## Goals
- Implement A* pathfinding on the tile grid with Manhattan distance heuristic
- Find shortest paths between any two rooms that avoid occupied tiles
- Handle corners and turns in paths naturally
- Provide path results that include the full list of tiles traversed
- Ensure pathfinding completes within acceptable time for large grids

## User Stories

### US-001: A* Pathfinding Implementation
**Description:** As a developer, I want an A* pathfinding function that operates on the tile grid so that hallway paths can be calculated between rooms.

**Acceptance Criteria:**
- [ ] A function `findPath(grid, startTile, endTile): Tile[] | null` exists
- [ ] Uses A* algorithm with Manhattan distance heuristic
- [ ] Returns the shortest path as an ordered array of tiles
- [ ] Returns `null` if no valid path exists
- [ ] Unit tests verify correct paths on simple grids
- [ ] Typecheck/lint passes

### US-002: Obstacle Avoidance
**Description:** As a developer, I want the pathfinder to avoid tiles occupied by rooms or other hallways so that paths do not overlap existing structures.

**Acceptance Criteria:**
- [ ] Tiles marked as occupied (by rooms or hallways) are treated as impassable
- [ ] The pathfinder routes around obstacles
- [ ] If all routes are blocked, returns `null`
- [ ] Unit tests with obstacles verify correct avoidance
- [ ] Typecheck/lint passes

### US-003: Room-to-Room Path Calculation
**Description:** As a developer, I want to calculate a path from one room's edge to another room's edge so that hallways connect rooms at their boundaries.

**Acceptance Criteria:**
- [ ] A function `findRoomToRoomPath(roomA, roomB, grid): Tile[] | null` exists
- [ ] The path starts from the nearest edge tile of Room A to Room B
- [ ] The path ends at the nearest edge tile of Room B to Room A
- [ ] The path does not include tiles inside either room
- [ ] Multiple start/end candidates are evaluated to find the overall shortest path
- [ ] Typecheck/lint passes

### US-004: Path with Corners and Turns
**Description:** As a developer, I want the pathfinder to handle L-shaped and multi-turn paths so that hallways can navigate around complex dungeon layouts.

**Acceptance Criteria:**
- [ ] Paths can include 90-degree turns
- [ ] The algorithm prefers fewer turns when path lengths are equal
- [ ] Unit tests verify paths with 1, 2, and 3+ turns
- [ ] Typecheck/lint passes

### US-005: Pathfinding Performance
**Description:** As a developer, I want pathfinding to complete quickly even on large grids so that the UI remains responsive during hallway planning.

**Acceptance Criteria:**
- [ ] Pathfinding on a 100x100 grid completes in under 50ms
- [ ] Uses a priority queue (min-heap) for the open set
- [ ] Early termination when the destination is reached
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must implement A* pathfinding with Manhattan distance as the heuristic.
- FR-2: Grid tiles occupied by rooms or existing hallways must be treated as impassable.
- FR-3: The pathfinder must return an ordered list of tiles representing the path, or null if no path exists.
- FR-4: Room-to-room paths must start and end at room boundary tiles, not interior tiles.
- FR-5: The pathfinder must handle grids up to 100x100 tiles within acceptable performance bounds.

## Non-Goals (Out of Scope)
- Hallway placement UI (handled by Issue #19)
- Hallway data persistence (handled by Issue #20)
- Cost calculation for hallways (handled by Issue #21)
- Multi-floor pathfinding
- Weighted tiles or terrain costs (all passable tiles have equal cost)

## Technical Considerations
- Depends on the grid system (Issue #1) for tile data and occupancy information.
- Implement as a pure helper function in `src/app/helpers/pathfinding.ts` for easy unit testing.
- Use a binary heap or similar priority queue for the A* open set; consider `es-toolkit` or a lightweight implementation.
- The Manhattan distance heuristic is appropriate since movement is 4-directional (no diagonals).
- Consider memoizing or caching path results if the same room pairs are queried repeatedly without grid changes.

## Success Metrics
- All pathfinding unit tests pass for straight, L-shaped, and multi-turn paths
- Obstacle avoidance tests pass with various grid configurations
- Performance benchmark: under 50ms for 100x100 grid pathfinding
- Returns null correctly when no path exists

## Open Questions
- Should the pathfinder support weighted tiles in the future (e.g., different terrain costs)?
- Should there be a maximum path length to prevent extremely long hallways?
- Should the algorithm consider a "smoothing" pass to reduce unnecessary zigzagging?
