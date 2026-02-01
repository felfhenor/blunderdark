# PRD: Lich Inhabitant

## Introduction
The Lich is a Tier 2 undead spellcaster and the premier research inhabitant in Blunderdark. With the Scholarly trait (+40% Research), Undead Master abilities, Fearless nature, and Ancient Knowledge, the Lich serves as a dungeon's intellectual powerhouse. It excels in Throne Rooms, Soul Wells, and Libraries, making it a cornerstone of research-focused dungeon strategies.

## Goals
- Define complete stat block for the Lich (HP, Attack, Defense, Speed)
- Implement traits: Scholarly (+40% Research), Undead Master, Fearless, Ancient Knowledge
- Define Scared and Hungry behavior states
- Enable special room interactions for Throne Room, Soul Well, and Library
- Define fusion options for the Lich
- Persist Lich state through save/load cycles

## User Stories

### US-001: Define Lich YAML Data
**Description:** As a developer, I want the Lich defined in a YAML data file so that it is available through the content pipeline.

**Acceptance Criteria:**
- [ ] A Lich entry exists in the gamedata YAML file (e.g., `gamedata/inhabitants/lich.yaml`)
- [ ] Stats are defined: HP (medium), Attack (high magic), Defense (low physical), Speed (low)
- [ ] Tier is set to 2
- [ ] The entry includes display name, description, and sprite reference
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-002: Implement Scholarly Trait
**Description:** As a developer, I want the Scholarly trait to boost Research output by 40% so that the Lich is the strongest research inhabitant.

**Acceptance Criteria:**
- [ ] A `Scholarly` trait is defined with a `researchBonus: 0.4` property
- [ ] When a Lich is assigned to a research-producing room, output is multiplied by 1.4
- [ ] The bonus stacks correctly with other research modifiers (additive)
- [ ] Unit tests verify the 40% research bonus is applied
- [ ] Typecheck/lint passes

### US-003: Implement Undead Master Trait
**Description:** As a developer, I want the Undead Master trait so that the Lich boosts nearby undead inhabitants.

**Acceptance Criteria:**
- [ ] An `UndeadMaster` trait is defined
- [ ] Undead inhabitants in the same room or adjacent rooms gain +1 Attack and +1 Defense
- [ ] The bonus is recalculated when the Lich is assigned or unassigned
- [ ] Unit tests verify the aura bonus applies to undead inhabitants only
- [ ] Typecheck/lint passes

### US-004: Implement Ancient Knowledge Trait
**Description:** As a developer, I want the Ancient Knowledge trait so that the Lich can unlock hidden research options.

**Acceptance Criteria:**
- [ ] An `AncientKnowledge` trait is defined
- [ ] Having a Lich in the dungeon reveals one additional hidden research node per research branch
- [ ] The revealed nodes are tracked in the research tree state
- [ ] Unit tests verify that hidden nodes become visible when a Lich is present
- [ ] Typecheck/lint passes

### US-005: Define Scared and Hungry Behaviors
**Description:** As a developer, I want the Lich's behavior states defined for completeness and edge-case handling.

**Acceptance Criteria:**
- [ ] A Scared behavior is defined (unreachable due to Fearless; documented as "Arcane Shield" - retreats to Library)
- [ ] A Hungry behavior is defined (Lich drains life force from nearby living inhabitants)
- [ ] Behaviors are stored in the YAML data file
- [ ] Typecheck/lint passes

### US-006: Special Room Interactions
**Description:** As a player, I want the Lich to provide significant bonuses in intellectual and magical rooms.

**Acceptance Criteria:**
- [ ] When assigned to a Throne Room, the Lich provides a dungeon-wide +10% Research bonus
- [ ] When assigned to a Soul Well, the Lich generates double Soul Essence
- [ ] When assigned to a Library, the Lich gains an additional +20% Research (stacking with Scholarly for +60% total)
- [ ] Room interaction data is defined in the YAML file
- [ ] Typecheck/lint passes

### US-007: Define Fusion Options
**Description:** As a developer, I want fusion recipes involving the Lich defined for the fusion system.

**Acceptance Criteria:**
- [ ] At least 2 fusion recipes involving the Lich are defined in YAML
- [ ] Each recipe specifies partner creature, result, and cost
- [ ] Fusion data compiles correctly with `npm run gamedata:build`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must load Lich data from compiled JSON at app initialization
- FR-2: Research output must increase by 40% when a Lich is assigned to a research room
- FR-3: Nearby undead inhabitants must receive +1 Attack and +1 Defense from Undead Master
- FR-4: The Lich must reveal hidden research nodes via Ancient Knowledge
- FR-5: The Lich must never enter the Scared state (Fearless trait)
- FR-6: Throne Room assignment must provide a dungeon-wide research bonus

## Non-Goals (Out of Scope)
- Lich phylactery mechanic (potential future feature)
- Lich spell casting during combat (handled in Issue #84)
- Lich resurrection mechanics
- Lich-specific quest lines

## Technical Considerations
- Depends on the base inhabitant system (Issue #11)
- Undead Master aura requires adjacency detection (depends on grid/room adjacency system)
- Ancient Knowledge trait interacts with the research tree system (Issue #73)
- The Scholarly bonus is the highest research bonus among inhabitants; balance may require caps
- Aura effects should use `computed()` signals that recalculate when room assignments change

## Success Metrics
- Lich loads correctly from compiled gamedata
- All four traits function correctly (verified by unit tests)
- Research output with Lich in Library is 60% higher than base
- Undead Master aura correctly applies to adjacent undead only

## Open Questions
- Should the Undead Master aura range be limited to adjacent rooms or a specific tile radius?
- Does Ancient Knowledge reveal the same hidden nodes for all Liches or different ones?
- What is the Soul Essence doubling rate at the Soul Well?
- Should the Lich have special dialogue or lore text when assigned to the Throne Room?
