# PRD: Time System

## Introduction
The time system drives the game's real-time simulation. It converts real wall-clock seconds into game time, supports pause and speed controls, and provides time-based triggers for the game loop. This system extends the existing `gameloop.ts` and `timer.ts` infrastructure.

## Goals
- Track game time in a human-readable format (days, hours, minutes)
- Support pause/resume functionality (extending the existing `gameloopPaused` option)
- Provide speed controls (1x, 2x, 4x) that multiply the tick rate
- Enable time-based event triggers for scheduled game events

## User Stories

### US-001: Game Time Tracking
**Description:** As a developer, I want game time tracked as days, hours, and minutes so that the game can display and reference elapsed time.

**Acceptance Criteria:**
- [ ] A `GameClock` type extends the existing `GameStateClock` with: `day: number`, `hour: number`, `minute: number`
- [ ] Game time starts at Day 1, Hour 0, Minute 0
- [ ] Each game tick advances time based on a configurable tick-to-time ratio (e.g., 1 tick = 1 second of game time)
- [ ] Time correctly rolls over: 60 minutes = 1 hour, 24 hours = 1 day
- [ ] Helper functions: `getGameDay()`, `getGameHour()`, `getGameMinute()`, `getFormattedTime()` return computed signals
- [ ] Unit tests verify time rollover at boundaries (minute 59 -> hour, hour 23 -> day)
- [ ] Typecheck/lint passes

### US-002: Pause and Resume
**Description:** As a player, I want to pause and resume the game so that I can plan my next move without time pressure.

**Acceptance Criteria:**
- [ ] A pause button is visible in the game UI (top bar or similar)
- [ ] Clicking pause stops the game loop (uses existing `gameloopPaused` option)
- [ ] Clicking again resumes the game loop
- [ ] Visual indicator shows current pause state (e.g., button text changes, overlay appears)
- [ ] Keyboard shortcut (Space bar) toggles pause
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-003: Speed Controls
**Description:** As a player, I want to change the game speed so that I can fast-forward through slow periods.

**Acceptance Criteria:**
- [ ] Speed buttons for 1x, 2x, and 4x are displayed next to the pause button
- [ ] The current speed is visually highlighted
- [ ] Speed multiplier is applied via the existing `debugTickMultiplier` option (or a new dedicated option)
- [ ] Changing speed takes effect immediately on the next tick
- [ ] Keyboard shortcuts: 1/2/3 keys set speed to 1x/2x/4x
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-004: Time Display in UI
**Description:** As a player, I want to see the current game time displayed so that I know what day and time it is in-game.

**Acceptance Criteria:**
- [ ] A time display component shows "Day X - HH:MM" format in the game UI header
- [ ] Time updates in real-time as the game runs
- [ ] Display pauses (stops updating) when game is paused
- [ ] Component uses OnPush change detection and Angular Signals
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Time-Based Event Triggers
**Description:** As a developer, I want to register callbacks that fire at specific game times so that events can be scheduled.

**Acceptance Criteria:**
- [ ] A function `scheduleEvent(triggerTime: {day?, hour?, minute?}, callback)` registers a time-based trigger
- [ ] Events fire when game time reaches or passes the specified time
- [ ] One-shot events fire once and are removed; recurring events can re-register
- [ ] Events do not fire while the game is paused
- [ ] Unit tests verify event firing at correct times and not firing when paused
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must track game time as days, hours, and minutes derived from tick count
- FR-2: Pause must stop all time-dependent game logic
- FR-3: Speed controls must multiply the effective ticks per real second (1x, 2x, 4x)
- FR-4: Game time must display in the UI and update reactively
- FR-5: Time-based events must fire at their scheduled game time

## Non-Goals (Out of Scope)
- Seasons or weather cycles
- Real-time clock integration (real wall time)
- Time travel or rewind mechanics
- Per-room time modifiers
- Time of day affecting lighting or visuals

## Technical Considerations
- The existing `gameloop.ts` already handles ticks with `numTicks` and `debugTickMultiplier`. Speed controls should integrate with this mechanism rather than duplicating it.
- Game time should be derived from `numTicks` via a pure calculation, not stored separately (to avoid desync). Alternatively, store it but keep it in sync.
- The `timer.ts` helper already tracks `timerTicksElapsed` and `timerLastSaveTick`. Extend rather than replace.
- Time display component should be a lightweight signal-based component in the game layout.
- Event triggers should use a sorted queue (by trigger time) checked each tick for efficiency.

## Success Metrics
- Time display updates smoothly at all speed settings
- Pause/resume has zero delay (< 1 tick latency)
- Speed changes take effect on the immediate next tick
- Time-based events fire within 1 tick of their scheduled time

## Open Questions
- Should game time map 1:1 with real time at 1x speed, or use a different ratio?
- Should speed controls go beyond 4x (8x, 16x) for late-game?
- Does time of day (hour) affect any game mechanics like inhabitant mood or production?
