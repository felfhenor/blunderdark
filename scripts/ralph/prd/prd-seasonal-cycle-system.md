# PRD: Seasonal Cycle System

## Introduction
The Seasonal Cycle System introduces four recurring seasons (Growth, Harvest, Darkness, Storms) to Blunderdark's game world. Each season lasts 7 game days and cycles automatically, creating rhythmic gameplay patterns. The current season is displayed in the UI and drives season-specific bonuses, events, and mechanics that keep the game dynamic over long play sessions.

## Goals
- Implement a four-season cycle: Growth, Harvest, Darkness, Storms
- Each season lasts exactly 7 game days
- Cycle repeats automatically after all four seasons complete
- Display the current season and day within season in the UI
- Provide a signal-based API for other systems to query the current season
- Persist season state through save/load

## User Stories

### US-001: Define Season Types
**Description:** As a developer, I want season types defined so that all systems can reference seasons consistently.

**Acceptance Criteria:**
- [ ] A `Season` type is defined as a union: `'growth' | 'harvest' | 'darkness' | 'storms'`
- [ ] A `SeasonState` type is defined with fields: `currentSeason`, `dayInSeason` (1-7), `totalSeasonCycles` (count of completed full cycles)
- [ ] A constant array `SEASON_ORDER` defines the cycle: `['growth', 'harvest', 'darkness', 'storms']`
- [ ] Types use `type` keyword per project conventions
- [ ] Typecheck/lint passes

### US-002: Implement Season Advancement Logic
**Description:** As a developer, I want seasons to advance automatically based on game days so that the cycle runs without player intervention.

**Acceptance Criteria:**
- [ ] A season advancement handler is integrated into the game loop
- [ ] Each game day advances `dayInSeason` by 1
- [ ] When `dayInSeason` exceeds 7, the season advances to the next in `SEASON_ORDER`
- [ ] When the last season (Storms) ends, the cycle resets to Growth and `totalSeasonCycles` increments
- [ ] Season state is managed via Angular Signals
- [ ] Unit tests verify season transitions at day boundaries
- [ ] Typecheck/lint passes

### US-003: Season State Signal API
**Description:** As a developer, I want a signal-based API for querying the current season so that other systems can react to season changes.

**Acceptance Criteria:**
- [ ] A `currentSeason` signal is exposed (type `Signal<Season>`)
- [ ] A `dayInSeason` signal is exposed (type `Signal<number>`)
- [ ] A `seasonProgress` computed signal provides the percentage through the current season (0-100%)
- [ ] A helper function `isSeason(season: Season): boolean` checks the current season
- [ ] Signals update reactively when the game loop advances the day
- [ ] Typecheck/lint passes

### US-004: Season Display in Game UI
**Description:** As a player, I want to see the current season and day displayed in the game UI so that I can plan my strategy.

**Acceptance Criteria:**
- [ ] A season indicator component is displayed in the game header/HUD
- [ ] The indicator shows the season name and icon (e.g., leaf for Growth, wheat for Harvest, skull for Darkness, lightning for Storms)
- [ ] The day within the season is displayed (e.g., "Day 3 of Growth")
- [ ] The indicator has a subtle animation or color change when the season transitions
- [ ] The component is standalone with OnPush change detection
- [ ] **[UI story]** Verify in browser using dev-browser skill
- [ ] Typecheck/lint passes

### US-005: Persist Season State
**Description:** As a player, I want my season progress saved so that it continues correctly after reloading.

**Acceptance Criteria:**
- [ ] `SeasonState` is added to `GameStateWorld` in `state-game.ts`
- [ ] Season state is saved to IndexedDB via `indexedDbSignal`
- [ ] On load, the season resumes at the saved position
- [ ] A new game starts at Day 1 of Growth
- [ ] Unit tests verify save/load round-trip of season state
- [ ] Typecheck/lint passes

### US-006: Season Transition Event Hook
**Description:** As a developer, I want a hook that fires when a season transitions so that other systems can respond (bonuses, events, merchants).

**Acceptance Criteria:**
- [ ] A season transition callback or event is emitted when the season changes
- [ ] The event includes the new season and the previous season
- [ ] Other systems can subscribe to this event to apply or remove season-specific effects
- [ ] The hook fires exactly once per season change, not per tick
- [ ] Unit tests verify the hook fires at the correct boundary
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must cycle through four seasons in order: Growth, Harvest, Darkness, Storms
- FR-2: Each season must last exactly 7 game days
- FR-3: The current season must be queryable via Angular Signals
- FR-4: Season state must persist in IndexedDB as part of the game state
- FR-5: A transition event must fire when the season changes
- FR-6: The UI must display the current season and day

## Non-Goals (Out of Scope)
- Season-specific bonuses (Issue #78)
- Seasonal events (Issue #79)
- Merchant system (Issue #80)
- Variable season lengths
- Player ability to skip or change seasons

## Technical Considerations
- Depends on the game loop and time system (Issue #8) for day tracking
- Season advancement should be a pure function of the game tick/day count for determinism
- Consider deriving season from total game days rather than tracking independently: `season = SEASON_ORDER[Math.floor(totalDays / 7) % 4]`
- Season transition effects should use `effect()` to watch the season signal and trigger side effects
- The season indicator component should use `@switch` for season-specific rendering

## Success Metrics
- Seasons cycle correctly through all four in order
- Day counter advances correctly within each season
- Season state survives save/load without skipping or repeating
- UI updates immediately when the season changes

## Open Questions
- Should the first cycle start at Growth or should the starting season be random/configurable?
- Should there be a "season preview" showing upcoming seasons?
- Do seasons affect the visual theme of the dungeon (darker during Darkness, etc.)?
- Should the cycle count affect difficulty or season intensity?
