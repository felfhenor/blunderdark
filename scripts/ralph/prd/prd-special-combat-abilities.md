# PRD: Special Combat Abilities

## Introduction
Give defender inhabitants unique combat abilities that go beyond basic attack/defense rolls. Each creature type gains a signature ability that reflects its fantasy archetype -- Medusa petrifies, Dragons breathe fire, Liches cast spells. These abilities add tactical depth to invasions and reward players for recruiting diverse inhabitants.

## Goals
- Implement 5 special combat abilities for key inhabitant types
- Create an ability resolution system with cooldowns, proc chances, and AOE
- Integrate abilities into the existing turn-based combat loop
- Display ability activations with clear visual/textual feedback
- Ensure abilities are data-driven and defined in YAML

## User Stories

### US-001: Ability System Framework
**Description:** As a developer, I want a generic ability system so that any inhabitant can have special combat abilities.

**Acceptance Criteria:**
- [ ] Create `CombatAbility` type with fields: id, name, description, effectType, value, chance, cooldown, targetType (single/AOE/self), duration
- [ ] Create `AbilityState` type tracking: currentCooldown, isActive, remainingDuration
- [ ] Ability resolution integrates with the combat turn loop (abilities checked each turn)
- [ ] Abilities are defined per inhabitant type in YAML data
- [ ] Typecheck/lint passes

### US-002: Medusa Petrifying Gaze
**Description:** As a developer, I want Medusa to have a Petrifying Gaze ability so that she can disable invaders.

**Acceptance Criteria:**
- [ ] Petrifying Gaze has a 10% chance to activate per combat turn
- [ ] On activation, target invader is petrified (cannot act) for 3 turns
- [ ] Petrified invaders take double damage from all sources
- [ ] Only one target can be petrified at a time per Medusa
- [ ] Ability data is defined in the Medusa YAML file
- [ ] Unit test verifies 10% proc rate over large sample
- [ ] Unit test verifies petrified target skips turns
- [ ] Typecheck/lint passes

### US-003: Dragon Breath Weapon
**Description:** As a developer, I want the Dragon to have a Breath Weapon AOE attack so that it can damage multiple invaders.

**Acceptance Criteria:**
- [ ] Breath Weapon deals damage to all invaders in the current room
- [ ] Damage is 150% of Dragon's base Attack stat
- [ ] 3-turn cooldown after use
- [ ] Dragon AI uses Breath Weapon when 3+ invaders are in the room (otherwise uses normal attack)
- [ ] Ability data is defined in the Dragon YAML file
- [ ] Unit test verifies AOE hits all targets in room
- [ ] Unit test verifies cooldown prevents reuse for 3 turns
- [ ] Unit test verifies damage calculation (150% Attack)
- [ ] Typecheck/lint passes

### US-004: Lich Spell Casting
**Description:** As a developer, I want the Lich to have multiple spells so that it is a versatile defender.

**Acceptance Criteria:**
- [ ] Death Bolt: Single target ranged attack dealing 200% magic damage, 2-turn cooldown
- [ ] Raise Dead: Resurrects one dead defender in the room at 50% HP, 5-turn cooldown, single use per invasion
- [ ] Shield: Grants +50% Defense to self for 3 turns, 4-turn cooldown
- [ ] Lich selects spell based on situation: Raise Dead if ally is dead, Shield if HP < 50%, otherwise Death Bolt
- [ ] All spells defined in the Lich YAML file
- [ ] Unit test verifies each spell's effect
- [ ] Unit test verifies spell selection priority
- [ ] Typecheck/lint passes

### US-005: Wraith Intangible Passive
**Description:** As a developer, I want the Wraith to have an Intangible passive so that physical attacks frequently miss.

**Acceptance Criteria:**
- [ ] Wraith has a 50% chance to evade physical attacks (passive, always active)
- [ ] Evasion does not apply to magic attacks
- [ ] When evasion triggers, display "Phased" feedback instead of "Miss"
- [ ] Evasion check happens before the normal attack roll
- [ ] Ability data is defined in the Wraith YAML file
- [ ] Unit test verifies ~50% evasion rate over large sample
- [ ] Unit test verifies magic attacks bypass evasion
- [ ] Typecheck/lint passes

### US-006: Orc Berserk Rage
**Description:** As a developer, I want the Orc to have Berserk Rage so that damaged Orcs become more dangerous.

