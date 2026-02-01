# PRD: Synergy Tooltip System

## Introduction
The synergy tooltip system provides players with detailed information about active and potential synergies when hovering over rooms. Tooltips explain where bonuses come from, show their magnitude, and highlight potential synergies that could be unlocked by placing or connecting additional rooms. Active synergies are color-coded green and potential synergies yellow.

## Goals
- Display active synergies with source explanations on room hover
- Show potential (unlockable) synergies with guidance on how to activate them
- Color-code active (green) and potential (yellow) synergies
- Provide clear, readable tooltip formatting
- Update tooltip content reactively as game state changes

## User Stories

### US-001: Active Synergy Tooltip Display
**Description:** As a dungeon builder, I want to hover over a room and see its active synergies so that I understand why my production is boosted.

**Acceptance Criteria:**
- [ ] Hovering over a room shows a tooltip panel
- [ ] Active synergies are listed with their name and effect (e.g., "Adjacent to Forge: +30% Crystal production")
- [ ] Each active synergy is displayed with a green indicator/text color
- [ ] Multiple active synergies are listed as separate line items
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-002: Potential Synergy Display
**Description:** As a dungeon builder, I want to see potential synergies on the tooltip so that I know what rooms to build or connect next.

**Acceptance Criteria:**
- [ ] Potential synergies are listed below active synergies
- [ ] Each potential synergy explains what is needed (e.g., "Connect to adjacent Library for +20% Research")
- [ ] Potential synergies are displayed with a yellow indicator/text color
- [ ] Only achievable synergies are shown (e.g., requiring a room type that exists in the game)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Tooltip Component
**Description:** As a developer, I want a reusable tooltip component for synergy information so that it can be attached to any room on the grid.

**Acceptance Criteria:**
- [ ] A standalone Angular component `SynergyTooltipComponent` exists
- [ ] It accepts a `roomId` input signal
- [ ] It uses `computed()` to derive active and potential synergies from the room's state
- [ ] It positions itself relative to the hovered room (above or to the side)
- [ ] Uses `ChangeDetectionStrategy.OnPush`
- [ ] Typecheck/lint passes

### US-004: Tooltip Formatting and Layout
**Description:** As a dungeon builder, I want the synergy tooltip to be well-formatted and easy to read so that I can quickly understand the information.

**Acceptance Criteria:**
- [ ] Active synergies section has a header "Active Synergies"
- [ ] Potential synergies section has a header "Potential Synergies"
- [ ] Each synergy shows: icon, name, effect value, and source
- [ ] Sections are hidden if empty (e.g., no potential synergies = no yellow section)
- [ ] Tooltip has appropriate width, padding, and contrast for readability
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-005: Reactive Tooltip Updates
**Description:** As a developer, I want the tooltip to update reactively when synergies change so that the player always sees current information.

**Acceptance Criteria:**
- [ ] If a synergy activates while the tooltip is open, the tooltip updates
- [ ] If a synergy deactivates while the tooltip is open, the tooltip updates
- [ ] No manual refresh or re-hover is needed to see updated data
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Hovering over a room must display a tooltip showing all active and potential synergies for that room.
- FR-2: Active synergies must be color-coded green; potential synergies must be color-coded yellow.
- FR-3: Each synergy entry must include its name, effect, and source (which room/condition triggers it).
- FR-4: The tooltip must update reactively when the underlying synergy state changes.
- FR-5: The tooltip must handle rooms with zero synergies gracefully (show "No synergies" or hide).

## Non-Goals (Out of Scope)
- Synergy detection and evaluation logic (handled by Issue #23)
- Bonus calculation and application (handled by Issue #22)
- Room info panel beyond synergies (general room tooltip is a different feature)
- Tooltip animations or transition effects

## Technical Considerations
- Depends on synergy detection logic (Issue #23) for active/potential synergy data.
- The tooltip component should be a standalone Angular component using `input()` signals.
- Use `computed()` to derive tooltip data from the synergy service's signals.
- Position the tooltip using CSS (e.g., absolute positioning relative to the room element) or a lightweight popover utility.
- Color-coding should use CSS classes (e.g., `.synergy-active`, `.synergy-potential`) with appropriate theme colors.
- Consider accessibility: tooltips should be keyboard-accessible and screen-reader friendly.

## Success Metrics
- Tooltip displays within 100ms of hovering over a room
- Active and potential synergies are correctly categorized and color-coded
- Tooltip content matches actual synergy state at all times
- Players report improved understanding of bonus sources (qualitative)

## Open Questions
- Should the tooltip show the total production modifier as a summary line?
- Should potential synergies be ranked by impact (highest bonus first)?
- Should clicking a potential synergy highlight the required room placement location?
