# PRD: Fear/Hunger UI Indicators

## Introduction
Fear and hunger UI indicators provide visual feedback on the grid and in room panels showing the current fear level of rooms and hunger status of inhabitants. Color-coded icons, tooltips, and warnings help players manage their dungeon's atmosphere and food supply at a glance.

## Goals
- Display fear icons on rooms, color-coded by fear level
- Display hunger icons on inhabitants, color-coded by hunger state
- Provide tooltips explaining fear and hunger effects
- Show warnings when food is running low
- Keep indicators unobtrusive but informative

## User Stories

### US-001: Fear Icon on Rooms
**Description:** As a dungeon builder, I want to see a fear icon on each room on the grid so that I can assess fear levels at a glance.

**Acceptance Criteria:**
- [ ] Each room on the grid displays a small fear icon (e.g., ghost, skull, or fear symbol)
- [ ] Icon color corresponds to fear level: None=hidden/gray, Low=green, Medium=yellow, High=orange, VeryHigh=red
- [ ] Rooms with None (0) fear may hide the icon entirely
- [ ] Icons are positioned consistently (e.g., top-right corner of the room's area)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-002: Hunger Icon on Inhabitants
**Description:** As a dungeon builder, I want to see hunger status icons on inhabitants in the room panel so that I know who needs feeding.

**Acceptance Criteria:**
- [ ] Each inhabitant listed in a room's panel shows a hunger icon
- [ ] Fed = green icon or no icon; Hungry = yellow/orange icon; Starving = red icon
- [ ] Inappetent inhabitants show no hunger icon (or a special "doesn't eat" icon)
- [ ] Icons are small and do not clutter the inhabitant list
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Fear Tooltip
**Description:** As a dungeon builder, I want to hover over a room's fear icon and see an explanation so that I understand the fear composition.

**Acceptance Criteria:**
- [ ] Hovering the fear icon shows a tooltip with: base fear, inhabitant modifiers, propagated fear, and total
- [ ] Example: "Base: Low (1) + Skeleton (+1) + Adjacent Soul Well (+1) = High (3)"
- [ ] Tooltip explains any effects the fear level has (e.g., "High fear: -20% production for scared inhabitants")
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: Hunger Tooltip
**Description:** As a dungeon builder, I want to hover over an inhabitant's hunger icon and see details so that I understand their state.

**Acceptance Criteria:**
- [ ] Hovering shows: hunger state, food consumption rate, and any effects
- [ ] Example: "Hungry (-50% production). Consumes 2 Food/hr."
- [ ] Inappetent tooltip: "Does not eat."
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-005: Low Food Warning
**Description:** As a dungeon builder, I want a prominent warning when food is running low so that I can act before inhabitants starve.

**Acceptance Criteria:**
- [ ] A warning banner or icon appears in the resource bar when food drops below a threshold
- [ ] The warning is color-coded (yellow for low, red for critical/zero)
- [ ] The warning includes estimated time until food runs out
- [ ] The warning is dismissible but reappears if the condition persists
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-006: Indicator Component Architecture
**Description:** As a developer, I want fear and hunger indicators implemented as reusable standalone components.

**Acceptance Criteria:**
- [ ] `FearIndicatorComponent` accepts a room ID input and renders the fear icon
- [ ] `HungerIndicatorComponent` accepts an inhabitant ID input and renders the hunger icon
- [ ] Both components use `ChangeDetectionStrategy.OnPush`
- [ ] Both use `input()` signals and `computed()` for derived state
- [ ] Both support tooltip display via a shared tooltip mechanism
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Fear icons must render on every room with fear level > 0, color-coded by level.
- FR-2: Hunger icons must render on every inhabitant in room panels, color-coded by state.
- FR-3: Tooltips must explain fear composition and hunger effects.
- FR-4: A low food warning must appear in the resource bar when food is below threshold.
- FR-5: All indicators must update reactively when underlying state changes.

## Non-Goals (Out of Scope)
- Fear level calculation (handled by Issue #33)
- Fear propagation logic (handled by Issue #34)
- Hunger state management (handled by Issue #35)
- Sound effects for warnings
- Animated fear/hunger effects on the grid

## Technical Considerations
- Depends on fear level tracking (Issue #33) and hunger system (Issue #35).
- Indicator components should be lightweight standalone Angular components.
- Use `input()` for room/inhabitant IDs and `computed()` to derive display state from service signals.
- Color coding should use CSS custom properties or utility classes from the game's theme system.
- Tooltips should use the same tooltip infrastructure as the synergy tooltip (Issue #24) for consistency.
- Consider accessibility: color-coding should be supplemented with icons/text for colorblind users.

## Success Metrics
- All rooms show correct fear indicators matching their current fear level
- All inhabitants show correct hunger indicators matching their state
- Tooltips display accurate, up-to-date information
- Low food warning appears at the correct threshold
- Indicators update within 1 frame of state changes

## Open Questions
- Should fear icons pulse or animate at High/Very High levels?
- Should there be a global fear/hunger summary in the main UI (not just per-room)?
- What exact food threshold triggers the low food warning?
