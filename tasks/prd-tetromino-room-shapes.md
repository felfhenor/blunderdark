# PRD: Tetromino Room Shapes

## Introduction
Room shapes define the spatial footprint of rooms on the dungeon grid. Each room type has a fixed shape composed of relative tile coordinates, similar to Tetris pieces. These shapes are the data foundation for room placement, validation, and rendering.

## Goals
- Define a `RoomShape` data structure that represents room footprints as relative tile coordinates
- Implement all required shape variants: Square 2x2, Square 3x3, Square 4x4, L-shape, T-shape, I-shape
- Ensure shapes are serializable for save/load and definable in YAML gamedata
- Shapes are fixed (no rotation)

## User Stories

### US-001: Define RoomShape Type
**Description:** As a developer, I want a `RoomShape` type that represents a room's spatial footprint so that the placement system can use it for validation and rendering.

**Acceptance Criteria:**
- [ ] A `RoomShape` type is defined in `src/app/interfaces/` with fields: `id: string`, `name: string`, `tiles: Array<{x: number, y: number}>` (relative coordinates)
- [ ] Relative coordinates use `(0,0)` as the top-left anchor tile
- [ ] The type includes a `width` and `height` computed from the tiles array for bounding box calculations
- [ ] Uses `type` keyword per project conventions
- [ ] Typecheck/lint passes

### US-002: Define Shape Variants in Gamedata YAML
**Description:** As a designer, I want room shapes defined in YAML gamedata so that shapes can be modified without code changes.

**Acceptance Criteria:**
- [ ] A YAML file (e.g., `gamedata/room/shapes.yml`) defines all 6 shape variants
- [ ] Square 2x2: occupies tiles `(0,0), (1,0), (0,1), (1,1)`
- [ ] Square 3x3: occupies 9 tiles forming a 3x3 square
- [ ] Square 4x4: occupies 16 tiles forming a 4x4 square
- [ ] L-shape: defined as relative coordinates (e.g., 3 tall + 1 wide extension)
- [ ] T-shape: defined as relative coordinates (e.g., 3 wide + 1 center extension)
- [ ] I-shape: defined as relative coordinates (e.g., 4 tiles in a line)
- [ ] YAML compiles to JSON via `npm run gamedata:build` without errors

### US-003: Load Room Shapes via ContentService
**Description:** As a developer, I want room shapes loaded through the existing ContentService so that they are available at runtime alongside other game content.

**Acceptance Criteria:**
- [ ] The build pipeline processes room shape YAML into the compiled JSON output
- [ ] `ContentService` exposes a method or signal to access room shapes (e.g., `getRoomShape(id)`, `allRoomShapes()`)
- [ ] Room shapes are available after app initialization completes
- [ ] Typecheck/lint passes

### US-004: RoomShape Helper Functions
**Description:** As a developer, I want utility functions for working with room shapes so that placement and rendering code is clean and reusable.

**Acceptance Criteria:**
- [ ] A helper function `getAbsoluteTiles(shape, anchorX, anchorY)` returns absolute grid coordinates for a shape placed at an anchor point
- [ ] A helper function `getShapeBounds(shape)` returns `{width, height}` of the bounding box
- [ ] A helper function `shapeFitsInGrid(shape, anchorX, anchorY, gridSize)` checks if all tiles are within grid bounds
- [ ] Helpers are in `src/app/helpers/room-shapes.ts`
- [ ] Unit tests cover all helpers in `src/app/helpers/room-shapes.spec.ts`
- [ ] Typecheck/lint passes

### US-005: Shape Serialization for Save/Load
**Description:** As a developer, I want room shapes referenced by ID in save data so that saved dungeons correctly reconstruct room footprints.

**Acceptance Criteria:**
- [ ] Placed rooms in game state store the `shapeId` (not the full shape data)
- [ ] On load, the shape is resolved from the content data using the stored ID
- [ ] If a shape ID is not found (e.g., removed in a content update), a graceful fallback or error is produced
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must define room shapes as collections of relative tile coordinates
- FR-2: Each shape must have a unique identifier and human-readable name
- FR-3: Shapes must be defined in YAML gamedata and compiled to JSON at build time
- FR-4: Helper functions must convert between relative and absolute coordinates
- FR-5: Shapes cannot be rotated by the player

## Non-Goals (Out of Scope)
- Shape rotation or flipping
- Dynamic shape creation by players
- Irregular shapes beyond the 6 defined variants
- Visual rendering of shapes (handled by Issue #5)
- Placement validation (handled by Issue #4)

## Technical Considerations
- Room shapes should be defined in `gamedata/room/` alongside existing room data, or in a dedicated shapes file
- The build scripts in `scripts/` may need updating to process shape definitions
- Relative coordinates should always have `(0,0)` as the minimum corner for consistency
- Consider using the existing `ContentService` pattern for loading shapes at init time
- Shape data is static content (read-only at runtime), not mutable game state

## Success Metrics
- All 6 shape variants correctly define their tile footprints
- Helper functions pass all unit tests
- Shapes integrate cleanly with the existing content pipeline

## Open Questions
- Should shapes be defined inline in room type YAML or in a separate shapes file?
- Will additional shapes be added in future updates (should the system be extensible)?
- Should shapes have a visual preview image for the UI, or is rendering from tile data sufficient?
