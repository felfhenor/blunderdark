# PRD: Stone Elemental Inhabitant

## Introduction
The Stone Elemental is a Tier 2 inhabitant for Blunderdark dungeons. It is a powerful, slow creature formed from living rock, excelling in mining operations and defensive roles. It requires no food (Inappetent) and gains bonuses when assigned to Mines, Forges, and Ley Lines. This feature adds strategic depth to dungeon workforce management by offering a durable, self-sufficient inhabitant with strong resource-extraction capabilities.

## Goals
- Define complete stat block for the Stone Elemental (HP, Attack, Defense, Speed)
- Implement three traits: Inappetent, Geological (+40% mining output), Sturdy (+1 Defense)
- Define Scared and Hungry behavior states with appropriate fallback logic
- Enable special room interactions for Mines, Forges, and Ley Lines
- Define fusion recipes involving the Stone Elemental
- Persist Stone Elemental data through save/load cycles

## User Stories

### US-001: Define Stone Elemental YAML Data
**Description:** As a developer, I want the Stone Elemental defined in a YAML data file so that it is compiled into the game content pipeline alongside other inhabitants.

**Acceptance Criteria:**
- [ ] A Stone Elemental entry exists in the appropriate gamedata YAML file (e.g., `gamedata/inhabitants/stone-elemental.yaml`)
- [ ] Stats are defined: HP (high), Attack (medium), Defense (high), Speed (low)
- [ ] Tier is set to 2
- [ ] The entry includes display name, description, and sprite reference
- [ ] `npm run gamedata:build` compiles the YAML without errors
- [ ] Typecheck/lint passes

### US-002: Implement Inappetent Trait
**Description:** As a developer, I want the Inappetent trait to exempt the Stone Elemental from hunger mechanics so that it never consumes Food resources.

**Acceptance Criteria:**
- [ ] An `Inappetent` trait is defined in the trait system
- [ ] Inhabitants with the Inappetent trait are excluded from food consumption calculations
- [ ] The Hungry behavior state is never entered for Inappetent inhabitants
- [ ] Unit tests verify that an Inappetent inhabitant does not reduce the Food resource pool
- [ ] Typecheck/lint passes

### US-003: Implement Geological Trait
**Description:** As a developer, I want the Geological trait to boost mining output by 40% so that Stone Elementals are optimal miners.

**Acceptance Criteria:**
- [ ] A `Geological` trait is defined with a `miningBonus: 0.4` property
- [ ] When a Stone Elemental is assigned to a Mine room, its resource output is multiplied by 1.4
- [ ] The bonus stacks correctly with other mining modifiers (additive, not multiplicative)
- [ ] Unit tests verify the 40% mining bonus is applied correctly
- [ ] Typecheck/lint passes

### US-004: Implement Sturdy Trait
**Description:** As a developer, I want the Sturdy trait to grant +1 Defense so that Stone Elementals are naturally resilient.

**Acceptance Criteria:**
- [ ] A `Sturdy` trait is defined with a `defenseBonus: 1` property
- [ ] The +1 Defense bonus is applied to the Stone Elemental's computed Defense stat
- [ ] The bonus is reflected in any UI displaying the inhabitant's stats
- [ ] Unit tests verify the Defense stat includes the Sturdy bonus
- [ ] Typecheck/lint passes

### US-005: Define Scared Behavior
**Description:** As a developer, I want to define the Stone Elemental's Scared behavior so that it responds predictably when frightened.

**Acceptance Criteria:**
- [ ] A Scared behavior is defined for the Stone Elemental (e.g., "Hunker Down" - becomes immobile but gains +3 Defense)
- [ ] The behavior activates when the Stone Elemental's fear threshold is exceeded
- [ ] The behavior has a defined duration or exit condition
- [ ] The behavior is stored in the YAML data file
- [ ] Typecheck/lint passes

### US-006: Define Hungry Behavior
**Description:** As a developer, I want a Hungry behavior defined for the Stone Elemental even though it is Inappetent, as a fallback for edge cases.

**Acceptance Criteria:**
- [ ] A Hungry behavior is defined in the YAML data (e.g., "Consume Stone" - eats room walls, minor room damage)
- [ ] The behavior is documented but effectively unreachable due to the Inappetent trait
- [ ] If the Inappetent trait is somehow removed, the behavior activates correctly
- [ ] Typecheck/lint passes

### US-007: Special Room Interactions
**Description:** As a player, I want Stone Elementals to provide bonuses when assigned to Mines, Forges, and Ley Lines so that I can optimize my dungeon layout.

**Acceptance Criteria:**
- [ ] When assigned to a Mine, the Stone Elemental gains the Geological bonus (+40% mining)
- [ ] When assigned to a Forge, the Stone Elemental provides a crafting speed bonus (+20%)
- [ ] When assigned to a Ley Line room, the Stone Elemental generates passive Flux
- [ ] Room interaction data is defined in the YAML file
- [ ] Interactions are applied through the room assignment system
- [ ] Typecheck/lint passes

### US-008: Define Fusion Options
**Description:** As a developer, I want fusion recipes involving the Stone Elemental defined so that players can combine it with other inhabitants.

**Acceptance Criteria:**
- [ ] At least 2 fusion recipes involving the Stone Elemental are defined in YAML
- [ ] Each recipe specifies the partner creature, result creature, and resource cost
- [ ] Fusion data compiles correctly with `npm run gamedata:build`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must load Stone Elemental data from compiled JSON at app initialization via ContentService
- FR-2: When a Stone Elemental is assigned to a Mine, its output must be increased by 40%
- FR-3: The Stone Elemental must never consume Food resources due to the Inappetent trait
- FR-4: The Sturdy trait must add +1 to the base Defense stat at all times
- FR-5: Scared behavior must activate when fear exceeds the creature's threshold
- FR-6: Stone Elemental state must persist through save/load via IndexedDB

## Non-Goals (Out of Scope)
- Stone Elemental sprite art and animation
- Sound effects for Stone Elemental actions
- AI pathfinding for Stone Elemental movement
- Balancing stat values (initial values are placeholder, to be tuned later)

## Technical Considerations
- Depends on the base inhabitant system (Issue #11) being implemented first
- Trait bonuses should be computed via Angular `computed()` signals that derive final stats from base stats + trait modifiers
- YAML schema for inhabitants must support a `traits` array and `behaviors` object
- Room interaction bonuses should be handled by the room assignment system, not hardcoded per creature
- Fusion recipes reference creature IDs, so stable IDs must be established

## Success Metrics
- Stone Elemental loads correctly from compiled gamedata
- All trait bonuses apply correctly (verified by unit tests)
- Save/load round-trip preserves Stone Elemental assignment and state
- Mining output with Stone Elemental is measurably 40% higher than without

## Open Questions
- What is the exact fear threshold for the Stone Elemental?
- Should the Forge interaction bonus stack with the Geological trait?
- What is the Flux generation rate when assigned to a Ley Line room?
- Should the Stone Elemental have a visual indicator when in "Hunker Down" scared state?
