# PRD: Contextual Tooltips

## Introduction
Contextual Tooltips provide hover-based information overlays on all interactive UI elements throughout the game. They explain stats, bonuses, costs, production calculations, and keyboard shortcuts, helping players understand the game systems without consulting external documentation.

## Goals
- Add hover tooltips to all interactive UI elements
- Explain stats, bonuses, costs, and calculations in tooltips
- Show production breakdowns (why a value is what it is)
- Display keyboard shortcuts in relevant tooltips
- Ensure tooltips are consistent in style and behavior

## User Stories

### US-001: Tooltip Directive
**Description:** As a developer, I want a reusable tooltip directive so that tooltips can be added to any element consistently.

**Acceptance Criteria:**
- [ ] A `TooltipDirective` is implemented as a standalone Angular directive
- [ ] Usage: `<button [appTooltip]="'Tooltip text'">` or `<button [appTooltip]="tooltipTemplate">`
- [ ] The directive supports string content and `TemplateRef` for rich content
- [ ] Tooltip appears on mouseenter after a short delay (300ms)
- [ ] Tooltip disappears on mouseleave
- [ ] Tooltip positioning avoids viewport edges (auto-repositions)
- [ ] Unit tests verify tooltip show/hide behavior
- [ ] Typecheck/lint passes

### US-002: Resource Tooltips
**Description:** As a player, I want tooltips on resource displays so that I understand production rates and sources.

**Acceptance Criteria:**
- [ ] Hovering a resource value shows: current amount, max storage, net production per minute
- [ ] Production breakdown lists each source room and its contribution
- [ ] Consumption sources are listed (e.g., "Inhabitants consume 5 Food/min")
- [ ] Net positive production is shown in green, net negative in red
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-003: Room Tooltips
**Description:** As a player, I want tooltips on rooms so that I can see room stats without opening a detail panel.

**Acceptance Criteria:**
- [ ] Hovering a room on the grid shows: room name, type, level, inhabitant count/capacity
- [ ] Production values with modifiers are displayed
- [ ] Active features are listed
- [ ] Fear and Corruption values for the room are shown
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-004: Inhabitant Tooltips
**Description:** As a player, I want tooltips on inhabitants so that I can quickly see their stats and assignment.

**Acceptance Criteria:**
- [ ] Hovering an inhabitant shows: name, type, level, HP, assigned room
- [ ] Combat stats are displayed if applicable
- [ ] Current activity (working, idle, fighting) is shown
- [ ] XP progress to next level is displayed
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Cost Tooltips
**Description:** As a player, I want tooltips on cost displays so that I understand what I need to afford something.

**Acceptance Criteria:**
- [ ] Hovering a cost indicator shows: each resource required and current availability
- [ ] Resources the player has enough of are shown in green
- [ ] Resources the player lacks are shown in red with the deficit amount
- [ ] Total affordability is clearly indicated ("Can afford" / "Cannot afford - need X more Gold")
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-006: Keyboard Shortcut Tooltips
**Description:** As a player, I want tooltips on buttons to include keyboard shortcuts so that I can learn faster navigation.

**Acceptance Criteria:**
- [ ] Buttons with keyboard shortcuts show the shortcut in the tooltip (e.g., "Save Game (Ctrl+S)")
- [ ] Shortcut text is styled distinctly (e.g., monospace or badge style)
- [ ] Shortcuts are accurate and match the actual key bindings
- [ ] Tooltips without shortcuts do not show empty shortcut areas
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-007: Tooltip Styling and Consistency
**Description:** As a developer, I want a consistent tooltip style so that all tooltips feel cohesive.

**Acceptance Criteria:**
- [ ] All tooltips use a shared CSS class with consistent background, border, font, and shadow
- [ ] Tooltips support a title line (bold) and body text
- [ ] Rich tooltips support sections with dividers
- [ ] Tooltip max width prevents overly wide tooltips
- [ ] Tooltips are readable against all game backgrounds
- [ ] **[UI story]** Verify in browser using dev-browser skill

## Functional Requirements
- FR-1: A reusable tooltip directive must support string and template content
- FR-2: Tooltips must appear on hover with a short delay and disappear on leave
- FR-3: Resource tooltips must show production breakdowns
- FR-4: Cost tooltips must show affordability with color coding
- FR-5: Keyboard shortcuts must be displayed in relevant tooltips
- FR-6: Tooltip positioning must avoid viewport edges

## Non-Goals (Out of Scope)
- Click-to-pin tooltips (tooltips are hover-only)
- Mobile/touch tooltip support (tap-to-show)
- Tooltip animations beyond fade-in/out
- Tooltip content localization

## Technical Considerations
- Depends on all UI systems being in place for full coverage
- The tooltip directive should use Angular's CDK Overlay or a lightweight custom positioning system
- Rich tooltips with `TemplateRef` enable computed content (production breakdowns)
- Tooltip delay prevents flickering when moving the mouse across many elements
- Consider using `@defer` for tooltip content that requires heavy computation
- Host bindings in the directive for `mouseenter`/`mouseleave` events per project conventions

## Success Metrics
- All interactive UI elements have tooltips
- Production breakdown tooltips show accurate values matching actual production
- Tooltips never overflow the viewport
- Tooltip delay feels natural (not too slow, not instant)

## Open Questions
- Should tooltips be dismissible via keyboard (Escape)?
- Should there be a setting to disable tooltips for experienced players?
- Should tooltips support images or icons inline?
