# PRD: Invasion Rewards System

## Introduction
Define the consequences of invasions -- both successful defenses and failed ones. Successful defense rewards the player with reputation, looted equipment, prisoners, and experience. Failed defense results in room damage, resource loss, and the need to rebuild. Captured prisoners open a mini-system of handling options (execute, ransom, convert, sacrifice, experiment) that ties into other game systems.

## Goals
- Define reward tables for successful invasions
- Define penalty tables for failed invasions
- Implement a prisoner handling system with multiple options
- Scale rewards/penalties with invasion difficulty
- Integrate with reputation, resource, and equipment systems

## User Stories

### US-001: Reward Calculation on Successful Defense
**Description:** As a developer, I want a function that calculates rewards for a successful defense so that players are compensated for their effort.

**Acceptance Criteria:**
- [ ] Create `calculateDefenseRewards(invasion: InvasionResult, profile: DungeonProfile): DefenseRewards` helper
- [ ] DefenseRewards type includes: reputationGain, lootedEquipment[], prisoners[], experienceGain, goldGain
- [ ] Reputation gain scales with invasion difficulty (party size, invader tiers)
- [ ] Higher difficulty invasions yield better rewards
- [ ] Function is pure for testability
- [ ] Typecheck/lint passes

### US-002: Reputation Bonus from Defense
**Description:** As a developer, I want successful defense to increase dungeon reputation so that the dungeon grows in infamy.

**Acceptance Criteria:**
- [ ] Base reputation gain: +5 per successful defense
- [ ] Bonus: +1 per invader killed
- [ ] Bonus: +3 if all secondary objectives were prevented
- [ ] Bonus: +2 if defense achieved via morale break (no invaders killed)
- [ ] Reputation signal is updated after invasion resolution
- [ ] Unit test verifies reputation calculation
- [ ] Typecheck/lint passes

### US-003: Looted Equipment from Invaders
**Description:** As a developer, I want defeated invaders to drop equipment so that invasions provide crafting materials.

**Acceptance Criteria:**
- [ ] Each killed invader has a loot table defined by class
- [ ] Warriors drop: weapons, armor pieces
- [ ] Rogues drop: lockpicks, poison vials, daggers
- [ ] Mages drop: spell scrolls, enchanting materials
- [ ] Clerics drop: holy water, healing herbs
- [ ] Paladins drop: blessed equipment, sacred relics
- [ ] Rangers drop: arrows, tracking tools, cloaks
- [ ] Loot is added to the player's inventory
- [ ] Typecheck/lint passes

### US-004: Prisoner Capture
**Description:** As a developer, I want retreating or surrendering invaders to become prisoners so that the player has post-invasion decisions.

**Acceptance Criteria:**
- [ ] Invaders who retreat (morale break) have a 30% chance of being captured
- [ ] Captured invaders become prisoners stored in the dungeon's prison
- [ ] Prisoner data includes: original class, stats, name, capture date
- [ ] Prisoners require a Prison room to hold (max capacity based on room size)
- [ ] If no Prison room exists, prisoners escape
- [ ] Typecheck/lint passes

### US-005: Prisoner Handling - Execute
**Description:** As a player, I want to execute prisoners for a fear bonus so that I can intimidate future invaders.

**Acceptance Criteria:**
- [ ] Execute action permanently removes the prisoner
- [ ] Grants +2 dungeon-wide fear for 5 game-minutes
- [ ] Increases reputation by +1
- [ ] Reduces future invader morale starting value by 5 (stacks up to -20)
- [ ] Typecheck/lint passes

### US-006: Prisoner Handling - Ransom
**Description:** As a player, I want to ransom prisoners for gold so that I can profit from captures.

**Acceptance Criteria:**
- [ ] Ransom action permanently removes the prisoner after a delay (2 game-minutes)
- [ ] Gold received scales with invader class tier (Paladin > Warrior > Rogue)
- [ ] Ransom reduces reputation by -1 (seen as merciful)
- [ ] Ransomed prisoners do not return in future invasions
- [ ] Typecheck/lint passes

### US-007: Prisoner Handling - Convert
**Description:** As a player, I want to convert prisoners into inhabitants so that I can turn enemies into allies.

**Acceptance Criteria:**
- [ ] Convert action takes significant time (10 game-minutes)
- [ ] Success rate depends on prisoner class: Rogues 50%, Warriors 30%, Clerics 10%, Paladins 5%
- [ ] On success: prisoner becomes a basic Tier 1 inhabitant with reduced stats
- [ ] On failure: prisoner escapes and is lost
- [ ] Costs corruption resources
- [ ] Typecheck/lint passes

