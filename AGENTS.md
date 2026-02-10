# AGENTS.md

Reusable patterns and learnings for agents working on Blunderdark.

## Circular Dependency Avoidance

- **Do NOT import from `@helpers/notify` in helper files that have tests.** The `notify.ts` file imports `isPageVisible` from the `@helpers` barrel, which triggers the entire barrel export chain including `state-game.ts` → `defaults.ts` → `rngUuid()`. This causes `ReferenceError: Cannot access '__vite_ssr_import_1__' before initialization` in Vitest.
- **Pattern:** Return data from helper functions and let Angular components call `notifyError()`/`notifySuccess()` instead. This decouples validation from notification and is more testable.

## Content Pipeline

- New content types require 3 things: (1) add to `ContentType` union in `src/app/interfaces/identifiable.ts`, (2) add `ensureX` initializer to `src/app/helpers/content-initializers.ts`, (3) create `gamedata/[type]/` folder with YAML
- Content types retrieved via `getEntry<T>` must use `T & IsContentItem` to satisfy type constraint
- Build script auto-discovers new folders in `gamedata/` — no script changes needed
- `public/json/` is gitignored (generated output) — only commit YAML source files

## State Management

- Helper functions use pure functions (take state as param, return new state) — consistent immutable pattern
- `updateGamestate()` is async and handles both tick-mode and direct signal updates
- `migrateGameState()` uses `merge()` from es-toolkit, but complex state (resources, floors) needs explicit migration functions
- When adding fields to `GameStateWorld`, also update `worldgen.ts` return value and `defaults.ts`
- When adding fields to `GameStateClock`, also update `defaults.ts` clock section
- The gameloop mutates `state.clock` in-place within the `updateGamestate` callback — safe because it operates on the tick-local copy

## Game Time & Events

- `TICKS_PER_MINUTE = 5` — each tick = 12 seconds of game time; at 1x speed (~1 tick/sec), 1 real minute ≈ 12 game minutes
- `advanceTime()` is a pure function in `game-time.ts` — takes `GameTime` and numTicks, returns new `GameTime` with correct rollover
- Computed signals (`gameDay`, `gameHour`, `gameMinute`, `formattedGameTime`) read directly from `gamestate().clock`
- `scheduleEvent(triggerTime, callback)` in `game-events.ts` registers one-shot time triggers; recurring events re-register in their callback
- `gameTimeToMinutes()` converts `GameTime` to total minutes for comparison (Day 1 = minute 0)
- `processScheduledEvents()` separates toFire/remaining before executing — safe if callbacks schedule new events

## Grid System

- Grid tiles use `[y][x]` indexing (row-major) — be careful with coordinate order
- `getAbsoluteTiles()` from room-shapes.ts converts shape-relative tiles to grid-absolute coordinates
- For grid tile lookup in templates, use a `Set<string>` of "x,y" keys for O(1) lookup vs O(n) array scan

## Room & Production System

- `PlacedRoom` type in `room-shape.ts` includes `roomTypeId` linking to the content definition — when adding fields to this type, update all test PlacedRoom literals in `room-shapes.spec.ts`
- `RoomDefinition` type in `room.ts` includes `production: RoomProduction` (Partial<Record<string, number>>), `requiresWorkers: boolean`, `adjacencyBonuses: AdjacencyBonus[]`
- `getBaseProduction(roomTypeId)` returns `{}` for rooms with no production or non-existent room types — callers don't need to handle undefined
- `getRoomDefinition(roomTypeId)` returns `undefined` for non-existent types — callers must check
- Room YAML lives in `gamedata/room/base.yml` — 7 base rooms defined with varying production rates, costs, and adjacency bonuses
- `calculateInhabitantBonus(placedRoom, inhabitants)` returns `{ bonus, hasWorkers }` — bonus is additive sum of `(workerEfficiency - 1.0)` + `production_bonus` trait effectValues per assigned inhabitant
- `InhabitantDefinition` content type is `'inhabitant'` — loaded from `gamedata/inhabitant/base.yml` via ContentService
- `workerEfficiency` of 1.0 = 0% bonus; only `production_bonus` effectType traits contribute to production bonuses; other trait types (defense_bonus, trap_bonus) are ignored
- `calculateAdjacencyBonus(placedRoom, adjacentRoomIds, allPlacedRooms)` returns additive bonus from gamedata adjacency rules — caller provides adjacentRoomIds from AdjacencyMap
- `calculateConditionalModifiers(placedRoom, inhabitants)` returns multiplicative modifier from inhabitant states — scared=0.5, hungry=0.75, normal=1.0; unique states only (Set dedup)
- Production formula: `Final = Base * (1 + inhabitantBonus + adjacencyBonus) * conditionalModifier` — bonuses are additive, modifiers are multiplicative

## Testing

- Pre-existing typecheck errors exist in `scripts/` files and some older components — these are expected
- Tests are scoped to `src/app/helpers/**/*.spec.ts` only
- When testing functions that call other helpers, mock the helper module rather than setting up deep gamestate
- Lint rule `typescript-paths/absolute-import` requires `@helpers/room-placement` not `./room-placement` in test imports

## Hallway System

- `hallway-placement.ts` manages the hallway build workflow via `HallwayBuildStep` signal: inactive → selectSource → selectDestination → preview
- `hallways.ts` has pure helper functions: `addHallwayToGrid()` marks tiles as `occupied: true, occupiedBy: 'hallway'`, `addHallway()` appends to hallway array
- Hallway data lives on each `Floor` object (`floor.hallways: Hallway[]`), not at world level
- To place a hallway: (1) `payCost({ crystals: cost })`, (2) create `Hallway` object with `rngUuid()`, (3) `updateGamestate` to update `floor.grid` via `addHallwayToGrid` and `floor.hallways` via `addHallway`
- `canAfford()` from resources.ts works inside `computed()` — it reads `gamestate()` internally so Angular tracks the dependency

## UI Patterns

- DaisyUI progress bars use classes like `progress-error`, `progress-warning`, etc.
- OKLCH color format works in Angular SCSS
- SweetAlert2 pattern: `[swal]="templateRef"` on button + `<swal>` element with `(confirm)` event handler
- Angular view encapsulation adds attribute selectors — manual class additions in browser console won't match scoped styles
- `@ngneat/hotkeys` provides global keyboard shortcuts: `[hotkeys]="'SPACE'"` with `isGlobal` directive attr, `(hotkey)` event handler
- `appRequireSetup` / `appRequireNotSetup` directives show/hide elements based on setup state
- Navbar component already has pause button, pause menu (ESC), Space bar toggle — check before re-implementing
