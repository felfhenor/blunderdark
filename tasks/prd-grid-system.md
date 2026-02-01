# PRD: Grid System

## Introduction
The grid system is the foundational spatial layer for Blunderdark's dungeon-building gameplay. It provides a 20x20 tile grid per floor where rooms, corridors, and other structures are placed. Every spatial operation in the game (room placement, adjacency checks, pathfinding) depends on this grid.

## Goals
- Provide a reliable 20x20 tile grid data structure that supports all downstream placement and query operations
- Render the grid visually in the game-play page so players can see and interact with individual tiles
- Support tile selection and highlighting for placement previews and inspection
- Persist grid state to IndexedDB as part of the game state for save/load

## User Stories

### US-001: Define Grid Tile Data Structure
**Description:** As a developer, I want a well-typed grid tile data structure so that each tile tracks its occupation state, room association, and connection type.

**Acceptance Criteria:**
- [ ] A `GridTile` type is defined in `src/app/interfaces/` with fields: `occupied: boolean`, `roomId: string | null`, `connectionType: string | null`
- [ ] A `GridState` type is defined representing the full 20x20 grid (array of arrays or flat array with accessor helpers)
- [ ] Grid coordinates use `(x, y)` from `(0,0)` top-left to `(19,19)` bottom-right
- [ ] Types use `type` keyword, not `interface`, per project conventions
- [ ] Typecheck passes (`npm run lint`)

### US-002: Implement Grid State Management
**Description:** As a developer, I want grid state managed via Angular Signals so that changes propagate reactively through the UI.

**Acceptance Criteria:**
- [ ] A grid state helper file exists (e.g., `src/app/helpers/grid.ts`) that creates and manages grid state
- [ ] Grid state is initialized as a 20x20 grid of empty tiles
- [ ] Functions exist to: `getTile(x, y)`, `setTile(x, y, tile)`, `resetGrid()`, `isInBounds(x, y)`
- [ ] Grid state integrates with `GameState.world` in `state-game.ts` for persistence via `indexedDbSignal`
- [ ] Unit tests cover `getTile`, `setTile`, `isInBounds`, and `resetGrid` in `src/app/helpers/grid.spec.ts`
- [ ] Typecheck/lint passes

### US-003: Render Grid in Game-Play Page
**Description:** As a player, I want to see the dungeon grid rendered visually so that I can understand the spatial layout of my dungeon.

**Acceptance Criteria:**
- [ ] A `GridComponent` (standalone, OnPush) renders the 20x20 grid as a visual tile map
- [ ] Each tile is rendered as a distinct cell with visible borders
- [ ] Empty tiles are visually distinguishable from occupied tiles
- [ ] The grid component is displayed on the game-play page
- [ ] Grid renders correctly at default zoom level
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-004: Tile Selection and Highlighting
**Description:** As a player, I want to click on a tile to select it and see it highlighted so that I can inspect or target specific tiles.

**Acceptance Criteria:**
- [ ] Clicking a tile selects it and applies a highlight style (e.g., colored border or overlay)
- [ ] Only one tile can be selected at a time (clicking another tile deselects the previous)
- [ ] A signal exposes the currently selected tile coordinates (`selectedTile: Signal<{x: number, y: number} | null>`)
- [ ] Pressing Escape or clicking the same tile again deselects it
- [ ] Hovering over a tile shows a subtle hover effect distinct from selection
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Grid Save and Load
**Description:** As a player, I want my grid state to persist across sessions so that my dungeon layout is saved.

**Acceptance Criteria:**
- [ ] Grid state is included in the `GameStateWorld` type in `state-game.ts`
- [ ] Grid state serializes to a JSON-compatible format (no class instances)
- [ ] On game load, grid state is restored from IndexedDB and the grid renders the saved layout
- [ ] A new game initializes a fresh empty grid
- [ ] Unit tests verify serialization round-trip (serialize then deserialize produces identical grid)
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must represent a 20x20 grid where each tile has `occupied`, `roomId`, and `connectionType` properties
- FR-2: The system must prevent out-of-bounds access with clear error handling or boundary checks
- FR-3: The grid must render as a 2D visual map in the game-play page using Angular components
- FR-4: When a tile is clicked, the system must select it and emit its coordinates via a signal
- FR-5: The grid state must be persisted as part of the game state in IndexedDB

## Non-Goals (Out of Scope)
- Multiple floors (only single floor for now)
- Zoom or pan controls (handled by Issue #2)
- Room placement logic (handled by Issues #4 and #5)
- Pathfinding or corridor generation
- Tile animations or sprite rendering

## Technical Considerations
- Grid state should be stored as a flat array of length 400 (20*20) with index calculation `y * 20 + x` for performance, or as a 2D array `GridTile[][]` for readability. Choose based on profiling.
- Use Angular Signals (`signal()`, `computed()`) for reactive grid state. Avoid RxJS for grid state.
- The grid component should use `@for` for rendering tile rows/columns, with `track` by index for performance.
- Grid tile styling should use CSS Grid or a similar layout that avoids per-tile absolute positioning.
- Integration with `GameStateWorld` in `src/app/interfaces/state-game.ts` requires extending that type.

## Success Metrics
- Grid renders 400 tiles without visible jank (< 16ms frame time)
- All grid helper functions have passing unit tests
- Grid state round-trips through save/load without data loss

## Open Questions
- Should the grid support variable sizes in the future, or is 20x20 fixed permanently?
- What visual style should empty tiles use (dark stone, void, etc.)?
- Should tile coordinates be displayed on hover for debugging?
