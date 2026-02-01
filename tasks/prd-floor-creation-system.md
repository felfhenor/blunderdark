# PRD: Floor Creation System

## Introduction
Allow players to expand their dungeon vertically by creating new floors. Each floor is an independent 20x20 grid with its own rooms and inhabitants. Floors have a depth value (1-10) that affects bonuses and penalties. Creating a floor costs resources, and a maximum of 10 floors can exist.

## Goals
- Enable creation of new dungeon floors (up to 10)
- Each floor has its own 20x20 grid
- Track floor depth (1-10) with associated bonuses/penalties
- Floor creation costs resources
- Persist floor data to game state

## User Stories

### US-001: Floor Data Model
**Description:** As a developer, I want a data model for floors so that each floor has its own grid and metadata.

**Acceptance Criteria:**
- [ ] Define `Floor` type in `src/app/interfaces/` with: id, depth, grid (20x20), rooms, inhabitants, name
- [ ] Each floor has its own independent 20x20 tile grid
- [ ] Floor depth is an integer from 1 to 10
- [ ] First floor (depth 1) is created automatically at game start
- [ ] Typecheck/lint passes

### US-002: Floor Creation Action
**Description:** As a player, I want to create a new floor so that I can expand my dungeon vertically.

**Acceptance Criteria:**
- [ ] Add `createFloor()` method to `FloorService`
- [ ] Creating a floor costs resources (e.g., 50 Crystals + 30 Gold per depth level)
- [ ] New floor is created at the next available depth
- [ ] Cannot create floor if max (10) is reached
- [ ] Cannot create floor if insufficient resources
- [ ] Typecheck/lint passes

### US-003: Floor Management Service
**Description:** As a developer, I want a FloorService that manages all floor state so that other systems can query and modify floor data.

**Acceptance Criteria:**
- [ ] Create `FloorService` in `src/app/services/` with `providedIn: 'root'`
- [ ] `floors` signal: array of all floors
- [ ] `currentFloor` signal: the currently viewed/active floor
- [ ] `setCurrentFloor(floorId: string)` method
- [ ] `getFloorByDepth(depth: number)` method
- [ ] Typecheck/lint passes

### US-004: Floor Persistence
**Description:** As a developer, I want floor data to persist to IndexedDB so that floors survive game reload.

**Acceptance Criteria:**
- [ ] All floor data (grid, rooms, inhabitants, depth) persisted to IndexedDB
- [ ] Floors restore correctly on game load
- [ ] Current floor selection persists
- [ ] Handle migration from single-floor save data to multi-floor
- [ ] Typecheck/lint passes

### US-005: Floor Creation UI
**Description:** As a player, I want a button to create a new floor with cost information so that I can plan my expansion.

**Acceptance Criteria:**
- [ ] "Create New Floor" button visible in floor navigation area
- [ ] Button shows resource cost for the next floor
- [ ] Button is disabled if max floors reached or insufficient resources
- [ ] Confirmation dialog before spending resources
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-006: Floor Grid Initialization
**Description:** As a developer, I want new floors to start with an empty 20x20 grid so that the player can build from scratch.

**Acceptance Criteria:**
- [ ] New floor grid is initialized with all empty/rock tiles
- [ ] Grid dimensions match the existing floor format (20x20)
- [ ] No rooms or inhabitants on new floor initially
- [ ] Grid is ready for room placement immediately after creation
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must support up to 10 dungeon floors.
- FR-2: Each floor must have its own independent 20x20 tile grid.
- FR-3: Floor creation must cost resources that scale with depth.
- FR-4: The first floor must be created automatically at game start.
- FR-5: All floor data must persist to IndexedDB.

## Non-Goals (Out of Scope)
- Vertical connections between floors (covered by #48, #49)
- Floor depth modifiers (covered by #50)
- Biome assignment (covered by #51)
- Floor-specific invasion targeting

## Technical Considerations
- Depends on Dungeon Grid (#1) for grid format and Room Placement (#7) for building on floors
- Existing grid/room systems need to be refactored to be floor-aware
- Consider lazy-loading floor data (only load current floor's full grid into memory)
- Floor types defined in `src/app/interfaces/`
- Current floor selection should be a signal consumed by grid rendering components

## Success Metrics
- Players can create and switch between up to 10 floors
- Floor data persists correctly across save/load
- No performance degradation with multiple floors
- Resource cost prevents premature floor expansion

## Open Questions
- Should floor names be customizable by the player?
- Can floors be deleted or abandoned?
- Should deeper floors unlock progressively or be available immediately?
