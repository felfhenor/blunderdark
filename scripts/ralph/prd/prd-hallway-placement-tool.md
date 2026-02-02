# PRD: Hallway Placement Tool

## Introduction
The hallway placement tool provides a UI workflow for building hallways between non-adjacent rooms. The player selects a source room, then a destination room, previews the calculated path with its cost, and confirms or cancels the build. This tool bridges the pathfinding system and the resource/cost system into a cohesive player experience.

## Goals
- Provide a clear, intuitive UI for building hallways between rooms
- Show a real-time preview of the hallway path on the grid
- Display the total cost (5 Crystals per tile) before confirmation
- Allow the player to cancel without spending resources
- Integrate with pathfinding and resource systems seamlessly

## User Stories

### US-001: Enter Hallway Build Mode
**Description:** As a dungeon builder, I want to activate a "Build Hallway" mode so that I can start the hallway construction workflow.

**Acceptance Criteria:**
- [ ] A "Build Hallway" button exists in the build toolbar
- [ ] Clicking it enters hallway build mode, changing the cursor/UI state
- [ ] Other build actions are disabled while in hallway mode
- [ ] Pressing Escape or clicking a cancel button exits hallway mode
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-002: Select Source Room
**Description:** As a dungeon builder, I want to click on a room to select it as the hallway's starting point so that the system knows where the hallway begins.

**Acceptance Criteria:**
- [ ] In hallway build mode, clicking a room highlights it as the source
- [ ] The source room is visually distinguished (e.g., glowing border)
- [ ] A prompt or tooltip says "Now select the destination room"
- [ ] Clicking an empty tile does nothing (only rooms are valid)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Select Destination and Preview Path
**Description:** As a dungeon builder, I want to click a second room to see a preview of the hallway path and its cost so that I can decide whether to build it.

**Acceptance Criteria:**
- [ ] Clicking a second room triggers pathfinding between the two rooms
- [ ] The calculated path renders as a highlighted overlay on the grid
- [ ] The total tile count and cost (5 Crystals x tiles) are displayed
- [ ] If no valid path exists, a message says "No valid path found"
- [ ] The preview updates if the player selects a different destination
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: Confirm Hallway Build
**Description:** As a dungeon builder, I want to confirm the hallway build so that the hallway is placed and resources are deducted.

**Acceptance Criteria:**
- [ ] A "Confirm" button appears alongside the path preview
- [ ] Clicking Confirm deducts the Crystal cost and places the hallway
- [ ] The hallway tiles are marked as occupied on the grid
- [ ] The hallway data structure is created and added to game state
- [ ] The UI exits hallway build mode after confirmation
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-005: Cancel Hallway Build
**Description:** As a dungeon builder, I want to cancel at any point during the hallway build process so that no resources are spent.

**Acceptance Criteria:**
- [ ] A "Cancel" button is visible throughout the build process
- [ ] Pressing Escape also cancels
- [ ] Canceling removes the path preview from the grid
- [ ] No resources are deducted on cancel
- [ ] The UI returns to normal mode
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-006: Insufficient Resources Feedback
**Description:** As a dungeon builder, I want to see a warning if I cannot afford the hallway so that I understand why I cannot build it.

**Acceptance Criteria:**
- [ ] If the player's Crystal count is less than the hallway cost, the cost text turns red
- [ ] The Confirm button is disabled with a tooltip "Insufficient Crystals"
- [ ] The path preview still shows so the player knows the cost they need
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements
- FR-1: The system must provide a build mode UI that guides the player through source selection, destination selection, preview, and confirmation.
- FR-2: Path preview must use the pathfinding system (Issue #18) to calculate and render the hallway route.
- FR-3: Cost must be displayed as (tile count x 5 Crystals) before confirmation.
- FR-4: The Confirm action must validate sufficient resources before proceeding.
- FR-5: Canceling at any step must clean up all preview state without side effects.

## Non-Goals (Out of Scope)
- Hallway pathfinding algorithm (handled by Issue #18)
- Hallway data persistence details (handled by Issue #20)
- Resource deduction logic (handled by Issue #21)
- Hallway upgrades or decorations
- Demolishing existing hallways (future feature)

## Technical Considerations
- Depends on hallway pathfinding (Issue #18) and resource management (Issue #7).
- The build mode state (source room, destination room, preview path) should be managed with Angular Signals in a service or component state.
- The path preview overlay should render on the grid canvas/component using a distinct visual style (e.g., semi-transparent tiles).
- Consider using Angular's `ChangeDetectionStrategy.OnPush` and signal-driven rendering for the preview overlay.
- The hallway build mode should be a state in a broader "build tool" state machine if one exists.

## Success Metrics
- Players can build hallways between any two rooms with a valid path
- Cost preview matches actual deduction on confirmation
- Cancel at any step has no side effects
- No valid path scenario is communicated clearly to the player

## Open Questions
- Should the player be able to drag to adjust the path, or is the shortest path always used?
- Should there be a maximum hallway length?
- Should the preview show alternative paths if the shortest is very expensive?
