# PRD: Reputation Effects

## Introduction
Reputation Effects gives gameplay consequences to the reputation levels accumulated through Issue #95. Each reputation category at high or legendary levels triggers specific effects: unlocking rooms, attracting creatures, modifying event rates, and altering dungeon dynamics. This system transforms reputation from a passive score into an active gameplay driver.

## Goals
- Implement distinct gameplay effects for each of the five reputation categories at high/legendary levels
- Integrate reputation effects with the room unlock system (Issue #44)
- Trigger effects dynamically as reputation levels change
- Communicate active effects clearly to the player
- Ensure effects are data-driven via YAML configuration for easy tuning

## User Stories

### US-001: Define Reputation Effects Data Structure
**Description:** As a developer, I want a data-driven reputation effects configuration so that designers can tune effects without code changes.

**Acceptance Criteria:**
- [ ] A `ReputationEffect` type is defined with fields: `reputationType`, `minimumLevel`, `effectType`, `effectValue`, `description`
- [ ] Effect types include: `unlock_room`, `modify_event_rate`, `attract_creature`, `modify_production`, `modify_invasion_rate`
- [ ] A YAML file in `gamedata/` defines all reputation effects
- [ ] The build pipeline compiles and validates the effects YAML
- [ ] TypeScript schema is generated for reputation effects
- [ ] Typecheck/lint passes

### US-002: Terror Effects - Dark Invasions and Torture Chamber
**Description:** As a player with high Terror reputation, I want to see darker invasions and unlock the Torture Chamber so that my fearsome dungeon has thematic consequences.

**Acceptance Criteria:**
- [ ] At High Terror: invasion frequency increases by 25%
- [ ] At High Terror: "dark invasion" variant events become possible (stronger but rarer loot)
- [ ] At High Terror: Torture Chamber room is unlocked for construction
- [ ] At Legendary Terror: dark invasion frequency doubles
- [ ] Effects are removed if Terror drops below High
- [ ] Unit tests verify Terror threshold triggers
- [ ] Typecheck/lint passes

### US-003: Wealth Effects - Thieves and Treasure Vault
**Description:** As a player with high Wealth reputation, I want thief events and Treasure Vault upgrades so that hoarding gold has risks and rewards.

**Acceptance Criteria:**
- [ ] At High Wealth: "thief raid" events become possible (steal Gold if undefended)
- [ ] At High Wealth: Treasure Vault room upgrades are unlocked
- [ ] At Legendary Wealth: Gold production bonus of +10% across all rooms
- [ ] Thief events scale in difficulty with Wealth level
- [ ] Effects are removed if Wealth drops below High
- [ ] Unit tests verify Wealth threshold triggers
- [ ] Typecheck/lint passes

### US-004: Knowledge Effects - Advanced Research
**Description:** As a player with high Knowledge reputation, I want access to advanced research options so that scholarly pursuits are rewarded.

**Acceptance Criteria:**
- [ ] At High Knowledge: advanced research tier is unlocked in the research system
- [ ] At High Knowledge: research speed increases by 15%
- [ ] At Legendary Knowledge: unique "forbidden knowledge" research branch unlocks
- [ ] Research UI shows locked items with "Requires High Knowledge" tooltip
- [ ] Effects are removed if Knowledge drops below High
- [ ] Unit tests verify Knowledge threshold triggers
- [ ] Typecheck/lint passes

### US-005: Harmony Effects - Peaceful Creatures and Reduced Invasions
**Description:** As a player with high Harmony reputation, I want peaceful creatures to arrive and fewer invasions so that a benevolent dungeon is viable.

**Acceptance Criteria:**
- [ ] At High Harmony: invasion frequency decreases by 30%
- [ ] At High Harmony: peaceful creature recruitment events trigger periodically
- [ ] At Legendary Harmony: invasions reduced by 50% and unique peaceful creatures available
- [ ] Peaceful creatures have distinct types defined in gamedata
- [ ] Effects are removed if Harmony drops below High
- [ ] Unit tests verify Harmony threshold triggers
- [ ] Typecheck/lint passes

### US-006: Chaos Effects - Random Events and Unpredictable Bonuses
**Description:** As a player with high Chaos reputation, I want increased random events and unpredictable bonuses so that embracing chaos feels exciting and risky.

**Acceptance Criteria:**
- [ ] At High Chaos: random event frequency increases by 50%
- [ ] At High Chaos: events have a 20% chance to give double rewards or double penalties
- [ ] At Legendary Chaos: "chaos surge" events trigger that can dramatically alter dungeon state
- [ ] Random events pulled from a weighted event pool defined in gamedata
- [ ] Effects are removed if Chaos drops below High
- [ ] Unit tests verify Chaos threshold triggers
- [ ] Typecheck/lint passes

### US-007: Active Effects Display
**Description:** As a player, I want to see which reputation effects are currently active so that I understand how my reputation is influencing gameplay.

**Acceptance Criteria:**
- [ ] An "Active Effects" section appears in the reputation panel or a dedicated UI area
- [ ] Each active effect shows: icon, name, brief description, source reputation
- [ ] Effects appear/disappear dynamically as reputation levels change
- [ ] Hovering an effect shows detailed tooltip with exact modifiers
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-008: Reputation Effects Engine
**Description:** As a developer, I want a centralized effects engine that activates/deactivates effects based on reputation levels so that all systems query one source of truth.

**Acceptance Criteria:**
- [ ] A `ReputationEffectsService` evaluates active effects based on current reputation levels
- [ ] The service exposes `getActiveEffects()` returning all currently active effects
- [ ] The service exposes `hasEffect(effectId)` for quick checks by other systems
- [ ] Effects are recalculated whenever reputation changes (reactive via signals)
- [ ] Other systems (invasion, room unlock, research) query this service instead of checking reputation directly
- [ ] Unit tests verify effect activation/deactivation at level boundaries
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must activate effects when reputation reaches the required level
- FR-2: The system must deactivate effects when reputation drops below the required level
- FR-3: Effects must modify gameplay systems (invasions, unlocks, production, events) through a query API
- FR-4: All effects must be defined in YAML gamedata for designer tunability
- FR-5: The UI must display currently active effects to the player

## Non-Goals (Out of Scope)
- Reputation point earning (handled by Issue #95)
- Balancing exact numeric values (tuning pass is separate)
- Cross-reputation interactions (e.g., high Terror canceling Harmony effects)
- Achievement/badge system tied to reputation

## Technical Considerations
- Depends on Issue #95 (Reputation Tracking) for reputation state and levels
- Depends on Issue #44 (Room Unlocks) for room unlock integration
- The effects engine should use `computed()` signals derived from reputation state signals
- Effect definitions in YAML should reference room IDs, creature IDs, and event IDs that exist in other gamedata files
- Consider using an event bus or signal-based notification for effect changes so subscribing systems react automatically

## Success Metrics
- All five reputation categories produce distinct, observable gameplay effects at High and Legendary levels
- Effects activate and deactivate correctly at threshold boundaries
- Active effects display updates in real time as reputation changes
- No performance degradation from continuous effect evaluation

## Open Questions
- Should effects stack if multiple reputations are at High/Legendary simultaneously?
- Should there be negative effects at Low reputation (e.g., Low Wealth attracts no merchants)?
- How should conflicting effects resolve (e.g., High Harmony reduces invasions but High Terror increases them)?
