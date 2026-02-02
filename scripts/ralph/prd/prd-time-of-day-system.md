# PRD: Time of Day System

## Introduction
Implement a 24-hour day/night cycle that drives gameplay events, production modifiers, and visual changes. The time system provides a foundational clock that other systems (production, invasions, corruption) hook into, creating dynamic gameplay that shifts based on the current hour.

## Goals
- Implement a configurable 24-hour game clock that maps real time to game time
- Track current hour (0-23) with day, night, and twilight phases
- Display current time in the game UI
- Provide an event system that fires callbacks at specific game hours
- Allow speed adjustment (1x, 2x, 4x) for time progression
- Persist time state across saves/reloads

## User Stories

### US-001: Core Time Signal
**Description:** As a developer, I want a time-tracking signal that maintains the current game hour so that other systems can react to time changes.

**Acceptance Criteria:**
- [ ] Create `TimeService` in `src/app/services/` with `providedIn: 'root'`
- [ ] Track `currentHour` as a signal (0-23, wrapping)
- [ ] Track `currentDay` as a signal (incrementing integer)
- [ ] Track `currentPhase` as a computed signal (`'day' | 'night' | 'dawn' | 'dusk'`)
- [ ] Day phase: hours 7-17, Night phase: hours 19-5, Dawn: 6, Dusk: 18
- [ ] Default speed: 1 real minute = 1 game hour
- [ ] Typecheck/lint passes

### US-002: Time Progression Integration with Game Loop
**Description:** As a developer, I want the time system to advance based on the existing game loop so that time progresses consistently with other game systems.

**Acceptance Criteria:**
- [ ] Hook into the existing tick-based game loop in `gameloop.ts`
- [ ] Accumulate elapsed real time and convert to game hours based on speed multiplier
- [ ] Advance hour when threshold reached, increment day when hour wraps past 23
- [ ] Pause time when game loop is paused
- [ ] Typecheck/lint passes

### US-003: Time Speed Control
**Description:** As a player, I want to adjust the speed of time progression so that I can speed through uneventful periods.

**Acceptance Criteria:**
- [ ] Add `timeSpeed` signal to `TimeService` with values: 1, 2, 4
- [ ] Speed multiplier affects how quickly real time converts to game hours
- [ ] At 1x: 1 real minute = 1 game hour; at 2x: 30 real seconds = 1 game hour; at 4x: 15 real seconds = 1 game hour
- [ ] Expose `setTimeSpeed(speed: number)` method
- [ ] Typecheck/lint passes

### US-004: Time Event Scheduler
**Description:** As a developer, I want to register callbacks that fire at specific game hours so that other systems can trigger events at particular times of day.

**Acceptance Criteria:**
- [ ] Add `onHour(hour: number, callback: () => void): () => void` method that returns an unsubscribe function
- [ ] Add `onPhaseChange(callback: (phase: TimePhase) => void): () => void` method
- [ ] Callbacks fire when the game clock reaches the specified hour
- [ ] Multiple callbacks can be registered for the same hour
- [ ] Typecheck/lint passes

### US-005: Time Persistence
**Description:** As a player, I want the time of day to be saved and restored so that my game continues at the correct time after reloading.

**Acceptance Criteria:**
- [ ] Persist `currentHour`, `currentDay`, and `timeSpeed` to IndexedDB via game state
- [ ] Restore time state on game load
- [ ] Handle missing time data gracefully (default to hour 0, day 1)
- [ ] Typecheck/lint passes

### US-006: Time Display in UI
**Description:** As a player, I want to see the current time of day displayed in the game UI so that I can plan my actions around the day/night cycle.

**Acceptance Criteria:**
- [ ] Add time display component showing current hour in 24h format (e.g., "Hour 14")
- [ ] Show current phase label (Day, Night, Dawn, Dusk)
- [ ] Show current day number (Day 1, Day 2, etc.)
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

## Functional Requirements
- FR-1: The system must track game time as a 24-hour clock (hours 0-23) with day counting.
- FR-2: Time must advance proportionally to real time, scaled by the speed multiplier.
- FR-3: The system must categorize each hour into a phase: day (7-17), night (19-5), dawn (6), or dusk (18).
- FR-4: The system must fire registered event callbacks when the clock reaches specified hours.
- FR-5: Time must pause when the game loop pauses and resume when it resumes.
- FR-6: Time state must persist to IndexedDB and restore on load.

## Non-Goals (Out of Scope)
- Visual lighting/color changes (covered by Issue #40)
- Production modifier calculations (covered by Issue #39)
- Seasonal or weather systems
- Real-time clock synchronization

## Technical Considerations
- Depends on the existing game loop system (#8) for tick integration
- Use Angular Signals for all time state (consistent with project conventions)
- Time types should be defined in `src/app/interfaces/`
- The `TimeService` will be consumed by many other services; keep the API minimal and stable
- Consider using `effect()` sparingly; prefer computed signals for derived state

## Success Metrics
- Time advances correctly at all speed settings
- Phase transitions occur at the correct hours
- Time persists and restores accurately across game sessions
- No performance degradation from time tick processing

## Open Questions
- Should twilight (dawn/dusk) be exactly 1 hour each, or configurable?
- Should time be pausable independently of the game loop?
- What happens to accumulated time if the browser tab is backgrounded?
