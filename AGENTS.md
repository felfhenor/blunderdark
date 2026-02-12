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

## Room Rotation System

- `Rotation` type is `0 | 1 | 2 | 3` (0°, 90°, 180°, 270° clockwise) — defined in `room-shape.ts`
- `PlacedRoom.rotation?: Rotation` — optional field (0 is default), stored on placed rooms for grid reconstruction
- `rotateTile90(tile, height)` rotates a single point 90° CW: `(x, y) → (h-1-y, x)` — pure function in `room-shapes.ts`
- `rotateTiles(tiles, w, h, rotation)` applies N 90° rotations, swapping w/h each step — returns `{ tiles, width, height }`
- `getRotatedShape(shape, rotation)` returns a new RoomShape with rotated tiles — returns original for rotation 0
- `resolveRoomShape(placedRoom)` now applies `placedRoom.rotation` — all downstream systems (production, adjacency, connections) automatically handle rotated rooms
- `placementRotation` signal tracks current rotation during placement; `rotatePlacement()` increments by 1 (mod 4) and updates the preview shape
- `enterPlacementMode()` stores the base (unrotated) shape internally; rotation always applies to the base shape, not incrementally
- R key and right-click rotate during placement; Escape exits placement mode
- `throne-room.ts` uses `getEntry<RoomShape>()` directly instead of `resolveRoomShape()` — safe because the Throne Room's 3x3 square shape is rotationally symmetric

## Room & Production System

