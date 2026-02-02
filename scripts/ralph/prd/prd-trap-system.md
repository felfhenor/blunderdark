# PRD: Trap System

## Introduction
Implement a trap system that lets players place traps in hallways to damage, slow, and demoralize invading parties. Traps are crafted in the Trap Workshop room and placed in hallway segments. Each trap type has unique effects, limited charges, and interacts with the morale and combat systems. Traps provide a passive defense layer that complements active inhabitant combat.

## Goals
- Support 5+ distinct trap types with unique effects
- Enable trap placement in hallway segments
- Implement trap trigger logic during invasion movement
- Track trap durability/charges with depletion
- Integrate trap crafting with the Trap Workshop room
- Connect trap triggers to the morale system

## User Stories

### US-001: Trap Data Model
**Description:** As a developer, I want a trap data model so that traps can be defined, placed, and tracked.

**Acceptance Criteria:**
- [ ] Create `TrapType` type with fields: id, name, description, effectType, damage, duration, charges, craftCost, triggerChance, sprite
- [ ] Create `TrapInstance` type with fields: trapTypeId, hallwayId, position, remainingCharges, isArmed
- [ ] Trap instances are stored in game state and persisted through save/load
- [ ] Types defined in `src/app/interfaces/trap.ts`
- [ ] Typecheck/lint passes

### US-002: Pit Trap Definition
**Description:** As a developer, I want the Pit Trap defined as a basic damage trap.

**Acceptance Criteria:**
- [ ] Pit Trap YAML defined in `gamedata/traps/pit.yaml`
- [ ] Effect: Deals moderate physical damage to the triggering invader
- [ ] Trigger chance: 80% (easily triggered)
- [ ] Charges: 3 (collapses after 3 triggers)
- [ ] Secondary effect: Slows the triggered invader for 1 turn (climbing out)
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-003: Arrow Trap Definition
**Description:** As a developer, I want the Arrow Trap defined as a ranged damage trap.

**Acceptance Criteria:**
- [ ] Arrow Trap YAML defined in `gamedata/traps/arrow.yaml`
- [ ] Effect: Deals moderate physical damage to the triggering invader
- [ ] Trigger chance: 70%
- [ ] Charges: 5 (more ammo, but slightly less reliable)
- [ ] Can hit multiple invaders if they pass in sequence (one charge per hit)
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-004: Rune Trap Definition
**Description:** As a developer, I want the Rune Trap defined as a magic damage trap.

**Acceptance Criteria:**
- [ ] Rune Trap YAML defined in `gamedata/traps/rune.yaml`
- [ ] Effect: Deals magic damage (bypasses physical Defense, uses magic resistance)
- [ ] Trigger chance: 90% (magical detection)
- [ ] Charges: 2 (powerful but limited)
- [ ] Cannot be disarmed by Rogues (magical, not mechanical)
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-005: Magic Trap Definition
**Description:** As a developer, I want the Magic Trap defined as a debuff trap.

**Acceptance Criteria:**
- [ ] Magic Trap YAML defined in `gamedata/traps/magic.yaml`
- [ ] Effect: Reduces target's Attack by 30% for 3 turns
- [ ] Trigger chance: 75%
- [ ] Charges: 4
- [ ] Secondary effect: Briefly reveals all invader positions (magical pulse)
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-006: Fear Glyph Trap Definition
**Description:** As a developer, I want the Fear Glyph defined as a morale-focused trap.

**Acceptance Criteria:**
- [ ] Fear Glyph YAML defined in `gamedata/traps/fear-glyph.yaml`
- [ ] Effect: Deals minor damage but applies -10 morale to the invading party
- [ ] Trigger chance: 85%
- [ ] Charges: 3
- [ ] The morale penalty stacks with the standard -5 trap trigger morale loss (total -15)
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-007: Trap Placement in Hallways
**Description:** As a player, I want to place traps in hallway segments so that invaders encounter them while traversing my dungeon.

**Acceptance Criteria:**
- [ ] Traps can only be placed in hallway tiles, not in rooms
- [ ] Each hallway tile supports at most 1 trap
- [ ] A placement UI allows selecting a hallway tile and choosing a trap from available inventory
- [ ] Placed traps are visible on the dungeon map with a trap icon
- [ ] Traps can be removed/replaced by the player (outside of invasions)
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-008: Trap Trigger During Invasion
**Description:** As a developer, I want traps to trigger when invaders walk over them during an invasion.

