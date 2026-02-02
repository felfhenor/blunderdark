# PRD: Underground Lake Room

## Introduction
The Underground Lake is a Tier 2 food production and utility room that generates 5 Food per minute through fishing and provides a humidity aura that boosts adjacent room production by +20%. It uses a T-shaped (3x3) footprint, supports 3 inhabitants (upgradeable to 5), and has no base fear level (upgradeable to Low). Adjacency bonuses with Mushroom Grove and Alchemy Lab rooms create powerful production clusters.

## Goals
- Implement a fully functional Underground Lake room with T-shaped layout
- Generate 5 Food per minute through fishing mechanics
- Provide +20% production bonus to adjacent rooms via humidity aura
- Support 3 inhabitants with upgradeable capacity to 5
- Implement no fear at base (upgradeable to Low)
- Define and implement adjacency bonuses for Lake+Mushroom Grove, Lake+Alchemy Lab

## User Stories

### US-001: Underground Lake Room Definition
**Description:** As a developer, I want the Underground Lake defined in YAML gamedata so that it is available through the content pipeline.

**Acceptance Criteria:**
- [ ] An `underground-lake.yaml` file exists in the appropriate `gamedata/` directory
- [ ] Fields include: id, name, description, shape (T-shaped), baseProduction, humidityAura, maxInhabitants, baseFearLevel, upgradePaths, adjacencyBonuses
- [ ] The shape is T-shaped (defined as a list of tile offsets within a 3x3 bounding box)
- [ ] The YAML compiles to valid JSON via `npm run gamedata:build`
- [ ] Typecheck/lint passes

### US-002: T-Shaped Room Placement
**Description:** As a dungeon builder, I want to place the Underground Lake as a T-shaped room on the grid.

**Acceptance Criteria:**
- [ ] The Underground Lake occupies a T-shaped set of tiles within a 3x3 area
- [ ] The room can be rotated (4 orientations) during placement
- [ ] Placement validates that all T-shaped tiles are unoccupied
- [ ] The room renders correctly on the grid in all orientations with water visual
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Base Food Production (Fishing)
**Description:** As a dungeon builder, I want the Underground Lake to produce 5 Food per minute through fishing so that I can feed my inhabitants.

**Acceptance Criteria:**
- [ ] The Lake produces 5 Food per minute when at least 1 inhabitant is assigned
- [ ] Production is added to the Food resource pool via ResourceManager
- [ ] Production scales with the number of assigned inhabitants
- [ ] Production is visible in the resource display
- [ ] Typecheck/lint passes

### US-004: Humidity Aura
**Description:** As a dungeon builder, I want the Underground Lake to provide a +20% production bonus to adjacent rooms so that placement near production rooms is strategically valuable.

**Acceptance Criteria:**
- [ ] All directly adjacent rooms receive a +20% production modifier
- [ ] The modifier applies to all production types (Food, Crystals, Gold, etc.)
- [ ] The modifier is removed if the Lake is demolished or the adjacency is broken
- [ ] The humidity bonus is visible in the affected room's production breakdown
- [ ] Multiple Lakes do not stack humidity on the same room (or stacking rules are defined)
- [ ] Typecheck/lint passes

### US-005: Inhabitant Capacity
**Description:** As a dungeon builder, I want the Underground Lake to hold up to 3 inhabitants (5 when upgraded).

**Acceptance Criteria:**
- [ ] Base capacity is 3 inhabitants
- [ ] Attempting to assign a 4th inhabitant is rejected with feedback
- [ ] After the capacity upgrade, the limit increases to 5
- [ ] Current/max inhabitant count is displayed on the room UI
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-006: No Base Fear Level
**Description:** As a developer, I want the Underground Lake to have no base fear, reflecting its peaceful nature.

**Acceptance Criteria:**
- [ ] The Lake's base fear level is set to None (0)
- [ ] Fear level is included in the room's gamedata definition
- [ ] An upgrade path can increase fear to Low (1)
- [ ] Typecheck/lint passes

