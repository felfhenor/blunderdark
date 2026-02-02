# PRD: Research UI

## Introduction
The Research UI provides players with a visual tech-tree interface to browse, select, and initiate research. It displays the three research branches (Dark, Arcane, Engineering) as an interconnected node graph, similar to technology trees in strategy games like Civilization. Players can see which research is available, locked, in progress, or completed, and can click nodes to start research.

## Goals
- Render a tech-tree style node graph for all three research branches
- Visually distinguish available, locked, in-progress, and completed nodes
- Display research costs, prerequisites, and unlock descriptions
- Allow players to click a node to start research
- Show a progress bar for active research
- Integrate with the game state for persistence

## User Stories

### US-001: Research Page Shell
**Description:** As a player, I want a dedicated Research page accessible from the game UI so that I can manage my research.

**Acceptance Criteria:**
- [ ] A Research page/component exists (e.g., `src/app/pages/game-research/`)
- [ ] The page is accessible via a route (e.g., `/game/research`) with appropriate guards
- [ ] The page has a header displaying "Research" and navigation back to the main game
- [ ] The component is standalone with OnPush change detection
- [ ] **[UI story]** Verify in browser using dev-browser skill
- [ ] Typecheck/lint passes

### US-002: Branch Tab Navigation
**Description:** As a player, I want tabs or buttons to switch between the three research branches so that I can focus on one branch at a time.

**Acceptance Criteria:**
- [ ] Three tabs/buttons are displayed: Dark, Arcane, Engineering
- [ ] Clicking a tab switches the displayed research tree to that branch
- [ ] The active tab is visually highlighted
- [ ] Default tab is the first branch with available research
- [ ] Uses Angular Signals for the selected branch state
- [ ] **[UI story]** Verify in browser using dev-browser skill
- [ ] Typecheck/lint passes

### US-003: Research Node Rendering
**Description:** As a player, I want to see research nodes displayed as a visual tree graph so that I understand the research structure.

**Acceptance Criteria:**
- [ ] Each research node is rendered as a card/box with name and icon
- [ ] Nodes are positioned in a tree layout (root at top/left, children below/right)
- [ ] Lines/connectors are drawn between parent and child nodes
- [ ] Nodes are arranged by tier (depth in the tree)
- [ ] The tree is scrollable if it exceeds the viewport
- [ ] **[UI story]** Verify in browser using dev-browser skill
- [ ] Typecheck/lint passes

### US-004: Node State Visualization
**Description:** As a player, I want nodes to be visually distinct based on their state so that I can quickly identify what is available.

**Acceptance Criteria:**
- [ ] Completed nodes have a distinct style (e.g., green border, checkmark icon)
- [ ] Available nodes (prerequisites met, not started) have a highlighted/glowing style
- [ ] Locked nodes (prerequisites not met) are dimmed/grayed out
- [ ] The active research node has a pulsing or animated border
- [ ] Node state is derived from the research state signal using `computed()`
- [ ] **[UI story]** Verify in browser using dev-browser skill
- [ ] Typecheck/lint passes

### US-005: Node Detail Panel
**Description:** As a player, I want to click a node and see its details so that I can make informed research decisions.

**Acceptance Criteria:**
- [ ] Clicking a node opens a detail panel (sidebar or modal)
- [ ] The panel shows: name, description, cost (itemized by resource), prerequisites (with completion status), unlock effects
- [ ] If the node is available, a "Start Research" button is displayed
- [ ] If the node is locked, the panel explains which prerequisites are missing
- [ ] If the node is completed, the panel shows "Completed" with unlock effects active
- [ ] **[UI story]** Verify in browser using dev-browser skill
- [ ] Typecheck/lint passes

### US-006: Start Research Action
**Description:** As a player, I want to click "Start Research" on an available node so that research begins.

**Acceptance Criteria:**
- [ ] Clicking "Start Research" deducts the required resources
- [ ] The node transitions to "in-progress" state with a progress bar
- [ ] If resources are insufficient, the button is disabled with a tooltip explaining why
- [ ] If another research is already active, the button is disabled with a message
- [ ] The action updates the research state signal
- [ ] **[UI story]** Verify in browser using dev-browser skill
- [ ] Typecheck/lint passes

### US-007: Active Research Progress Bar
**Description:** As a player, I want to see a progress bar for my current active research so that I know how long until it completes.

**Acceptance Criteria:**
- [ ] A progress bar is displayed on the active research node
- [ ] The progress bar shows percentage complete and estimated time remaining
- [ ] A summary bar at the top of the Research page shows the current research name and progress
- [ ] Progress updates reactively as the game tick advances
- [ ] **[UI story]** Verify in browser using dev-browser skill
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The Research UI must render all research nodes from all three branches
- FR-2: Node state (locked, available, in-progress, completed) must update reactively
- FR-3: Players must be able to start research by clicking available nodes
- FR-4: The UI must prevent starting research when resources are insufficient or another research is active
- FR-5: Active research progress must be displayed as a percentage with time estimate

## Non-Goals (Out of Scope)
- Research progress mechanics (tick-based advancement) - handled by Issue #75
- Research unlock application - handled by Issue #76
- Drag-to-rearrange or custom tree layouts
- Research queue (only one active research at a time)

## Technical Considerations
- The tree layout can use CSS Grid or a simple SVG-based graph rendering
- Connectors between nodes can be drawn with SVG lines or CSS borders
- Node positions should be computed from the tree structure data, not hardcoded
- Use Angular `computed()` signals to derive node states from the research state
- The Research page should lazy-load to keep the initial bundle small
- Consider accessibility: nodes should be keyboard-navigable

## Success Metrics
- All research nodes render without layout overlap
- Node states update immediately when research completes
- Starting research deducts resources and updates the UI within one frame
- The tree renders smoothly with 30-45 nodes across all branches

## Open Questions
- Should the research UI be a full page or a panel within the game view?
- Should nodes display cost directly or only in the detail panel?
- Is there a search/filter capability needed for finding specific research?
- Should completed branches have a visual reward (e.g., gold banner)?