- `PlacedRoom` type in `room-shape.ts` includes `roomTypeId` linking to the content definition — when adding fields to this type, update all test PlacedRoom literals in `room-shapes.spec.ts`
- `RoomDefinition` type in `room.ts` includes `production: RoomProduction`, `requiresWorkers: boolean`, `adjacencyBonuses: AdjacencyBonus[]`, `isUnique: boolean`, `maxInhabitants: number` (-1 = unlimited), `inhabitantRestriction: string | null`, `fearLevel: number | 'variable'`
- When adding fields to `RoomDefinition`, also update `ensureRoom()` in `content-initializers.ts` with defaults — the initializer is what populates missing fields from YAML
- `isUniqueRoomTypePlaced(floors, roomTypeId)` checks all floors for an existing room of that type — used for dungeon-wide unique constraint enforcement
- `placedRoomTypeIds` computed signal exposes the set of room type IDs placed across all floors — reactive for UI bindings
- Unique room enforcement is at the data level (`executeRoomPlacement`) and the UI level (`panel-room-select` disables button with tooltip)
- `getBaseProduction(roomTypeId)` returns `{}` for rooms with no production or non-existent room types — callers don't need to handle undefined
- `getRoomDefinition(roomTypeId)` returns `undefined` for non-existent types — callers must check
- Room YAML lives in `gamedata/room/base.yml` — 7 base rooms defined with varying production rates, costs, and adjacency bonuses
- `calculateInhabitantBonus(placedRoom, inhabitants)` returns `{ bonus, hasWorkers }` — bonus is additive sum of `(workerEfficiency - 1.0)` + `production_bonus` trait effectValues per assigned inhabitant
- `InhabitantDefinition` content type is `'inhabitant'` — loaded from `gamedata/inhabitant/base.yml` via ContentService; includes `restrictionTags: string[]` for room assignment restrictions
- `restrictionTags` on `InhabitantDefinition` matches against `inhabitantRestriction` on `RoomDefinition` — if restriction is null, any inhabitant allowed; otherwise tag must be in the array
- When adding fields to `InhabitantDefinition`, also update `ensureInhabitant()` in `content-initializers.ts` with defaults
- `canAssignInhabitantToRoom(def, roomDef, assignedCount)` checks restriction then capacity; `getEligibleInhabitants(allDefs, roomDef)` filters to eligible definitions
- `assignInhabitantToRoom(instanceId, roomId, roomTypeId)` enforces restrictions at the data level before updating state; `unassignInhabitantFromRoom(instanceId)` clears assignedRoomId
- `rulerBonuses: Record<string, number>` on `InhabitantDefinition` defines dungeon-wide bonuses for unique rulers — keys are bonus types (attack, fear, researchSpeed, fluxProduction, corruptionGeneration, invaderMorale), values are percentage modifiers
- `throne-room.ts` helper: `findThroneRoom(floors)` searches all floors, `getSeatedRulerInstance(floor, roomId)` finds the assigned inhabitant, `getActiveRulerBonuses(floors)` returns the seated ruler's bonus record
- `THRONE_ROOM_TYPE_ID` constant in `throne-room.ts` references the Throne Room content ID — use this instead of hardcoding the UUID
- Unique ruler creatures (Dragon, Lich, Demon Lord) are tier 4 with `restrictionTags: ['unique']` — they have `rulerBonuses`, `rulerFearLevel`, but empty `traits` since their bonuses are dungeon-wide, not room-specific
- `rulerFearLevel: number` on `InhabitantDefinition` — the fear level this ruler provides (Dragon=4, Lich=3, Demon Lord=5); `getThroneRoomFearLevel(floors)` returns null if no throne, 1 (EMPTY_THRONE_FEAR_LEVEL) if empty, or ruler's value
- TypeScript `Record<string, number>` properties must use bracket notation (`bonuses['attack']`) not dot notation in strict mode — TS4111 error otherwise
- `TREASURE_VAULT_TYPE_ID` constant in `throne-room.ts` references the Treasure Vault content ID — used for adjacency bonus checks
- `getThroneRoomPositionalBonuses(floors)` returns `ThronePositionalBonuses` with `vaultAdjacent`, `central`, `goldProductionBonus` (+5% if adjacent to vault), `rulerBonusMultiplier` (+10% if centrally placed)
- `isRoomCentral(anchorX, anchorY, shapeWidth, shapeHeight, gridSize, threshold)` — pure function using Manhattan distance from room center to grid center; threshold=5 for Throne Room
- Room shape resolution in throne-room.ts uses `getEntry<RoomShape & IsContentItem>(shapeId)` — in tests, put shapes into `mockContent` Map and the mock `getEntry` returns them
- `areRoomsAdjacent` from `adjacency.ts` checks edge-sharing (not diagonal) — used for vault adjacency detection
- `workerEfficiency` of 1.0 = 0% bonus; only `production_bonus` effectType traits contribute to production bonuses; other trait types (defense_bonus, trap_bonus) are ignored
- `calculateAdjacencyBonus(placedRoom, adjacentRoomIds, allPlacedRooms)` returns additive bonus from gamedata adjacency rules — caller provides adjacentRoomIds from AdjacencyMap
- `calculateConditionalModifiers(placedRoom, inhabitants)` returns multiplicative modifier from inhabitant states — scared=0.5, hungry=0.75, normal=1.0; unique states only (Set dedup)
- Production formula: `Final = Base * (1 + inhabitantBonus + adjacencyBonus) * conditionalModifier` — bonuses are additive, modifiers are multiplicative
- `PlacedRoom.appliedUpgradePathId?: string` tracks the chosen upgrade — optional field so existing PlacedRoom literals in tests don't break
- `room-upgrades.ts` helper: `canApplyUpgrade()` enforces mutual exclusivity (one upgrade per room), `applyUpgrade()` returns new PlacedRoom, `getAppliedUpgradeEffects()` returns effects array
- Upgrade effect types: `productionMultiplier` (scales base production), `maxInhabitantBonus` (adds to capacity), `fearReduction` (reduces fear level), `secondaryProduction` (adds new resource output)
- Room YAML upgrade paths use UUIDs prefixed `aa200001-` to distinguish from room IDs (`aa100001-`)

## Altar Room & Auto-Placement

- `ALTAR_ROOM_TYPE_ID` constant in `altar-room.ts` references the Altar Room content ID — use this instead of hardcoding the UUID
- `autoPlaceRooms(floor)` finds all rooms with `autoPlace: true` and places them centered on the grid — called during `worldgenGenerateWorld()`
- `removable: boolean` field on `RoomDefinition` — `isRoomRemovable(roomTypeId)` in `room-placement.ts` checks this before allowing removal
- `autoPlace: boolean` field on `RoomDefinition` — rooms with `autoPlace: true` are excluded from the build panel and auto-placed during world generation
- `fearReductionAura: number` field on `RoomDefinition` — base aura value, overridden by upgrade `fearReductionAura` effect type
- Altar uses sequential upgrade levels (1→2→3) on the existing mutually-exclusive `appliedUpgradePathId` system — `getAltarLevel()` checks which upgrade is applied, `applyAltarUpgrade()` validates level ordering
- `getEffectiveFearLevel(floor, room, baseFearLevel)` reduces fear for rooms adjacent to the Altar — returns 'variable' unchanged, otherwise clamps to 0
- `isAdjacentToAltar(floor, room)` uses `areRoomsAdjacent()` from adjacency.ts — checks edge-sharing between room tiles and Altar tiles
- `panel-altar` component follows same pattern as `panel-throne-room` — shows when selected tile is the Altar, displays level/aura/recruitment/upgrade UI
- When adding new fields to `RoomDefinition`, update defaults in `ensureRoom()` AND update all mock `RoomDefinition` objects in test files (mushroom-grove.spec.ts, inhabitants.spec.ts, etc.)

