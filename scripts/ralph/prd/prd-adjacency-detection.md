# PRD: Adjacency Detection

## Introduction
Adjacency detection determines which rooms in the dungeon share edges, enabling the connection and synergy systems. Two rooms are adjacent if they share at least one full edge between tiles (not diagonal/corner touching). This system provides the foundation for room connections, hallway planning, and adjacency bonuses.

## Goals
- Accurately detect edge-sharing adjacency between any two rooms on the grid
- Maintain a cached adjacency map that updates when rooms are placed or removed
- Provide a query API that returns all adjacent rooms for a given room
- Ensure corner-only touching is explicitly excluded from adjacency
- Keep adjacency lookups O(1) after initial computation

## User Stories

### US-001: Compute Adjacency on Room Placement
**Description:** As the dungeon builder, I want the system to automatically detect which rooms are adjacent when I place a new room so that connections and bonuses can be calculated.

**Acceptance Criteria:**
- [ ] When a room is placed on the grid, the adjacency map is updated
- [ ] Adjacency is detected by checking if any tile of Room A is directly left/right/above/below any tile of Room B
- [ ] Diagonal (corner) touching does not count as adjacent
- [ ] The newly placed room's adjacency list is populated
- [ ] All other rooms' adjacency lists are updated if they are now adjacent to the new room
- [ ] Typecheck/lint passes

### US-002: Update Adjacency on Room Removal
**Description:** As the dungeon builder, I want adjacency data to update when a room is removed so that stale connections are cleaned up.

**Acceptance Criteria:**
- [ ] When a room is removed, it is removed from every other room's adjacency list
- [ ] The removed room's own adjacency entry is deleted from the cache
- [ ] Any active connections referencing the removed room are also invalidated
- [ ] Typecheck/lint passes

### US-003: Query Adjacent Rooms
**Description:** As a developer, I want to query the adjacency map for a given room and receive a list of adjacent rooms so that other systems (connections, bonuses) can use this data.

**Acceptance Criteria:**
- [ ] A function `getAdjacentRooms(roomId: string): Room[]` exists and returns the correct list
- [ ] Returns an empty array if the room has no neighbors
- [ ] Returns consistent results regardless of query order
- [ ] Typecheck/lint passes

### US-004: Edge-Sharing Validation Logic
**Description:** As a developer, I want a pure function that determines whether two sets of tiles are edge-adjacent so that the detection logic is testable in isolation.

**Acceptance Criteria:**
- [ ] A pure function `areRoomsAdjacent(tilesA: Tile[], tilesB: Tile[]): boolean` exists
- [ ] Two tiles at (x, y) and (x+1, y) are edge-adjacent (horizontal)
- [ ] Two tiles at (x, y) and (x, y+1) are edge-adjacent (vertical)
- [ ] Two tiles at (x, y) and (x+1, y+1) are NOT adjacent (diagonal)
- [ ] Unit tests cover horizontal, vertical, diagonal, and non-touching cases
- [ ] Typecheck/lint passes

### US-005: Adjacency Cache Performance
**Description:** As a developer, I want adjacency data cached in a Map so that lookups are fast and do not require re-scanning the entire grid each time.

**Acceptance Criteria:**
- [ ] Adjacency data is stored in a `Map<string, Set<string>>` (roomId to set of adjacent roomIds)
- [ ] Cache is updated incrementally on place/remove, not recomputed from scratch
- [ ] Accessing adjacency for a room is O(1)
- [ ] Cache is serializable for save/load (converted to plain objects)
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must detect adjacency by comparing tile coordinates of all room pairs, where adjacency means at least one pair of tiles differs by exactly 1 in one axis and 0 in the other.
- FR-2: Corner-only contact (diagonal tiles) must not be considered adjacent.
- FR-3: The adjacency map must update automatically when a room is placed or removed via the grid system.
- FR-4: The system must expose a public method to retrieve all adjacent rooms for a given room ID.
- FR-5: Adjacency data must be included in the serialized game state for save/load.

## Non-Goals (Out of Scope)
- Hallway pathfinding (handled by Issue #18)
- Connection creation UI (handled by Issue #17)
- Adjacency bonus calculations (handled by Issue #22)
- Multi-floor adjacency (vertical stacking)

## Technical Considerations
- Depends on the grid system (Issue #1) for tile coordinate data and the room data structure (Issue #5) for room tile lists.
- The adjacency map should live in the game state (IndexedDB via `indexedDbSignal`) so it persists across sessions.
- Use Angular Signals to expose reactive adjacency data so UI components can respond to changes.
- Consider using a helper in `src/app/helpers/` for the pure adjacency logic and a service for state management.

## Success Metrics
- All unit tests for edge-sharing logic pass (horizontal, vertical, diagonal, non-touching)
- Adjacency map correctly updates on room placement and removal in integration tests
- Adjacency lookup completes in under 1ms for dungeons with up to 100 rooms

## Open Questions
- Should adjacency data be stored per-room (each room knows its neighbors) or in a central map? Central map recommended for consistency.
- How should adjacency handle rooms that are placed simultaneously (e.g., during world generation)? Batch update recommended.
