# PRD: Floor Navigation UI

## Introduction
Provide intuitive UI for navigating between dungeon floors. Players need to quickly switch between floors to manage their expanding dungeon. The navigation includes a floor selector, current floor indicator, minimap overview, and keyboard shortcuts.

## Goals
- Provide a floor selector UI (dropdown or buttons)
- Show the current floor number prominently
- Display a minimap showing all floors at a glance
- Support keyboard shortcuts for floor navigation
- Only render the current floor for performance

## User Stories

### US-001: Floor Selector Component
**Description:** As a player, I want a floor selector so that I can switch between dungeon floors.

**Acceptance Criteria:**
- [ ] Create `FloorSelectorComponent` showing all available floors
- [ ] Each floor entry shows: depth number, floor name, room count
- [ ] Clicking a floor switches the active view to that floor
- [ ] Current floor is highlighted in the selector
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-002: Current Floor Indicator
**Description:** As a player, I want to see which floor I am currently viewing so that I don't lose track.

**Acceptance Criteria:**
- [ ] Display current floor number prominently in the game UI header
- [ ] Show format like "Floor 3 / 10" (current / max created)
- [ ] Update immediately when floor changes
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-003: Keyboard Shortcuts
**Description:** As a player, I want keyboard shortcuts to navigate floors so that I can switch quickly.

**Acceptance Criteria:**
- [ ] Page Up: Switch to the floor above (lower depth number)
- [ ] Page Down: Switch to the floor below (higher depth number)
- [ ] Shortcuts do nothing if already at the top or bottom floor
- [ ] Shortcuts are disabled during invasion mode
- [ ] Register shortcuts via `host` bindings on the appropriate component
- [ ] Typecheck/lint passes

### US-004: Floor Minimap
**Description:** As a player, I want a minimap showing all floors so that I can get an overview of my dungeon.

**Acceptance Criteria:**
- [ ] Display a small minimap panel showing all created floors stacked vertically
- [ ] Each floor shown as a simplified grid with room outlines
- [ ] Current floor is highlighted
- [ ] Clicking a floor in the minimap switches to it
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Render Optimization
**Description:** As a developer, I want only the current floor to be fully rendered so that multi-floor dungeons remain performant.

**Acceptance Criteria:**
- [ ] Only the current floor's grid and rooms are rendered in the main view
- [ ] Floor switch triggers a render of the new floor's data
- [ ] Non-active floors are not in the DOM (use `@if` for conditional rendering)
- [ ] Floor switch is visually smooth (no flicker or long delay)
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: A floor selector must allow switching between all created floors.
- FR-2: The current floor number must be visible at all times.
- FR-3: Keyboard shortcuts (Page Up/Down) must navigate floors.
- FR-4: A minimap must show an overview of all floors.
- FR-5: Only the current floor must be fully rendered for performance.

## Non-Goals (Out of Scope)
- Floor creation from the navigation UI (covered by #46)
- Floor-to-floor animations or transitions
- 3D cross-section view
- Floor comparison view (side-by-side)

## Technical Considerations
- Depends on Floor Creation System (#46) for floor data and signals
- Floor switching updates `FloorService.currentFloor` signal
- Minimap should use a lightweight rendering approach (CSS grid with colored cells, not full tile rendering)
- Keyboard shortcut handling should use Angular's host binding pattern
- Consider debouncing rapid keyboard navigation

## Success Metrics
- Floor switching takes less than 100ms
- Minimap renders all floors without lag
- Keyboard shortcuts feel responsive
- Players always know which floor they are viewing

## Open Questions
- Should the minimap show inhabitant positions?
- Should there be a floor transition animation?
- How large should the minimap be relative to the main view?
