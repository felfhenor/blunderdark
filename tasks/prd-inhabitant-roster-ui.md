# PRD: Inhabitant Roster UI

## Introduction
The inhabitant roster UI provides players with a comprehensive view of all their owned inhabitants. It shows stats, current assignments, and allows filtering and selection for management purposes.

## Goals
- Display a list of all owned inhabitants with key information
- Show inhabitant stats and current room assignment
- Provide filtering by assignment status
- Enable clicking to view detailed inhabitant info
- Support reassignment from the roster view

## User Stories

### US-001: Inhabitant List Display
**Description:** As a player, I want to see a list of all my inhabitants so that I know what creatures I have.

**Acceptance Criteria:**
- [ ] A `RosterComponent` (standalone, OnPush) displays a scrollable list of all owned inhabitants
- [ ] Each list entry shows: name, type icon, tier badge, current state (normal/scared/hungry)
- [ ] List updates reactively when inhabitants are recruited, removed, or change state
- [ ] Empty state message shown when no inhabitants are owned: "No inhabitants yet. Visit the altar to recruit."
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-002: Stats Display per Inhabitant
**Description:** As a player, I want to see each inhabitant's stats so that I can make informed assignment decisions.

**Acceptance Criteria:**
- [ ] Each roster entry shows key stats: HP, Attack, Defense, Speed, Worker Efficiency
- [ ] Stats are displayed compactly (icons + numbers or a small stat bar)
- [ ] Traits are shown as small badges or tags on each entry
- [ ] Stat values that are above average for the tier are highlighted in green
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-003: Assignment Status Display
**Description:** As a player, I want to see where each inhabitant is assigned so that I can manage my workforce.

**Acceptance Criteria:**
- [ ] Each roster entry shows the assigned room name, or "Unassigned" if not assigned
- [ ] Assigned inhabitants show a room icon next to the room name
- [ ] Unassigned inhabitants are visually distinct (dimmer or different background)
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-004: Filter by Assignment Status
**Description:** As a player, I want to filter the roster by assigned/unassigned so that I can quickly find available inhabitants.

**Acceptance Criteria:**
- [ ] Filter buttons/tabs: "All", "Assigned", "Unassigned"
- [ ] Filtering updates the list immediately (signal-driven, no reload)
- [ ] Filter shows count for each category (e.g., "All (12)", "Assigned (8)", "Unassigned (4)")
- [ ] Default filter is "All"
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Inhabitant Detail View
**Description:** As a player, I want to click an inhabitant to see their full details so that I can inspect all their properties.

**Acceptance Criteria:**
- [ ] Clicking a roster entry opens a detail panel/modal
- [ ] Detail view shows: full name, type, tier, all stats with labels, all traits with descriptions, current state, current assignment
- [ ] Detail view includes a "Reassign" button that opens the assignment interface
- [ ] Detail view includes an "Unassign" button if currently assigned
- [ ] Pressing Escape or clicking outside closes the detail view
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-006: Reassign from Roster
**Description:** As a player, I want to reassign an inhabitant directly from the roster so that I don't have to navigate to the room first.

**Acceptance Criteria:**
- [ ] The "Reassign" button in the detail view shows a list of rooms with available slots
- [ ] Clicking a room assigns the inhabitant to that room (removes from previous assignment if any)
- [ ] Rooms at max capacity are shown but disabled
- [ ] Assignment updates both the roster display and room production
- [ ] **[UI story]** Verify in browser using dev-browser skill

## Functional Requirements
- FR-1: The roster must display all owned inhabitants with name, type, stats, and assignment
- FR-2: The roster must support filtering by assignment status
- FR-3: Clicking an inhabitant must open a detailed view with all properties
- FR-4: Reassignment must be possible directly from the roster
- FR-5: All roster data must update reactively via signals

## Non-Goals (Out of Scope)
- Inhabitant sorting (by stat, name, etc.) -- future enhancement
- Inhabitant dismissal/release
- Batch assignment of multiple inhabitants
- Inhabitant comparison side-by-side
- Inhabitant search by name

## Technical Considerations
- The roster component should read from `GameStateWorld.inhabitants` signal
- Inhabitant definitions should be resolved from `ContentService` using `definitionId`
- Use `computed()` for filtered lists to avoid unnecessary re-renders
- The detail panel can be a child component or a dialog component
- Depends on inhabitant data model (Issue #11) for types and data
- Reassignment depends on the assignment system (Issue #13); stub the UI if not yet built
- Use `@for` with `track` by `instanceId` for efficient list rendering

## Success Metrics
- Roster renders 50+ inhabitants without perceptible lag
- Filter changes update the list within one animation frame
- Detail view opens within 100ms of click

## Open Questions
- Should the roster be a sidebar panel, a full page, or a modal overlay?
- Should inhabitants show a small portrait/sprite image?
- Should the roster auto-scroll to newly recruited inhabitants?
