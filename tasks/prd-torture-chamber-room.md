# PRD: Torture Chamber Room

## Introduction
The Torture Chamber is a Tier 2 advanced room with three core functions: extracting information from prisoners, converting prisoners into loyal inhabitants, and generating Corruption. It uses an L-shaped footprint, supports 1 inhabitant (upgradeable to 2), and has a very high base fear level. The Chamber spreads both Corruption and Fear to adjacent rooms, making placement a strategic tradeoff between utility and dungeon stability.

## Goals
- Implement a fully functional Torture Chamber room with L-shaped layout
- Enable information extraction from prisoners
- Enable prisoner-to-inhabitant conversion
- Generate Corruption as a resource
- Support 1 inhabitant with upgradeable capacity to 2
- Implement very high fear level with adjacency Fear/Corruption spread

## User Stories

### US-001: Torture Chamber Room Definition
**Description:** As a developer, I want the Torture Chamber defined in YAML gamedata so that it is available through the content pipeline.

**Acceptance Criteria:**
- [ ] A `torture-chamber.yaml` file exists in the appropriate `gamedata/` directory
- [ ] Fields include: id, name, description, shape (L-shaped), functions (extraction, conversion, corruptionGen), maxInhabitants, baseFearLevel, adjacencyEffects, upgradePaths
- [ ] The shape is L-shaped (defined as a list of tile offsets)
- [ ] The YAML compiles to valid JSON via `npm run gamedata:build`
- [ ] Typecheck/lint passes

### US-002: L-Shaped Room Placement
**Description:** As a dungeon builder, I want to place the Torture Chamber as an L-shaped room on the grid.

**Acceptance Criteria:**
- [ ] The Torture Chamber occupies an L-shaped set of tiles
- [ ] The room can be rotated (4 orientations) during placement
- [ ] Placement validates that all L-shaped tiles are unoccupied
- [ ] The room renders correctly on the grid in all orientations
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Information Extraction
**Description:** As a dungeon builder, I want to extract information from captured prisoners to gain strategic intelligence.

**Acceptance Criteria:**
- [ ] A prisoner can be placed in the Torture Chamber for interrogation
- [ ] Interrogation takes a defined amount of time
- [ ] Successful extraction reveals information (e.g., incoming invasion details, resource locations, enemy weaknesses)
- [ ] Extraction requires at least 1 inhabitant assigned as the interrogator
- [ ] The extracted information is displayed in the game event feed
- [ ] Typecheck/lint passes

### US-004: Prisoner Conversion
**Description:** As a dungeon builder, I want to convert prisoners into loyal inhabitants so that I can expand my workforce.

**Acceptance Criteria:**
- [ ] A prisoner can be placed in the Torture Chamber for conversion
- [ ] Conversion takes a defined amount of time (longer than extraction)
- [ ] Successful conversion transforms the prisoner into a basic inhabitant
- [ ] Converted inhabitants have reduced stats compared to recruited ones (e.g., -20% efficiency)
- [ ] Conversion has a failure chance (prisoner may die or escape)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-005: Corruption Generation
**Description:** As a dungeon builder, I want the Torture Chamber to passively generate Corruption so that I can fuel Corruption-based mechanics.

**Acceptance Criteria:**
- [ ] The Chamber generates a defined amount of Corruption per minute (e.g., 3 Corruption/min)
- [ ] Generation requires at least 1 inhabitant assigned
- [ ] Generation increases when a prisoner is being processed
- [ ] Corruption is added to the Corruption resource pool
- [ ] Typecheck/lint passes

### US-006: Inhabitant Capacity
**Description:** As a dungeon builder, I want the Torture Chamber to hold 1 inhabitant (2 when upgraded).

**Acceptance Criteria:**
- [ ] Base capacity is 1 inhabitant (the torturer)
- [ ] Attempting to assign a 2nd inhabitant is rejected with feedback
- [ ] After the capacity upgrade, the limit increases to 2
- [ ] Current/max inhabitant count is displayed on the room UI
- [ ] Typecheck/lint passes

### US-007: Very High Fear Level
**Description:** As a developer, I want the Torture Chamber to have a very high base fear level reflecting its horrifying nature.

**Acceptance Criteria:**
- [ ] The Chamber's base fear level is set to Very High (4)
- [ ] Fear level is included in the room's gamedata definition
- [ ] Fear level integrates with the fear tracking and propagation systems
- [ ] Typecheck/lint passes

