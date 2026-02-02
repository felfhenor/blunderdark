# PRD: Seasonal Events

## Introduction
Seasonal Events are random occurrences that trigger during specific seasons, adding variety and strategic challenges to gameplay. Each event presents the player with bonuses, challenges, or choices. Events are defined in data files, triggered randomly during appropriate seasons, and displayed as notifications in the UI. This system keeps the game engaging over long sessions by introducing unexpected situations.

## Goals
- Define 10-15 seasonal events distributed across the four seasons
- Implement random event triggering during the appropriate season
- Each event has defined effects (bonuses, challenges, choices)
- Display event notifications in the UI with effect descriptions
- Persist event history and active event state through save/load

## User Stories

### US-001: Define Seasonal Event Data Structure
**Description:** As a developer, I want a typed event data structure so that events are well-defined and data-driven.

**Acceptance Criteria:**
- [ ] A `SeasonalEvent` type is defined with fields: `id`, `name`, `description`, `season`, `effects` (array of effects), `choices` (optional array of player choices), `duration` (in game days), `weight` (probability weight)
- [ ] An `EventEffect` type supports: resource gains/losses, stat modifiers, creature spawns, and flags
- [ ] An `EventChoice` type supports: label, description, and effects for each option
- [ ] Types use `type` keyword per project conventions
- [ ] Typecheck/lint passes

### US-002: Define Growth Season Events
**Description:** As a developer, I want 3-4 events defined for the Growth season.

**Acceptance Criteria:**
- [ ] "Bumper Crop" event: +50 Food bonus, lasts 1 day
- [ ] "Wild Growth" event: Nature rooms produce double for 2 days but attract invaders
- [ ] "Healing Spring" event: All inhabitants heal 20% HP
- [ ] Events are defined in YAML (e.g., `gamedata/events/growth.yaml`)
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-003: Define Harvest Season Events
**Description:** As a developer, I want 3-4 events defined for the Harvest season.

**Acceptance Criteria:**
- [ ] "Rich Merchant" event: Merchant offers rare items at discount
- [ ] "Tax Collector" event: Lose 10% Gold or fight off the collector
- [ ] "Bountiful Harvest" event: +100 of each resource
- [ ] Events are defined in YAML (e.g., `gamedata/events/harvest.yaml`)
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-004: Define Darkness Season Events
**Description:** As a developer, I want 3-4 events defined for the Darkness season.

**Acceptance Criteria:**
- [ ] "Demonic Visitor" event: Opportunity to recruit a rare demon (choice: recruit or reject)
- [ ] "Shadow Rift" event: Random room gains +3 Corruption, may spawn shadow creatures
- [ ] "Undead Rising" event: Free skeleton reinforcements appear
- [ ] "Eclipse" event: All dark creatures gain +2 Attack for 1 day
- [ ] Events are defined in YAML
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-005: Define Storms Season Events
**Description:** As a developer, I want 3-4 events defined for the Storms season.

**Acceptance Criteria:**
- [ ] "Lightning Strike" event: Random room takes damage but generates burst of Flux
- [ ] "Arcane Storm" event: All magic rooms produce double for 1 day
- [ ] "Cave-In" event: Random hallway is blocked, must be repaired
- [ ] "Energy Surge" event: Research progress jumps 10%
- [ ] Events are defined in YAML
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-006: Random Event Trigger System
**Description:** As a developer, I want events to trigger randomly during appropriate seasons so that gameplay has variety.

**Acceptance Criteria:**
- [ ] Each game day during a season, there is a configurable chance (e.g., 30%) to trigger an event
- [ ] Events are selected from the pool matching the current season
- [ ] Selection uses weighted random based on the event's `weight` property
- [ ] The same event cannot trigger twice in the same season cycle
- [ ] Event triggering is integrated into the game loop day-transition handler
- [ ] Unit tests verify probability distribution and season filtering
- [ ] Typecheck/lint passes

### US-007: Event Notification UI
**Description:** As a player, I want event notifications to appear so that I know what is happening and can make choices.

**Acceptance Criteria:**
- [ ] When an event triggers, a notification panel/modal appears
- [ ] The notification shows the event name, description, and effects
- [ ] If the event has choices, buttons for each option are displayed
- [ ] Choosing an option applies its effects and dismisses the notification
- [ ] Events without choices have a "Dismiss" button that applies the default effect
- [ ] The notification component is standalone with OnPush change detection
- [ ] **[UI story]** Verify in browser using dev-browser skill
- [ ] Typecheck/lint passes

### US-008: Event Effect Application
**Description:** As a developer, I want event effects applied correctly to the game state.

**Acceptance Criteria:**
- [ ] Resource gain/loss effects modify the resource state immediately
- [ ] Stat modifier effects are applied for the event's duration then removed
- [ ] Creature spawn effects add inhabitants to the dungeon
- [ ] Timed effects track their remaining duration and expire correctly
- [ ] Unit tests verify each effect type
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must trigger random events during appropriate seasons
- FR-2: Events must be selectable from a weighted pool filtered by current season
- FR-3: Events must have defined effects that modify game state
- FR-4: Some events must offer player choices with distinct outcomes
- FR-5: Event notifications must appear in the UI
- FR-6: Timed event effects must expire after their duration

## Non-Goals (Out of Scope)
- Event chains (one event leading to follow-up events)
- Player-created custom events
- Event achievements or statistics
- Visual effects for events (beyond the notification UI)

## Technical Considerations
- Depends on the seasonal cycle system (Issue #77) and game loop (Issue #8)
- Event pool should be loaded from compiled gamedata via ContentService
- Random selection should use a seeded RNG if deterministic replay is desired
- Timed effects need a duration tracker integrated into the game loop
- Event history should be stored in game state to prevent repeats within a cycle
- Choice-based events should pause the game loop until the player decides

## Success Metrics
- Events trigger at approximately the configured probability
- Events are correctly filtered by season
- All effect types apply and expire correctly
- Players can make choices and see different outcomes

## Open Questions
- Should events be able to trigger during paused game states?
- Can multiple events be active simultaneously?
- Should there be a minimum gap between events (e.g., at least 1 day)?
- Should events scale in intensity with game progression?
