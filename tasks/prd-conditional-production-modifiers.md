# PRD: Conditional Production Modifiers

## Introduction
Conditional production modifiers are dynamic multipliers applied to room production based on game state conditions such as time of day, inhabitant fear/hunger state, floor depth, and biome. These modifiers are applied after base production and adjacency bonuses, stacking multiplicatively to create meaningful gameplay variation.

## Goals
- Define modifier types: time-of-day, fear, hunger, floor depth, biome
- Apply modifiers after base production + adjacency bonuses
- Stack multiple modifiers multiplicatively
- Update modifiers reactively as conditions change
- Provide a clear, extensible modifier system for future condition types

## User Stories

### US-001: Modifier Type Definitions
**Description:** As a developer, I want modifier types defined as data so that new modifiers can be added without refactoring the production pipeline.

**Acceptance Criteria:**
- [ ] A `ProductionModifier` type is defined with `id`, `type`, `multiplier`, `condition`, and `description` fields
- [ ] Modifier types include: `time-of-day`, `fear`, `hunger`, `floor-depth`, `biome`
- [ ] Each modifier has a condition function that evaluates against game state
- [ ] Modifiers are registered in a central registry
- [ ] Typecheck/lint passes

### US-002: Time-of-Day Modifiers
**Description:** As a dungeon builder, I want production to vary by time of day so that gameplay has natural rhythms.

**Acceptance Criteria:**
- [ ] A day/night cycle exists in the game clock
- [ ] Night gives certain rooms a bonus (e.g., Shadow rooms +20% at night)
- [ ] Day gives certain rooms a bonus (e.g., Grove rooms +15% during day)
- [ ] Modifiers transition smoothly (or at defined thresholds) as time changes
- [ ] Typecheck/lint passes

### US-003: Fear-Based Modifiers
**Description:** As the system, I want fear levels to modify production so that fear has gameplay consequences.

**Acceptance Criteria:**
- [ ] Rooms with High or Very High fear apply a production modifier to inhabitants
- [ ] The modifier varies by inhabitant type (some thrive in fear, others suffer)
- [ ] Fear modifiers are recalculated when room fear level changes
- [ ] Typecheck/lint passes

### US-004: Hunger-Based Modifiers
**Description:** As the system, I want hunger state to modify production so that feeding inhabitants matters.

**Acceptance Criteria:**
- [ ] Hungry inhabitants produce at a reduced rate (e.g., 0.5x multiplier)
- [ ] Starving inhabitants produce at a severely reduced rate (e.g., 0.1x multiplier)
- [ ] Fed inhabitants produce at 1.0x (no modifier)
- [ ] Hunger modifiers are recalculated when hunger state changes
- [ ] Typecheck/lint passes

### US-005: Floor Depth and Biome Modifiers
**Description:** As a developer, I want floor depth and biome to apply production modifiers so that dungeon exploration is rewarded.

**Acceptance Criteria:**
- [ ] Deeper floors may grant production bonuses (e.g., +5% per floor depth)
- [ ] Biome types apply modifiers to compatible rooms (e.g., Crystal biome +10% to Mines)
- [ ] Modifiers are applied based on the room's location on the grid
- [ ] Typecheck/lint passes

### US-006: Multiplicative Stacking
**Description:** As a developer, I want modifiers to stack multiplicatively so that the combined effect is balanced and predictable.

**Acceptance Criteria:**
- [ ] Final production = base * (1 + adjacency%) * fearMod * hungerMod * timeMod * depthMod * biomeMod
- [ ] Each modifier is a multiplier (e.g., 0.8 for -20%, 1.2 for +20%)
- [ ] A helper function `applyModifiers(base: number, modifiers: number[]): number` exists
- [ ] Unit tests verify correct stacking with 0, 1, 2, and 5 modifiers
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must support multiple modifier types that evaluate against different aspects of game state.
- FR-2: Modifiers must be applied multiplicatively after base production and additive adjacency bonuses.
- FR-3: Each modifier must have a condition that determines when it is active.
- FR-4: Modifier values must update reactively when their triggering conditions change.
- FR-5: The modifier pipeline must be extensible for future condition types.

## Non-Goals (Out of Scope)
- Base production calculation (handled by Issue #9)
- Adjacency bonus calculation (handled by Issue #22)
- Fear level tracking (handled by Issue #33)
- Hunger system (handled by Issue #35)
- UI display of individual modifiers (future feature)

## Technical Considerations
- Depends on the production system (Issue #9) for the production pipeline.
- Modifier evaluation should be pure functions for testability.
- The production pipeline should accept a list of modifiers and apply them in a defined order.
- Use Angular `computed()` signals to derive active modifiers from game state signals.
- Consider a middleware/pipeline pattern where modifiers are functions that transform a production value.
- Day/night cycle may need a new field in `GameStateClock` or a derived signal.

## Success Metrics
- All modifier types correctly affect production when their conditions are met
- Multiplicative stacking produces mathematically correct results
- Production updates within the same tick as condition changes
- New modifier types can be added with minimal code changes (< 50 lines)

## Open Questions
- Should modifiers have a minimum/maximum clamp to prevent production from going to zero or infinity?
- Should players be able to see a breakdown of all active modifiers on a room?
- How does the day/night cycle length relate to the game tick system?
