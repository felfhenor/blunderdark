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

## Testing

- Pre-existing typecheck errors exist in `scripts/` files and some older components — these are expected
- Tests are scoped to `src/app/helpers/**/*.spec.ts` only
- When testing functions that call other helpers, mock the helper module rather than setting up deep gamestate
- Lint rule `typescript-paths/absolute-import` requires `@helpers/room-placement` not `./room-placement` in test imports

## UI Patterns

- DaisyUI progress bars use classes like `progress-error`, `progress-warning`, etc.
- OKLCH color format works in Angular SCSS
- SweetAlert2 pattern: `[swal]="templateRef"` on button + `<swal>` element with `(confirm)` event handler
- Angular view encapsulation adds attribute selectors — manual class additions in browser console won't match scoped styles
- `@ngneat/hotkeys` provides global keyboard shortcuts: `[hotkeys]="'SPACE'"` with `isGlobal` directive attr, `(hotkey)` event handler
- `appRequireSetup` / `appRequireNotSetup` directives show/hide elements based on setup state
- Navbar component already has pause button, pause menu (ESC), Space bar toggle — check before re-implementing
