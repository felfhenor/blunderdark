# PRD: Room Removal

## Introduction
Room removal allows players to demolish rooms they have placed on the grid. This provides flexibility in dungeon design, letting players reconfigure their layout. Removal returns a partial refund and requires handling of displaced inhabitants.

## Goals
- Allow players to remove placed rooms from the grid
- Require confirmation before removal to prevent accidental demolition
- Refund 50% of the room's original resource cost
- Handle reassignment of inhabitants from removed rooms
- Prevent removal of the altar (core room)

## User Stories

### US-001: Room Selection for Removal
**Description:** As a player, I want to select a placed room and see a removal option so that I can demolish rooms I no longer want.

**Acceptance Criteria:**
- [ ] Clicking on a placed room (when not in placement mode) opens a room context panel/popup
- [ ] The context panel shows room details: name, type, assigned inhabitants
- [ ] A "Remove Room" button is visible in the context panel
- [ ] The remove button is disabled (grayed out) for the altar room with tooltip "Altar cannot be removed"
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-002: Removal Confirmation Dialog
**Description:** As a player, I want a confirmation dialog before removing a room so that I don't accidentally demolish important rooms.

**Acceptance Criteria:**
- [ ] Clicking "Remove Room" shows a confirmation dialog
- [ ] Dialog shows: room name, refund amount (50% of cost), and number of inhabitants that will be displaced
- [ ] Dialog has "Confirm" and "Cancel" buttons
- [ ] Pressing Escape or clicking Cancel closes the dialog without removing the room
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-003: Resource Refund on Removal
**Description:** As a developer, I want room removal to refund 50% of the room's original cost so that players recover some resources.

**Acceptance Criteria:**
- [ ] When removal is confirmed, 50% of each resource type used to build the room is added back
- [ ] Refund amounts are rounded down (floor) for fractional values
- [ ] Refund does not exceed storage limits (excess is lost)
- [ ] A notification shows the refund amounts received
- [ ] Unit tests verify correct refund calculation for various room costs
- [ ] Typecheck/lint passes

### US-004: Clear Grid Tiles on Removal
**Description:** As a developer, I want all tiles occupied by a removed room to be cleared so that the space is available for new rooms.

**Acceptance Criteria:**
- [ ] All tiles belonging to the removed room have `occupied` set to `false` and `roomId` set to `null`
- [ ] The room is removed from the `GameStateWorld` placed rooms list
- [ ] The grid visually updates to show the tiles as empty
- [ ] Unit tests verify grid state is clean after removal
- [ ] Typecheck/lint passes

### US-005: Inhabitant Displacement on Removal
**Description:** As a developer, I want inhabitants from a removed room to be unassigned so that they return to the available pool.

**Acceptance Criteria:**
- [ ] All inhabitants assigned to the removed room are unassigned (moved to unassigned pool)
- [ ] Inhabitants are not deleted, only their assignment is cleared
- [ ] Production calculations update to reflect the lost assignments
- [ ] A notification lists the displaced inhabitants by name
- [ ] Typecheck/lint passes

### US-006: Altar Cannot Be Removed
**Description:** As a player, I want the altar to be permanently placed so that the core of my dungeon is always present.

**Acceptance Criteria:**
- [ ] The altar room type is flagged as non-removable in its gamedata definition
- [ ] The removal validation function checks for this flag and returns an error
- [ ] The "Remove Room" button is disabled for the altar with an explanatory tooltip
- [ ] Even if the button is somehow triggered, the backend validation rejects removal
- [ ] Unit tests verify altar cannot be removed
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must allow removal of any placed room except the altar
- FR-2: A confirmation dialog must be shown before any removal occurs
- FR-3: The system must refund 50% of the room's construction cost (rounded down)
- FR-4: All grid tiles belonging to a removed room must be cleared to empty state
- FR-5: All inhabitants assigned to a removed room must be unassigned to the available pool

## Non-Goals (Out of Scope)
- Room relocation (move without destroy/rebuild)
- Variable refund rates based on room condition or age
- Undo/redo for room removal
- Cascade removal (removing a room that blocks access to other rooms)
- Animated demolition effects

## Technical Considerations
- Room removal logic should be in a helper function (e.g., `src/app/helpers/room-management.ts`) separate from grid state
- The confirmation dialog should be a standalone Angular component using the existing modal/dialog pattern
- Inhabitant displacement depends on the inhabitant assignment system (Issue #13); stub if not yet built
- Refund calculation depends on the resource manager (Issue #7)
- The altar's non-removable flag should be defined in `gamedata/room/` YAML as a boolean property
- Ensure the removal transaction is atomic: if any step fails, no partial removal occurs

## Success Metrics
- Room removal completes within one game tick
- No orphaned data (tile references, inhabitant assignments) after removal
- Altar removal is always prevented regardless of approach

## Open Questions
- Should there be a cooldown or cost to remove rooms (beyond the 50% loss)?
- Should the game warn if removing a room will leave inhabitants with no valid assignment?
- Can rooms be removed while the game is paused?
