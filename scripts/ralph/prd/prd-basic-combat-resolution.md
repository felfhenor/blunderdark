# PRD: Basic Combat Resolution

## Introduction
Implement the core combat mechanics for resolving attacks during turn-based invasions. Combat uses a d20-based attack roll system where damage is calculated as the difference between attack and defense stats. Units lose HP on successful hits and die when HP reaches zero. Visual feedback (damage numbers, health bars) communicates combat results to the player.

## Goals
- Implement d20-based attack roll mechanics
- Calculate damage as (Attack - Defense) with a minimum of 0
- Reduce HP on successful hits; trigger death at 0 HP
- Provide visual feedback for combat events
- Support extensibility for future combat features (critical hits, resistances)

## User Stories

### US-001: Attack Roll System
**Description:** As a developer, I want a d20-based attack roll system so that combat has controlled randomness.

**Acceptance Criteria:**
- [ ] Attack roll: roll d20 + attacker's Attack stat
- [ ] Hit threshold: roll must meet or exceed target's Defense stat + 10
- [ ] Natural 20 always hits; natural 1 always misses
- [ ] Roll result and hit/miss outcome are returned from the combat function
- [ ] Typecheck/lint passes

### US-002: Damage Calculation
**Description:** As a developer, I want damage to be calculated based on Attack vs Defense so that stats matter in combat.

**Acceptance Criteria:**
- [ ] On hit: damage = attacker's Attack stat - defender's Defense stat
- [ ] Minimum damage on hit is 1 (a hit always deals at least 1 damage)
- [ ] On miss: damage is 0
- [ ] Damage value is returned from the combat function
- [ ] Typecheck/lint passes

### US-003: HP Reduction and Death
**Description:** As a developer, I want units to lose HP when damaged and die at 0 HP so that combat has consequences.

**Acceptance Criteria:**
- [ ] Subtract damage from the target's current HP
- [ ] HP cannot go below 0
- [ ] When HP reaches 0, mark unit as dead
- [ ] Dead units are removed from the turn queue
- [ ] Dead defenders are removed from their stationed room
- [ ] Typecheck/lint passes

### US-004: Combat Resolution Function
**Description:** As a developer, I want a single combat resolution function so that attack actions can delegate to a clean API.

**Acceptance Criteria:**
- [ ] Create `resolveCombat(attacker: CombatUnit, defender: CombatUnit): CombatResult` in helpers
- [ ] `CombatResult` type includes: `hit: boolean`, `roll: number`, `damage: number`, `defenderDead: boolean`
- [ ] Function is pure (no side effects) for testability; caller applies results
- [ ] Typecheck/lint passes

### US-005: Combat Unit Tests
**Description:** As a developer, I want unit tests for combat resolution so that the math is verified.

**Acceptance Criteria:**
- [ ] Test: Attack roll hits when roll + attack >= defense + 10
- [ ] Test: Attack roll misses when roll + attack < defense + 10
- [ ] Test: Natural 20 always hits regardless of stats
- [ ] Test: Natural 1 always misses regardless of stats
- [ ] Test: Damage is attack - defense (minimum 1 on hit)
- [ ] Test: Defender death at 0 HP
- [ ] Tests placed in `src/app/helpers/combat.spec.ts`
- [ ] All tests pass with `npm run test`
- [ ] Typecheck/lint passes

### US-006: Damage Number Display
**Description:** As a player, I want to see damage numbers when attacks land so that I understand the combat outcome.

**Acceptance Criteria:**
- [ ] Show floating damage number above the damaged unit
- [ ] Damage number animates upward and fades out over ~1 second
- [ ] Miss displays "Miss" text instead of a number
- [ ] Different colors for damage (red) and miss (gray)
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-007: Health Bar Display
**Description:** As a player, I want to see health bars on units during invasions so that I can assess the state of the battle.

**Acceptance Criteria:**
- [ ] Show health bar above each unit during invasion mode
- [ ] Health bar shows current HP as a proportion of max HP
- [ ] Color changes: green (>50%), yellow (25-50%), red (<25%)
- [ ] Health bar updates immediately when damage is applied
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

## Functional Requirements
- FR-1: The system must use a d20 + Attack vs Defense + 10 hit determination.
- FR-2: Damage on hit must equal Attack - Defense (minimum 1).
- FR-3: Units at 0 HP must be removed from combat.
- FR-4: Combat results must be displayed via floating damage numbers and health bars.
- FR-5: Combat resolution must be a pure function for testability.

## Non-Goals (Out of Scope)
- Critical hit system (beyond natural 20)
- Elemental damage types or resistances
- Area-of-effect attacks
- Healing during combat
- Combat log / history panel

## Technical Considerations
- Depends on Inhabitant System (#11) for unit stats and Turn-Based Invasion Mode (#41) for integration
- Combat resolution helper in `src/app/helpers/combat.ts`
- Combat types (`CombatUnit`, `CombatResult`) in `src/app/interfaces/`
- Use a seeded random number generator for testability (inject RNG function)
- Damage number animation can use CSS `@keyframes` with Angular `@if` for conditional rendering

## Success Metrics
- Combat math is correct as verified by unit tests
- Damage numbers and health bars display correctly during invasions
- Combat resolution takes < 1ms per call
- Players understand hit/miss/damage outcomes intuitively

## Open Questions
- Should there be a combat log for reviewing past rolls?
- Should critical hits (natural 20) deal bonus damage?
- How should armor/equipment modify Defense in the future?
