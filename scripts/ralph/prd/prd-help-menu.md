# PRD: Help Menu

## Introduction
The Help Menu provides an in-game reference organized by topic (Rooms, Inhabitants, Combat, Resources, Victory). It includes a search function for quick lookup and links to replay the tutorial. This serves as a comprehensive guide players can consult at any time during gameplay.

## Goals
- Provide organized help content covering all major game systems
- Implement a search function for quick topic lookup
- Include a link to replay the tutorial
- Make the help menu accessible from the main menu and during gameplay
- Keep content data-driven for easy updates

## User Stories

### US-001: Help Menu Access
**Description:** As a player, I want to access a Help menu from the main menu and during gameplay so that I can find information at any time.

**Acceptance Criteria:**
- [ ] A "Help" button exists on the main menu screen
- [ ] A "Help" button/icon is accessible during gameplay (toolbar or pause menu)
- [ ] Clicking either button opens the Help menu overlay/panel
- [ ] The Help menu can be closed to return to the previous context
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-002: Help Sections Organization
**Description:** As a player, I want help content organized into clear sections so that I can browse by topic.

**Acceptance Criteria:**
- [ ] Help sections: Rooms, Inhabitants, Combat, Resources, Victory
- [ ] Each section is accessible via a tab or sidebar navigation
- [ ] Sections are collapsible/expandable to manage content density
- [ ] Each section has a brief overview paragraph followed by detailed subsections
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-003: Rooms Help Section
**Description:** As a player, I want help content about rooms so that I understand room types, placement, features, and upgrades.

**Acceptance Criteria:**
- [ ] Content covers: room types and their functions, room placement rules, feature attachment, room connections
- [ ] Each room type is listed with its description and production values
- [ ] Feature categories are explained with examples
- [ ] Content is loaded from gamedata where possible (room descriptions from YAML)
- [ ] Typecheck/lint passes

### US-004: Inhabitants Help Section
**Description:** As a player, I want help content about inhabitants so that I understand recruitment, assignment, stats, and leveling.

**Acceptance Criteria:**
- [ ] Content covers: inhabitant types, recruitment, room assignment, stats, leveling, combat roles
- [ ] Each inhabitant type is listed with key stats
- [ ] Assignment mechanics are explained (how to assign, benefits of assignment)
- [ ] Leveling and XP mechanics are described
- [ ] Typecheck/lint passes

### US-005: Combat Help Section
**Description:** As a player, I want help content about combat so that I understand invasions, defense, and combat stats.

**Acceptance Criteria:**
- [ ] Content covers: invasion mechanics, defense strategies, combat stats, Fear effects
- [ ] Turn-based combat flow is explained step by step
- [ ] Defense room bonuses are described
- [ ] Tips for surviving invasions are included
- [ ] Typecheck/lint passes

### US-006: Resources and Victory Help Sections
**Description:** As a player, I want help content about resources and victory conditions so that I understand the economy and win conditions.

**Acceptance Criteria:**
- [ ] Resources section covers: all resource types, production, consumption, storage
- [ ] Victory section covers: all five victory paths with their conditions
- [ ] Victory conditions list exact thresholds
- [ ] Resources section explains Corruption and Fear mechanics
- [ ] Typecheck/lint passes

### US-007: Help Search
**Description:** As a player, I want to search help content so that I can quickly find specific information.

**Acceptance Criteria:**
- [ ] A search bar is at the top of the Help menu
- [ ] Typing filters help content to matching sections and subsections
- [ ] Search matches against titles, body text, and keywords
- [ ] Results highlight the matching text
- [ ] Clearing the search restores the full section list
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-008: Tutorial Replay Link
**Description:** As a player, I want a link in the Help menu to replay the tutorial so that I can refresh my basic knowledge.

**Acceptance Criteria:**
- [ ] A "Replay Tutorial" button exists in the Help menu (e.g., at the top or bottom)
- [ ] Clicking it closes the Help menu and starts the tutorial from Step 1
- [ ] The link integrates with the tutorial system from Issue #111
- [ ] **[UI story]** Verify in browser using dev-browser skill

## Functional Requirements
- FR-1: The Help menu must be accessible from the main menu and during gameplay
- FR-2: Content must be organized into at least 5 sections covering major game systems
- FR-3: A search function must filter content by query
- FR-4: A tutorial replay link must be available in the Help menu
- FR-5: Help content should reference gamedata where applicable

## Non-Goals (Out of Scope)
- External documentation or wiki links
- Video help content
- Context-sensitive help (opening to the relevant section based on current UI)
- Community-contributed help content

## Technical Considerations
- Depends on Issue #111 (Tutorial Sequence) for tutorial replay integration
- Help content can be stored as structured data (YAML or JSON) for easy editing
- Search can use simple string matching for initial implementation
- The Help menu component should be lazy-loaded since it is not frequently used
- Use `@for` to render help sections and search results dynamically

## Success Metrics
- All major game systems have corresponding help content
- Search returns relevant results for common queries
- Help menu loads within 500ms
- Tutorial replay link correctly starts the tutorial

## Open Questions
- Should help content be versioned alongside game updates?
- Should there be "tips of the day" or contextual help suggestions?
- Should the help menu track which sections the player has viewed?