### US-008: Prisoner Handling - Sacrifice
**Description:** As a player, I want to sacrifice prisoners at the Altar for magical benefits so that dark rituals are rewarding.

**Acceptance Criteria:**
- [ ] Sacrifice action requires the prisoner to be brought to the Altar room
- [ ] Grants a random magical boon: Flux burst (+50), temporary room buff, corruption boost
- [ ] Higher-tier prisoners yield greater boons
- [ ] Increases corruption level by +5
- [ ] Increases reputation by +2
- [ ] Typecheck/lint passes

### US-009: Prisoner Handling - Experiment
**Description:** As a player, I want to experiment on prisoners in the Breeding Pits for research so that I can advance my dungeon's knowledge.

**Acceptance Criteria:**
- [ ] Experiment action requires a Breeding Pits room
- [ ] Grants research points toward a random research topic
- [ ] Research points scale with prisoner class tier
- [ ] The prisoner is consumed in the process
- [ ] Increases corruption level by +3
- [ ] Typecheck/lint passes

### US-010: Failed Defense Penalties
**Description:** As a developer, I want failed defenses to have meaningful consequences so that losing matters.

**Acceptance Criteria:**
- [ ] Create `calculateDefensePenalties(invasion: InvasionResult): DefensePenalties` helper
- [ ] Room damage: rooms along the invader's path lose 25% durability
- [ ] Resource loss: 20% of gold reserves are looted by invaders
- [ ] If Altar is destroyed: must be rebuilt at significant resource cost (100 Stone, 50 Gold, 20 Flux)
- [ ] Reputation loss: -3 per failed defense
- [ ] Killed inhabitants are permanently lost
- [ ] Unit test verifies penalty calculations
- [ ] Typecheck/lint passes

### US-011: Prisoner Management UI
**Description:** As a player, I want a UI for managing prisoners so that I can make handling decisions.

**Acceptance Criteria:**
- [ ] A prisoner list is accessible from the Prison room
- [ ] Each prisoner shows: class, stats, name, capture date
- [ ] Action buttons for each handling option (Execute, Ransom, Convert, Sacrifice, Experiment)
- [ ] Actions that require specific rooms are disabled if the room does not exist
- [ ] Confirmation dialog before irreversible actions
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-012: Invasion Rewards Unit Tests
**Description:** As a developer, I want comprehensive tests for rewards and penalties.

**Acceptance Criteria:**
- [ ] Test: Reputation gain scales with invasion difficulty
- [ ] Test: Loot tables produce valid items per invader class
- [ ] Test: Prisoner capture rate is ~30% for retreating invaders
- [ ] Test: Execute grants fear bonus
- [ ] Test: Ransom provides gold scaled by class
- [ ] Test: Convert success rates match per-class percentages
- [ ] Test: Failed defense applies room damage
- [ ] Test: Altar rebuild cost is correct
- [ ] Tests placed in `src/app/helpers/invasion-rewards.spec.ts`
- [ ] All tests pass with `npm run test`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Successful defense must grant reputation, loot, prisoners, and experience.
- FR-2: Failed defense must apply room damage, resource loss, and reputation loss.
- FR-3: Prisoners must support 5 handling options with distinct outcomes.
- FR-4: Rewards must scale with invasion difficulty.
- FR-5: Destroyed Altars must be rebuildable at defined resource costs.

## Non-Goals (Out of Scope)
- Invasion reward multipliers from research or upgrades
- Prisoner diplomacy or negotiation mini-games
- Equipment forging from looted materials (separate crafting system)
- Prisoner escapes or riots
- Visual invasion aftermath (damaged room graphics)

## Technical Considerations
- Depends on invasion win/loss conditions (Issue #45) for outcome data
- Depends on resource system (Issue #7) for gold/material management
- Reward types in `src/app/interfaces/invasion-rewards.ts`
- Reward helper in `src/app/helpers/invasion-rewards.ts`
- Prisoner state stored in game state IndexedDB
- Prisoner handling actions should be Angular Signal-driven for UI reactivity
- Sacrifice and Experiment actions need room existence checks
- Loot tables defined in YAML per invader class

## Success Metrics
- Rewards feel proportionate to invasion difficulty
- Players engage with the prisoner handling system
- Failed defenses create meaningful setbacks without being game-ending
- All reward/penalty calculations verified by tests

## Open Questions
- Should prisoners have a maintenance cost (food)?
- Can prisoners escape if not guarded (Prison room inhabitant requirement)?
- Should there be a limit on total prisoners?
- How does prisoner conversion interact with the inhabitant cap?
