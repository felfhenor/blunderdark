# PRD: Victory Progress Tracking UI

## Introduction
The Victory Progress Tracking UI provides players with a dedicated menu showing all five victory paths, their conditions, and current progress. Players can see how close they are to each victory, identify which path they are closest to pursuing, and understand what actions are needed to progress.

## Goals
- Display all five victory paths with condition progress in a dedicated UI panel
- Show progress bars and checkboxes for individual conditions
- Highlight the path the player is closest to achieving
- Provide informative tooltips explaining each condition
- Update progress in real time as game state changes

## User Stories

### US-001: Victory Menu Access
**Description:** As a player, I want to access a Victory menu from the game UI so that I can review my progress toward winning.

**Acceptance Criteria:**
- [ ] A "Victory" button or tab is accessible from the game-play page
- [ ] Clicking the button opens a Victory progress panel/overlay
- [ ] The panel can be closed to return to normal gameplay
- [ ] The panel does not pause the game while open
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-002: Victory Paths Overview
**Description:** As a player, I want to see all five victory paths listed with their names and brief descriptions so that I understand the available win conditions.

**Acceptance Criteria:**
- [ ] All five paths are listed: Terror Lord, Dragon's Hoard, Mad Scientist, Harmonious Kingdom, Eternal Empire
- [ ] Each path shows its name, a one-sentence description, and an icon
- [ ] Paths are displayed in a consistent layout (cards, rows, or accordion sections)
- [ ] Each path can be expanded to show detailed conditions
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-003: Condition Progress Display
**Description:** As a player, I want to see each condition within a victory path with its current progress so that I know exactly what I need to achieve.

**Acceptance Criteria:**
- [ ] Each condition shows: description, current value, target value
- [ ] Numeric conditions show a progress bar (e.g., "Gold: 3,500 / 10,000")
- [ ] Boolean conditions show a checkbox (checked = complete, unchecked = incomplete)
- [ ] Duration conditions show elapsed/required time (e.g., "Peaceful Days: 12 / 30")
- [ ] Completed conditions are visually marked (green checkmark, strikethrough, or highlight)
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-004: Active Pursuit Highlighting
**Description:** As a player, I want the path I am closest to completing highlighted so that I can focus my efforts.

**Acceptance Criteria:**
- [ ] The system calculates a "completion percentage" for each path (completed conditions / total conditions, weighted by progress)
- [ ] The path with the highest completion percentage is visually highlighted (border, badge, or "Closest" label)
- [ ] If two paths are tied, both are highlighted
- [ ] The highlight updates dynamically as progress changes
- [ ] Unit tests verify completion percentage calculation
- [ ] Typecheck/lint passes

### US-005: Condition Tooltips
**Description:** As a player, I want tooltips on each condition that explain what is needed and provide hints so that I can plan my strategy.

**Acceptance Criteria:**
- [ ] Hovering over a condition shows a tooltip with detailed explanation
- [ ] Tooltips include: full description, current state, what actions contribute to progress
- [ ] For incomplete conditions, the tooltip suggests gameplay actions (e.g., "Build more rooms to increase room count")
- [ ] Tooltips are styled consistently with the game's tooltip system
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-006: Real-Time Progress Updates
**Description:** As a player, I want the victory UI to update in real time so that I see progress changes immediately.

**Acceptance Criteria:**
- [ ] Progress bars and values update without requiring the panel to be closed and reopened
- [ ] When a condition is newly completed, a brief highlight animation plays
- [ ] When all conditions for a path are complete, the path entry shows a "Victory Available!" indicator
- [ ] Updates use Angular Signals / computed values for reactive rendering
- [ ] Typecheck/lint passes

### US-007: Victory Progress Component Architecture
**Description:** As a developer, I want the victory UI built as composable standalone components so that it follows project conventions.

**Acceptance Criteria:**
- [ ] `VictoryMenuComponent` (standalone, OnPush) is the top-level container
- [ ] `VictoryPathCardComponent` (standalone, OnPush) renders a single path with its conditions
- [ ] `VictoryConditionRowComponent` (standalone, OnPush) renders a single condition with progress
- [ ] Components use `input()` / `output()` functions, not decorators
- [ ] Components use `@for` and `@if` for control flow
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The UI must display all five victory paths with their conditions
- FR-2: Each condition must show current progress relative to its target
- FR-3: The system must highlight the path closest to completion
- FR-4: Tooltips must explain each condition and suggest actions
- FR-5: Progress must update in real time via reactive signals

## Non-Goals (Out of Scope)
- Victory path selection or commitment (players can pursue any path freely)
- Victory history or past game results
- Social sharing of victory progress
- Victory path recommendations based on playstyle

## Technical Considerations
- Depends on Issue #101 (Victory Path Implementation) for victory data and condition evaluation
- Use `computed()` signals derived from `VictoryService` for reactive progress
- Completion percentage should weight conditions by their relative difficulty (optional enhancement)
- The panel should use CSS Grid or Flexbox for responsive layout within the game viewport
- Consider lazy loading the victory panel since it is not needed on every frame

## Success Metrics
- All five paths display correctly with accurate progress for all conditions
- Active pursuit highlighting correctly identifies the closest path
- Progress updates are visible within 1 second of game state changes
- Tooltips provide useful, accurate information for all conditions

## Open Questions
- Should the victory menu show a "recommended path" based on current game state?
- Should completed victory paths from the current game be permanently displayed?
- Is there a compact/minimized view for the victory panel that shows just the closest path?
