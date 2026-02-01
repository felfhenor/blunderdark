# PRD: Invasion Trigger System

## Introduction
Control when and how invasions are triggered. After a grace period of 30 days, invasions begin occurring on a schedule that increases in frequency over time. Special invasions can be triggered by events or reputation. Players receive a 2-minute warning before each invasion begins. Random variance prevents invasions from being entirely predictable.

## Goals
- Enforce a 30-day grace period before the first invasion
- Schedule invasions based on day count with increasing frequency
- Add random variance to invasion timing
- Support special event-triggered invasions
- Warn the player 2 minutes before an invasion starts

## User Stories

### US-001: Grace Period
**Description:** As a player, I want a grace period before invasions start so that I can build up my dungeon defenses.

**Acceptance Criteria:**
- [ ] No invasions occur before day 30
- [ ] Grace period duration is configurable in game settings
- [ ] First invasion is scheduled for day 30 (plus random variance)
- [ ] Grace period status is visible to the player
- [ ] Typecheck/lint passes

### US-002: Invasion Scheduling
**Description:** As a developer, I want an invasion scheduler that plans future invasions so that the game has a predictable but escalating threat.

**Acceptance Criteria:**
- [ ] After grace period, schedule next invasion based on current day
- [ ] Base interval: every 15 days initially
- [ ] Interval decreases over time: 15 days at day 30, 10 days at day 60, 7 days at day 100, minimum 5 days
- [ ] Schedule is recalculated when an invasion completes
- [ ] Scheduled invasion day is persisted to game state
- [ ] Typecheck/lint passes

### US-003: Random Variance
**Description:** As a player, I want some unpredictability in invasion timing so that the game feels dynamic.

**Acceptance Criteria:**
- [ ] Each scheduled invasion has a random variance of +/- 2 days
- [ ] Variance is determined when the invasion is scheduled (not re-rolled)
- [ ] Variance cannot push an invasion before the grace period
- [ ] Minimum 3 days between consecutive invasions
- [ ] Typecheck/lint passes

### US-004: Invasion Warning
**Description:** As a player, I want to be warned before an invasion so that I can prepare my defenses.

**Acceptance Criteria:**
- [ ] Display a warning notification 2 game minutes before invasion starts
- [ ] Warning includes text like "Invasion approaching!"
- [ ] Warning is dismissible but remains visible until invasion starts
- [ ] Audio/visual alert accompanies the warning
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Special Invasion Triggers
**Description:** As a developer, I want to trigger invasions from special events so that reputation and corruption create consequences.

**Acceptance Criteria:**
- [ ] Provide `triggerSpecialInvasion(type: string, delay?: number)` method on InvasionTriggerService
- [ ] Special invasions bypass the normal schedule
- [ ] Special invasions have their own warning period
- [ ] Special invasion types are defined as a type union (e.g., `'crusade' | 'raid' | 'bounty_hunter'`)
- [ ] Typecheck/lint passes

### US-006: Invasion Trigger Persistence
**Description:** As a developer, I want invasion schedule data to persist so that saving and loading doesn't reset the invasion timeline.

**Acceptance Criteria:**
- [ ] Persist next scheduled invasion day, variance, and invasion history to IndexedDB
- [ ] Restore schedule on game load
- [ ] Handle edge case: loaded game is past the scheduled invasion day (trigger immediately after load)
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: No invasions may occur before day 30 (configurable grace period).
- FR-2: Invasion frequency must increase over time with a minimum interval of 5 days.
- FR-3: Each invasion's scheduled day must include +/- 2 days of random variance.
- FR-4: A warning must display 2 game minutes before each invasion.
- FR-5: Special invasions must be triggerable independently of the schedule.
- FR-6: All scheduling data must persist across saves.

## Non-Goals (Out of Scope)
- Invasion difficulty scaling (covered separately)
- Invasion composition / army generation
- Multi-floor invasions
- Player-initiated invasions

## Technical Considerations
- Depends on Game Loop (#8) for day tracking
- Create `InvasionTriggerService` in `src/app/services/`
- Use Angular Signals for next invasion day, warning state
- Invasion types in `src/app/interfaces/`
- Consider using the TimeService (if available) for minute-level warning timing

## Success Metrics
- No invasions occur during grace period
- Invasion frequency increases observably over a 100-day game
- Warnings appear exactly 2 game minutes before invasion start
- Schedule persists correctly across save/load

## Open Questions
- Should the player be able to see the approximate date of the next invasion?
- Can the player delay invasions through diplomacy or tribute?
- Should difficulty scale with dungeon size or just day count?
