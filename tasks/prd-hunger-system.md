# PRD: Hunger System

## Introduction
The hunger system tracks food consumption for each inhabitant, automatically deducting food from the resource pool and managing hunger states. Each inhabitant has a food consumption rate, and their hunger state (fed, hungry, starving) affects production and behavior. Some inhabitants with the Inappetent trait do not consume food.

## Goals
- Track food consumption rate per inhabitant type
- Auto-deduct food from ResourceManager at defined intervals
- Track hunger state per inhabitant (fed, hungry, starving)
- Apply production penalties for hungry/starving states
- Support the Inappetent trait for inhabitants that do not eat

## User Stories

### US-001: Food Consumption Rate Definition
**Description:** As a developer, I want each inhabitant type to define a food consumption rate so that food costs are data-driven.

**Acceptance Criteria:**
- [ ] Inhabitant type definitions in gamedata include a `foodConsumptionRate` field (food per game-hour or per-tick)
- [ ] Different inhabitant types have different rates (e.g., Goblin: 2/hr, Skeleton: 0/hr)
- [ ] The rate is accessible at runtime from the inhabitant data
- [ ] Typecheck/lint passes

### US-002: Automatic Food Deduction
**Description:** As the system, I want food to be automatically deducted from the resource pool based on all inhabitants' consumption rates.

**Acceptance Criteria:**
- [ ] Each game tick (or at a defined interval), food is deducted for all active inhabitants
- [ ] Total deduction = sum of all inhabitants' consumption rates * time elapsed
- [ ] Deduction uses the ResourceManager to subtract from the Food pool
- [ ] If food reaches zero, deduction stops (does not go negative)
- [ ] Typecheck/lint passes

### US-003: Hunger State Tracking
**Description:** As a developer, I want each inhabitant to have a tracked hunger state so that other systems can apply effects.

**Acceptance Criteria:**
- [ ] A `HungerState` type is defined: `'fed' | 'hungry' | 'starving'`
- [ ] State transitions: fed -> hungry (when food runs out for X ticks), hungry -> starving (after Y more ticks)
- [ ] Restoring food transitions: starving -> hungry -> fed
- [ ] Each inhabitant's hunger state is stored in game state
- [ ] State changes emit updates via Angular Signals
- [ ] Typecheck/lint passes

### US-004: Hungry Production Penalty
**Description:** As the system, I want hungry inhabitants to produce less so that feeding them matters strategically.

**Acceptance Criteria:**
- [ ] Hungry inhabitants have a production multiplier (e.g., 0.5x)
- [ ] Starving inhabitants have a severe production multiplier (e.g., 0.1x)
- [ ] Fed inhabitants have no penalty (1.0x)
- [ ] The penalty integrates with the production modifier pipeline
- [ ] Typecheck/lint passes

### US-005: Inappetent Trait
**Description:** As a developer, I want some inhabitants to have an Inappetent trait that exempts them from food consumption.

**Acceptance Criteria:**
- [ ] Inhabitants with the `inappetent` trait have a food consumption rate of 0
- [ ] They never transition to hungry or starving states
- [ ] Their hunger state is permanently `'fed'`
- [ ] Examples: Skeleton, Golem, or other undead/construct types
- [ ] Typecheck/lint passes

### US-006: Food Depletion Warning
**Description:** As a dungeon builder, I want to be warned when food is running low so that I can take action before inhabitants starve.

**Acceptance Criteria:**
- [ ] A warning notification appears when food drops below a threshold (e.g., 20% of consumption rate * 5 minutes)
- [ ] The warning appears once, not repeatedly
- [ ] A critical warning appears when food hits zero
- [ ] Warnings are visible in the notification system
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Each inhabitant type must define a food consumption rate in gamedata.
- FR-2: Food must be automatically deducted from the resource pool based on total consumption.
- FR-3: Each inhabitant must have a tracked hunger state (fed, hungry, starving).
- FR-4: Hunger states must transition based on food availability over time.
- FR-5: Hungry/starving states must apply production multiplier penalties.
- FR-6: The Inappetent trait must exempt inhabitants from food consumption.

## Non-Goals (Out of Scope)
- Food production (handled by room-specific PRDs like Mushroom Grove)
- Hunger UI indicators (handled by Issue #36)
- Per-creature hungry effects (handled by Issue #37)
- Food storage limits or spoilage mechanics
- Inhabitant death from starvation (future feature)

## Technical Considerations
- Depends on resource management (Issue #7), inhabitant types (Issue #8), and inhabitant management (Issue #11).
- Food deduction should integrate with the game loop tick system (`src/app/helpers/gameloop.ts`).
- Hunger state should be stored per inhabitant in the game state (IndexedDB).
- Use `computed()` signals for hunger state derivation where possible.
- Consider a `HungerService` that runs each tick and updates all inhabitant hunger states.
- The state transition timing (how many ticks until hungry, then starving) should be configurable.

## Success Metrics
- Food is correctly deducted based on total consumption each tick
- Hunger states transition accurately based on food availability
- Inappetent inhabitants never consume food or go hungry
- Production penalties are correctly applied for hungry/starving states
- Warnings appear at appropriate thresholds

## Open Questions
- What are the exact tick counts for fed->hungry and hungry->starving transitions?
- Should starving inhabitants eventually die or just remain at 0.1x production?
- Can inhabitants be manually fed (priority feeding)?
