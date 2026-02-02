# PRD: Fear Propagation

## Introduction
Fear propagation causes high-fear rooms to increase the fear level of adjacent rooms. When a room has High or Very High fear, nearby rooms receive a fear increase based on the source's level. Propagation distance is typically 1 tile but can extend further for specific inhabitants (e.g., Medusa). This creates a spatial dimension to fear management.

## Goals
- Propagate fear from high-fear rooms to adjacent rooms
- Define propagation rules based on source fear level
- Support variable propagation distance per inhabitant type
- Update propagation when rooms or inhabitants change
- Integrate with the adjacency detection system

## User Stories

### US-001: Basic Fear Propagation
**Description:** As the system, I want high-fear rooms to increase fear in adjacent rooms so that fear has spatial consequences.

**Acceptance Criteria:**
- [ ] Rooms with High (3) or Very High (4) fear propagate fear to adjacent rooms
- [ ] Adjacent rooms receive +1 fear from a High source, +2 from Very High
- [ ] Propagation only affects rooms detected as adjacent (Issue #16)
- [ ] Propagated fear stacks with the target room's own fear level
- [ ] Effective fear is still clamped to [0, 4]
- [ ] Typecheck/lint passes

### US-002: Propagation Distance
**Description:** As a developer, I want fear propagation to have a configurable distance so that certain creatures can spread fear farther.

**Acceptance Criteria:**
- [ ] Default propagation distance is 1 (only directly adjacent rooms)
- [ ] Specific inhabitant types can extend propagation (e.g., Medusa: distance 2)
- [ ] Distance 2 means rooms adjacent to the adjacent rooms also receive (reduced) fear
- [ ] Fear decreases by 1 per propagation step
- [ ] Typecheck/lint passes

### US-003: Propagation Recalculation Triggers
**Description:** As the system, I want fear propagation to recalculate when relevant state changes so that fear is always accurate.

**Acceptance Criteria:**
- [ ] Propagation recalculates when a room is placed or removed
- [ ] Propagation recalculates when an inhabitant is assigned or removed
- [ ] Propagation recalculates when a room's base fear changes (e.g., via upgrade)
- [ ] Propagation recalculates when rooms are connected or disconnected
- [ ] Typecheck/lint passes

### US-004: Fear Propagation Calculation
**Description:** As a developer, I want a pure function that computes propagated fear for a room so that the logic is testable.

**Acceptance Criteria:**
- [ ] A function `calculatePropagatedFear(room, adjacentRooms, grid): number` exists
- [ ] It sums incoming propagated fear from all adjacent high-fear rooms
- [ ] It accounts for distance attenuation
- [ ] It returns the total propagated fear modifier (not the final clamped value)
- [ ] Unit tests cover: no propagation, single source, multiple sources, distance 2
- [ ] Typecheck/lint passes

### US-005: Propagated Fear Display
**Description:** As a dungeon builder, I want to see which rooms are affected by fear propagation so that I can manage my layout.

**Acceptance Criteria:**
- [ ] Rooms with propagated fear show an indicator (e.g., "Fear: Medium (+1 from adjacent Soul Well)")
- [ ] The source of propagated fear is identified in the tooltip
- [ ] The display distinguishes between base fear, inhabitant modifiers, and propagated fear
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements
- FR-1: Rooms with fear level 3+ must propagate fear to adjacent rooms.
- FR-2: Propagated fear magnitude must depend on the source room's fear level.
- FR-3: Propagation distance must be configurable per inhabitant type, defaulting to 1.
- FR-4: Fear decreases by 1 for each additional propagation step beyond distance 1.
- FR-5: Propagation must recalculate on any relevant state change (room/inhabitant/connection).
- FR-6: Effective fear (base + inhabitants + propagated) must be clamped to [0, 4].

## Non-Goals (Out of Scope)
- Fear effects on production (handled by Issues #25, #37)
- Fear UI indicators beyond room panel (handled by Issue #36)
- Global fear mechanics
- Fear-based events or random occurrences

## Technical Considerations
- Depends on adjacency detection (Issue #16) and fear level tracking (Issue #33).
- Propagation should be computed as a derived value, not stored separately, using `computed()` signals.
- For distance-2 propagation, the adjacency map needs to support "neighbors of neighbors" queries.
- Be careful about circular propagation: Room A propagates to B, B propagates back to A. Use source fear only (not effective fear) for propagation to avoid feedback loops.
- Consider a propagation pass that runs once and sets all propagated values, rather than recursive computation.

## Success Metrics
- Fear propagation correctly increases adjacent rooms' fear levels
- Propagation recalculates within the same tick as triggering changes
- No circular propagation feedback loops
- Distance-based attenuation works correctly

## Open Questions
- Should propagation work through hallway connections, or only direct adjacency?
- Can the Altar's fear reduction counter propagated fear?
- Should there be a visual "fear aura" on the grid showing propagation range?
