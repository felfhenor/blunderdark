# PRD: Legendary Inhabitants

## Introduction
Introduce 5 legendary creatures as the pinnacle of dungeon inhabitant power. Each legendary inhabitant (Dragon, Demon Lord, Beholder, Medusa, Ancient Treant) has unique recruitment requirements, dungeon-wide aura effects, high maintenance costs, and a strict limit of 1 per type per dungeon. Legendaries are game-changing acquisitions that define the dungeon's identity and strategy.

## Goals
- Define 5 legendary inhabitants with unique stat blocks and abilities
- Implement special recruitment requirements (events, costs, prerequisites)
- Apply dungeon-wide aura effects per legendary
- Enforce the 1-per-type-per-dungeon limit
- Implement high maintenance/upkeep costs
- Integrate legendaries with existing inhabitant, room, and combat systems

## User Stories

### US-001: Legendary Inhabitant Base Type
**Description:** As a developer, I want a legendary inhabitant type so that legendaries share common constraints.

**Acceptance Criteria:**
- [ ] Create `LegendaryInhabitant` type extending the base inhabitant type with: auraEffect, recruitmentRequirements, upkeepCost, isUnique (true), tier ("legendary")
- [ ] Legendary tier is above all standard tiers
- [ ] Only 1 instance of each legendary type per dungeon (enforced at recruitment)
- [ ] Types defined in `src/app/interfaces/legendary-inhabitant.ts`
- [ ] Typecheck/lint passes

### US-002: Dragon Legendary Definition
**Description:** As a developer, I want the Dragon defined as a legendary with a combat-focused aura.

**Acceptance Criteria:**
- [ ] Dragon YAML defined in `gamedata/inhabitants/legendary/dragon.yaml`
- [ ] Stats: Very High HP, Very High Attack, High Defense, Low Speed
- [ ] Aura: Dragon's Dominion -- all defenders gain +15% Attack dungeon-wide
- [ ] Recruitment: Requires Lair room (4x4), 500 Gold, 200 Flux, and a "Dragon Egg" event item
- [ ] Upkeep: 10 Gold/min, 5 Food/min
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-003: Demon Lord Legendary Definition
**Description:** As a developer, I want the Demon Lord defined as a legendary with a corruption-focused aura.

**Acceptance Criteria:**
- [ ] Demon Lord YAML defined in `gamedata/inhabitants/legendary/demon-lord.yaml`
- [ ] Stats: High HP, Very High Attack, Medium Defense, Medium Speed
- [ ] Aura: Infernal Authority -- +25% corruption generation, +10 Fear dungeon-wide, -15% invader starting morale
- [ ] Recruitment: Requires Throne Room or Altar at Level 3, 300 Gold, 500 Corruption, and a "Demonic Pact" event
- [ ] Upkeep: 5 Gold/min, 10 Corruption/min, 3 Souls/min
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-004: Beholder Legendary Definition
**Description:** As a developer, I want the Beholder defined as a legendary with a surveillance-focused aura.

**Acceptance Criteria:**
- [ ] Beholder YAML defined in `gamedata/inhabitants/legendary/beholder.yaml`
- [ ] Stats: Medium HP, High Attack (magic), Very High Defense, Low Speed
- [ ] Aura: All-Seeing Eye -- all traps have +15% trigger chance, invader Scout ability is negated, all rooms reveal invader positions
- [ ] Recruitment: Requires Shadow Library at Level 2, 400 Gold, 300 Flux, and a "Planar Breach" event
- [ ] Upkeep: 8 Gold/min, 8 Flux/min
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-005: Medusa Legendary Definition
**Description:** As a developer, I want Medusa defined as a legendary with a fear-focused aura.

**Acceptance Criteria:**
- [ ] Medusa YAML defined in `gamedata/inhabitants/legendary/medusa.yaml`
- [ ] Stats: Medium HP, Medium Attack, Medium Defense, High Speed
- [ ] Aura: Petrifying Presence -- +20% Fear in all rooms, 5% chance per turn to petrify a random invader dungeon-wide
- [ ] Recruitment: Requires a room with "ancient" tag, 250 Gold, 150 Flux, and a "Gorgon's Mirror" event item
- [ ] Upkeep: 5 Gold/min, 5 Flux/min, 2 Food/min
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-006: Ancient Treant Legendary Definition
**Description:** As a developer, I want the Ancient Treant defined as a legendary with a production-focused aura.

**Acceptance Criteria:**
- [ ] Ancient Treant YAML defined in `gamedata/inhabitants/legendary/ancient-treant.yaml`
- [ ] Stats: Very High HP, Low Attack, Very High Defense, Very Low Speed
- [ ] Aura: Nature's Bounty -- +20% food production, +15% resource gathering, all rooms regenerate 1 durability/min
- [ ] Recruitment: Requires Mushroom Grove room, 200 Gold, 100 Flux, and a "Heartwood Seed" event item
- [ ] Upkeep: 3 Gold/min, 8 Food/min (ironic -- it eats a lot)
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-007: Recruitment Requirements Check
**Description:** As a developer, I want recruitment requirements validated before allowing legendary recruitment.

