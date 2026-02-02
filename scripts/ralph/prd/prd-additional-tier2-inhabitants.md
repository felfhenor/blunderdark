# PRD: Additional Tier 2 Inhabitants (Dryad, Gargoyle, Imp)

## Introduction
This feature adds three additional Tier 2 inhabitants to Blunderdark: the Dryad (nature/purification specialist), Gargoyle (stone-form defender with architectural bonuses), and Imp (mischievous fire-starter and corruptor). Each brings unique traits, behaviors, and room interactions that expand strategic options for dungeon management.

## Goals
- Define complete stat blocks for Dryad, Gargoyle, and Imp
- Implement unique traits for each creature
- Define Scared and Hungry behavior states for each
- Enable special room interactions and fusion options for each
- Persist all three inhabitant types through save/load cycles

## User Stories

### US-001: Define Dryad YAML Data
**Description:** As a developer, I want the Dryad defined in a YAML data file with nature-themed stats and traits.

**Acceptance Criteria:**
- [ ] A Dryad entry exists in the gamedata YAML file (e.g., `gamedata/inhabitants/dryad.yaml`)
- [ ] Stats are defined: HP (medium), Attack (low), Defense (medium), Speed (medium)
- [ ] Tier is set to 2
- [ ] Traits include: Nature Affinity, Purifier, Regenerative
- [ ] The entry includes display name, description, and sprite reference
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-002: Implement Dryad Traits
**Description:** As a developer, I want the Dryad's traits implemented so that it provides nature and purification bonuses.

**Acceptance Criteria:**
- [ ] `NatureAffinity` trait: +30% Food production when assigned to food-producing rooms
- [ ] `Purifier` trait: Reduces Corruption in the assigned room by 1 per game day
- [ ] `Regenerative` trait: Passively heals 5% HP per minute outside of combat
- [ ] Each trait is defined in the trait system with appropriate properties
- [ ] Unit tests verify each trait's effect
- [ ] Typecheck/lint passes

### US-003: Define Dryad Behaviors and Interactions
**Description:** As a developer, I want Dryad behaviors and room interactions defined.

**Acceptance Criteria:**
- [ ] Scared behavior: "Wilt" - loses Nature Affinity bonus for duration, reduces to 50% productivity
- [ ] Hungry behavior: "Root Drain" - drains nutrients from room floor, minor room degradation
- [ ] Special interaction with gardens/nature rooms: +50% all bonuses
- [ ] Special interaction with corrupted rooms: Purification accelerated but Dryad takes damage
- [ ] Behaviors and interactions stored in YAML
- [ ] Typecheck/lint passes

### US-004: Define Gargoyle YAML Data
**Description:** As a developer, I want the Gargoyle defined in a YAML data file with defensive stats.

**Acceptance Criteria:**
- [ ] A Gargoyle entry exists in the gamedata YAML file (e.g., `gamedata/inhabitants/gargoyle.yaml`)
- [ ] Stats are defined: HP (high), Attack (low), Defense (very high), Speed (very low)
- [ ] Tier is set to 2
- [ ] Traits include: Stone Form, Sentinel, Architectural
- [ ] The entry includes display name, description, and sprite reference
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-005: Implement Gargoyle Traits
**Description:** As a developer, I want the Gargoyle's traits implemented for defensive and architectural roles.

**Acceptance Criteria:**
- [ ] `StoneForm` trait: Takes 50% reduced damage from physical attacks; immune to poison
- [ ] `Sentinel` trait: Automatically detects invaders within 2 tiles and alerts the dungeon
- [ ] `Architectural` trait: Room the Gargoyle is assigned to gains +1 structural integrity
- [ ] Each trait is defined in the trait system
- [ ] Unit tests verify each trait's effect
- [ ] Typecheck/lint passes

### US-006: Define Gargoyle Behaviors and Interactions
**Description:** As a developer, I want Gargoyle behaviors and room interactions defined.

