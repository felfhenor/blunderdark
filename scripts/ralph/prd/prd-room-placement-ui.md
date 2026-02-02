# PRD: Room Placement UI

## Introduction
The room placement UI allows players to select a room type from a menu, preview its shape on the grid, and place it with a click. This is the primary interface for building the dungeon and must feel intuitive and responsive.

## Goals
- Provide a room selection menu showing available room types
- Show a ghost preview of the room shape following the mouse cursor on the grid
- Allow click-to-place with validation feedback
- Support cancellation via Escape or right-click

## User Stories

### US-001: Room Selection Menu
**Description:** As a player, I want a menu showing available room types so that I can choose which room to build.

**Acceptance Criteria:**
- [ ] A room selection panel/sidebar is displayed on the game-play page
- [ ] Each room type shows its name, shape preview (small icon), and resource cost
- [ ] Rooms the player cannot afford are visually dimmed but still visible
- [ ] Clicking a room type enters "placement mode" for that room
- [ ] The selected room type is highlighted in the menu
- [ ] Component uses OnPush change detection and standalone pattern
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-002: Room Shape Preview on Grid
**Description:** As a player, I want to see a ghost preview of the room shape on the grid as I move my mouse so that I can see exactly where the room will be placed.

**Acceptance Criteria:**
- [ ] When in placement mode, a translucent preview of the room shape follows the mouse on the grid
- [ ] The preview snaps to tile positions (not pixel-level)
- [ ] Preview uses the validation system: green for valid placement, red for invalid
- [ ] Preview is not shown when the mouse is outside the grid area
- [ ] Preview updates smoothly without flicker as the mouse moves
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-003: Click to Place Room
**Description:** As a player, I want to click to place a room at the previewed location so that I can build my dungeon.

**Acceptance Criteria:**
- [ ] Left-clicking while the preview is green places the room at that position
- [ ] Left-clicking while the preview is red shows an error notification and does not place
- [ ] Placing a room deducts the resource cost from the player's resources
- [ ] Placed room tiles are marked as occupied in the grid state with the room's ID
- [ ] After placing, the player remains in placement mode for the same room type (for rapid building)
- [ ] Typecheck/lint passes

### US-004: Cancel Placement Mode
**Description:** As a player, I want to cancel room placement with Escape or right-click so that I can back out without placing.

**Acceptance Criteria:**
- [ ] Pressing Escape exits placement mode and returns to normal grid interaction
- [ ] Right-clicking anywhere exits placement mode
- [ ] The ghost preview disappears when placement mode is exited
- [ ] The room selection menu deselects the previously selected room type
- [ ] No resources are deducted when cancelling
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Placed Room Visual Representation
**Description:** As a player, I want placed rooms to be visually distinct on the grid so that I can see my dungeon layout clearly.

**Acceptance Criteria:**
- [ ] Placed rooms are rendered with a distinct fill color or pattern on their tiles
- [ ] Room tiles belonging to the same room share a uniform appearance
- [ ] Room name or icon is displayed on the room (centered on its tiles)
- [ ] Rooms are visually distinct from empty tiles and from each other (different room types may have different colors)
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-006: Room State in Game State
**Description:** As a developer, I want placed rooms tracked in the game state so that room data persists across save/load.

**Acceptance Criteria:**
- [ ] A `PlacedRoom` type is defined with: `id`, `roomTypeId`, `shapeId`, `anchorX`, `anchorY`, `assignedInhabitants`
- [ ] Game state (`GameStateWorld`) includes an array/record of placed rooms
- [ ] Placing a room adds it to the game state
- [ ] Grid tile `roomId` references match the placed room IDs
- [ ] Save/load correctly preserves and restores all placed rooms
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must display a room selection menu with all available room types
- FR-2: When in placement mode, a ghost preview must follow the mouse on the grid
- FR-3: Clicking must place the room if valid, or show an error if invalid
- FR-4: Escape and right-click must cancel placement mode
- FR-5: Placed rooms must be visually rendered on the grid and persisted in game state

## Non-Goals (Out of Scope)
- Room upgrades or modifications after placement
- Room removal (handled by Issue #6)
- Inhabitant assignment to rooms (handled by Issue #13)
- Room production output display
- Drag-to-move rooms

## Technical Considerations
- Placement mode state should be a signal (e.g., `placementMode: Signal<{active: boolean, roomTypeId?: string}>`)
- The ghost preview is an overlay rendered on top of the grid, not actual tile modification
- Mouse position to grid coordinate conversion must account for camera pan/zoom from Issue #2
- Resource cost deduction integrates with the Resource Manager from Issue #7 (stub initially if not yet built)
- Room selection menu should load room types from `ContentService` (compiled from `gamedata/room/`)
- Use `@for` with `track` for rendering room tiles efficiently

## Success Metrics
- Room placement from selection to placed takes fewer than 3 clicks
- Ghost preview updates at 60fps with no visible lag
- Players can place 20+ rooms without UI performance degradation

## Open Questions
- Should the room menu be a sidebar, bottom bar, or floating panel?
- Should there be a build mode toggle, or is clicking a room type sufficient to enter placement mode?
- Should placed rooms show a room-type-specific sprite or just a colored shape?
