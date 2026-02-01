# PRD: Inhabitant Assignment System

## Introduction
The inhabitant assignment system allows players to assign inhabitants to rooms, where they work to produce resources or provide other benefits. Each room has a limited number of assignment slots, and the system manages the relationship between inhabitants and rooms.

## Goals
- Allow assigning inhabitants to rooms via click interaction
- Enforce room capacity limits
- Update production calculations when assignments change
- Show visual indicators of assigned inhabitants on rooms

## User Stories

### US-001: View Room Assignment Slots
**Description:** As a player, I want to click a room and see its assignment slots so that I know how many inhabitants it can hold.

**Acceptance Criteria:**
- [ ] Clicking a placed room opens a room detail panel
- [ ] Panel shows room name, type, and current production stats
- [ ] Panel shows assignment slots: filled slots with inhabitant names, empty slots with "Empty" placeholder
- [ ] Max slots per room is defined in room type gamedata
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-002: Assign Inhabitant to Room
**Description:** As a player, I want to assign an unassigned inhabitant to an empty room slot so that they start producing resources.

**Acceptance Criteria:**
- [ ] Clicking an empty slot shows a list of unassigned inhabitants
- [ ] Clicking an inhabitant from the list assigns them to the slot
- [ ] The inhabitant's `assignedRoomId` is updated in game state
- [ ] The room's assigned inhabitants list is updated
- [ ] Assignment is rejected if the room is at max capacity
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-003: Unassign Inhabitant from Room
**Description:** As a player, I want to remove an inhabitant from a room so that I can reassign them elsewhere.

**Acceptance Criteria:**
- [ ] Clicking a filled slot shows an option to "Unassign" the inhabitant
- [ ] Unassigning sets the inhabitant's `assignedRoomId` to `null`
- [ ] The room slot becomes empty and available for a new assignment
- [ ] Production recalculates immediately after unassignment
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-004: Enforce Room Capacity Limits
**Description:** As a developer, I want room capacity enforced so that rooms cannot have more inhabitants than their maximum.

**Acceptance Criteria:**
- [ ] Each room type defines `maxInhabitants` in its gamedata YAML
- [ ] A validation function `canAssignToRoom(roomId)` checks current count vs. max
- [ ] Attempting to assign when full returns an error message
- [ ] The UI disables/hides the assign option when a room is full
- [ ] Unit tests verify capacity enforcement for rooms at 0, partial, and full capacity
- [ ] Typecheck/lint passes

### US-005: Production Update on Assignment Change
**Description:** As a developer, I want production to recalculate when assignments change so that resource generation reflects the current workforce.

**Acceptance Criteria:**
- [ ] Assigning an inhabitant triggers a production recalculation for that room
- [ ] Unassigning an inhabitant triggers a production recalculation for that room
- [ ] The production rate signal updates immediately (within the same tick)
- [ ] Resource UI display reflects the new rates
- [ ] Unit tests verify production changes when inhabitants are assigned/unassigned
- [ ] Typecheck/lint passes

### US-006: Visual Indicators on Grid
**Description:** As a player, I want to see visual indicators on rooms showing how many inhabitants are assigned so that I can spot understaffed rooms.

**Acceptance Criteria:**
- [ ] Each placed room on the grid shows a small indicator: "X/Y" where X is assigned count and Y is max
- [ ] Fully staffed rooms show a green indicator
- [ ] Partially staffed rooms show a yellow indicator
- [ ] Empty rooms show a red indicator (if the room requires inhabitants)
- [ ] Indicators are small and do not obscure the room visual
- [ ] **[UI story]** Verify in browser using dev-browser skill

## Functional Requirements
- FR-1: The system must allow assigning unassigned inhabitants to rooms with available slots
- FR-2: The system must enforce room capacity limits defined in gamedata
- FR-3: The system must update production calculations when assignments change
- FR-4: The system must show visual indicators of assignment status on rooms in the grid
- FR-5: Assignment state must persist as part of game state (via `InhabitantInstance.assignedRoomId`)

## Non-Goals (Out of Scope)
- Drag-and-drop assignment (click-based only for initial implementation)
- Auto-assignment or optimization suggestions
- Inhabitant preferences for room types
- Assignment history or undo
- Inhabitant movement animations between rooms

## Technical Considerations
- Assignment logic should be in `src/app/helpers/assignment.ts`
- The room detail panel can be a standalone component opened by clicking a room on the grid
- Assignment changes should use `updateGamestate()` for atomic state updates
- The unassigned inhabitants list should be a `computed()` signal filtering all inhabitants where `assignedRoomId === null`
- Depends on inhabitant data model (Issue #11), room placement UI (Issue #5) for room interaction, and production system (Issue #9) for recalculation
- Room `maxInhabitants` should be added to room type YAML in `gamedata/room/`

## Success Metrics
- Assignment/unassignment completes within one game tick
- Production updates reflect assignment changes immediately
- No inhabitant can be double-assigned (assigned to two rooms simultaneously)

## Open Questions
- Should some room types restrict which inhabitant types can be assigned (e.g., only undead in crypt)?
- Should inhabitants auto-unassign when their state changes to scared or hungry?
- Can the player swap two inhabitants between rooms in a single action?
