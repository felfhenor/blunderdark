# PRD: Hallway Data Structure

## Introduction
The hallway data structure defines how hallways are represented, stored, and managed in the game state. Hallways connect two rooms via a path of grid tiles, occupy those tiles on the grid, and can receive upgrades. This structure must be serializable for save/load and integrate with the grid occupancy system.

## Goals
- Define a clear, typed data structure for hallways
- Track start room, end room, and the ordered list of path tiles
- Mark hallway tiles as occupied on the grid
- Support upgrade/feature storage on hallways
- Ensure full serialization compatibility for save/load via IndexedDB

## User Stories

### US-001: Hallway Type Definition
**Description:** As a developer, I want a TypeScript type for hallways so that all hallway data is consistently structured across the codebase.

**Acceptance Criteria:**
- [ ] A `Hallway` type is defined in `src/app/interfaces/`
- [ ] Fields include: `id: string`, `startRoomId: string`, `endRoomId: string`, `tiles: Tile[]`, `upgrades: HallwayUpgrade[]`
- [ ] The type uses `type` keyword (not `interface`), per project conventions
- [ ] The type is exported from the interfaces barrel (`index.ts`)
- [ ] Typecheck/lint passes

### US-002: Hallway Tile Occupancy
**Description:** As a developer, I want hallway tiles to be marked as occupied on the grid so that other rooms and hallways cannot overlap them.

**Acceptance Criteria:**
- [ ] When a hallway is created, each tile in its path is marked as occupied in the grid
- [ ] The occupancy type distinguishes between room tiles and hallway tiles
- [ ] When a hallway is removed, its tiles are freed on the grid
- [ ] Pathfinding treats hallway tiles as impassable (same as room tiles)
- [ ] Typecheck/lint passes

### US-003: Hallway Collection in Game State
**Description:** As a developer, I want hallways stored in the game state so that they persist across sessions and can be queried by other systems.

**Acceptance Criteria:**
- [ ] The `GameState` (or `GameStateWorld`) type includes a `hallways` array
- [ ] Hallways are saved to and loaded from IndexedDB
- [ ] Adding/removing hallways updates the game state signal
- [ ] A helper function `getHallwaysBetween(roomAId, roomBId): Hallway[]` exists
- [ ] Typecheck/lint passes

### US-004: Hallway Upgrade Storage
**Description:** As a developer, I want hallways to store applied upgrades so that future upgrade features have a data foundation.

**Acceptance Criteria:**
- [ ] The `Hallway` type includes an `upgrades` array field
- [ ] A `HallwayUpgrade` type is defined with at minimum `id` and `name` fields
- [ ] Upgrades can be added to and removed from a hallway
- [ ] Upgrade data serializes correctly for save/load
- [ ] Typecheck/lint passes

### US-005: Hallway Removal
**Description:** As a developer, I want a function to remove a hallway cleanly so that all associated state is updated.

**Acceptance Criteria:**
- [ ] A function `removeHallway(hallwayId: string)` exists
- [ ] Removes the hallway from the game state hallways array
- [ ] Frees all tiles on the grid that the hallway occupied
- [ ] Removes any connections that depended on this hallway
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The `Hallway` type must include fields for ID, start room, end room, tile path, and upgrades.
- FR-2: Hallway tiles must integrate with the grid occupancy system, preventing overlap with rooms or other hallways.
- FR-3: The hallway collection must be part of the serializable game state.
- FR-4: Hallway creation and removal must update both the hallway collection and grid occupancy atomically.
- FR-5: Query functions must exist to find hallways by room pair or by individual room.

## Non-Goals (Out of Scope)
- Hallway pathfinding algorithm (handled by Issue #18)
- Hallway placement UI/workflow (handled by Issue #19)
- Hallway cost calculation (handled by Issue #21)
- Hallway visual rendering (sprites, animations)
- Specific upgrade implementations (future feature)

## Technical Considerations
- Depends on the grid system (Issue #1) for tile occupancy tracking.
- The hallway type should be defined in `src/app/interfaces/hallway.ts` and added to the barrel export.
- Game state changes should flow through Angular Signals (`indexedDbSignal`) for reactivity.
- Consider using a `Map<string, Hallway>` at runtime for O(1) lookups, serialized as an array for storage.
- Tile occupancy should use an enum or union type to distinguish `'room' | 'hallway' | 'empty'`.

## Success Metrics
- Hallway type is used consistently across all hallway-related features
- Hallways persist correctly across save/load cycles
- Grid occupancy accurately reflects hallway tiles
- No orphaned hallway data after room or hallway removal

## Open Questions
- Should hallways have a `name` or `label` field for display purposes?
- Should the tile path store just coordinates or full tile references?
- What is the maximum number of upgrades a hallway can hold?
