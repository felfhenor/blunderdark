# PRD: Tutorial Sequence

## Introduction
The Tutorial Sequence guides new players through Blunderdark's core mechanics on first launch. It teaches room placement, resource generation, inhabitant management, and room connections through interactive steps that require the player to complete actions before proceeding. The tutorial can be skipped and replayed.

## Goals
- Teach core mechanics: room placement, resources, inhabitants, connections
- Use interactive steps (player performs action, tutorial advances)
- Support skipping the tutorial entirely
- Provide tooltip hints during tutorial steps
- Trigger automatically on first launch, replayable from settings

## User Stories

### US-001: Tutorial State Management
**Description:** As a developer, I want tutorial state tracked so that the game knows whether to show the tutorial and which step the player is on.

**Acceptance Criteria:**
- [ ] A `TutorialState` type tracks: `isComplete`, `isSkipped`, `currentStep`, `hasSeenTutorial`
- [ ] Tutorial state is persisted via `localStorageSignal`
- [ ] On first launch (no saved state), `hasSeenTutorial` is false
- [ ] Completing or skipping the tutorial sets `isComplete` or `isSkipped` to true
- [ ] Unit tests verify state transitions
- [ ] Typecheck/lint passes

### US-002: Tutorial Trigger on First Launch
**Description:** As a new player, I want the tutorial to start automatically when I first play the game so that I learn the basics.

**Acceptance Criteria:**
- [ ] When the player reaches the game-play page with `hasSeenTutorial: false`, the tutorial starts
- [ ] The tutorial overlay appears with a welcome message and "Start Tutorial" / "Skip" buttons
- [ ] Choosing "Start Tutorial" begins Step 1
- [ ] Choosing "Skip" marks the tutorial as skipped and proceeds to free play
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-003: Step 1 - Room Placement
**Description:** As a new player, I want to learn how to place a room so that I can start building my dungeon.

**Acceptance Criteria:**
- [ ] A tooltip highlights the room placement button/area
- [ ] The tutorial text explains: "Click here to select a room, then click on the grid to place it"
- [ ] The player must place at least one room to advance
- [ ] Placing a room triggers a congratulatory message and advances to Step 2
- [ ] Other UI elements are dimmed or disabled during this step
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-004: Step 2 - Resource Generation
**Description:** As a new player, I want to learn about resource generation so that I understand how rooms produce resources.

**Acceptance Criteria:**
- [ ] A tooltip points to the resource display
- [ ] The tutorial explains: "Rooms generate resources over time. Watch your Gold and Food increase."
- [ ] The player must wait for at least one resource tick to see generation
- [ ] After a resource tick, the tutorial highlights the changed values and advances
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Step 3 - Inhabitants
**Description:** As a new player, I want to learn about inhabitants so that I understand how to populate my dungeon.

**Acceptance Criteria:**
- [ ] The tutorial provides a free starting inhabitant
- [ ] A tooltip highlights the inhabitant assignment area
- [ ] The tutorial explains: "Assign inhabitants to rooms to boost production and defend your dungeon"
- [ ] The player must assign the inhabitant to a room to advance
- [ ] After assignment, the tutorial shows the production increase
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-006: Step 4 - Connections
**Description:** As a new player, I want to learn about room connections so that I understand how rooms link together.

**Acceptance Criteria:**
- [ ] The tutorial prompts the player to place a second room
- [ ] A tooltip highlights the hallway/connection tool
- [ ] The tutorial explains: "Connect rooms with hallways so inhabitants can travel between them"
- [ ] The player must create a connection between two rooms to advance
- [ ] After connecting, the tutorial congratulates and explains the importance of connections
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-007: Tutorial Completion
**Description:** As a new player, I want the tutorial to end with a summary so that I feel ready to play on my own.

**Acceptance Criteria:**
- [ ] After completing all steps, a summary overlay appears
- [ ] The summary recaps: room placement, resources, inhabitants, connections
- [ ] A "Start Playing" button dismisses the tutorial and begins free play
- [ ] Tutorial state is marked as complete
- [ ] The summary mentions the Help menu for further learning
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-008: Tutorial Replay
**Description:** As a player, I want to replay the tutorial from the settings menu so that I can refresh my knowledge.

**Acceptance Criteria:**
- [ ] A "Replay Tutorial" button exists in the settings/options menu
- [ ] Clicking it resets tutorial state and starts the tutorial from Step 1
- [ ] The replay does not affect the current game state (dungeon is preserved)
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-009: Tutorial Skip at Any Point
**Description:** As a player, I want to skip the tutorial at any step so that I am not forced to complete it.

**Acceptance Criteria:**
- [ ] A "Skip Tutorial" button is visible during all tutorial steps
- [ ] Clicking "Skip" shows a brief confirmation
- [ ] Confirming skip marks the tutorial as skipped and removes the overlay
- [ ] The player can resume normal gameplay immediately
- [ ] **[UI story]** Verify in browser using dev-browser skill

## Functional Requirements
- FR-1: The tutorial must start automatically on first launch
- FR-2: Each step must require the player to complete a specific action
- FR-3: The tutorial must be skippable at any point
- FR-4: Tutorial state must persist across sessions
- FR-5: The tutorial must be replayable from settings

## Non-Goals (Out of Scope)
- Advanced tutorials (combat, research, invasions)
- Video tutorials or external links
- Adaptive tutorials based on player behavior
- Multi-language tutorial text (i18n is separate)

## Technical Considerations
- Depends on Issue #1 (Grid), #5 (Room Placement), #13 (Inhabitants), #17 (Connections)
- Tutorial overlay should be a standalone component layered above the game UI
- Use Angular's `@if` to conditionally render tutorial elements based on current step
- Tutorial step definitions should be data-driven (array of step configs) for maintainability
- Dimming/disabling non-tutorial UI elements requires a CSS overlay or pointer-events manipulation
- Tutorial state uses `localStorageSignal` (not IndexedDB) since it is a UI preference

## Success Metrics
- New players can complete the tutorial in under 3 minutes
- Tutorial steps correctly detect player actions and advance
- Skip functionality works at all steps without leaving stale state
- Tutorial replay starts cleanly without affecting game state

## Open Questions
- Should the tutorial use a dedicated simplified dungeon or the player's actual starting dungeon?
- Should there be different tutorial lengths (quick vs. detailed)?
- Should tutorial completion unlock a small reward (e.g., bonus resources)?
