# PRD: Research Progress System

## Introduction
The Research Progress System manages the tick-based advancement of active research. It handles starting research, advancing progress over time, completing research, and cancellation. Research speed can be modified by Library upgrades, inhabitant bonuses, and other modifiers. Only one research can be active at a time.

## Goals
- Implement the ability to start research by deducting resources
- Advance research progress over game ticks
- Complete research when progress reaches 100% and trigger unlock effects
- Support cancellation with progress loss
- Allow research speed modifiers from buildings and inhabitants
- Persist active research state through save/load

## User Stories

### US-001: Start Research
**Description:** As a player, I want to start research on an available node so that I can progress through the tech tree.

**Acceptance Criteria:**
- [ ] Starting research requires all prerequisite nodes to be completed
- [ ] Starting research deducts the node's cost from the player's resources
- [ ] The research state updates to set the active research node ID and progress to 0
- [ ] Only one research can be active at a time; starting a new one is blocked if one is already active
- [ ] If the player lacks sufficient resources, the start action fails with an error message
- [ ] Unit tests verify resource deduction and state update
- [ ] Typecheck/lint passes

### US-002: Research Tick Advancement
**Description:** As a developer, I want research progress to advance with each game tick so that research takes time to complete.

**Acceptance Criteria:**
- [ ] A research progress handler is integrated into the game loop (`src/app/helpers/gameloop.ts`)
- [ ] Each tick advances the active research progress by a calculated amount
- [ ] Progress is stored as a number from 0 to the required total (not a percentage)
- [ ] The base research rate is configurable per node (e.g., `requiredTicks: 1000`)
- [ ] Progress does not advance when the game is paused
- [ ] Unit tests verify progress advancement per tick
- [ ] Typecheck/lint passes

### US-003: Research Speed Modifiers
**Description:** As a player, I want Library upgrades and inhabitant bonuses to speed up research so that I can optimize my research strategy.

**Acceptance Criteria:**
- [ ] Research speed is a `computed()` signal derived from base rate + modifiers
- [ ] Library rooms add a flat research speed bonus (e.g., +10% per Library level)
- [ ] Inhabitants with Scholar/Scholarly traits add their research bonus to the modifier
- [ ] Modifiers stack additively (base * (1 + sum of bonuses))
- [ ] The computed speed updates reactively when modifiers change
- [ ] Unit tests verify modifier stacking
- [ ] Typecheck/lint passes

### US-004: Research Completion
**Description:** As a developer, I want research to complete automatically when progress reaches the required amount.

**Acceptance Criteria:**
- [ ] When progress >= requiredTicks, the research is marked as completed
- [ ] The node ID is added to the `completedNodes` array in research state
- [ ] The `activeResearch` is set to null and progress is reset to 0
- [ ] A completion event/notification is triggered for the UI
- [ ] The unlock effects for the node are queued for application (handled by Issue #76)
- [ ] Unit tests verify completion logic
- [ ] Typecheck/lint passes

### US-005: Cancel Active Research
**Description:** As a player, I want to cancel active research so that I can change my research priorities, accepting that progress is lost.

**Acceptance Criteria:**
- [ ] A cancel action sets `activeResearch` to null and progress to 0
- [ ] Resources spent to start the research are NOT refunded
- [ ] Progress is lost entirely (no partial credit)
- [ ] The node returns to "available" state (can be researched again)
- [ ] A confirmation dialog is shown before cancellation
- [ ] Unit tests verify cancellation resets state
- [ ] Typecheck/lint passes

### US-006: Persist Research Progress
**Description:** As a player, I want my research progress to be saved so that it survives page reloads and app restarts.

**Acceptance Criteria:**
- [ ] Research state (active node, progress, completed list) is part of `GameStateWorld`
- [ ] State is saved to IndexedDB via `indexedDbSignal`
- [ ] On load, active research resumes from the saved progress
- [ ] Completed nodes are restored and reflected in the UI
- [ ] Unit tests verify save/load round-trip
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must deduct resources when research is started
- FR-2: Research progress must advance each game tick by a computed rate
- FR-3: Only one research can be active at any time
- FR-4: Research speed must be modifiable by Library upgrades and inhabitant traits
- FR-5: Completed research must trigger unlock effect application
- FR-6: Cancelled research must lose all progress without resource refund
- FR-7: Research state must persist through save/load

## Non-Goals (Out of Scope)
- Research queue (multiple queued researches)
- Research sharing between players
- Research tree UI (Issue #74)
- Specific unlock effects (Issue #76)

## Technical Considerations
- Depends on the resource system (Issue #7), game loop (Issue #8), and research tree data (Issue #73)
- Research progress handler should be a pure function called from the game loop
- Speed modifiers should be collected from a centralized modifier aggregation system
- Use `computed()` for derived research speed to ensure reactive updates
- Consider using `effect()` to watch for completion and trigger side effects
- Progress should be stored as ticks completed (integer) not a float percentage

## Success Metrics
- Research starts correctly with resource deduction
- Progress advances at the expected rate per tick
- Speed modifiers correctly accelerate research
- Completion triggers within one tick of reaching the threshold
- Cancel correctly resets all progress

## Open Questions
- Should there be a partial refund option for cancellation?
- Is there a maximum research speed cap?
- Should research speed be displayed in the UI as "ticks remaining" or "estimated time"?
- Can events or abilities pause/slow active research?
