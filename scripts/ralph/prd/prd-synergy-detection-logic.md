# PRD: Synergy Detection Logic

## Introduction
Synergy detection extends beyond simple adjacency bonuses to evaluate complex multi-factor conditions. Synergies consider room types, inhabitant assignments, connection states, and potentially other game state factors. The system checks all rooms for synergy conditions, caches results, and updates when relevant state changes.

## Goals
- Evaluate complex synergy conditions involving rooms, inhabitants, and connections
- Track active synergies per room in the game state
- Update synergy state reactively when rooms, inhabitants, or connections change
- Cache synergy results to avoid redundant computation
- Provide a query API for other systems to check active synergies

## User Stories

### US-001: Synergy Condition Definitions
**Description:** As a developer, I want synergy conditions defined as data so that new synergies can be added declaratively.

**Acceptance Criteria:**
- [ ] A `Synergy` type is defined with `id`, `name`, `conditions`, `effects`, and `description` fields
- [ ] Conditions support: room type check, inhabitant type check, adjacency check, connection check
- [ ] A registry of all synergies exists (data-driven, in YAML or constants)
- [ ] At least 5 example synergies are defined
- [ ] Typecheck/lint passes

### US-002: Synergy Evaluation on Room Placement
**Description:** As the system, I want synergies evaluated whenever a room is placed so that new synergies activate immediately.

**Acceptance Criteria:**
- [ ] When a room is placed, all synergies involving that room type are checked
- [ ] Synergies that now meet all conditions are activated and stored in game state
- [ ] Adjacent rooms are also re-evaluated for synergies that involve the new room
- [ ] Typecheck/lint passes

### US-003: Synergy Evaluation on Inhabitant Assignment
**Description:** As the system, I want synergies re-evaluated when inhabitants are assigned to or removed from rooms so that inhabitant-dependent synergies stay accurate.

**Acceptance Criteria:**
- [ ] Assigning an inhabitant triggers synergy re-evaluation for that room
- [ ] Removing an inhabitant triggers synergy re-evaluation for that room
- [ ] Synergies requiring specific inhabitant types activate/deactivate correctly
- [ ] Typecheck/lint passes

### US-004: Synergy Evaluation on Connection Changes
**Description:** As the system, I want synergies re-evaluated when rooms are connected or disconnected so that connection-dependent synergies stay accurate.

**Acceptance Criteria:**
- [ ] Connecting two rooms triggers synergy re-evaluation for both rooms
- [ ] Disconnecting rooms triggers synergy re-evaluation for both rooms
- [ ] Synergies requiring connected rooms activate/deactivate correctly
- [ ] Typecheck/lint passes

### US-005: Active Synergy Tracking
**Description:** As a developer, I want active synergies tracked per room so that the UI and production systems can easily access them.

**Acceptance Criteria:**
- [ ] Each room in the game state has an `activeSynergies: string[]` field (synergy IDs)
- [ ] A function `getActiveSynergies(roomId: string): Synergy[]` returns full synergy objects
- [ ] Active synergies persist across save/load
- [ ] Typecheck/lint passes

### US-006: Synergy Result Caching
**Description:** As a developer, I want synergy evaluation results cached so that repeated queries do not re-evaluate conditions unnecessarily.

**Acceptance Criteria:**
- [ ] Synergy results are cached per room
- [ ] Cache is invalidated when relevant state changes (room placement, inhabitant change, connection change)
- [ ] Cache invalidation is scoped: only affected rooms are re-evaluated, not the entire dungeon
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must evaluate synergy conditions that can involve room types, inhabitant types, adjacency, and connection state.
- FR-2: Synergy evaluation must trigger automatically on room placement, inhabitant assignment, and connection changes.
- FR-3: Active synergies must be tracked per room in the game state.
- FR-4: Synergy results must be cached and invalidated only when relevant state changes.
- FR-5: The system must expose query APIs for the UI and production systems to access active synergies.

## Non-Goals (Out of Scope)
- Synergy tooltip display (handled by Issue #24)
- Production modifier application (handled by Issues #9 and #22)
- Conditional modifiers unrelated to synergies (handled by Issue #25)
- Cross-floor synergies

## Technical Considerations
- Depends on production system (Issue #9), inhabitant management (Issue #13), and adjacency bonus system (Issue #22).
- Synergy evaluation should be implemented as a service in `src/app/services/` with pure evaluation helpers in `src/app/helpers/`.
- Use Angular Signals for reactive synergy state; `computed()` signals can derive synergy status from room/inhabitant/connection signals.
- Consider a rule engine pattern where each synergy has a `checkConditions(context): boolean` function.
- Keep synergy definitions in gamedata YAML for content pipeline consistency.

## Success Metrics
- All defined synergies activate and deactivate correctly based on their conditions
- Synergy state updates within the same game tick as the triggering change
- Cache hit rate above 90% during normal gameplay (most queries served from cache)
- No stale synergy data after any state change

## Open Questions
- Should synergies have tiers (e.g., basic synergy at 2 rooms, enhanced at 3)?
- Can synergies have negative effects (anti-synergies)?
- Should synergy evaluation order matter (e.g., priority system)?