### US-008: Adjacency Corruption Spread
**Description:** As the system, I want the Torture Chamber to spread Corruption to adjacent rooms so that its placement has consequences.

**Acceptance Criteria:**
- [ ] Adjacent rooms gain Corruption over time (e.g., +1 Corruption/min to each adjacent room)
- [ ] Corruption spread rate is defined in the room's gamedata
- [ ] Corruption affects adjacent rooms' inhabitants (fear increase, possible corruption-related effects)
- [ ] Spread is removed if the Chamber is demolished
- [ ] Typecheck/lint passes

### US-009: Adjacency Fear Spread
**Description:** As the system, I want the Torture Chamber to increase fear in adjacent rooms.

**Acceptance Criteria:**
- [ ] Adjacent rooms receive a +1 fear level modifier from the Chamber
- [ ] The fear modifier stacks with the room's base fear level
- [ ] The modifier is removed if the Chamber is demolished
- [ ] Fear spread is visible in the affected room's stats
- [ ] Typecheck/lint passes

### US-010: Upgrade Path - Grand Inquisitor
**Description:** As a dungeon builder, I want an upgrade that improves extraction and conversion success rates.

**Acceptance Criteria:**
- [ ] Upgrade increases extraction speed by 50%
- [ ] Upgrade increases conversion success rate by 25%
- [ ] Upgrade increases max inhabitants from 1 to 2
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-011: Upgrade Path - Corruption Engine
**Description:** As a dungeon builder, I want an upgrade that maximizes Corruption generation.

**Acceptance Criteria:**
- [ ] Upgrade doubles Corruption generation rate
- [ ] Upgrade increases Corruption spread to adjacent rooms
- [ ] Upgrade may unlock Corruption-to-Essence conversion
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-012: Upgrade Path - Fear Amplifier
**Description:** As a dungeon builder, I want an upgrade that weaponizes the Chamber's fear aura for defense.

**Acceptance Criteria:**
- [ ] Upgrade increases fear spread radius (affects rooms 2 tiles away)
- [ ] Upgrade causes invaders who enter affected rooms to suffer a combat penalty
- [ ] Fear level increases to Maximum (5)
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-013: Prisoner Management UI
**Description:** As a dungeon builder, I want a UI to manage prisoners in the Torture Chamber.

**Acceptance Criteria:**
- [ ] The room panel shows current prisoner (if any) and their status
- [ ] Options to start extraction or conversion are available
- [ ] Progress bars show current operation progress
- [ ] Outcome (success/failure) is displayed clearly
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements
- FR-1: The Torture Chamber must be defined in YAML gamedata with all required fields.
- FR-2: The room must use an L-shaped tile layout with rotation support.
- FR-3: Information extraction must consume time and produce strategic intelligence.
- FR-4: Prisoner conversion must transform prisoners into inhabitants with defined success/failure rates.
- FR-5: Corruption must be generated passively when staffed.
- FR-6: Inhabitant capacity must be 1 (base) upgradeable to 2.
- FR-7: Very high fear level must propagate to adjacent rooms.
- FR-8: Corruption must spread to adjacent rooms.
- FR-9: Three mutually exclusive upgrade paths must be implemented.

## Non-Goals (Out of Scope)
- Prisoner capture mechanics (handled by invasion/combat system)
- Corruption system internals (handled by Issue #54)
- Fear propagation system internals (handled by fear system)
- Room placement UI generics (handled by earlier issues)

## Technical Considerations
- Depends on room shape system (Issue #3), room data structure (Issue #5), and Corruption system (Issue #54).
- Prisoner state (current prisoner, operation type, progress) should be stored on the room instance.
- Corruption and Fear adjacency effects should be implemented as modifiers that update when rooms are placed/removed.
- The very high fear level will significantly impact surrounding rooms -- placement should be carefully considered by players.
- L-shaped tile offsets require 4 rotation variants.

## Success Metrics
- Torture Chamber can extract information and convert prisoners correctly
- Corruption is generated at the correct rate
- Fear and Corruption spread to adjacent rooms as defined
- All 3 upgrade paths function correctly and are mutually exclusive
- Prisoner operations persist across save/load

## Open Questions
- Where do prisoners come from (captured invaders? purchased?)?
- What specific information can be extracted and how does it affect gameplay?
- What is the exact conversion success/failure rate?
- Should the Torture Chamber have a limit on total prisoners processed?
