# PRD: Room Placement Validation

## Introduction
Room placement validation ensures that rooms can only be placed in legal positions on the dungeon grid. It checks for grid bounds, tile occupation, and overlap conflicts, and provides clear visual and textual feedback to the player about why a placement is valid or invalid.

## Goals
- Validate that all tiles in a room shape are within grid bounds before placement
- Prevent rooms from overlapping with existing rooms
- Provide real-time visual feedback (green/red) during placement preview
- Return detailed error messages explaining why a placement failed

## User Stories

### US-001: Bounds Validation
**Description:** As a developer, I want a function that checks whether a room shape fits within the grid bounds so that rooms cannot extend outside the 20x20 grid.

**Acceptance Criteria:**
- [ ] A function `validateBounds(shape, anchorX, anchorY, gridSize)` returns `{valid: boolean, error?: string}`
- [ ] Returns invalid with message "Room extends beyond grid boundary" when any tile falls outside 0-19 range
- [ ] Works correctly for all 6 shape variants at edge positions
- [ ] Unit tests cover corner cases: placement at (0,0), (18,18), (19,19), and negative coordinates
- [ ] Typecheck/lint passes

### US-002: Overlap Validation
**Description:** As a developer, I want a function that checks whether a room shape overlaps any existing occupied tiles so that rooms cannot stack on top of each other.

**Acceptance Criteria:**
- [ ] A function `validateNoOverlap(shape, anchorX, anchorY, grid)` returns `{valid: boolean, error?: string, conflictingTiles?: Array<{x,y}>}`
- [ ] Returns invalid with message "Tiles already occupied" when any target tile has `occupied === true`
- [ ] Returns the list of conflicting tile coordinates for debugging/UI
- [ ] Unit tests cover: empty grid (valid), partially occupied grid (invalid), fully occupied grid (invalid)
- [ ] Typecheck/lint passes

### US-003: Combined Validation Function
**Description:** As a developer, I want a single validation function that runs all checks so that callers don't need to invoke each validation separately.

**Acceptance Criteria:**
- [ ] A function `validatePlacement(shape, anchorX, anchorY, grid)` runs bounds + overlap checks
- [ ] Returns a result object: `{valid: boolean, errors: string[]}`
- [ ] Errors array contains all applicable error messages (not just the first failure)
- [ ] Function is in `src/app/helpers/room-placement.ts`
- [ ] Unit tests in `src/app/helpers/room-placement.spec.ts` cover combined scenarios
- [ ] Typecheck/lint passes

### US-004: Visual Placement Feedback
**Description:** As a player, I want to see green or red tile highlights when placing a room so that I know whether the placement is valid before clicking.

**Acceptance Criteria:**
- [ ] When previewing a room placement, valid tiles show a green overlay
- [ ] When previewing a room placement, invalid tiles (occupied or out of bounds) show a red overlay
- [ ] If any tile in the shape is invalid, all tiles in the preview show red (placement is all-or-nothing)
- [ ] Feedback updates in real-time as the mouse moves across the grid
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Placement Error Messages
**Description:** As a player, I want to see a clear message when I try to place a room in an invalid location so that I understand what went wrong.

**Acceptance Criteria:**
- [ ] When clicking to place a room in an invalid position, a notification appears with the error reason
- [ ] Error messages are player-friendly (e.g., "Cannot place room: tiles are already occupied" not "validateNoOverlap returned false")
- [ ] Uses the existing `NotifyService` for displaying messages
- [ ] Multiple errors are combined into a single notification
- [ ] **[UI story]** Verify in browser using dev-browser skill

## Functional Requirements
- FR-1: The system must reject placements where any tile falls outside the 20x20 grid
- FR-2: The system must reject placements where any tile overlaps an existing room
- FR-3: The system must provide green/red visual feedback during placement preview
- FR-4: The system must return human-readable error messages for failed placements
- FR-5: Validation must run synchronously and complete within 1ms for responsive UI

## Non-Goals (Out of Scope)
- Adjacency requirements (rooms needing to connect to corridors)
- Resource cost validation (handled by room placement UI)
- Room-type-specific placement rules (e.g., altar must be at center)
- Multi-floor validation

## Technical Considerations
- Validation functions should be pure functions (no side effects) for easy testing
- Visual feedback is a concern of the grid/placement component, not the validation logic itself
- Keep validation helpers in `src/app/helpers/room-placement.ts` separate from grid state management
- The preview overlay can be a CSS class applied to tile elements based on validation result
- Depends on grid state from Issue #1 and room shapes from Issue #3

## Success Metrics
- All validation edge cases covered by unit tests
- Visual feedback updates within a single animation frame (< 16ms)
- Zero false positives (valid placements never rejected) or false negatives (invalid placements never accepted)

## Open Questions
- Should placement validation also check for connectivity (room must be reachable from altar)?
- Are there any room types that allow overlap (e.g., upgrades that replace existing rooms)?
- Should we validate minimum distance between certain room types?
