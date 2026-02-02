# PRD: Multiple Invader Types

## Introduction
Introduce distinct invader classes to create varied and strategic invasion encounters. Rather than generic invaders, each class (Warrior, Rogue, Mage, Cleric, Paladin, Ranger) has unique stat distributions and special abilities that force the player to consider different defensive strategies. This transforms invasions from simple stat checks into tactical puzzles.

## Goals
- Define 6 invader classes with unique stat blocks (HP, Attack, Defense, Speed)
- Implement at least one special ability per class
- Create YAML-driven invader data that compiles through the existing content pipeline
- Ensure invader types are extensible for future classes
- Support invader composition variation based on dungeon profile (integrated via Issue #82)

## User Stories

### US-001: Define Invader Base Type
**Description:** As a developer, I want a base invader type definition so that all invader classes share a common structure.

**Acceptance Criteria:**
- [ ] Create `InvaderClass` type in `src/app/interfaces/` with fields: id, name, description, baseStats (HP, Attack, Defense, Speed), abilities, sprite reference
- [ ] Create `InvaderInstance` type representing a spawned invader with current HP, status effects, and class reference
- [ ] Types support extensibility for future stat additions
- [ ] Typecheck/lint passes

### US-002: Warrior Invader Data
**Description:** As a developer, I want the Warrior invader class defined in YAML so that it can be loaded at runtime.

**Acceptance Criteria:**
- [ ] A `warrior.yaml` file exists in `gamedata/invaders/`
- [ ] Stats: High HP, High Attack, Medium Defense, Low Speed
- [ ] Ability: Shield Wall (reduces incoming damage by 25% for 2 turns, 4-turn cooldown)
- [ ] Display name, description, and sprite reference are defined
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-003: Rogue Invader Data
**Description:** As a developer, I want the Rogue invader class defined in YAML with trap-disarming capability.

**Acceptance Criteria:**
- [ ] A `rogue.yaml` file exists in `gamedata/invaders/`
- [ ] Stats: Low HP, Medium Attack, Low Defense, High Speed
- [ ] Ability: Disarm Trap (can detect and disarm traps in the current room/hallway with 60% success rate)
- [ ] Ability: Backstab (deals double damage if attacking from behind or undetected)
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-004: Mage Invader Data
**Description:** As a developer, I want the Mage invader class defined in YAML with spell-casting capability.

**Acceptance Criteria:**
- [ ] A `mage.yaml` file exists in `gamedata/invaders/`
- [ ] Stats: Low HP, High Attack (magic), Low Defense, Medium Speed
- [ ] Ability: Arcane Bolt (ranged magic attack that ignores physical Defense, uses magic resistance instead)
- [ ] Ability: Dispel (can remove magical barriers or room enchantments)
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-005: Cleric Invader Data
**Description:** As a developer, I want the Cleric invader class defined in YAML with healing capability.

**Acceptance Criteria:**
- [ ] A `cleric.yaml` file exists in `gamedata/invaders/`
- [ ] Stats: Medium HP, Low Attack, High Defense, Medium Speed
- [ ] Ability: Heal (restores 20% max HP to one ally, 3-turn cooldown)
- [ ] Ability: Turn Undead (deals bonus damage to undead inhabitants)
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-006: Paladin Invader Data
**Description:** As a developer, I want the Paladin invader class defined in YAML as a tanky anti-corruption fighter.

**Acceptance Criteria:**
- [ ] A `paladin.yaml` file exists in `gamedata/invaders/`
- [ ] Stats: High HP, Medium Attack, High Defense, Low Speed
- [ ] Ability: Smite Evil (bonus damage against corrupted or demonic inhabitants)
- [ ] Ability: Aura of Courage (nearby allies immune to fear effects within same room)
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-007: Ranger Invader Data
**Description:** As a developer, I want the Ranger invader class defined in YAML with scouting capability.

**Acceptance Criteria:**
- [ ] A `ranger.yaml` file exists in `gamedata/invaders/`
- [ ] Stats: Medium HP, Medium Attack, Low Defense, High Speed
- [ ] Ability: Scout (reveals room contents 2 rooms ahead, avoiding ambushes)
- [ ] Ability: Mark Target (marks one defender, all invaders deal +20% damage to marked target for 3 turns)
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-008: Invader Content Service Integration
**Description:** As a developer, I want invader data loaded through the ContentService so that invader classes are available at runtime.

**Acceptance Criteria:**
- [ ] ContentService loads compiled invader JSON at app initialization
- [ ] An `allInvaders()` method or signal exposes all loaded invader classes
- [ ] Individual invader classes can be retrieved by ID
- [ ] Invader data is read-only after loading
- [ ] Typecheck/lint passes

### US-009: Invader Ability Resolution
**Description:** As a developer, I want a helper function to resolve invader ability effects so that abilities integrate with the combat system.

**Acceptance Criteria:**
- [ ] Create `resolveInvaderAbility(invader: InvaderInstance, ability: InvaderAbility, targets: CombatUnit[]): AbilityResult` in helpers
- [ ] AbilityResult type includes: effectType, value, duration, targetIds, cooldownApplied
- [ ] Cooldown tracking prevents ability reuse before cooldown expires
- [ ] Function is pure for testability
- [ ] Typecheck/lint passes

### US-010: Invader Type Unit Tests
**Description:** As a developer, I want unit tests verifying invader data loading and ability resolution.

**Acceptance Criteria:**
- [ ] Test: All 6 invader classes load from compiled data
- [ ] Test: Each invader has valid stats (all > 0)
- [ ] Test: Rogue disarm ability returns success/failure result
- [ ] Test: Cleric heal ability restores correct HP
- [ ] Test: Cooldown prevents ability reuse
- [ ] Test: Paladin Smite Evil deals bonus damage to corrupted targets
- [ ] Tests placed in `src/app/helpers/invader.spec.ts`
- [ ] All tests pass with `npm run test`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must define 6 distinct invader classes with unique stat blocks.
- FR-2: Each invader class must have at least one special ability.
- FR-3: Invader data must be authored in YAML and compiled to JSON via the content pipeline.
- FR-4: Abilities must integrate with the existing combat resolution system.
- FR-5: Invader instances must track current HP, active cooldowns, and status effects.

## Non-Goals (Out of Scope)
- Invader leveling or progression between invasions
- Invader equipment or gear systems
- Invader AI decision-making (handled by pathfinding and invasion systems)
- Visual invader animations beyond sprite display
- Invader dialogue or narrative events

## Technical Considerations
- Depends on the inhabitant/combat system (Issue #43) for combat integration
- Invader YAML files go in `gamedata/invaders/` directory
- Invader types defined in `src/app/interfaces/invader.ts`
- Ability resolution helper in `src/app/helpers/invader.ts`
- Abilities that interact with traps (Rogue) depend on the Trap System (Issue #85)
- Abilities that interact with corruption (Paladin) depend on Corruption System (Issue #54)
- Use branded types (`InvaderId`) consistent with existing codebase patterns

## Success Metrics
- All 6 invader classes load correctly from compiled gamedata
- Abilities resolve correctly as verified by unit tests
- Invader stat blocks are balanced (no single class dominates)
- System supports adding new invader classes without code changes (data-driven)

## Open Questions
- Should invader abilities have mana/resource costs or just cooldowns?
- How does the Rogue's trap disarm interact with trap durability?
- Should the Mage's Dispel permanently remove room enchantments or temporarily suppress them?
- What are the exact stat values for each class (needs balancing pass)?
