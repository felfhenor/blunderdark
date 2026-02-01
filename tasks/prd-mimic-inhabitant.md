# PRD: Mimic Inhabitant

## Introduction
The Mimic is a Tier 2 shapeshifting inhabitant that excels at deception and treasure guarding. Its Shapeshifter trait allows it to disguise itself, its Treasure Guardian trait provides +2 Defense in Vaults, and its Versatile trait enables 80% efficiency in any room type. Mimics add a unique strategic layer by functioning as flexible generalists that also serve as surprise defenders against invaders.

## Goals
- Define complete stat block for the Mimic (HP, Attack, Defense, Speed)
- Implement traits: Shapeshifter, Treasure Guardian (+2 Defense in Vault), Versatile (80% efficiency anywhere)
- Define Scared and Hungry behavior states
- Enable special interactions with Treasure Vaults and trap mechanics
- Define fusion options for the Mimic
- Persist Mimic state through save/load cycles

## User Stories

### US-001: Define Mimic YAML Data
**Description:** As a developer, I want the Mimic defined in a YAML data file with balanced stats.

**Acceptance Criteria:**
- [ ] A Mimic entry exists in the gamedata YAML file (e.g., `gamedata/inhabitants/mimic.yaml`)
- [ ] Stats are defined: HP (medium), Attack (medium), Defense (medium), Speed (low)
- [ ] Tier is set to 2
- [ ] The entry includes display name, description, and sprite reference
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-002: Implement Shapeshifter Trait
**Description:** As a developer, I want the Shapeshifter trait so that the Mimic can disguise itself as a room object, surprising invaders.

**Acceptance Criteria:**
- [ ] A `Shapeshifter` trait is defined
- [ ] When assigned to a room, the Mimic appears as a room object (e.g., chest, barrel) to invaders
- [ ] Invaders do not detect the Mimic until interacting with or passing adjacent to it
- [ ] On reveal, the Mimic gets a surprise attack bonus (+100% damage on first hit)
- [ ] Unit tests verify the surprise attack bonus
- [ ] Typecheck/lint passes

### US-003: Implement Treasure Guardian Trait
**Description:** As a developer, I want the Treasure Guardian trait to give +2 Defense when the Mimic is assigned to a Vault room.

**Acceptance Criteria:**
- [ ] A `TreasureGuardian` trait is defined with a `vaultDefenseBonus: 2` property
- [ ] The +2 Defense bonus only applies when the Mimic is assigned to a Treasure Vault room
- [ ] The bonus is removed when the Mimic is reassigned to a different room type
- [ ] Unit tests verify the conditional defense bonus
- [ ] Typecheck/lint passes

### US-004: Implement Versatile Trait
**Description:** As a developer, I want the Versatile trait so that the Mimic operates at 80% efficiency in any room type.

**Acceptance Criteria:**
- [ ] A `Versatile` trait is defined with an `efficiencyMultiplier: 0.8` property
- [ ] When assigned to any room, the Mimic produces 80% of what a specialist would produce
- [ ] This applies to all room types (Mining, Research, Training, etc.)
- [ ] The 80% efficiency is applied after other bonuses
- [ ] Unit tests verify the 80% efficiency cap applies universally
- [ ] Typecheck/lint passes

### US-005: Define Scared Behavior
**Description:** As a developer, I want the Mimic's Scared behavior defined so it reacts to fear.

**Acceptance Criteria:**
- [ ] A Scared behavior is defined (e.g., "Lockdown" - the Mimic transforms into an inert object and becomes untargetable but cannot act)
- [ ] The behavior activates when the Mimic's fear threshold is exceeded
- [ ] The behavior has a duration before the Mimic reverts
- [ ] Behavior is stored in the YAML data file
- [ ] Typecheck/lint passes

### US-006: Define Hungry Behavior
**Description:** As a developer, I want the Mimic's Hungry behavior defined.

**Acceptance Criteria:**
- [ ] A Hungry behavior is defined (e.g., "Consume" - the Mimic attempts to eat nearby small objects, reducing room inventory)
- [ ] The behavior activates when the Mimic's hunger threshold is exceeded
- [ ] Consumed objects are removed from the room's inventory
- [ ] Behavior is stored in the YAML data file
- [ ] Typecheck/lint passes

### US-007: Trap Interaction Mechanics
**Description:** As a player, I want Mimics to interact with the trap system so they can act as living traps.

**Acceptance Criteria:**
- [ ] A Mimic in a hallway or room entrance functions as a pseudo-trap
- [ ] When an invader triggers the Mimic, it deals damage and applies a slow effect
- [ ] The Mimic does not consume trap charges (it is a living creature, not a trap)
- [ ] The Mimic can be placed in hallways that also have regular traps
- [ ] Typecheck/lint passes

### US-008: Define Fusion Options
**Description:** As a developer, I want fusion recipes involving the Mimic defined.

**Acceptance Criteria:**
- [ ] At least 2 fusion recipes involving the Mimic are defined in YAML
- [ ] Each recipe specifies partner creature, result, and cost
- [ ] Fusion data compiles correctly with `npm run gamedata:build`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must load Mimic data from compiled JSON at app initialization
- FR-2: The Mimic must operate at 80% efficiency in any room type
- FR-3: When in a Treasure Vault, the Mimic must gain +2 Defense
- FR-4: The Shapeshifter surprise attack must deal double damage on first hit
- FR-5: The Mimic must function as a living trap when placed in hallways
- FR-6: Mimic state must persist through save/load via IndexedDB

## Non-Goals (Out of Scope)
- Mimic visual transformation animations
- Mimic mimicking specific creature types
- Mimic intelligence or decision-making AI
- Mimic reproduction or splitting mechanics

## Technical Considerations
- Depends on the base inhabitant system (Issue #11)
- Versatile trait efficiency should be computed as a final multiplier after all other bonuses
- Shapeshifter detection logic integrates with the invasion/combat system
- Treasure Guardian bonus requires knowing the room type of the current assignment
- The "living trap" mechanic needs to work alongside the regular trap system without conflicts

## Success Metrics
- Mimic loads correctly from compiled gamedata
- Versatile trait applies 80% efficiency universally (verified by unit tests)
- Treasure Guardian grants +2 Defense only in Vaults
- Shapeshifter surprise attack deals correct bonus damage

## Open Questions
- Does the Versatile 80% efficiency override room-specific bonuses or stack with them?
- Can the Mimic shapeshift into a different form per room type?
- Should the Mimic have a cooldown on the surprise attack after being revealed?
- How does the "living trap" interact with Rogue invaders who can disarm traps?
