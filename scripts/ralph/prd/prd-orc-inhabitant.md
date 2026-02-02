# PRD: Orc Inhabitant

## Introduction
The Orc is a Tier 2 combat-focused inhabitant with high physical stats. Orcs are aggressive warriors who excel in Barracks, Forges, and War Bands. Their Berserk scared behavior and Grumpy hungry behavior add tactical considerations to dungeon management. Orcs are the primary melee combatants for defending against invasions.

## Goals
- Define complete stat block for the Orc (high HP, high Attack, medium Defense, medium Speed)
- Implement traits: Warrior (+30% Training), Intimidating (+1 Fear), Strong, Aggressive
- Define Berserk (Scared) and Grumpy (Hungry) behavior states
- Enable special room interactions for Barracks, Forge, and War Bands
- Define fusion options for the Orc
- Persist Orc state through save/load cycles

## User Stories

### US-001: Define Orc YAML Data
**Description:** As a developer, I want the Orc defined in a YAML data file with high combat stats.

**Acceptance Criteria:**
- [ ] An Orc entry exists in the gamedata YAML file (e.g., `gamedata/inhabitants/orc.yaml`)
- [ ] Stats are defined: HP (high), Attack (high), Defense (medium), Speed (medium)
- [ ] Tier is set to 2
- [ ] The entry includes display name, description, and sprite reference
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-002: Implement Warrior Trait
**Description:** As a developer, I want the Warrior trait to boost Training speed by 30% so that Orcs level up faster in Barracks.

**Acceptance Criteria:**
- [ ] A `Warrior` trait is defined with a `trainingBonus: 0.3` property
- [ ] When an Orc is assigned to a Barracks, training speed is multiplied by 1.3
- [ ] The bonus stacks correctly with other training modifiers
- [ ] Unit tests verify the 30% training bonus
- [ ] Typecheck/lint passes

### US-003: Implement Intimidating Trait
**Description:** As a developer, I want the Intimidating trait to add +1 Fear to the Orc's assigned room.

**Acceptance Criteria:**
- [ ] An `Intimidating` trait is defined with a `fearBonus: 1` property
- [ ] The room's fear level increases by 1 when an Orc is assigned
- [ ] The bonus is removed when the Orc is unassigned
- [ ] Unit tests verify the fear bonus
- [ ] Typecheck/lint passes

### US-004: Implement Strong and Aggressive Traits
**Description:** As a developer, I want Strong (+2 Attack in combat) and Aggressive (attacks first in combat) traits for the Orc.

**Acceptance Criteria:**
- [ ] A `Strong` trait is defined with an `attackBonus: 2` property (combat only)
- [ ] An `Aggressive` trait is defined that gives priority in combat turn order
- [ ] Strong bonus only applies during combat encounters, not for room production
- [ ] Aggressive modifies the initiative/speed calculation for combat ordering
- [ ] Unit tests verify both traits
- [ ] Typecheck/lint passes

### US-005: Implement Berserk Scared Behavior
**Description:** As a developer, I want the Orc's Scared behavior to be "Berserk" so that frightened Orcs become dangerous rather than fleeing.

**Acceptance Criteria:**
- [ ] When the Orc's fear threshold is exceeded, it enters "Berserk" state
- [ ] Berserk grants +50% Attack but -50% Defense
- [ ] Berserk Orcs may attack friendly inhabitants in the same room
- [ ] The behavior has a duration (e.g., 30 seconds game time) before returning to normal
- [ ] Behavior is defined in the YAML data file
- [ ] Typecheck/lint passes

### US-006: Implement Grumpy Hungry Behavior
**Description:** As a developer, I want the Orc's Hungry behavior to be "Grumpy" so that starving Orcs reduce dungeon morale.

**Acceptance Criteria:**
- [ ] When the Orc becomes hungry, it enters the "Grumpy" state
- [ ] Grumpy Orcs reduce room productivity by 20% for all inhabitants in the same room
- [ ] Grumpy state persists until the Orc is fed
- [ ] A visual or textual indicator shows the Grumpy state
- [ ] Behavior is defined in the YAML data file
- [ ] Typecheck/lint passes

### US-007: Special Room Interactions
**Description:** As a player, I want Orcs to excel in combat-oriented rooms.

**Acceptance Criteria:**
- [ ] When assigned to a Barracks, the Orc gains the Warrior training bonus (+30%)
- [ ] When assigned to a Forge, the Orc provides a weapon crafting speed bonus (+15%)
- [ ] When grouped with 3+ Orcs, they form a War Band gaining +1 Attack each
- [ ] War Band bonus is recalculated when Orcs are assigned or removed
- [ ] Room interaction data is defined in the YAML file
- [ ] Typecheck/lint passes

### US-008: Define Fusion Options
**Description:** As a developer, I want fusion recipes involving the Orc defined for the fusion system.

**Acceptance Criteria:**
- [ ] At least 2 fusion recipes involving the Orc are defined in YAML
- [ ] Each recipe specifies partner creature, result, and cost
- [ ] Fusion data compiles correctly with `npm run gamedata:build`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must load Orc data from compiled JSON at app initialization
- FR-2: Training speed must increase by 30% when an Orc is in a Barracks
- FR-3: Berserk scared behavior must increase Attack by 50% and decrease Defense by 50%
- FR-4: Grumpy hungry behavior must reduce room productivity by 20%
- FR-5: War Band bonus must activate when 3+ Orcs are in the same room
- FR-6: Orc state (including behavior states) must persist through save/load

## Non-Goals (Out of Scope)
- Orc tribal hierarchy or leadership mechanics
- Orc-specific dialogue or events
- Orc breeding or reproduction
- Orc equipment/gear customization

## Technical Considerations
- Depends on the base inhabitant system (Issue #11)
- War Band detection requires tracking inhabitant counts per room, ideally as a `computed()` signal
- Berserk friendly-fire logic needs integration with the combat/damage system
- Grumpy productivity reduction should modify the room's output signal, not individual inhabitant outputs
- Aggressive trait requires a combat initiative system or turn-order mechanism

## Success Metrics
- Orc loads correctly from compiled gamedata
- All four traits function correctly (verified by unit tests)
- Berserk and Grumpy behaviors activate at correct thresholds
- War Band bonus applies correctly with 3+ Orcs

## Open Questions
- What is the exact fear threshold for the Orc to enter Berserk?
- How often does a Berserk Orc attack friendlies (every turn, random chance)?
- Does the War Band bonus apply across adjacent rooms or only the same room?
- Should the Grumpy debuff have a visual effect on the room?
