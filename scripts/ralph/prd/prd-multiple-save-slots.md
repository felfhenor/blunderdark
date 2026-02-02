# PRD: Multiple Save Slots

## Introduction
Multiple Save Slots allows players to maintain several independent save files alongside the autosave slot. Players can create, overwrite, and delete manual saves, each displaying useful metadata like timestamp, dungeon name, and playtime. This enables players to experiment with different strategies without losing prior progress.

## Goals
- Provide 3 or more manual save slots plus 1 dedicated autosave slot
- Display save slot metadata (timestamp, dungeon name, playtime, floor count)
- Support creating, overwriting, and deleting saves
- Present a clear save/load UI accessible from the game menu

## User Stories

### US-001: Save Slot Data Structure
**Description:** As a developer, I want a save slot metadata structure so that each slot displays useful information to the player.

**Acceptance Criteria:**
- [ ] A `SaveSlotMeta` type is defined with: `slotId`, `timestamp`, `dungeonName`, `playtime` (seconds), `floorCount`, `roomCount`, `dayNumber`, `isEmpty: boolean`
- [ ] The autosave slot has a reserved `slotId` (e.g., `'autosave'`)
- [ ] Manual slots have IDs `'slot-1'`, `'slot-2'`, `'slot-3'`
- [ ] Types use `type` keyword per project conventions
- [ ] Typecheck/lint passes

### US-002: Save Slot Selection UI
**Description:** As a player, I want to see all save slots with their metadata so that I can choose where to save or which save to load.

**Acceptance Criteria:**
- [ ] A `SaveSlotsComponent` (standalone, OnPush) displays all save slots in a list/grid
- [ ] Each slot shows: slot name, timestamp (formatted), dungeon name, playtime, "Empty" if unused
- [ ] The autosave slot is visually distinct and labeled "Autosave"
- [ ] Empty slots show a "New Save" option
- [ ] Occupied slots show "Overwrite" and "Load" options
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-003: Save to Specific Slot
**Description:** As a player, I want to save my game to a specific slot so that I can organize my saves.

**Acceptance Criteria:**
- [ ] Clicking "Save" on an empty slot creates a new save in that slot
- [ ] Clicking "Overwrite" on an occupied slot shows a confirmation dialog
- [ ] Confirming overwrite replaces the existing save data and updates metadata
- [ ] After saving, the slot metadata updates to reflect the new save
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-004: Load from Specific Slot
**Description:** As a player, I want to load a game from a specific slot so that I can resume from that point.

**Acceptance Criteria:**
- [ ] Clicking "Load" on an occupied slot shows a confirmation if a game is in progress
- [ ] Confirming load deserializes the save and transitions to the game-play page
- [ ] Loading the autosave slot works identically to manual slots
- [ ] Loading from the main menu (no game in progress) does not require confirmation
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Delete Save Slot
**Description:** As a player, I want to delete a save so that I can free up a slot.

**Acceptance Criteria:**
- [ ] Each occupied slot has a "Delete" button
- [ ] Clicking "Delete" shows a confirmation dialog warning that the save will be permanently removed
- [ ] Confirming delete clears the slot data from IndexedDB and resets metadata to empty
- [ ] The autosave slot cannot be manually deleted (only overwritten by autosave)
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-006: Save Slot Storage Management
**Description:** As a developer, I want save slots stored efficiently in IndexedDB so that multiple saves do not exceed storage limits.

**Acceptance Criteria:**
- [ ] Each save slot is stored as a separate IndexedDB entry keyed by slot ID
- [ ] Save slot metadata is stored in a separate lightweight index for fast listing
- [ ] Total storage usage is estimated and displayed in the save UI
- [ ] If IndexedDB storage is near capacity, a warning is shown
- [ ] Unit tests verify slot CRUD operations
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must support at least 3 manual save slots and 1 autosave slot
- FR-2: Each slot must display metadata including timestamp, dungeon name, and playtime
- FR-3: Players must be able to save to, load from, and delete specific slots
- FR-4: Overwrite and delete operations must require confirmation
- FR-5: The autosave slot must be protected from manual deletion

## Non-Goals (Out of Scope)
- Save file export/import
- Cloud save synchronization
- Unlimited save slots
- Save file comparison or diff

## Technical Considerations
- Depends on Issue #103 (Comprehensive Save System) for serialization
- IndexedDB object store should use slot IDs as keys
- Metadata should be stored separately from full save data so slot listing is fast
- Consider using IndexedDB transactions to ensure atomicity of save operations
- Save slot count (3) should be a configurable constant for future expansion

## Success Metrics
- Players can save to, load from, and delete all slots without errors
- Slot metadata displays accurate information for all occupied slots
- Overwrite and delete confirmations prevent accidental data loss
- Slot listing loads within 100ms even with all slots occupied

## Open Questions
- Should the number of manual save slots be expandable (e.g., purchase more slots)?
- Should saves include a visual thumbnail of the dungeon?
- Should there be a "quick save" shortcut that saves to the most recently used slot?
