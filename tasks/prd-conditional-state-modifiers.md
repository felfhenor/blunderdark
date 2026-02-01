# PRD: Conditional State Modifiers

## Introduction
Conditional state modifiers apply per-creature effects based on their current state (scared, hungry, or normal). Each creature type has unique reactions to fear and hunger: some creatures produce more when scared, others eat more; some shut down when hungry, others become aggressive. These modifiers affect both production and future combat calculations.

## Goals
- Define per-creature-type effects for scared, hungry, and normal states
- Apply modifiers to production calculations based on current state
- Support future combat modifier application
- Make modifier definitions data-driven for easy content expansion
- Ensure modifiers update reactively as creature states change

## User Stories

### US-001: State Modifier Definitions
**Description:** As a developer, I want per-creature state modifiers defined in gamedata so that effects are data-driven and content-expandable.

**Acceptance Criteria:**
- [ ] Each creature/inhabitant type in gamedata defines `stateModifiers` with entries for `scared`, `hungry`, and `normal`
- [ ] Each state entry specifies: production multiplier, food consumption multiplier, and optional special effects
- [ ] Example: Kobold scared = `{ productionMultiplier: 1.1, foodConsumptionMultiplier: 2.0, description: 'Eats 2x food, +10% production' }`
- [ ] Example: Goblin hungry = `{ productionMultiplier: 0.5, description: '-50% production' }`
- [ ] The YAML compiles correctly via `npm run gamedata:build`
- [ ] Typecheck/lint passes

### US-002: Scared State Detection
**Description:** As the system, I want to determine if an inhabitant is in a scared state based on their fear tolerance and the room's fear level.

**Acceptance Criteria:**
- [ ] Each inhabitant type defines a `fearTolerance` threshold (integer 0-4)
- [ ] An inhabitant is scared when the room's effective fear level exceeds their tolerance
- [ ] The scared state is tracked per inhabitant as a derived value
- [ ] The state updates when room fear or inhabitant assignment changes
- [ ] Typecheck/lint passes

### US-003: Apply Scared Modifiers to Production
**Description:** As the system, I want scared modifiers to affect production so that fear has tangible consequences per creature type.

**Acceptance Criteria:**
- [ ] When an inhabitant is scared, their creature type's `scared.productionMultiplier` is applied
- [ ] The multiplier integrates with the production modifier pipeline (multiplicative)
- [ ] Positive multipliers (>1.0) increase production; negative (<1.0) decrease it
- [ ] The modifier is removed when the inhabitant is no longer scared
- [ ] Typecheck/lint passes

### US-004: Apply Hungry Modifiers to Production
**Description:** As the system, I want hungry modifiers to affect production per creature type so that hunger has varied consequences.

**Acceptance Criteria:**
- [ ] When an inhabitant is hungry, their creature type's `hungry.productionMultiplier` is applied
- [ ] Different creatures respond differently (Goblin: -50%, Imp: -20%, etc.)
- [ ] Starving state may use the same or a separate, more severe modifier
- [ ] The modifier is removed when the inhabitant returns to fed state
- [ ] Typecheck/lint passes

### US-005: Apply Scared Modifiers to Food Consumption
**Description:** As the system, I want scared creatures to consume food at a modified rate so that fear affects resource management.

**Acceptance Criteria:**
- [ ] Scared inhabitants use `scared.foodConsumptionMultiplier` to modify their food rate
- [ ] Example: Kobold scared eats 2x food (multiplier 2.0)
- [ ] The modified rate is used by the hunger system's food deduction
- [ ] The modifier is removed when no longer scared
- [ ] Typecheck/lint passes

### US-006: Normal State (No Modifiers)
**Description:** As the system, I want the normal state to apply no modifiers so that baseline behavior is predictable.

**Acceptance Criteria:**
- [ ] Normal state means: not scared AND not hungry
- [ ] Normal state applies `productionMultiplier: 1.0` and `foodConsumptionMultiplier: 1.0`
- [ ] No special effects are active in normal state
- [ ] Typecheck/lint passes

### US-007: Modifier State Display
**Description:** As a dungeon builder, I want to see which modifiers are active on each inhabitant so that I can manage my workforce.

**Acceptance Criteria:**
- [ ] The inhabitant panel shows active state modifiers (e.g., "Scared: +10% production, 2x food")
- [ ] Active negative modifiers are highlighted in red; positive in green
- [ ] Hovering shows the full modifier details
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-008: Combat Modifier Foundation
**Description:** As a developer, I want the state modifier system to support combat modifiers so that the foundation exists for future combat features.

**Acceptance Criteria:**
- [ ] The state modifier type includes optional `combatModifier` fields (e.g., attack multiplier, defense multiplier)
- [ ] Combat fields can be null/undefined when not yet implemented
- [ ] The type is extensible for future combat attributes
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Each creature type must define state modifiers for scared, hungry, and normal states in gamedata.
- FR-2: Scared state must be determined by comparing room fear level to inhabitant fear tolerance.
- FR-3: State modifiers must affect production and food consumption multiplicatively.
- FR-4: Normal state must apply no modifiers (1.0x multipliers).
- FR-5: Modifiers must update reactively when states change.
- FR-6: The modifier system must support future combat attributes.

## Non-Goals (Out of Scope)
- Combat system implementation (future feature)
- Fear propagation mechanics (handled by Issue #34)
- Hunger system mechanics (handled by Issue #35)
- Global modifiers unrelated to creature state
- Creature morale or happiness systems

## Technical Considerations
- Depends on production system (Issue #9), fear level tracking (Issue #33), and hunger system (Issue #35).
- State modifiers should be loaded from compiled gamedata JSON at runtime.
- Use `computed()` signals to derive each inhabitant's current state (normal, scared, hungry) from room fear and hunger signals.
- The production pipeline should accept creature-state modifiers alongside other modifier types.
- Consider a `StateModifierService` that evaluates all inhabitants and provides modifier data.
- Food consumption modification requires coordination with the hunger system's deduction logic.

## Success Metrics
- All creature types have defined state modifiers in gamedata
- Scared/hungry modifiers apply correctly per creature type
- Production values match expected calculations with modifiers
- Food consumption rates are modified correctly for scared creatures
- Modifier state changes propagate within the same game tick

## Open Questions
- Should multiple states stack (e.g., scared AND hungry at the same time)?
- If states stack, are the multipliers combined multiplicatively or additively?
- Should there be a "panicked" state when both scared and hungry simultaneously?
- What happens to combat modifiers for peaceful/non-combat inhabitants?
