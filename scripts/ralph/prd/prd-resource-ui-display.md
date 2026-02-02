# PRD: Resource UI Display

## Introduction
The resource UI display shows the player their current resource amounts, storage limits, and production rates at a glance. It provides visual warnings when resources are low and tooltips for detailed information about each resource.

## Goals
- Display all 7 resource types with current amount and max storage
- Show per-minute production rate for each resource
- Provide color-coded warnings for low resources
- Include tooltips explaining each resource's purpose

## User Stories

### US-001: Resource Bar Component
**Description:** As a player, I want a resource bar showing all my currencies so that I can monitor my economy at a glance.

**Acceptance Criteria:**
- [ ] A `ResourceBarComponent` (standalone, OnPush) is displayed at the top of the game-play page
- [ ] Shows all 7 resource types in a horizontal bar
- [ ] Each resource shows its icon/name and current amount
- [ ] Resources are ordered consistently (Crystals, Food, Gold, Flux, Research, Essence, Corruption)
- [ ] Component is responsive and does not overflow on smaller viewports
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-002: Current and Max Display
**Description:** As a player, I want to see both my current amount and storage limit so that I know how close I am to capacity.

**Acceptance Criteria:**
- [ ] Each resource displays as "Current / Max" format (e.g., "150 / 500")
- [ ] A progress bar or fill indicator visually shows the ratio
- [ ] When at max capacity, the resource is visually marked (e.g., golden border or "FULL" badge)
- [ ] Numbers use locale-appropriate formatting (commas for thousands)
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-003: Production Rate Display
**Description:** As a player, I want to see how quickly each resource is being produced so that I can plan my expansion.

**Acceptance Criteria:**
- [ ] Each resource shows a production rate label: "+X/min" or "-X/min"
- [ ] Positive rates are shown in green, negative in red, zero in gray
- [ ] Production rate updates when rooms, inhabitants, or modifiers change
- [ ] Rate is calculated from the production calculation system's signals (Issue #9)
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-004: Low Resource Warnings
**Description:** As a player, I want visual warnings when resources are critically low so that I can take action before running out.

**Acceptance Criteria:**
- [ ] When a resource drops below 20% of max, its display turns yellow/amber
- [ ] When a resource drops below 10% of max, its display turns red with a pulse animation
- [ ] When a resource reaches 0, the display shows a distinct "EMPTY" state
- [ ] Warning thresholds are configurable constants (not hardcoded inline)
- [ ] Warnings use CSS classes, not inline styles
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Resource Tooltips
**Description:** As a player, I want to hover over a resource to see detailed information so that I understand what each resource does.

**Acceptance Criteria:**
- [ ] Hovering over a resource shows a tooltip with: resource name, description, current/max, production breakdown
- [ ] Production breakdown shows: base production, inhabitant bonuses, adjacency bonuses, modifier effects
- [ ] Tooltip appears after a short delay (200-300ms) and disappears on mouse leave
- [ ] Tooltip is positioned to avoid overflow off-screen
- [ ] **[UI story]** Verify in browser using dev-browser skill

## Functional Requirements
- FR-1: The resource bar must display all 7 resource types with current amount and max storage
- FR-2: Each resource must show its per-minute production rate
- FR-3: Resources below threshold levels must display color-coded warnings
- FR-4: Tooltips must provide detailed breakdowns of each resource
- FR-5: All displayed values must update reactively via Angular Signals

## Non-Goals (Out of Scope)
- Resource history charts or graphs
- Resource notifications/alerts (e.g., "Gold is full!")
- Clicking resources to spend them
- Resource conversion UI
- Detailed production log

## Technical Considerations
- The component should consume signals from the resource manager (Issue #7) and production system (Issue #9)
- Use `computed()` signals to derive display values (formatted strings, warning states, rates)
- Tooltips can be a shared directive (`src/app/directives/tooltip.directive.ts`) reusable across the app
- Number formatting should use Angular's built-in number pipe or a helper function
- The resource bar should be a fixed/sticky element that stays visible during scrolling/panning
- CSS classes for warning states: `.resource-normal`, `.resource-warning`, `.resource-critical`, `.resource-empty`

## Success Metrics
- All 7 resources are visible without scrolling on a 1280px-wide viewport
- Warning states activate at correct thresholds
- Tooltips render within 300ms of hover
- Production rates match the actual resource accumulation rate

## Open Questions
- Should the resource bar be collapsible or always visible?
- Should there be a detailed resource panel accessible by clicking a resource?
- What icons represent each resource type?
