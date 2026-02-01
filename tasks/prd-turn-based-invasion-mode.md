# PRD: Turn-Based Invasion Mode

## Introduction
When an invasion begins, normal real-time gameplay pauses and the game switches to a turn-based combat mode. Invaders and defenders take turns based on initiative (Speed stat). Each unit can perform one action per turn: Move, Attack, or Use Ability. Combat concludes when one side is defeated or retreats.

## Goals
- Implement a mode switch from real-time to turn-based combat when an invasion starts
- Create a queue-based turn system ordered by initiative (Speed stat)
- Support Move, Attack, and Use Ability actions (one per turn)
- End combat when one side is fully defeated or retreats
- Provide clear UI feedback for turn order and current actor

## User Stories

### US-001: Invasion Mode Toggle
**Description:** As a developer, I want to switch the game between real-time and turn-based modes so that invasions use a different gameplay system.

**Acceptance Criteria:**
- [ ] Create `InvasionService` in `src/app/services/` with `providedIn: 'root'`
- [ ] Add `isInvasionActive` signal (boolean)
- [ ] When invasion starts: pause game loop, switch to invasion mode
- [ ] When invasion ends: resume game loop, return to real-time mode
- [ ] Other systems respect the mode flag (no resource ticks during invasion)
- [ ] Typecheck/lint passes

### US-002: Turn Queue System
**Description:** As a developer, I want a turn queue that orders all combatants by Speed stat so that faster units act first.

**Acceptance Criteria:**
- [ ] Build turn queue from all invaders and defenders at invasion start
- [ ] Sort queue by Speed stat (highest first); break ties by defender priority
- [ ] Track the current actor in the queue
- [ ] Advance to next actor after current actor completes their action
- [ ] When all units have acted, start a new round (re-sort queue)
- [ ] Typecheck/lint passes

### US-003: Move Action
**Description:** As a player, I want my defenders to move to adjacent tiles during their turn so that I can position them strategically.

**Acceptance Criteria:**
- [ ] Move action allows movement to an adjacent, unoccupied tile
- [ ] Movement range is 1 tile per turn (upgradeable via Speed stat later)
- [ ] Moving into a tile occupied by an enemy is not allowed (must Attack instead)
- [ ] Move consumes the unit's action for the turn
- [ ] Typecheck/lint passes

### US-004: Attack Action
**Description:** As a player, I want my defenders to attack adjacent enemies during their turn so that I can fight off invaders.

**Acceptance Criteria:**
- [ ] Attack action targets an adjacent enemy unit
- [ ] Attack triggers combat resolution (delegated to combat system)
- [ ] Attack consumes the unit's action for the turn
- [ ] Visual feedback when attack is selected and executed
- [ ] Typecheck/lint passes

### US-005: Use Ability Action
**Description:** As a player, I want my defenders to use special abilities during their turn so that combat has tactical variety.

**Acceptance Criteria:**
- [ ] Use Ability action triggers a unit's special ability (if available)
- [ ] Abilities have targeting rules (self, adjacent, ranged)
- [ ] Ability consumes the unit's action for the turn
- [ ] Units without abilities cannot select this action
- [ ] Typecheck/lint passes

### US-006: AI Turn Execution for Invaders
**Description:** As a developer, I want invaders to automatically execute their turns using simple AI so that the player only controls defenders.

**Acceptance Criteria:**
- [ ] When it is an invader's turn, AI selects an action automatically
- [ ] AI priority: Attack adjacent defender > Move toward objective > Use Ability
- [ ] AI turn executes with a short delay for visual clarity
- [ ] AI does not require player input
- [ ] Typecheck/lint passes

### US-007: Turn Order UI
**Description:** As a player, I want to see the turn order so that I can plan my actions based on who acts next.

**Acceptance Criteria:**
- [ ] Display turn queue as an ordered list showing upcoming actors
- [ ] Highlight the current actor
- [ ] Show at least the next 5 actors in the queue
- [ ] Differentiate invaders from defenders visually (color/icon)
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-008: Action Selection UI
**Description:** As a player, I want to select an action for my defender during their turn so that I can control combat tactically.

**Acceptance Criteria:**
- [ ] When it is a defender's turn, show action buttons (Move, Attack, Use Ability)
- [ ] Disable unavailable actions (e.g., no adjacent enemies for Attack)
- [ ] Highlight valid targets/tiles for the selected action
- [ ] Confirm action on click/tap
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

## Functional Requirements
- FR-1: The system must pause real-time gameplay and enter turn-based mode when an invasion starts.
- FR-2: Turn order must be determined by Speed stat, re-calculated each round.
- FR-3: Each unit gets exactly one action per turn: Move, Attack, or Use Ability.
- FR-4: Invader turns must be handled by AI automatically.
- FR-5: The system must resume real-time gameplay when combat ends.

## Non-Goals (Out of Scope)
- Multi-action turns or action points
- Terrain effects on movement
- Fog of war during invasions
- Multiplayer invasion support
- Invasion pathfinding (covered by #42)
- Combat damage calculation (covered by #43)

## Technical Considerations
- Depends on Inhabitant System (#11) for unit stats (Speed, etc.)
- The invasion mode needs to cleanly pause/resume the game loop from `gameloop.ts`
- Use Angular Signals for all invasion state (turn queue, current actor, mode flag)
- Define invasion-related types in `src/app/interfaces/`
- Consider a state machine pattern for invasion phases (setup, in-progress, resolution)

## Success Metrics
- Mode transitions are seamless with no state corruption
- Turn order is correctly sorted by Speed each round
- AI turns complete within 500ms
- Player can intuitively select and execute actions

## Open Questions
- Should defenders be auto-assigned or manually placed before invasion?
- Can the player skip/end their turn without acting?
- Should there be an undo option for moves (before confirming)?
