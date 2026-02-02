# PRD: Barracks Room

## Introduction
The Barracks is a Tier 2 housing room designed for combat units. It uses an I-shaped (1x4) footprint and can house 6 inhabitants at base (upgradeable to 10). It has a low base fear level that can be removed entirely via upgrade. The Barracks provides a defense rating to the dungeon and has adjacency bonuses with Training Grounds and Trap Workshop, encouraging military cluster builds.

## Goals
- Implement a fully functional Barracks room with I-shaped (1x4) layout
- House combat units with 6 base capacity, upgradeable to 10
- Implement low fear level with option to remove it
- Provide a defense rating bonus to the dungeon
- Define and implement adjacency bonuses for Barracks+Training Grounds, Barracks+Trap Workshop

## User Stories

### US-001: Barracks Room Definition
**Description:** As a developer, I want the Barracks defined in YAML gamedata so that it is available through the content pipeline.

**Acceptance Criteria:**
- [ ] A `barracks.yaml` file exists in the appropriate `gamedata/` directory
- [ ] Fields include: id, name, description, shape (1x4 I-shape), maxInhabitants, baseFearLevel, defenseRating, upgradePaths, adjacencyBonuses
- [ ] The shape is I-shaped (4 tiles in a line)
- [ ] The YAML compiles to valid JSON via `npm run gamedata:build`
- [ ] Typecheck/lint passes

### US-002: I-Shaped Room Placement
**Description:** As a dungeon builder, I want to place the Barracks as a 1x4 I-shaped room on the grid.

**Acceptance Criteria:**
- [ ] The Barracks occupies 4 tiles in a straight line
- [ ] The room can be rotated (2 orientations: horizontal and vertical)
- [ ] Placement validates that all 4 tiles are unoccupied
- [ ] The room renders correctly on the grid in both orientations
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Combat Unit Housing
**Description:** As a dungeon builder, I want the Barracks to house up to 6 combat units (10 when upgraded) so that I can build a standing army.

**Acceptance Criteria:**
- [ ] Base capacity is 6 inhabitants
- [ ] Attempting to assign a 7th inhabitant is rejected with feedback
- [ ] After the capacity upgrade, the limit increases to 10
- [ ] Current/max inhabitant count is displayed on the room UI
- [ ] Inhabitants assigned to the Barracks are marked as "garrisoned" or "combat-ready"
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: Defense Rating Contribution
**Description:** As a dungeon builder, I want the Barracks to provide a defense rating to my dungeon based on its inhabitants.

**Acceptance Criteria:**
- [ ] Each inhabited Barracks contributes a defense rating value
- [ ] Defense rating scales with the number of assigned inhabitants
- [ ] Defense rating is calculated as: base defense + (inhabitants * per-unit bonus)
- [ ] The total defense rating is visible in the dungeon overview UI
- [ ] Defense rating affects invasion difficulty or combat outcomes
- [ ] Typecheck/lint passes

### US-005: Low Fear Level
**Description:** As a developer, I want the Barracks to have a low base fear level that can be removed.

**Acceptance Criteria:**
- [ ] The Barracks' base fear level is set to Low (1)
- [ ] Fear level is included in the room's gamedata definition
- [ ] Fear can be reduced to None (0) via an upgrade path
- [ ] Fear level integrates with the fear tracking system when available
- [ ] Typecheck/lint passes

### US-006: Upgrade Path - Fortified Barracks
**Description:** As a dungeon builder, I want to fortify the Barracks for higher capacity and defense.

**Acceptance Criteria:**
- [ ] Upgrade increases max inhabitants from 6 to 10
- [ ] Upgrade increases base defense rating by +50%
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-007: Upgrade Path - Comfortable Quarters
**Description:** As a dungeon builder, I want a comfort upgrade that removes fear and improves morale.

**Acceptance Criteria:**
- [ ] Upgrade removes fear level (sets to None/0)
- [ ] Upgrade grants a morale bonus to garrisoned inhabitants (+10% combat effectiveness)
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-008: Upgrade Path - War Room
**Description:** As a dungeon builder, I want a war room upgrade that provides strategic bonuses during invasions.

**Acceptance Criteria:**
- [ ] Upgrade provides a global defense buff during invasions (+10% defense to all rooms)
- [ ] Upgrade reduces response time for garrisoned units to reach combat zones
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-009: Adjacency Bonuses
**Description:** As a dungeon builder, I want the Barracks to receive adjacency bonuses from specific room types.

**Acceptance Criteria:**
- [ ] Barracks + Training Grounds adjacency: -20% training time for garrisoned units
- [ ] Barracks + Trap Workshop adjacency: garrisoned units gain trap awareness (avoid friendly traps)
- [ ] Bonuses are defined in gamedata and activate via the adjacency bonus system
- [ ] Typecheck/lint passes

### US-010: Garrison Status Display
**Description:** As a dungeon builder, I want to see the garrison status of the Barracks so I know my combat readiness.

**Acceptance Criteria:**
- [ ] The room panel shows all garrisoned inhabitants with their stats
- [ ] Each inhabitant's combat readiness (trained/untrained) is visible
- [ ] The total defense rating contribution is shown
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements
- FR-1: The Barracks must be defined in YAML gamedata with all required fields.
- FR-2: The room must use a 1x4 I-shaped tile layout with rotation support (2 orientations).
- FR-3: Base housing capacity must be 6 inhabitants, upgradeable to 10.
- FR-4: The Barracks must contribute a defense rating based on its inhabitants.
- FR-5: Three mutually exclusive upgrade paths must be implemented.
- FR-6: Adjacency bonuses for Barracks+Training Grounds, Barracks+Trap Workshop must be defined.

## Non-Goals (Out of Scope)
- Combat resolution system (handled by separate issues)
- Invasion system details (handled by separate issues)
- Room placement UI generics (handled by earlier issues)
- Inhabitant recruitment (handled by separate feature)

## Technical Considerations
- Depends on room shape system (Issue #3), room data structure (Issue #5), and inhabitant data model (Issue #11).
- The I-shape (1x4) is a new shape variant; only 2 rotations needed (horizontal/vertical).
- Defense rating should be a computed value (Angular `computed()` signal) that recalculates when inhabitants change.
- Garrisoned state should be a flag on inhabitant instances when assigned to a Barracks.
- The War Room upgrade's global buff during invasions needs to integrate with the invasion system.

## Success Metrics
- Barracks can be placed in both orientations and houses the correct number of inhabitants
- Defense rating is calculated and displayed correctly
- All 3 upgrade paths function correctly and are mutually exclusive
- Adjacency bonuses activate correctly with qualifying adjacent rooms
- Room and garrison state persist correctly across save/load

## Open Questions
- How is defense rating used in combat calculations?
- Should garrisoned units automatically deploy during invasions?
- What is the exact per-unit defense bonus formula?
- Can non-combat inhabitants be assigned to the Barracks?
