# PRD: Adjacency Bonus System

## Introduction
The adjacency bonus system rewards players for strategically placing complementary rooms next to each other. When two rooms of specific types are both adjacent and connected, production bonuses are applied. Bonuses stack when multiple qualifying rooms are adjacent, encouraging thoughtful dungeon layout planning.

## Goals
- Define adjacency bonus rules per room type pair (e.g., Mine + Forge = +30%)
- Detect when bonus conditions are met (rooms adjacent AND connected)
- Apply bonuses to production calculations as percentage modifiers
- Support stacking bonuses from multiple adjacent rooms
- Provide a data-driven bonus definition system for easy content expansion

## User Stories

### US-001: Adjacency Bonus Definition Data
**Description:** As a developer, I want adjacency bonuses defined in a data structure so that new bonuses can be added without code changes.

**Acceptance Criteria:**
- [ ] An `AdjacencyBonus` type is defined with `roomTypeA`, `roomTypeB`, `bonusPercent`, and `description` fields
- [ ] A registry/map of all adjacency bonuses exists (e.g., in YAML gamedata or a constants file)
- [ ] Bonuses are bidirectional: Mine+Forge is the same as Forge+Mine
- [ ] Example bonuses defined: Mine+Forge (+30%), Grove+Lake (+40%)
- [ ] Typecheck/lint passes

### US-002: Bonus Activation Detection
**Description:** As the system, I want to detect when an adjacency bonus should activate so that production is enhanced when conditions are met.

**Acceptance Criteria:**
- [ ] A function checks if two rooms satisfy a bonus condition: same types as a defined bonus, adjacent, and connected
- [ ] The check runs when rooms are placed, connected, or disconnected
- [ ] Active bonuses are stored in the game state per room
- [ ] Unit tests verify activation for valid pairs and non-activation for invalid pairs
- [ ] Typecheck/lint passes

### US-003: Apply Bonus to Production
**Description:** As the system, I want active adjacency bonuses to modify room production so that players see tangible benefits from good placement.

**Acceptance Criteria:**
- [ ] Production calculation includes adjacency bonus as a percentage modifier
- [ ] Base production * (1 + sum of bonus percentages) = modified production
- [ ] If a Mine (5 Crystals/min base) is adjacent to a Forge (+30%), it produces 6.5 Crystals/min
- [ ] Production updates immediately when bonuses activate or deactivate
- [ ] Typecheck/lint passes

### US-004: Stacking Multiple Bonuses
**Description:** As a dungeon builder, I want bonuses from multiple adjacent rooms to stack so that I am rewarded for complex layouts.

**Acceptance Criteria:**
- [ ] If a Mine is adjacent to both a Forge (+30%) and another Mine (+10%), the Mine gets +40% total
- [ ] Each qualifying adjacent room contributes its bonus independently
- [ ] There is no cap on stacked bonuses (or a defined cap if design requires)
- [ ] The stacking behavior is documented and tested
- [ ] Typecheck/lint passes

### US-005: Bonus Deactivation
**Description:** As the system, I want bonuses to deactivate when conditions are no longer met so that the system stays accurate.

**Acceptance Criteria:**
- [ ] Disconnecting two rooms removes their adjacency bonus
- [ ] Removing a room removes all bonuses it was providing to neighbors
- [ ] Production recalculates immediately after bonus deactivation
- [ ] Unit tests verify deactivation scenarios
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must define adjacency bonuses as data, mapping room type pairs to percentage modifiers.
- FR-2: Bonuses must only activate when rooms are both adjacent AND connected.
- FR-3: Bonuses must apply as additive percentage modifiers to base production.
- FR-4: Multiple bonuses on a single room must stack additively.
- FR-5: Bonuses must deactivate immediately when adjacency or connection conditions change.

## Non-Goals (Out of Scope)
- Synergy detection beyond simple adjacency pairs (handled by Issue #23)
- Tooltip display of bonuses (handled by Issue #24)
- Conditional modifiers like time-of-day (handled by Issue #25)
- Bonus animations or visual effects on rooms

## Technical Considerations
- Depends on production system (Issue #9), adjacency detection (Issue #16), and direct adjacency connection (Issue #17).
- Bonus definitions could live in YAML gamedata alongside room definitions, or in a separate `adjacency-bonuses.yaml`.
- The bonus calculation should be a pure function that takes room type, adjacent connected rooms, and bonus registry as inputs.
- Use Angular Signals to reactively propagate production changes when bonuses change.
- Consider storing active bonuses per room in the game state for quick access and display.

## Success Metrics
- All defined room type pair bonuses activate correctly when conditions are met
- Production values reflect bonuses accurately
- Stacking produces correct cumulative results
- Bonus deactivation is immediate and accurate

## Open Questions
- Should bonuses have a visual effect on the room (e.g., sparkle animation)?
- Should there be a "bonus log" showing recent bonus activations?
- Are bonus percentages always additive, or could future bonuses be multiplicative?
