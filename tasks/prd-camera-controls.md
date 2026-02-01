# PRD: Camera Controls

## Introduction
Camera controls allow the player to navigate the dungeon grid by panning and zooming. Since the 20x20 grid may not fit entirely on screen at higher zoom levels, the player needs intuitive controls to move their viewport around the dungeon.

## Goals
- Provide smooth pan and zoom controls for navigating the grid
- Enforce camera bounds so the player cannot scroll into empty void beyond the grid
- Support both mouse-based and keyboard-based navigation
- Include a reset button to return to default camera position

## User Stories

### US-001: Mouse Drag Panning
**Description:** As a player, I want to drag the grid with my mouse so that I can pan around the dungeon.

**Acceptance Criteria:**
- [ ] Middle-mouse-button drag (or left-mouse drag on empty space) pans the camera
- [ ] Panning is smooth (no stuttering or snapping)
- [ ] Pan direction follows the mouse movement intuitively (drag left moves view left)
- [ ] Camera position is tracked via a signal (e.g., `cameraPosition: Signal<{x: number, y: number}>`)
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-002: Keyboard Panning (WASD)
**Description:** As a player, I want to pan the camera using WASD keys so that I can navigate without the mouse.

**Acceptance Criteria:**
- [ ] W/A/S/D keys pan the camera up/left/down/right respectively
- [ ] Arrow keys also work as an alternative to WASD
- [ ] Pan speed is consistent and comfortable (configurable constant)
- [ ] Key panning does not interfere with text input fields if any are focused
- [ ] Typecheck/lint passes

### US-003: Mouse Wheel Zoom
**Description:** As a player, I want to zoom in and out with the mouse wheel so that I can see more or less of the dungeon.

**Acceptance Criteria:**
- [ ] Mouse wheel up zooms in, mouse wheel down zooms out
- [ ] Zoom has minimum and maximum limits (e.g., 0.5x to 3x)
- [ ] Zoom is centered on the mouse cursor position
- [ ] Zoom level is tracked via a signal (e.g., `cameraZoom: Signal<number>`)
- [ ] Zoom transitions are smooth (not instant snapping)
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-004: Camera Bounds
**Description:** As a player, I want the camera to stop at the edges of the grid so that I cannot scroll into empty space.

**Acceptance Criteria:**
- [ ] Camera cannot pan beyond the grid boundaries (accounts for current zoom level)
- [ ] At minimum zoom, the entire grid is visible and no further zoom-out is allowed
- [ ] Bounds are recalculated when zoom level changes
- [ ] Attempting to pan beyond bounds clamps the position silently (no error, no bounce)
- [ ] Typecheck/lint passes

### US-005: Reset Camera Button
**Description:** As a player, I want a reset button that returns the camera to its default position and zoom so that I can quickly reorient.

**Acceptance Criteria:**
- [ ] A "Reset Camera" button is visible in the game UI (toolbar or corner overlay)
- [ ] Clicking it resets camera position to center of grid and zoom to 1x
- [ ] Reset transition is smooth (animated, not instant)
- [ ] Keyboard shortcut (Home key) also triggers reset
- [ ] **[UI story]** Verify in browser using dev-browser skill

## Functional Requirements
- FR-1: The system must support panning via mouse drag and WASD/arrow keys
- FR-2: The system must support zooming via mouse wheel with min/max limits
- FR-3: The camera must be bounded to the grid extents at all zoom levels
- FR-4: A reset control must return the camera to default position and zoom
- FR-5: Camera state (position, zoom) should be transient (not saved to IndexedDB)

## Non-Goals (Out of Scope)
- Minimap display
- Camera following a selected unit or inhabitant
- Touch/pinch zoom for mobile
- Camera rotation
- Saving camera position across sessions

## Technical Considerations
- Camera transforms should be applied via CSS `transform: translate() scale()` on the grid container for GPU-accelerated rendering
- Use `host` bindings or a directive on the grid container to capture mouse/keyboard events
- Debounce or throttle zoom events to avoid performance issues
- Camera state signals should live in a dedicated helper (e.g., `src/app/helpers/camera.ts`)
- Depends on the grid component from Issue #1 being rendered in the game-play page

## Success Metrics
- Pan and zoom feel smooth at 60fps
- Camera cannot be moved outside grid bounds under any input combination
- Reset returns to default state within 300ms animation

## Open Questions
- Should zoom speed be configurable in game options?
- What is the ideal default zoom level (fit entire grid vs. zoomed-in starting view)?
- Should camera position persist within a session when navigating between game sub-pages?
