# PRD: Fusion Interface

## Introduction
The Fusion Interface is a UI system that allows players to select two inhabitants and fuse them into a new hybrid creature. It displays fusion result previews when a known recipe exists, shows the fusion cost in resources and Essence, and provides a confirmation flow that removes the original inhabitants and adds the resulting hybrid. The interface also provides a way to browse all available fusion recipes.

## Goals
- Implement a fusion selection UI for choosing two inhabitants to fuse
- Show fusion result previews when a matching recipe exists
- Display fusion costs (resources + Essence) before confirmation
- Implement confirm/cancel flow with clear feedback
- Provide a recipe browser showing all available fusion combinations

## User Stories

### US-001: Open Fusion Interface
**Description:** As a dungeon builder, I want to access a fusion interface so that I can combine inhabitants into hybrids.

**Acceptance Criteria:**
- [ ] A "Fusion" button or menu option is accessible from the inhabitant roster or a dedicated UI area
- [ ] The fusion interface opens as a modal or dedicated panel
- [ ] The interface is only available when the player has at least 2 inhabitants
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-002: Select First Inhabitant
**Description:** As a dungeon builder, I want to select the first inhabitant for fusion from a list of my available inhabitants.

**Acceptance Criteria:**
- [ ] A scrollable list of available inhabitants is shown
- [ ] Each inhabitant entry shows: name, type, stats summary, current assignment
- [ ] Selecting an inhabitant highlights it and moves to the second selection step
- [ ] Inhabitants currently in use (assigned to rooms) can still be selected with a warning
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Select Second Inhabitant
**Description:** As a dungeon builder, I want to select the second inhabitant for fusion so that the system can determine if a valid recipe exists.

**Acceptance Criteria:**
- [ ] After selecting the first inhabitant, the list updates to show remaining inhabitants
- [ ] The first selected inhabitant is shown in a "Slot A" display
- [ ] Selecting the second inhabitant places it in "Slot B"
- [ ] Invalid combinations (no recipe) show a "No recipe found" message
- [ ] Valid combinations immediately show the fusion preview
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: Fusion Result Preview
**Description:** As a dungeon builder, I want to see a preview of the fusion result before committing so that I can make informed decisions.

**Acceptance Criteria:**
- [ ] When a valid recipe exists, the preview shows: hybrid name, type, sprite, predicted stats
- [ ] Stats are shown with comparison indicators (higher/lower than parents)
- [ ] Inherited traits from both parents are listed
- [ ] Any unique bonus traits are highlighted
- [ ] If no recipe exists, a clear "Unknown combination" message is shown
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-005: Display Fusion Cost
**Description:** As a dungeon builder, I want to see the fusion cost in resources and Essence before confirming.

**Acceptance Criteria:**
- [ ] The fusion cost is displayed prominently (Essence amount + any other resources)
- [ ] Current resource amounts are shown next to required amounts
- [ ] Insufficient resources are highlighted in red
- [ ] The "Confirm" button is disabled if resources are insufficient
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-006: Confirm Fusion
**Description:** As a dungeon builder, I want to confirm the fusion to create the hybrid, removing the original inhabitants.

**Acceptance Criteria:**
- [ ] A confirmation dialog warns that both original inhabitants will be permanently consumed
- [ ] Confirming deducts the resource cost from the player's resources
- [ ] Both original inhabitants are removed from the roster
- [ ] The new hybrid inhabitant is added to the roster
- [ ] If either parent was assigned to a room, that room's inhabitant slot is freed
- [ ] A success notification is shown with the new hybrid's details
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-007: Cancel Fusion
**Description:** As a dungeon builder, I want to cancel the fusion at any point before confirmation.

**Acceptance Criteria:**
- [ ] A "Cancel" button is always visible during the fusion flow
- [ ] Canceling returns to the previous state with no changes
- [ ] The selected inhabitants are deselected
- [ ] No resources are consumed on cancel
- [ ] Typecheck/lint passes

### US-008: Recipe Browser
**Description:** As a dungeon builder, I want to browse all available fusion recipes so that I can plan my fusions.

**Acceptance Criteria:**
- [ ] A "Recipes" tab or section in the fusion interface shows all known recipes
- [ ] Each recipe shows: Creature A + Creature B = Hybrid C
- [ ] Recipe cost (Essence + resources) is displayed
- [ ] Recipes the player can currently perform (has both creatures + resources) are highlighted
- [ ] Recipes can be filtered or searched
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-009: Fusion Animation/Feedback
**Description:** As a dungeon builder, I want visual feedback during the fusion process for a satisfying experience.

**Acceptance Criteria:**
- [ ] A brief animation or transition plays when fusion is confirmed
- [ ] The two parent sprites merge or transform into the hybrid sprite
- [ ] The animation does not block gameplay for more than 2-3 seconds
- [ ] Animation can be skipped with a click
- [ ] Typecheck/lint passes

### US-010: Fusion State Persistence
**Description:** As a developer, I want fusion results to persist correctly in game state.

**Acceptance Criteria:**
- [ ] Hybrid inhabitants are saved to IndexedDB as part of the game state
- [ ] Hybrid inhabitants have a `fusedFrom` field recording parent IDs
- [ ] Loading a saved game correctly restores all hybrids
- [ ] Undo is not supported after fusion (permanent operation)
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The fusion interface must allow selecting exactly two inhabitants.
- FR-2: When a valid recipe matches the two selected inhabitants, a preview must be shown.
- FR-3: Fusion cost must be displayed and validated before confirmation.
- FR-4: Confirming fusion must atomically: deduct resources, remove parents, add hybrid.
- FR-5: A recipe browser must show all available fusion combinations.
- FR-6: Fusion results must persist in game state (IndexedDB).

## Non-Goals (Out of Scope)
- Fusion recipe definitions (handled by Issue #93)
- Hybrid stat calculation logic (handled by Issue #94)
- Fusion discovery mechanics (all recipes are visible)
- Multi-fusion chains (fusing hybrids with other creatures)

## Technical Considerations
- Depends on inhabitant data model (Issue #11) and resource system (Issue #7).
- The fusion interface should be an Angular standalone component with OnPush change detection.
- Use Angular Signals for selected inhabitants, preview state, and resource validation.
- The recipe lookup should query the compiled JSON fusion recipes loaded by ContentService.
- The fusion operation must be atomic: use a single state update to remove parents and add hybrid.
- Parent removal must cascade: free room slots, update roster, recalculate defense ratings, etc.

## Success Metrics
- Players can select two inhabitants and see a fusion preview
- Fusion correctly consumes resources and parents, producing a hybrid
- Recipe browser shows all recipes with correct information
- Fusion results persist across save/load
- The UI is responsive and provides clear feedback at each step

## Open Questions
- Should fusion be available from any screen or only from a specific room (e.g., Summoning Circle)?
- Can hybrids be fused again with other creatures?
- Should there be a discovery system where unknown recipes show "???" until performed?
- Is there a cooldown between fusions?
