# PRD: Creature Compendium

## Introduction

Add a Help system accessible from the gear/settings menu (Esc) that initially houses a Creature Compendium. The compendium displays all research-unlocked creatures in a two-column layout (list + detail panel) with search and sort controls. This gives players a central reference for understanding their available creature roster without needing to visit the altar or inspect individual room assignments.

## Goals

- Provide a single, comprehensive reference for all unlocked creature definitions
- Surface creature data that is currently scattered across altar, roster, and room panels
- Indicate how many creatures remain undiscovered to encourage exploration
- Establish a tabbed Help modal that can host future reference pages

## User Stories

### US-001: Add Help button to gear menu
**Description:** As a player, I want a "Help" button in the gear/escape menu so that I can access reference information.

**Acceptance Criteria:**
- [ ] A "Help" button appears below the "Settings" button in the gear menu
- [ ] Clicking it opens a modal dialog (using `app-modal`)
- [ ] The modal has a tab bar at the top for future help topics
- [ ] The first (and currently only) tab is "Creatures"
- [ ] Closing the modal returns to the game
- [ ] Typecheck/lint passes

### US-002: Two-column layout with creature list and detail panel
**Description:** As a player, I want a list of creatures on the left and a detail panel on the right so that I can browse and inspect creatures efficiently.

**Acceptance Criteria:**
- [ ] Two-column layout: scrollable creature list on the left, detail panel on the right
- [ ] All research-unlocked creature definitions are listed (one entry per base creature definition, excluding hybrids/summoned/converted/elite)
- [ ] Each list entry shows the creature's name, tier, and creature type
- [ ] Clicking a list entry selects it and populates the detail panel on the right
- [ ] First creature is selected by default when the tab opens
- [ ] Creatures not yet unlocked via research are excluded from the list
- [ ] Typecheck/lint passes

### US-003: Search and sort controls
**Description:** As a player, I want to search and sort the creature list so that I can find specific creatures quickly.

**Acceptance Criteria:**
- [ ] A search bar at the top of the creature list filters by name and creature type (case-insensitive, partial match)
- [ ] Typing "undead" shows all undead creatures; typing "gob" shows creatures with "gob" in the name
- [ ] A sort dropdown with options: by name (A-Z), by tier (ascending), by type (grouped)
- [ ] Default sort is by name (A-Z)
- [ ] Search and sort work together (search filters first, then sort applies)
- [ ] Typecheck/lint passes

### US-004: Creature detail display
**Description:** As a player, I want to see detailed information about a selected creature so that I can make informed recruitment and assignment decisions.

**Acceptance Criteria:**
- [ ] The detail panel displays for the selected creature:
  - Name and tier (with tier color badge)
  - Creature type (creature, undead, demon, dragon, aberration, fungal, ooze)
  - Base stats: HP, attack, defense, speed, worker efficiency
  - Innate fear value (fearModifier)
  - Fear tolerance (how much fear before scared state)
  - Traits (listed by name with brief description)
  - Work affinity: liked and disliked work categories shown with category names and icons
  - Recruitment cost
  - Food consumption rate (or "Does not eat" if 0)
- [ ] Data comes from `InhabitantContent` definitions via `ContentService`
- [ ] Typecheck/lint passes

### US-005: Undiscovered creatures count
**Description:** As a player, I want to know how many creatures I haven't unlocked yet so that I'm motivated to research more.

**Acceptance Criteria:**
- [ ] At the bottom of the creature list, a line reads "X creatures not yet encountered" where X is the count of locked (not research-unlocked) base creature definitions
- [ ] Count excludes hybrid, summoned, converted, and elite variants
- [ ] Count updates reactively as research unlocks new creatures
- [ ] If all creatures are unlocked, the line is hidden or reads "All creatures discovered"
- [ ] Typecheck/lint passes

### US-006: Legendary creature entries
**Description:** As a player, I want legendary creatures to appear in the compendium when unlocked, with their unique details.

**Acceptance Criteria:**
- [ ] Legendary creatures appear in the same list when unlocked via research
- [ ] Detail panel additionally shows: recruitment requirements, upkeep costs, aura effects
- [ ] Marked with a visual indicator distinguishing them from regular creatures (e.g., unique tag or badge)
- [ ] Typecheck/lint passes

## Functional Requirements

- FR-1: Add a "Help" button to the gear menu component (`button-settings` or `panel-options`), positioned below the existing "Settings" button
- FR-2: Clicking "Help" opens a modal dialog with a `app-tab-bar` for help topics
- FR-3: The "Creatures" tab uses a two-column layout: scrollable creature list on the left, detail panel on the right
- FR-4: Clicking a creature in the list selects it and shows its full details in the right panel; the first creature is selected by default
- FR-5: A text input search bar at the top of the creature list filters by name and creature type (case-insensitive, partial match)
- FR-6: A sort dropdown allows sorting by: name (A-Z), tier (ascending), type (grouped alphabetically)
- FR-7: The detail panel displays: name, tier, creature type, base stats (HP/ATK/DEF/SPD/efficiency), fear modifier, fear tolerance, traits, work affinities (likes/dislikes), recruitment cost, food consumption
- FR-8: Legendary creatures additionally display recruitment requirements, upkeep costs, and aura effects in the detail panel
- FR-9: Unlock status is determined by `researchUnlockIsUnlocked('inhabitant', id)` for each creature
- FR-10: A footer line below the creature list shows the count of not-yet-unlocked base creatures (excluding hybrids/summoned/converted/elite)
- FR-11: The count of "not encountered" creatures excludes variant types (restriction tags: hybrid, summoned, converted)
- FR-12: The help modal and its tabs must use `ChangeDetectionStrategy.OnPush`

## Non-Goals

- No individual creature instance tracking (this is a definition-level reference, not a roster view)
- No editing or interaction with creatures from the compendium (no recruit, assign, or rename)
- No hybrid/summoned/converted/elite creature entries (base definitions only)
- No creature art/sprites in this iteration
- No search by trait or stat (search covers name and creature type only)
- No persistence of "seen" creatures -- purely based on research unlock state

## Design Considerations

- Reuse `app-modal` with `[replacement]` slot for the full help layout
- Use `app-tab-bar` for the help topic tabs (Creatures as first tab)
- Use `app-currency-cost` for displaying recruitment costs
- Use existing tier color badge patterns from `inhabitant-card` component
- Work affinity display should show category icons consistent with room work category icons
- Two-column layout: compact list items on the left (name, tier badge, type), full detail panel on the right
- List items should be compact and scannable; detail panel shows everything
- The modal should be reasonably large (not fullscreen) to feel like a reference book

## Technical Considerations

- Creature definitions available via `ContentService` (`contentGetEntriesByType<InhabitantContent>('inhabitant')`)
- Research unlock status via `researchUnlockIsUnlocked` from research helpers
- Work affinity data from `work-affinity.ts` helpers (`getWorkAffinityForCreatureType`)
- Trait definitions from `ContentService` (`contentGetEntry` for trait lookups)
- Fear tolerance from `InhabitantContent.fearTolerance`
- Use `computed()` signals for filtered/sorted creature list to stay reactive
- The help modal component should be a standalone component in `src/app/components/`

## Success Metrics

- Player can find any unlocked creature's details in under 3 interactions (open menu, open help, search/scroll)
- All creature data matches what is shown in altar/roster panels (single source of truth from ContentService)
- Help modal structure supports adding new tabs without refactoring

## Open Questions

None - all questions resolved.
