# PRD: Fear Level Tracking

## Introduction
Fear level tracking assigns and maintains a fear value for each room in the dungeon. Fear levels range from None (0) to Very High (4) and are determined by the room's base fear, modified by its inhabitants. Fear affects inhabitant behavior, production, and willingness to work in a room. This system provides the data foundation for fear propagation and conditional modifiers.

## Goals
- Track fear level per room as an integer (0-4) mapped to an enum
- Set base fear from room type definition
- Allow inhabitants to modify room fear (e.g., Skeleton +1, Dryad -2)
- Display fear level in the room UI
- Provide reactive fear data for other systems (propagation, modifiers)

## User Stories

### US-001: Fear Level Enum and Type
**Description:** As a developer, I want a fear level type defined so that fear values are consistent across the codebase.

**Acceptance Criteria:**
- [ ] A `FearLevel` enum or const object is defined: None(0), Low(1), Medium(2), High(3), VeryHigh(4)
- [ ] A helper function `getFearLabel(level: number): string` returns the human-readable name
- [ ] The type is exported from the interfaces barrel
- [ ] Typecheck/lint passes

### US-002: Base Fear from Room Type
**Description:** As a developer, I want each room type to define a base fear level in its gamedata so that fear is data-driven.

**Acceptance Criteria:**
- [ ] Room YAML definitions include a `baseFearLevel` field (integer 0-4)
- [ ] When a room is placed, its current fear level is initialized to the base
- [ ] The base fear is immutable (only modifiers change the effective level)
- [ ] Typecheck/lint passes

### US-003: Inhabitant Fear Modification
**Description:** As the system, I want inhabitants to modify a room's effective fear level so that room composition matters.

**Acceptance Criteria:**
- [ ] Each inhabitant type defines a `fearModifier` value (e.g., Skeleton: +1, Dryad: -2)
- [ ] When an inhabitant is assigned to a room, the room's effective fear is recalculated
- [ ] Effective fear = base fear + sum of inhabitant fear modifiers
- [ ] Effective fear is clamped to [0, 4]
- [ ] Removing an inhabitant triggers recalculation
- [ ] Typecheck/lint passes

### US-004: Fear Display in Room UI
**Description:** As a dungeon builder, I want to see the fear level of each room so that I can manage my dungeon atmosphere.

**Acceptance Criteria:**
- [ ] Each room's UI panel shows the current fear level (icon + label)
- [ ] Fear level is color-coded: None=white, Low=green, Medium=yellow, High=orange, VeryHigh=red
- [ ] If inhabitants modify fear, the modifier is shown (e.g., "Medium (base) + 1 (Skeleton) = High")
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-005: Reactive Fear Signal
**Description:** As a developer, I want fear levels exposed as Angular Signals so that dependent systems update reactively.

**Acceptance Criteria:**
- [ ] Each room has a `fearLevel` computed signal derived from base + inhabitant modifiers
- [ ] The signal updates when inhabitants are added or removed
- [ ] Other systems (propagation, modifiers, UI) can subscribe to this signal
- [ ] Fear level persists in game state for save/load
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Fear levels must be integers from 0 to 4, mapped to named levels (None through Very High).
- FR-2: Each room type must define a base fear level in YAML gamedata.
- FR-3: Inhabitants must be able to increase or decrease a room's effective fear level.
- FR-4: Effective fear must be clamped to the [0, 4] range.
- FR-5: Fear level must be displayed in the room UI with color coding.
- FR-6: Fear data must be reactive (Angular Signals) and serializable.

## Non-Goals (Out of Scope)
- Fear propagation to adjacent rooms (handled by Issue #34)
- Fear effects on production (handled by Issues #25, #37)
- Fear-based inhabitant refusal (future feature)
- Global fear level or dungeon-wide fear mechanics

## Technical Considerations
- Depends on room data structure (Issue #5) and inhabitant management (Issue #11).
- The `FearLevel` type should be in `src/app/interfaces/fear.ts` or similar.
- Use `computed()` signals to derive effective fear from base + modifiers.
- Inhabitant `fearModifier` should be part of the inhabitant type definition in gamedata.
- Consider storing both `baseFear` and `effectiveFear` on the room instance for display purposes.

## Success Metrics
- All rooms display correct fear levels based on base + inhabitant modifiers
- Fear levels update immediately when inhabitants are assigned/removed
- Fear levels persist correctly across save/load
- Color coding matches fear level consistently

## Open Questions
- Should room upgrades be able to modify base fear, or only effective fear?
- Can fear level go below 0 (e.g., a "calming" room)?
- Should there be a visual effect on the grid for high-fear rooms (e.g., dark overlay)?