**Acceptance Criteria:**
- [ ] Scared behavior: "Petrify" - becomes completely immobile stone statue, gains +5 Defense, cannot act
- [ ] Hungry behavior: "Crumble" - slowly loses HP over time (stone degradation)
- [ ] Special interaction with room entrances: +2 Defense to the room when placed at entrance
- [ ] Special interaction with towers/high rooms: Sentinel range increased to 4 tiles
- [ ] Behaviors and interactions stored in YAML
- [ ] Typecheck/lint passes

### US-007: Define Imp YAML Data
**Description:** As a developer, I want the Imp defined in a YAML data file with mischievous traits.

**Acceptance Criteria:**
- [ ] An Imp entry exists in the gamedata YAML file (e.g., `gamedata/inhabitants/imp.yaml`)
- [ ] Stats are defined: HP (low), Attack (medium), Defense (low), Speed (high)
- [ ] Tier is set to 2
- [ ] Traits include: Mischievous, FireStarter, Corruptor
- [ ] The entry includes display name, description, and sprite reference
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-008: Implement Imp Traits
**Description:** As a developer, I want the Imp's traits implemented for disruption and corruption roles.

**Acceptance Criteria:**
- [ ] `Mischievous` trait: 5% chance per game hour to cause a random minor event in assigned room
- [ ] `FireStarter` trait: +25% damage with fire-based attacks; assigned room gains fire hazard potential
- [ ] `Corruptor` trait: Increases Corruption in the assigned room by 1 per game day
- [ ] Each trait is defined in the trait system
- [ ] Unit tests verify each trait's effect
- [ ] Typecheck/lint passes

### US-009: Define Imp Behaviors and Interactions
**Description:** As a developer, I want Imp behaviors and room interactions defined.

**Acceptance Criteria:**
- [ ] Scared behavior: "Panic Fire" - sets small fires in the room, causing minor damage to room and all occupants
- [ ] Hungry behavior: "Steal" - attempts to steal food from adjacent rooms
- [ ] Special interaction with Forge: +20% crafting speed due to fire affinity
- [ ] Special interaction with Corruption sources: doubles Corruption generation
- [ ] Behaviors and interactions stored in YAML
- [ ] Typecheck/lint passes

### US-010: Define Fusion Options for All Three
**Description:** As a developer, I want fusion recipes for all three inhabitants defined.

**Acceptance Criteria:**
- [ ] At least 2 fusion recipes per creature (6 total) are defined in YAML
- [ ] Each recipe specifies partner creature, result, and cost
- [ ] Cross-creature fusions are included (e.g., Dryad + Gargoyle = Treant Guardian)
- [ ] Fusion data compiles correctly with `npm run gamedata:build`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must load all three inhabitants from compiled JSON at app initialization
- FR-2: Dryad Purifier must reduce room Corruption by 1 per game day
- FR-3: Gargoyle Stone Form must reduce physical damage by 50%
- FR-4: Imp Mischievous trait must trigger random events at 5% chance per game hour
- FR-5: All behaviors must activate at appropriate thresholds
- FR-6: All three inhabitant states must persist through save/load

## Non-Goals (Out of Scope)
- Sprite art for these inhabitants
- Environmental effects (fire spreading, nature growth visuals)
- Inhabitant-specific quest lines
- Faction or loyalty systems between creature types

## Technical Considerations
- Depends on the base inhabitant system (Issue #11)
- Dryad's Purifier trait interacts with the Corruption system
- Imp's Mischievous random events need a lightweight event trigger system
- Gargoyle's Sentinel detection requires tile-distance calculations from the grid system
- Fire hazard potential from FireStarter may need a room hazard property
- All traits should be composable and data-driven from YAML definitions

## Success Metrics
- All three inhabitants load correctly from compiled gamedata
- Each trait functions as specified (verified by unit tests)
- Behaviors activate at correct thresholds
- No performance degradation with all three types active simultaneously

## Open Questions
- What are the specific Mischievous random events the Imp can cause?
- Does the Dryad's Purifier trait conflict with the Imp's Corruptor trait if both are in the same room?
- Should the Gargoyle's Petrify scared behavior make it completely invulnerable?
- Can the Imp's Panic Fire behavior damage the Imp itself?