**Acceptance Criteria:**
- [ ] When an invader enters a hallway tile with an armed trap, roll trigger chance
- [ ] On success: apply trap effects (damage, debuff, morale penalty)
- [ ] On success: decrement remaining charges by 1
- [ ] When charges reach 0, the trap is destroyed and removed from the map
- [ ] On failure: trap is not revealed (invader walks past)
- [ ] Rogue invaders with Disarm Trap ability get a 60% chance to disarm instead of trigger
- [ ] Typecheck/lint passes

### US-009: Trap Crafting in Workshop
**Description:** As a player, I want to craft traps in the Trap Workshop room so that I can stock my defenses.

**Acceptance Criteria:**
- [ ] The Trap Workshop room provides a "Craft Trap" action
- [ ] Crafting requires resources defined in the trap's craftCost
- [ ] Crafting takes time (game ticks) proportional to trap complexity
- [ ] Crafted traps are added to the player's trap inventory
- [ ] Workshop inhabitants increase crafting speed (based on room inhabitant count)
- [ ] Typecheck/lint passes

### US-010: Trap Inventory Management
**Description:** As a player, I want to manage my trap inventory so that I can decide where to place them.

**Acceptance Criteria:**
- [ ] A trap inventory tracks unplaced traps by type and count
- [ ] Inventory is displayed in the trap placement UI
- [ ] Traps removed from hallways return to inventory
- [ ] Inventory persists through save/load
- [ ] Typecheck/lint passes

### US-011: Trap Trigger Visual Feedback
**Description:** As a player, I want to see when traps trigger so that I feel rewarded for placing them.

**Acceptance Criteria:**
- [ ] When a trap triggers, show a visual effect on the hallway tile
- [ ] Display damage numbers on the affected invader
- [ ] Show trap name in the combat/event log
- [ ] Destroyed traps (0 charges) show a "Trap Destroyed" message
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-012: Trap System Unit Tests
**Description:** As a developer, I want comprehensive tests for the trap system.

**Acceptance Criteria:**
- [ ] Test: Trap triggers at correct probability
- [ ] Test: Trap damage is applied correctly
- [ ] Test: Charges decrement on trigger
- [ ] Test: Trap is destroyed at 0 charges
- [ ] Test: Rogue disarm chance works correctly
- [ ] Test: Rune Trap cannot be disarmed by Rogues
- [ ] Test: Fear Glyph applies additional morale penalty
- [ ] Test: Magic Trap debuff reduces Attack for correct duration
- [ ] Tests placed in `src/app/helpers/trap.spec.ts`
- [ ] All tests pass with `npm run test`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must support 5+ distinct trap types with unique effects.
- FR-2: Traps must only be placeable in hallway segments.
- FR-3: Traps must trigger based on probability when invaders enter the tile.
- FR-4: Traps must have limited charges and be destroyed when depleted.
- FR-5: Traps must be craftable in the Trap Workshop room.
- FR-6: Trap triggers must integrate with the morale system.

## Non-Goals (Out of Scope)
- Trap upgrades or leveling
- Trap chains or combo effects between adjacent traps
- Player-triggered trap activation (traps are automatic)
- Traps inside rooms (hallways only)
- Environmental traps (floor-level hazards not placed by the player)

## Technical Considerations
- Depends on hallway system (Issue #19) for placement locations
- Depends on invasion movement (Issue #42) for trigger timing
- Depends on Trap Workshop room (Issue #65) for crafting
- Trap types in `src/app/interfaces/trap.ts`
- Trap logic helper in `src/app/helpers/trap.ts`
- Trap YAML files in `gamedata/traps/` directory
- Trap placement state stored per-hallway-tile in game state
- Trap trigger check runs during invader movement phase of each invasion turn
- Rogue disarm interaction requires invader class detection

## Success Metrics
- All 5 trap types function with correct effects and trigger rates
- Traps visibly impact invasion outcomes
- Players engage with trap placement as a strategic layer
- Trap crafting loop feels rewarding
- All trap tests pass

## Open Questions
- Can traps be repaired/recharged or only replaced?
- Should traps be visible to the player at all times or only when an invader is nearby?
- How does trap density affect invader pathfinding (do invaders avoid trapped hallways)?
- Should there be a maximum number of total placed traps?