**Acceptance Criteria:**
- [ ] When Orc HP drops below 50%, Berserk Rage activates automatically
- [ ] Berserk Rage grants +100% Attack stat
- [ ] Berserk Rage persists until combat ends or the Orc dies
- [ ] Berserk Rage does not reduce Defense (unlike the scared Berserk behavior)
- [ ] Ability data is defined in the Orc YAML file
- [ ] Unit test verifies activation at 50% HP threshold
- [ ] Unit test verifies +100% Attack bonus
- [ ] Typecheck/lint passes

### US-007: Ability Cooldown Management
**Description:** As a developer, I want cooldowns to tick down each combat turn so that abilities have strategic timing.

**Acceptance Criteria:**
- [ ] At the start of each combat turn, decrement all active cooldowns by 1
- [ ] Cooldown at 0 means the ability is ready
- [ ] Cooldowns are tracked per inhabitant instance
- [ ] Cooldown state resets between invasions
- [ ] Unit test verifies cooldown decrement per turn
- [ ] Unit test verifies ability blocked during cooldown
- [ ] Typecheck/lint passes

### US-008: Ability Activation Feedback
**Description:** As a player, I want to see when special abilities activate so that combat feels dynamic.

**Acceptance Criteria:**
- [ ] When an ability activates, display the ability name above the unit
- [ ] Ability text uses a distinct color (e.g., purple for magic, orange for physical)
- [ ] AOE abilities show an effect indicator on all affected targets
- [ ] Status effects (petrified, shielded, berserk) show an icon on the affected unit
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-009: Ability Integration with Combat Loop
**Description:** As a developer, I want abilities checked during the combat turn so that they fire at the right time.

**Acceptance Criteria:**
- [ ] During each unit's combat turn: check for passive abilities first (Wraith evasion, Orc berserk)
- [ ] Then check for active abilities (Medusa gaze, Dragon breath, Lich spells)
- [ ] If an active ability fires, it replaces the normal attack for that turn
- [ ] Passive abilities modify the normal attack/defense flow
- [ ] Combat log records ability activations
- [ ] Typecheck/lint passes

### US-010: Special Ability Unit Tests
**Description:** As a developer, I want comprehensive tests for all special abilities.

**Acceptance Criteria:**
- [ ] Test: Medusa Petrifying Gaze activates at ~10% rate
- [ ] Test: Dragon Breath hits all room targets
- [ ] Test: Lich spell selection logic is correct
- [ ] Test: Lich Raise Dead only works once per invasion
- [ ] Test: Wraith evasion ~50% against physical, 0% against magic
- [ ] Test: Orc Berserk activates at exactly 50% HP
- [ ] Test: Cooldowns prevent premature ability reuse
- [ ] Tests placed in `src/app/helpers/combat-abilities.spec.ts`
- [ ] All tests pass with `npm run test`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Each of the 5 inhabitant types must have at least one unique combat ability.
- FR-2: Abilities must respect cooldown timers.
- FR-3: AOE abilities must affect all valid targets in the room.
- FR-4: Passive abilities must be checked every combat turn automatically.
- FR-5: Ability data must be defined in YAML and loaded through the content pipeline.

## Non-Goals (Out of Scope)
- Player-triggered ability activation (abilities are automatic/AI-driven)
- Ability upgrades or skill trees
- Invader special abilities (handled in Issue #81)
- Combo abilities between multiple inhabitants
- Ability animations beyond text/icon feedback

## Technical Considerations
- Depends on the combat system (Issue #43) for integration with the combat loop
- Depends on the inhabitant system (Issue #11) for inhabitant stat blocks
- Ability types in `src/app/interfaces/combat-ability.ts`
- Ability resolution helper in `src/app/helpers/combat-abilities.ts`
- Wraith evasion modifies the attack flow before the d20 roll
- Lich spell selection uses a priority-based decision function
- Use seeded RNG for proc chance testing (inject RNG function)
- Ability YAML is nested within each inhabitant's YAML file

## Success Metrics
- All 5 abilities function correctly as verified by unit tests
- Abilities activate at correct rates and timing
- Combat feels more varied with abilities active
- Ability feedback is clear and informative

## Open Questions
- Should abilities scale with inhabitant level?
- Can abilities be silenced or countered by invader abilities?
- Should the Lich's Raise Dead work on any dead defender or only those who died this invasion?
- How does Dragon Breath interact with damage resistance or shields?