### US-007: Upgrade Path - Deep Fishing
**Description:** As a dungeon builder, I want a fishing upgrade that increases Food production.

**Acceptance Criteria:**
- [ ] Upgrade increases base Food production from 5 to 8 per minute
- [ ] Upgrade may unlock rare fish catches that provide bonus resources
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-008: Upgrade Path - Expanded Lake
**Description:** As a dungeon builder, I want a capacity upgrade that increases inhabitant slots and humidity radius.

**Acceptance Criteria:**
- [ ] Upgrade increases max inhabitants from 3 to 5
- [ ] Upgrade extends humidity aura to rooms 2 tiles away (at reduced effect, e.g., +10%)
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-009: Upgrade Path - Dark Waters
**Description:** As a dungeon builder, I want a dark waters upgrade that adds combat utility and fear.

**Acceptance Criteria:**
- [ ] Upgrade increases fear level to Low (1)
- [ ] Upgrade allows the Lake to spawn aquatic defenders during invasions
- [ ] Aquatic defenders are temporary and guard adjacent rooms
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-010: Adjacency Bonuses
**Description:** As a dungeon builder, I want the Underground Lake to receive adjacency bonuses from specific room types.

**Acceptance Criteria:**
- [ ] Lake + Mushroom Grove adjacency: +40% Food production for both rooms
- [ ] Lake + Alchemy Lab adjacency: +15% conversion speed for the Lab
- [ ] Bonuses are defined in gamedata and activate via the adjacency bonus system
- [ ] Typecheck/lint passes

### US-011: Humidity Aura Visual Indicator
**Description:** As a dungeon builder, I want to see which rooms are affected by the humidity aura so I can optimize placement.

**Acceptance Criteria:**
- [ ] Rooms affected by humidity have a visual indicator (e.g., water droplet icon or blue tint)
- [ ] Hovering over the Lake highlights all affected adjacent rooms
- [ ] The production breakdown for affected rooms shows the humidity bonus as a line item
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements
- FR-1: The Underground Lake must be defined in YAML gamedata with all required fields.
- FR-2: The room must use a T-shaped tile layout with rotation support.
- FR-3: Base production must be 5 Food per minute with at least 1 inhabitant.
- FR-4: The humidity aura must provide +20% production to all directly adjacent rooms.
- FR-5: Inhabitant capacity must be 3 (base) upgradeable to 5.
- FR-6: Three mutually exclusive upgrade paths must be implemented.
- FR-7: Adjacency bonuses for Lake+Mushroom Grove, Lake+Alchemy Lab must be defined.

## Non-Goals (Out of Scope)
- Water as a separate resource type (may be future feature)
- Room placement UI generics (handled by earlier issues)
- Production system internals (handled by Issue #9)
- Invasion combat mechanics (handled by separate issues)

## Technical Considerations
- Depends on room shape system (Issue #3), room data structure (Issue #5), and production system (Issue #9).
- The humidity aura is an adjacency effect, not a standard adjacency bonus. It should be implemented as a production modifier applied to adjacent rooms via the adjacency detection system.
- The aura modifier should recalculate when rooms are added/removed adjacent to the Lake.
- T-shaped tile offsets require 4 rotation variants within a 3x3 bounding box.
- The "Dark Waters" upgrade creates temporary defenders, similar to the Summoning Circle's temporary helpers.

## Success Metrics
- Underground Lake produces Food at the correct rate when staffed
- Humidity aura correctly boosts adjacent room production by 20%
- All 3 upgrade paths function correctly and are mutually exclusive
- Adjacency bonuses activate correctly with qualifying adjacent rooms
- Aura effects update correctly when rooms are added or removed

## Open Questions
- Does the humidity aura apply to rooms connected via hallway, or only directly adjacent tiles?
- How does Food production scale per additional inhabitant?
- Do multiple Lakes' humidity auras stack on the same room?
- What specific aquatic defenders does the Dark Waters upgrade spawn?
