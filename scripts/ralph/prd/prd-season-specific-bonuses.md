# PRD: Season-Specific Bonuses

## Introduction
Each season in Blunderdark applies global bonuses and modifiers that affect resource production, recruitment, and generation rates. Growth boosts food production, Harvest increases all production and triggers merchant visits, Darkness amplifies Corruption and dark creature generation, and Storms boost Flux generation and trigger random events. These bonuses create strategic rhythms that reward planning around the seasonal cycle.

## Goals
- Apply unique global modifiers for each of the four seasons
- Growth: +50% Food production, -25% recruitment costs
- Harvest: +20% all production, merchant visits enabled
- Darkness: +100% Corruption generation, +50% dark creature spawn rates
- Storms: +80% Flux generation, random events enabled
- Remove bonuses when the season transitions
- Display active season bonuses in the UI

## User Stories

### US-001: Define Season Bonus Data
**Description:** As a developer, I want season bonuses defined in a data structure so that they are configurable and data-driven.

**Acceptance Criteria:**
- [ ] A `SeasonBonus` type is defined with fields: `season`, `modifiers` (array of stat/production modifiers), `description`
- [ ] Season bonuses are defined in YAML (e.g., `gamedata/seasons/bonuses.yaml`)
- [ ] Each season has its specific modifiers listed
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-002: Implement Growth Season Bonuses
**Description:** As a player, I want Growth season to boost my food production and reduce recruitment costs.

**Acceptance Criteria:**
- [ ] During Growth, all Food production rooms output 50% more Food
- [ ] During Growth, inhabitant recruitment costs are reduced by 25%
- [ ] Bonuses activate at the start of Growth and deactivate at the end
- [ ] Unit tests verify the +50% Food modifier is applied
- [ ] Unit tests verify the -25% recruitment cost modifier is applied
- [ ] Typecheck/lint passes

### US-003: Implement Harvest Season Bonuses
**Description:** As a player, I want Harvest season to boost all production and enable merchant visits.

**Acceptance Criteria:**
- [ ] During Harvest, all resource production is increased by 20%
- [ ] The merchant visit flag is set to true during Harvest (merchant system handles the rest)
- [ ] Bonuses activate at the start of Harvest and deactivate at the end
- [ ] Unit tests verify the +20% all-production modifier
- [ ] Typecheck/lint passes

### US-004: Implement Darkness Season Bonuses
**Description:** As a player, I want Darkness season to amplify Corruption generation and dark creature spawning.

**Acceptance Criteria:**
- [ ] During Darkness, Corruption generation is increased by 100% (doubled)
- [ ] During Darkness, dark creature spawn rates increase by 50%
- [ ] Bonuses activate at the start of Darkness and deactivate at the end
- [ ] Unit tests verify the +100% Corruption modifier
- [ ] Unit tests verify the +50% dark creature spawn modifier
- [ ] Typecheck/lint passes

### US-005: Implement Storms Season Bonuses
**Description:** As a player, I want Storms season to boost Flux generation and enable random events.

**Acceptance Criteria:**
- [ ] During Storms, Flux generation is increased by 80%
- [ ] The random events flag is set to true during Storms (event system handles the rest)
- [ ] Bonuses activate at the start of Storms and deactivate at the end
- [ ] Unit tests verify the +80% Flux modifier
- [ ] Typecheck/lint passes

### US-006: Season Bonus Modifier Integration
**Description:** As a developer, I want season bonuses to integrate with the global modifier system so that they stack correctly with other bonuses.

**Acceptance Criteria:**
- [ ] Season bonuses are applied through a centralized modifier aggregation system
- [ ] Season bonuses stack additively with other modifiers (inhabitant traits, room upgrades)
- [ ] When a season ends, its bonuses are cleanly removed from the modifier system
- [ ] No residual bonuses carry over between seasons
- [ ] The modifier system uses `computed()` signals for reactive updates
- [ ] Unit tests verify correct stacking behavior
- [ ] Typecheck/lint passes

### US-007: Display Active Bonuses in UI
**Description:** As a player, I want to see what bonuses the current season provides so that I can make strategic decisions.

**Acceptance Criteria:**
- [ ] The season indicator (from Issue #77) shows active bonuses when hovered or clicked
- [ ] Each bonus is displayed with its effect (e.g., "+50% Food Production")
- [ ] Bonuses use color coding (green for positive, red for negative/costs)
- [ ] The tooltip or panel updates when the season changes
- [ ] **[UI story]** Verify in browser using dev-browser skill
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must apply season-specific modifiers to resource production at the start of each season
- FR-2: The system must remove season modifiers when the season ends
- FR-3: Season bonuses must stack additively with other modifier sources
- FR-4: Growth: +50% Food, -25% recruitment; Harvest: +20% all; Darkness: +100% Corruption, +50% dark spawns; Storms: +80% Flux
- FR-5: Active bonuses must be visible in the game UI

## Non-Goals (Out of Scope)
- Season-specific visual changes to the dungeon
- Player-chosen season bonuses
- Season bonus upgrades or research modifications
- Seasonal events (Issue #79) or merchant visits (Issue #80) beyond setting flags

## Technical Considerations
- Depends on the seasonal cycle system (Issue #77) and resource system (Issue #9)
- Modifiers should be registered with a central modifier registry that all production calculations query
- Use `effect()` watching the current season signal to apply/remove bonuses
- Recruitment cost reduction should modify the cost computation, not the payment
- The merchant visit flag should be a signal that the merchant system watches

## Success Metrics
- Each season's bonuses activate and deactivate at exact season boundaries
- Resource production changes are measurable and match expected percentages
- No bonus leakage between seasons
- UI correctly displays all active bonuses

## Open Questions
- Should season bonuses be affected by research upgrades (e.g., "Enhanced Seasons" research)?
- Do negative effects exist for any season (e.g., reduced defense during Storms)?
- Should bonuses ramp up over the 7 days or apply at full strength immediately?
- Can the player build structures to mitigate negative seasonal effects?