**Acceptance Criteria:**
- [ ] Create `canRecruitLegendary(legendaryId: string, state: GameState): { allowed: boolean; missingRequirements: string[] }` helper
- [ ] Check: Required room exists and meets level requirements
- [ ] Check: Sufficient resources (Gold, Flux, Corruption, etc.)
- [ ] Check: Required event item is in inventory
- [ ] Check: No existing instance of this legendary in the dungeon
- [ ] Return missing requirements for UI display
- [ ] Unit test verifies all requirement checks
- [ ] Typecheck/lint passes

### US-008: Legendary Aura System
**Description:** As a developer, I want legendary auras to apply dungeon-wide effects reactively.

**Acceptance Criteria:**
- [ ] Each legendary's aura is implemented as a set of `computed()` modifier signals
- [ ] Aura effects activate when the legendary is recruited and assigned to a room
- [ ] Aura effects deactivate if the legendary dies or is unassigned
- [ ] Multiple legendary auras stack (e.g., Dragon + Demon Lord both provide bonuses)
- [ ] Aura effects are listed in the dungeon status panel
- [ ] Unit test verifies aura activation and deactivation
- [ ] Typecheck/lint passes

### US-009: Upkeep and Maintenance
**Description:** As a developer, I want legendaries to have ongoing upkeep costs so that maintaining them is a strategic decision.

**Acceptance Criteria:**
- [ ] Upkeep costs are deducted from resources each game-minute
- [ ] If upkeep cannot be paid, the legendary enters a "Discontented" state
- [ ] Discontented legendaries provide no aura bonus
- [ ] If discontented for 5 consecutive minutes, the legendary leaves the dungeon permanently
- [ ] A warning notification appears when resources are low for legendary upkeep
- [ ] Typecheck/lint passes

### US-010: Legendary Recruitment UI
**Description:** As a player, I want a clear UI for recruiting legendaries showing requirements and costs.

**Acceptance Criteria:**
- [ ] A "Legendary Recruitment" panel shows all 5 legendaries
- [ ] Each entry shows: name, portrait, stats, aura effect, requirements, upkeep
- [ ] Met requirements are checked in green; unmet are in red
- [ ] A "Recruit" button is enabled only when all requirements are met
- [ ] Recruited legendaries show as "Active" with their current room assignment
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-011: Legendary Status Display
**Description:** As a player, I want to see my active legendaries and their status at a glance.

**Acceptance Criteria:**
- [ ] Active legendaries appear in a dedicated panel or section of the dungeon overview
- [ ] Shows: name, room assignment, aura status (active/inactive), upkeep status
- [ ] Discontented state shows a warning icon and countdown
- [ ] Clicking a legendary shows detailed stats and aura breakdown
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-012: Legendary Inhabitant Unit Tests
**Description:** As a developer, I want comprehensive tests for legendary inhabitants.

**Acceptance Criteria:**
- [ ] Test: Only 1 of each legendary per dungeon
- [ ] Test: Recruitment fails if requirements not met
- [ ] Test: Recruitment succeeds when all requirements met
- [ ] Test: Aura activates on assignment
- [ ] Test: Aura deactivates on removal
- [ ] Test: Upkeep is deducted each minute
- [ ] Test: Discontented state after unpaid upkeep
- [ ] Test: Legendary leaves after 5 minutes discontented
- [ ] Tests placed in `src/app/helpers/legendary-inhabitant.spec.ts`
- [ ] All tests pass with `npm run test`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must support 5 distinct legendary inhabitants.
- FR-2: Each legendary must have unique recruitment requirements.
- FR-3: Each legendary must provide a dungeon-wide aura effect.
- FR-4: Legendaries must have ongoing upkeep costs.
- FR-5: Only 1 of each legendary type can exist per dungeon.
- FR-6: Unpaid upkeep must lead to discontent and eventual departure.

## Non-Goals (Out of Scope)
- Legendary-specific quest lines or story events
- Legendary creature evolution or leveling
- Legendary vs. legendary combat
- Legendary breeding or hybridization
- Legendary cosmetic customization

## Technical Considerations
- Depends on inhabitant system (Issue #11) for base inhabitant integration
- Depends on resource system (Issue #7) for upkeep deduction
- Legendary data in `gamedata/inhabitants/legendary/` directory
- Legendary types in `src/app/interfaces/legendary-inhabitant.ts`
- Legendary helper in `src/app/helpers/legendary-inhabitant.ts`
- Aura effects should be implemented as global modifier signals that other systems read
- Upkeep check runs in the game loop tick
- Event items for recruitment need a simple inventory/event system
- Recruitment requirements are data-driven from YAML for easy balancing

## Success Metrics
- All 5 legendaries load correctly from gamedata
- Recruitment requirements are correctly enforced
- Auras provide accurate dungeon-wide bonuses
- Upkeep system creates meaningful resource pressure
- Players view legendaries as aspirational mid-to-late-game goals

## Open Questions
- How are event items (Dragon Egg, Demonic Pact, etc.) obtained?
- Can legendaries be assigned to any room or only specific ones?
- Should legendaries have unique death/defeat consequences beyond normal inhabitant death?
- How do legendary auras interact with room-specific buffs (additive or multiplicative)?
- Should there be a UI notification when a legendary becomes available for recruitment?
