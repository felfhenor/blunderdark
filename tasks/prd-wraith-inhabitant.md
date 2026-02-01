# PRD: Wraith Inhabitant

## Introduction
The Wraith is a Tier 2 spectral inhabitant that excels in research and fear generation. It is incorporeal, fearless, and terrifying to invaders. Wraiths are ideal for Libraries and Soul Wells, and gain bonuses at night. This feature expands the dungeon's intellectual and supernatural capabilities, giving players a research-focused inhabitant with strong defensive fear utility.

## Goals
- Define complete stat block for the Wraith (HP, Attack, Defense, Speed)
- Implement traits: Inappetent, Fearless, Terrifying (+2 Fear), Intangible, Scholar (+20% Research)
- Define Scared and Hungry behavior states
- Enable special room interactions for Libraries, Soul Wells, and Night bonus
- Define fusion options for the Wraith
- Persist Wraith state through save/load cycles

## User Stories

### US-001: Define Wraith YAML Data
**Description:** As a developer, I want the Wraith defined in a YAML data file so that it is compiled into the game content pipeline.

**Acceptance Criteria:**
- [ ] A Wraith entry exists in the gamedata YAML file (e.g., `gamedata/inhabitants/wraith.yaml`)
- [ ] Stats are defined: HP (low), Attack (medium), Defense (low), Speed (high)
- [ ] Tier is set to 2
- [ ] The entry includes display name, description, and sprite reference
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-002: Implement Fearless Trait
**Description:** As a developer, I want the Fearless trait so that the Wraith is immune to fear effects and never enters the Scared behavior state.

**Acceptance Criteria:**
- [ ] A `Fearless` trait is defined in the trait system
- [ ] Inhabitants with Fearless are immune to all fear-inducing effects
- [ ] The Scared behavior state is never entered for Fearless inhabitants
- [ ] Unit tests verify Fearless inhabitants ignore fear triggers
- [ ] Typecheck/lint passes

### US-003: Implement Terrifying Trait
**Description:** As a developer, I want the Terrifying trait to add +2 Fear to any room the Wraith occupies so that invaders are deterred.

**Acceptance Criteria:**
- [ ] A `Terrifying` trait is defined with a `fearBonus: 2` property
- [ ] The room's fear level increases by 2 when a Wraith is assigned to it
- [ ] The bonus is removed when the Wraith is unassigned from the room
- [ ] Unit tests verify the fear bonus is applied and removed correctly
- [ ] Typecheck/lint passes

### US-004: Implement Intangible Trait
**Description:** As a developer, I want the Intangible trait so that the Wraith has a chance to evade physical attacks during combat.

**Acceptance Criteria:**
- [ ] An `Intangible` trait is defined with an `evadePhysicalChance: 0.5` property
- [ ] During combat, physical attacks against the Wraith have a 50% chance to miss
- [ ] Magical attacks are not affected by Intangible
- [ ] Unit tests verify the evasion logic with mocked random values
- [ ] Typecheck/lint passes

### US-005: Implement Scholar Trait
**Description:** As a developer, I want the Scholar trait to boost Research output by 20% so that Wraiths accelerate research progress.

**Acceptance Criteria:**
- [ ] A `Scholar` trait is defined with a `researchBonus: 0.2` property
- [ ] When a Wraith is assigned to a research-producing room, output is multiplied by 1.2
- [ ] The bonus stacks correctly with other research modifiers
- [ ] Unit tests verify the 20% research bonus
- [ ] Typecheck/lint passes

### US-006: Define Scared and Hungry Behaviors
**Description:** As a developer, I want behaviors defined for the Wraith's edge-case states so that the system handles them gracefully.

**Acceptance Criteria:**
- [ ] A Scared behavior is defined (effectively unreachable due to Fearless, but documented)
- [ ] A Hungry behavior is defined (effectively unreachable due to Inappetent, but documented)
- [ ] Both behaviors are stored in the YAML data file
- [ ] Typecheck/lint passes

### US-007: Special Room Interactions
**Description:** As a player, I want Wraiths to provide bonuses in Libraries, Soul Wells, and at night so that I can optimize their placement.

**Acceptance Criteria:**
- [ ] When assigned to a Library, the Wraith gains an additional +10% Research bonus (stacks with Scholar)
- [ ] When assigned to a Soul Well, the Wraith generates bonus Soul Essence
- [ ] During night cycles, the Wraith gains +1 Attack and +1 Speed
- [ ] Room interaction data is defined in the YAML file
- [ ] Typecheck/lint passes

### US-008: Define Fusion Options
**Description:** As a developer, I want fusion recipes involving the Wraith defined so that players can create hybrid creatures.

**Acceptance Criteria:**
- [ ] At least 2 fusion recipes involving the Wraith are defined in YAML
- [ ] Each recipe specifies partner, result, and cost
- [ ] Fusion data compiles correctly with `npm run gamedata:build`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must load Wraith data from compiled JSON at app initialization
- FR-2: The Wraith must never consume Food (Inappetent) and never be frightened (Fearless)
- FR-3: Rooms occupied by the Wraith must have their fear level increased by 2
- FR-4: Physical attacks against the Wraith must have a 50% miss chance
- FR-5: Research output must be increased by 20% when a Wraith is assigned to a research room
- FR-6: Night-time bonuses must apply automatically based on the day/night cycle

## Non-Goals (Out of Scope)
- Wraith sprite art and ghost animations
- Wraith-specific sound effects
- Wraith AI movement patterns
- Multiplayer interactions

## Technical Considerations
- Depends on the base inhabitant system (Issue #11) being implemented
- Night bonus depends on the time-of-day system (Issue #8)
- Intangible evasion logic must integrate with the combat resolution system
- Fear level computation should be a `computed()` signal derived from room base fear + inhabitant fear contributions
- The Scholar trait bonus and Library room bonus should stack additively (Scholar 20% + Library 10% = 30%)

## Success Metrics
- Wraith loads correctly from compiled gamedata
- All five traits function correctly (verified by unit tests)
- Fear level of occupied rooms increases by 2
- Research output is measurably 20% higher with Wraith assignment

## Open Questions
- Does the Intangible trait affect trap damage or only invader attacks?
- Should the night bonus apply to all Wraiths globally or only those in specific rooms?
- What is the Soul Essence generation rate at a Soul Well?
- Can multiple Wraiths stack their Terrifying fear bonus in the same room?
