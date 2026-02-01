# PRD: Environmental Features

## Introduction
Environmental Features are room attachments that leverage the dungeon's natural environment to provide thematic bonuses. These include Coffins for undead, Bioluminescent Moss for ambient production, Arcane Crystals for magic, Blood Altars for sacrifice mechanics, Geothermal Vents for fire bonuses, and Fungal Networks for room connectivity. Each feature adds strategic depth and thematic flavor.

## Goals
- Implement six distinct environmental features with unique mechanics
- Define all features in YAML gamedata for the content pipeline
- Integrate each feature's bonuses with the feature attachment system (Issue #97)
- Ensure each feature has clear visual representation and tooltips
- Balance features to encourage diverse playstyles

## User Stories

### US-001: Coffins Feature
**Description:** As a player, I want to attach Coffins to a room so that it supports an additional undead inhabitant with reduced Fear.

**Acceptance Criteria:**
- [ ] Coffins feature is defined in gamedata YAML with: cost, bonuses (+1 undead capacity, -1 Fear for undead)
- [ ] Attaching Coffins increases the room's undead inhabitant capacity by 1
- [ ] Undead inhabitants in the room receive -1 Fear modifier
- [ ] The bonus only applies to undead-type inhabitants (not living)
- [ ] Feature displays a coffin icon on the room
- [ ] Unit tests verify capacity increase and Fear reduction
- [ ] Typecheck/lint passes

### US-002: Bioluminescent Moss Feature
**Description:** As a player, I want to attach Bioluminescent Moss so that it reduces Fear and boosts adjacent room production.

**Acceptance Criteria:**
- [ ] Bioluminescent Moss is defined in gamedata with: cost, bonuses (-1 Fear, +5% adjacent production)
- [ ] The room's Fear value decreases by 1 when Moss is attached
- [ ] Adjacent rooms (connected neighbors) receive a +5% production modifier
- [ ] Adjacent bonus recalculates when rooms are added/removed nearby
- [ ] Feature displays a glowing moss visual indicator
- [ ] Unit tests verify Fear reduction and adjacency bonus calculation
- [ ] Typecheck/lint passes

### US-003: Arcane Crystals Feature
**Description:** As a player, I want to attach Arcane Crystals so that the room generates Flux and improves magic efficiency.

**Acceptance Criteria:**
- [ ] Arcane Crystals is defined in gamedata with: cost, bonuses (+1 Flux/min, +15% magic efficiency)
- [ ] The room generates 1 additional Flux per minute when Crystals are attached
- [ ] Magic-related production in the room is increased by 15%
- [ ] Feature displays a crystal icon with a subtle glow effect
- [ ] Unit tests verify Flux generation and magic efficiency modifier
- [ ] Typecheck/lint passes

### US-004: Blood Altar Feature
**Description:** As a player, I want to attach a Blood Altar so that I can sacrifice Food for bonuses while generating Corruption.

**Acceptance Criteria:**
- [ ] Blood Altar is defined in gamedata with: cost, bonuses (sacrifice mechanic, +2 Corruption/min)
- [ ] The room gains a "Sacrifice" action that consumes Food and grants a temporary buff
- [ ] Sacrifice buff options are defined in gamedata (e.g., +production, +combat strength)
- [ ] The room generates +2 Corruption per minute passively when the Altar is attached
- [ ] Sacrifice UI shows Food cost and buff description
- [ ] Feature displays a blood altar icon
- [ ] Unit tests verify Corruption generation and sacrifice mechanic
- [ ] Typecheck/lint passes

### US-005: Geothermal Vents Feature
**Description:** As a player, I want to attach Geothermal Vents so that the room gains production and fire bonuses.

**Acceptance Criteria:**
- [ ] Geothermal Vents is defined in gamedata with: cost, bonuses (+15% production, fire damage bonus)
- [ ] Room production is increased by 15% across all resource types
- [ ] Inhabitants in the room gain a fire damage bonus in combat
- [ ] Feature displays a vent/steam icon
- [ ] Unit tests verify production modifier and fire bonus application
- [ ] Typecheck/lint passes

### US-006: Fungal Network Feature
**Description:** As a player, I want to attach Fungal Networks so that connected rooms can teleport inhabitants between them.

**Acceptance Criteria:**
- [ ] Fungal Network is defined in gamedata with: cost, bonuses (teleport connection)
- [ ] Two rooms with Fungal Networks become linked for instant inhabitant transfer
- [ ] A UI action allows selecting a destination Fungal Network room for transfer
- [ ] Transfer is instant (no travel time through hallways)
- [ ] If a Fungal Network is removed, the link is broken
- [ ] Feature displays a mushroom/mycelium network icon
- [ ] Unit tests verify link creation and destruction
- [ ] Typecheck/lint passes

### US-007: Environmental Features Gamedata
**Description:** As a developer, I want all environmental features defined in YAML so that the content pipeline handles them consistently.

**Acceptance Criteria:**
- [ ] All six environmental features are defined in `gamedata/feature/` YAML files
- [ ] Each definition includes: id, name, description, category (`environmental`), cost, bonuses, visual asset reference
- [ ] The build pipeline validates all feature definitions against the schema
- [ ] `ContentService` loads environmental features and makes them queryable by category
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Each environmental feature must provide its specified bonuses when attached to a room
- FR-2: Bonuses must be removed when the feature is detached
- FR-3: The Blood Altar sacrifice mechanic must consume Food and grant temporary buffs
- FR-4: Fungal Networks must enable instant transport between linked rooms
- FR-5: Bioluminescent Moss must affect adjacent rooms, not just the host room
- FR-6: All features must be defined in YAML gamedata

## Non-Goals (Out of Scope)
- Feature upgrading or leveling
- Environmental hazards (features are always beneficial to the owner)
- Biome-specific feature restrictions
- Animated visual effects for features (handled by Issue #119/120)

## Technical Considerations
- Depends on Issue #97 (Feature Attachment System) for slot mechanics
- Adjacency bonuses (Bioluminescent Moss) require querying the grid for neighboring rooms
- Fungal Network links need a many-to-many relationship data structure
- Blood Altar sacrifice is an active mechanic (player-triggered), unlike passive bonuses
- All costs and bonus values should come from gamedata YAML, not hardcoded

## Success Metrics
- All six environmental features can be purchased, attached, and removed without errors
- Each feature's bonuses are correctly applied and reverted
- Fungal Network teleportation works between any two linked rooms
- Blood Altar sacrifice correctly consumes Food and grants buffs

## Open Questions
- Is there a limit to how many Fungal Networks can be linked together?
- Does the Blood Altar sacrifice have a cooldown?
- Should Geothermal Vents have a risk of fire damage to the room's own inhabitants?
