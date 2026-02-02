# PRD: Corruption Threshold Triggers

## Introduction
A monitoring system that checks Corruption levels every game hour and triggers appropriate events when thresholds are crossed. It provides warnings before major thresholds and supports Corruption reduction to avoid events. This system orchestrates the timing and delivery of Corruption effects.

## Goals
- Check Corruption level every game hour
- Trigger events at defined thresholds (50, 100, 200)
- Warn the player before major thresholds
- Support Corruption reduction to prevent events
- Track which thresholds have been triggered

## User Stories

### US-001: Periodic Corruption Check
**Description:** As a developer, I want Corruption levels checked every game hour so that threshold events are detected reliably.

**Acceptance Criteria:**
- [ ] Register a callback with the TimeService `onHour` for every hour (or use an effect on the hour signal)
- [ ] Each check compares current Corruption against all thresholds
- [ ] Check runs only during normal gameplay (not during invasions)
- [ ] Typecheck/lint passes

### US-002: Threshold Crossing Detection
**Description:** As a developer, I want to detect when Corruption crosses a threshold so that events trigger exactly once per crossing.

**Acceptance Criteria:**
- [ ] Track `triggeredThresholds` as a set of numbers
- [ ] When Corruption >= threshold AND threshold not already triggered, fire the event
- [ ] If Corruption drops below a threshold, remove it from triggered set (allowing re-trigger on next crossing)
- [ ] Thresholds: 50, 100, 200
- [ ] Persist triggered thresholds to game state
- [ ] Typecheck/lint passes

### US-003: Pre-Threshold Warnings
**Description:** As a player, I want warnings before I reach major Corruption thresholds so that I can take action.

**Acceptance Criteria:**
- [ ] Warn at 80% of each threshold (40 for 50-threshold, 80 for 100-threshold, 160 for 200-threshold)
- [ ] Warning shows: "Corruption approaching [threshold]. [Effect description]. Current: [value]/[threshold]"
- [ ] Warning appears as a dismissible notification
- [ ] Warning only shows once per approach (until threshold is crossed or Corruption drops below warning level)
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-004: Corruption Reduction to Avoid Events
**Description:** As a player, I want to reduce Corruption to avoid threshold events so that I have agency over consequences.

**Acceptance Criteria:**
- [ ] Document available reduction methods: Dryad inhabitant, purification rooms (future)
- [ ] If Corruption drops below a threshold before the event fires, the event does not trigger
- [ ] Reducing Corruption below 80% of a threshold dismisses the warning
- [ ] Corruption reduction is visible in the resource change rate
- [ ] Typecheck/lint passes

### US-005: Threshold Trigger Service
**Description:** As a developer, I want a dedicated service for Corruption threshold logic so that it is cleanly separated from the resource system.

**Acceptance Criteria:**
- [ ] Create `CorruptionThresholdService` in `src/app/services/`
- [ ] Service observes `corruption` signal and `currentHour` signal
- [ ] Service delegates to effect systems (unlock, mutation, invasion) when thresholds are crossed
- [ ] Service exposes `nextThreshold` computed signal for UI consumption
- [ ] Typecheck/lint passes

### US-006: Threshold Trigger Tests
**Description:** As a developer, I want tests for threshold detection logic so that triggers are reliable.

**Acceptance Criteria:**
- [ ] Test: Crossing 50 triggers dark unlock event
- [ ] Test: Crossing 100 triggers mutation event
- [ ] Test: Crossing 200 triggers crusade event
- [ ] Test: Dropping below threshold and re-crossing triggers again
- [ ] Test: Already-triggered threshold does not re-fire without dropping below
- [ ] Tests in `src/app/helpers/corruption-thresholds.spec.ts`
- [ ] All tests pass with `npm run test`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Corruption must be checked every game hour.
- FR-2: Events must trigger when Corruption crosses defined thresholds.
- FR-3: Each threshold must trigger only once per crossing.
- FR-4: Warnings must appear at 80% of each threshold.
- FR-5: Reducing Corruption must allow avoiding pending events.
- FR-6: Triggered thresholds must persist across saves.

## Non-Goals (Out of Scope)
- Specific effect implementations (covered by #56)
- Corruption generation rates (covered by #55)
- Custom threshold configuration by the player
- Threshold notifications for custom values

## Technical Considerations
- Depends on Corruption Resource (#54) and Corruption Effects (#56)
- Use Angular Signals and `effect()` for reactive threshold detection
- Consider debouncing to avoid rapid trigger/untrigger cycles
- Threshold state should persist to IndexedDB

## Success Metrics
- Thresholds trigger exactly once per crossing
- Warnings appear at correct pre-threshold levels
- Reducing Corruption successfully prevents events
- All unit tests pass

## Open Questions
- Should there be thresholds beyond 200?
- What is the exact timing of event execution relative to the hourly check?
- Should threshold warnings be more or less frequent as Corruption rises?