## Room Removal System

- `room-removal.ts` is the main orchestration helper — `executeRoomRemoval()` handles validation, grid clearing, inhabitant unassignment, and resource refund in one atomic operation
- `calculateRefund(cost)` returns 50% of each resource rounded down (Math.floor) — pure function, easy to test
- `getRemovalInfo(roomId)` returns a preview of what removal would do (room name, refund, displaced inhabitant names, canRemove flag) — used by the confirmation dialog
- `executeRoomRemoval()` does a single `updateGamestate()` call for grid + inhabitant changes, then separate `addResource()` calls for refund — refund is capped at resource max by `addResource()`
- The removal UI lives in `panel-room-info` component — `canRemoveRoom` computed checks `isRoomRemovable()`, disabled button shown for non-removable rooms
- SweetAlert2 confirmation dialog uses `[swal]="removeSwal"` + `<swal>` pattern with dynamic `[title]` and `[text]` bindings from computed signals
- `removeRoomFromFloor()` preserves hallway data (`hallwayId`, `connectionType`) on tiles when clearing room data — important for tiles that have both room and hallway occupancy

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
- Panel components follow card pattern: `card bg-base-100 shadow-xl` → `card-body p-4` → `card-title text-sm` for headers
- Panel components conditionally render using a computed signal (e.g., `throneRoom()` returns null if not relevant) and wrapping template in `@if`
- `panel-throne-room` component shows when a Throne Room tile is selected — reads from `selectedTile()`, `currentFloor()`, then finds the room and checks `roomTypeId === THRONE_ROOM_TYPE_ID`
- Sidebar panels are added to `game-play.component.html` inside the `.sidebar` div — order matters for visual stacking
- `PanelResourcesComponent` displays all 7 resource types with progress bars and `+X/min` production rates — uses `productionRates` computed signal and `productionPerMinute()` helper
- `ensureContent()` in `content-initializers.ts` gracefully handles unknown content types by returning content as-is — prevents crashes when new YAML content types (e.g., currency) lack an initializer function

## Adding Generic Rooms

- **Generic rooms (non-unique, no special logic) only need YAML changes** — the existing placement, production, adjacency, and upgrade systems are fully data-driven. No helper code or component changes are needed.
- Room production values in YAML are **per tick**. To get per-minute rate, multiply by `TICKS_PER_MINUTE` (5). Example: 8 Food/min = `food: 1.6` in YAML.
- Adjacency bonuses reference specific room type IDs (not categories). For "Water rooms" use Soul Well ID, for "Dark rooms" use Shadow Library/Dark Forge IDs.
- Upgrade path IDs use `aa200001-` prefix, room IDs use `aa100001-` prefix. Increment the last digits to avoid collisions with existing entries.
- The T-Shape room shape ID is `0279e677-6073-4a18-b57b-8e6008f4a3a5` — a 3x2 bounding box with 4 tiles.

## Production & Upgrade Integration

- **Upgrade effects are NOT yet wired into production calculations** — `productionMultiplier` and `secondaryProduction` upgrade effects from `room-upgrades.ts` are defined but not applied in `calculateTotalProduction()` or `calculateSingleRoomProduction()`. This needs to be done when upgrade UI is implemented.
- `processProduction(state)` in `gameloop.ts` is the entry point — called every tick, sums all room production, adds to resources capped at max
- `productionRates` is a computed signal that recalculates whenever `gamestate().world.floors` changes — used by `PanelResourcesComponent` for live rate display

## Inhabitant Capacity & Assignment

- `getEffectiveMaxInhabitants(placedRoom, roomDef)` in `room-upgrades.ts` returns base + `maxInhabitantBonus` from upgrade effects — returns -1 for unlimited
- `canAssignInhabitantToRoom(def, roomDef, count, placedRoom?)` accepts optional `PlacedRoom` to use effective capacity from upgrades; without it, falls back to `roomDef.maxInhabitants`
- `assignInhabitantToRoom()` searches `state.world.floors` to find the `PlacedRoom` by room ID — this is necessary because `PlacedRoom` lives on `Floor.rooms`, not on `GameStateWorld` directly
- **Inhabitants exist in two places:** `GameStateWorld.inhabitants` (used by inhabitant management functions) and `Floor.inhabitants` (used by production, throne room, and UI panels) — be careful which you query
- `panel-room-info` component shows inhabitant count, assigned list with Remove buttons, and eligible unassigned inhabitants with Assign buttons — only for rooms with `maxInhabitants !== 0`
- When mocking `room-upgrades` in `inhabitants.spec.ts`, use `vi.mock('@helpers/room-upgrades')` to control `getEffectiveMaxInhabitants` return values without needing the content system

