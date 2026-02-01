# PRD: Summoning Circle Room

## Introduction
The Summoning Circle is a Tier 2 advanced room that summons rare inhabitants and temporary helpers. It uses an L-shaped footprint, supports 1 inhabitant (upgradeable to 2), and has a high base fear level. The Circle enables access to powerful creatures not available through normal recruitment, with adjacency bonuses from Library and Soul Well rooms amplifying its capabilities.

## Goals
- Implement a fully functional Summoning Circle room with L-shaped layout
- Enable summoning of rare inhabitants and temporary helpers
- Support 1 inhabitant with upgradeable capacity to 2
- Implement high fear level
- Define summoning mechanics (cost, time, outcomes)
- Define and implement adjacency bonuses for Summoning Circle+Library, Summoning Circle+Soul Well

## User Stories

### US-001: Summoning Circle Room Definition
**Description:** As a developer, I want the Summoning Circle defined in YAML gamedata so that it is available through the content pipeline.

**Acceptance Criteria:**
- [ ] A `summoning-circle.yaml` file exists in the appropriate `gamedata/` directory
- [ ] Fields include: id, name, description, shape (L-shaped), maxInhabitants, baseFearLevel, summonRecipes, upgradePaths, adjacencyBonuses
- [ ] The shape is L-shaped (defined as a list of tile offsets)
- [ ] The YAML compiles to valid JSON via `npm run gamedata:build`
- [ ] Typecheck/lint passes

### US-002: L-Shaped Room Placement
**Description:** As a dungeon builder, I want to place the Summoning Circle as an L-shaped room on the grid.

**Acceptance Criteria:**
- [ ] The Summoning Circle occupies an L-shaped set of tiles
- [ ] The room can be rotated (4 orientations) during placement
- [ ] Placement validates that all L-shaped tiles are unoccupied
- [ ] The room renders correctly on the grid in all orientations
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Summon Rare Inhabitants
**Description:** As a dungeon builder, I want to use the Summoning Circle to summon rare inhabitants not available through normal recruitment.

**Acceptance Criteria:**
- [ ] At least 3 rare inhabitant types are summonable (e.g., Demon, Elemental, Shadow Beast)
- [ ] Each summon has a defined resource cost (Essence, Crystals, etc.)
- [ ] Summoning takes a defined amount of time to complete
- [ ] The summoned inhabitant is added to the player's roster upon completion
- [ ] Summoning requires at least 1 inhabitant assigned as a summoner
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: Summon Temporary Helpers
**Description:** As a dungeon builder, I want to summon temporary helpers that assist for a limited time.

**Acceptance Criteria:**
- [ ] At least 2 temporary helper types are summonable
- [ ] Temporary helpers have a defined duration (e.g., 10 minutes)
- [ ] Temporary helpers provide a specific bonus (combat aid, production boost, etc.)
- [ ] Helpers automatically despawn when their duration expires
- [ ] A timer shows remaining duration for each active helper
- [ ] Typecheck/lint passes

### US-005: Summoning Interface
**Description:** As a dungeon builder, I want a summoning menu that shows available summons, costs, and cooldowns.

**Acceptance Criteria:**
- [ ] The room panel shows a list of available summon options
- [ ] Each option displays: creature name, resource cost, summoning time, description
- [ ] Unavailable summons (insufficient resources) are grayed out with cost breakdown
- [ ] Active summoning shows a progress indicator
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-006: Inhabitant Capacity
**Description:** As a dungeon builder, I want the Summoning Circle to hold 1 inhabitant (2 when upgraded).

**Acceptance Criteria:**
- [ ] Base capacity is 1 inhabitant (the summoner)
- [ ] Attempting to assign a 2nd inhabitant is rejected with feedback
- [ ] After the capacity upgrade, the limit increases to 2
- [ ] Current/max inhabitant count is displayed on the room UI
- [ ] Typecheck/lint passes

### US-007: High Fear Level
**Description:** As a developer, I want the Summoning Circle to have a high base fear level reflecting its dark ritual nature.

**Acceptance Criteria:**
- [ ] The Summoning Circle's base fear level is set to High (3)
- [ ] Fear level is included in the room's gamedata definition
- [ ] Fear level integrates with the fear tracking and propagation systems
- [ ] Typecheck/lint passes

### US-008: Upgrade Path - Greater Summoning
**Description:** As a dungeon builder, I want an upgrade that unlocks more powerful summon options.

**Acceptance Criteria:**
- [ ] Upgrade unlocks 2+ advanced summon recipes (e.g., Greater Demon, Archon)
- [ ] Advanced summons have higher costs but significantly stronger stats
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-009: Upgrade Path - Dual Circle
**Description:** As a dungeon builder, I want a capacity upgrade that allows 2 summoners to work simultaneously.

**Acceptance Criteria:**
- [ ] Upgrade increases max inhabitants from 1 to 2
- [ ] Two summoners can run parallel summons (reducing effective cooldown)
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-010: Upgrade Path - Binding Mastery
**Description:** As a dungeon builder, I want an upgrade that extends the duration of temporary helpers and grants bonus stats to summoned creatures.

**Acceptance Criteria:**
- [ ] Temporary helpers last 50% longer
- [ ] Permanent summons gain +1 to all stats
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-011: Adjacency Bonuses
**Description:** As a dungeon builder, I want the Summoning Circle to receive adjacency bonuses from specific room types.

**Acceptance Criteria:**
- [ ] Summoning Circle + Library adjacency: -25% summoning time
- [ ] Summoning Circle + Soul Well adjacency: summoned creatures gain +2 HP
- [ ] Bonuses are defined in gamedata and activate via the adjacency bonus system
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The Summoning Circle must be defined in YAML gamedata with all required fields.
- FR-2: The room must use an L-shaped tile layout with rotation support.
- FR-3: Summoning must consume defined resources and produce inhabitants or temporary helpers.
- FR-4: Inhabitant capacity must be 1 (base) upgradeable to 2.
- FR-5: Three mutually exclusive upgrade paths must be implemented.
- FR-6: Adjacency bonuses for Summoning Circle+Library, Summoning Circle+Soul Well must be defined.
- FR-7: Temporary helpers must have defined durations and auto-despawn.

## Non-Goals (Out of Scope)
- Inhabitant stat system details (handled by inhabitant data model)
- Combat AI for summoned creatures (handled by combat system)
- Room placement UI generics (handled by earlier issues)
- Soul Well mechanics (separate room)

## Technical Considerations
- Depends on room shape system (Issue #3), room data structure (Issue #5), resource system (Issue #7), and inhabitant data model (Issue #11).
- Summoning recipes should be defined in YAML alongside or linked from the room definition.
- Temporary helper state (duration timer, active effects) must be tracked in game state and tick down via the game loop.
- Summoned inhabitants should be marked with an origin flag (e.g., `summonedFrom: 'summoning-circle'`).
- The high fear level will significantly impact adjacent rooms via fear propagation.

## Success Metrics
- Summoning Circle can summon rare inhabitants and temporary helpers correctly
- Resource costs are consumed and creatures are added to the roster
- Temporary helpers despawn after their duration expires
- All 3 upgrade paths function correctly and are mutually exclusive
- Adjacency bonuses activate correctly

## Open Questions
- What specific rare creatures are summonable and at what costs?
- Is there a cooldown between summons beyond the summoning time?
- Can summoned creatures be permanently lost (death in combat)?
- Should the Summoning Circle have a failure chance for high-tier summons?