## Assignment System

- `assignment.ts` helper: `canAssignToRoom(roomId)` returns `AssignmentValidation` with allowed/reason/currentCount/maxCapacity — handles room lookup across floors, room type lookup, effective capacity from upgrades
- `getRoomAssignmentInfo(roomId)` returns `{ currentCount, maxCapacity }` or null — lighter version for UI indicators
- `getAssignmentCount(roomId)` and `isInhabitantAssigned(instanceId)` — simple query helpers
- Grid component uses `roomAssignmentMap` computed signal to build per-room assignment status (full/partial/empty) for O(1) per-tile lookup — same pattern as `roomInfoMap`
- Assignment indicators rendered as small badges on room anchor tiles — only shown for rooms with `maxInhabitants !== 0`
- Color coding: green (full), yellow (partial), red (empty) using OKLCH colors
- Production recalculation is automatic via Angular signals — no explicit trigger needed when assignment changes; `gamestate` signal change cascades through `productionRates` computed

## Pre-existing Test Typecheck Fixes

- `GridTile` mock objects in spec files need `occupiedBy: 'room'` and `hallwayId: null` — these fields were added to the interface but not all test mocks were updated
- `RoomDefinition` mock objects need `removable: true`, `fearReductionAura: 0`, `autoPlace: false` — same pattern, fields added to interface but test mocks lagged
- `ContentType` union in `identifiable.ts` is the source of truth — test files using fictional types ('armor', 'skill', 'guardian') will fail typecheck; use valid types ('trinket', 'pet', 'monster')
- When adding new fields to interfaces, grep for test mock objects across all spec files and update them

## Inhabitant Roster UI

- `PanelRosterComponent` in `panel-roster/` — standalone panel showing all inhabitants with filter, stats, and detail view
- Uses `gamestate().world.inhabitants` directly (not `currentFloor().inhabitants`) since roster is dungeon-wide, not floor-scoped
- `allEntries` computed builds `RosterEntry[]` with instance, definition, and resolved room name — maps over `gamestate().world.inhabitants` and looks up defs via `getEntry`
- Room name resolution: iterate `state.world.floors` to find the room matching `assignedRoomId`, then `getRoomDefinition()` for the name
- Filter tabs use signal + computed pattern: `activeFilter` signal drives `filteredEntries` computed
- Detail view uses `selectedInhabitantId` signal; `availableRooms` computed lists all rooms with `maxInhabitants !== 0` and their `canAssignToRoom` status
- For reassignment from roster: unassign first, then assign — `assignInhabitantToRoom` rejects already-assigned inhabitants
- Panel placed in sidebar between floor-selector and room-info panels for easy access

## Inhabitant Recruitment System

- `recruitment.ts` helper: `recruitInhabitant(def)` handles validation (altar check, roster limit, tier gate, affordability), cost deduction via `payCost()`, and instance creation via `addInhabitant()` in one async call
- `getRecruitableInhabitants()` returns all non-unique inhabitant definitions sorted by tier then name — filters out `restrictionTags: ['unique']` (rulers)
- `getRecruitShortfall(cost, resources)` is a pure function taking cost and resources as params — avoids `computed()` issues in Vitest
- `DEFAULT_MAX_INHABITANTS = 50` — configurable roster cap; `isRosterFull` computed signal checks `inhabitants.length >= max`
- `unlockedTier` computed signal returns `1` — placeholder for future progression system (research/upgrades)
- Recruitment UI lives in `panel-altar` component (not a separate component) — the Altar panel expands to show recruitable inhabitants when the altar is selected
- `RecruitableEntry` type bundles def, affordable flag, locked flag, shortfall, and costEntries for efficient template binding
- When testing `recruitment.ts`, mock `canRecruit` as a simple function `() => mockHasAltar` — Angular `computed()` signals at module level don't work in Vitest, so test only the pure functions via `await import()`
- `IsContentItem` type has `__type` but NOT `__key` — don't add `__key` to test mock objects
