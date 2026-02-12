# Agents Knowledge Base

Reusable patterns and learnings for agents working on Blunderdark.

## Data-Driven ID Policy

- **NEVER hardcode content UUIDs in TypeScript code.** All room IDs, trap IDs, invader IDs, etc. are assigned at build time from YAML. Code must not reference specific content items by their UUID.
- **Use `findRoomIdByRole(role)` from `room-roles.ts`** to look up rooms that have special gameplay logic (e.g., `'altar'`, `'throne'`, `'trainingGrounds'`, `'trapWorkshop'`). The `role` field is set in `gamedata/room/base.yml`.
- **Use data fields on `RoomDefinition`** to drive behavior: `timeOfDayBonus`, `biomeBonuses`, `invasionProfile`, `objectiveTypes`, `trainingAdjacencyEffects`, `throneAdjacencyEffects`. Add new optional fields when rooms need new behavior — don't match on IDs.
- **Synergies are defined in `gamedata/synergy/base.yml`**, loaded via `getEntriesByType('synergy')` — not hardcoded in TypeScript.
- **In spec files**, define test-local arbitrary UUID constants — these are not hardcoded production references, they're test fixtures.
- **All gamedata UUIDs must be real v4 UUIDs** — generate with `crypto.randomUUID()` in Node.js.

## Circular Dependency Avoidance

- **Do NOT import from `@helpers/notify` in helper files that have tests.** The `notify.ts` file imports `isPageVisible` from the `@helpers` barrel, which triggers the entire barrel export chain including `state-game.ts` → `defaults.ts` → `rngUuid()`. This causes `ReferenceError: Cannot access '__vite_ssr_import_1__' before initialization` in Vitest.
- **Pattern:** Return data from helper functions and let Angular components call `notifyError()`/`notifySuccess()` instead. This decouples validation from notification and is more testable.

## Content Pipeline

- New content types require 3 things: (1) add to `ContentType` union in `src/app/interfaces/identifiable.ts`, (2) add `ensureX` initializer to `src/app/helpers/content-initializers.ts`, (3) create `gamedata/[type]/` folder with YAML
- Content types retrieved via `getEntry<T>` must use `T & IsContentItem` to satisfy type constraint
- Build script auto-discovers new folders in `gamedata/` — no script changes needed
- `public/json/` is gitignored (generated output) — only commit YAML source files
- Empty YAML files cause non-fatal "doc is not iterable" errors — pre-existing issue
- Use separate folders for different content types to avoid build script merging issues

## State Management

- Helper functions use pure functions (take state as param, return new state) — consistent immutable pattern
- **Computed signals** for derived state: `currentFloor`, `currentFloorBiome`, etc.
- **Default to safe values**: use `??` operator (e.g., `floor?.biome ?? 'neutral'`)
- `updateGamestate()` is async and handles both tick-mode and direct signal updates
- `migrateGameState()` uses `merge()` from es-toolkit, but complex state (resources, floors) needs explicit migration functions
- **Array fields need explicit migration** — `merge()` merges arrays by index (not replace), which corrupts multi-element data like `floors[]`. Add a dedicated `migrateX()` function (like `migrateResources`, `migrateFloors`) and call it after `merge()` in `migrateGameState()`
- When adding fields to `GameStateWorld`, also update `worldgen.ts` return value and `defaults.ts`
- When adding fields to `GameStateClock`, also update `defaults.ts` clock section
- The gameloop mutates `state.clock` in-place within the `updateGamestate` callback — safe because it operates on the tick-local copy
- `indexedDbSignal` auto-persists on `set()`/`update()` — no manual save needed

### Adding Fields to GameStateWorld

1. Add the field to the interface in `src/app/interfaces/state-game.ts`
2. Add default factory in `src/app/helpers/defaults.ts` (e.g., `defaultInvasionSchedule()`)
3. Update `defaultGameState()` to include the new field
4. Update `worldgenGenerateWorld()` in `worldgen.ts` to include the field
5. Update `makeGameState()` helpers in test files that construct full GameState objects
6. Migration is handled automatically by `merge(defaultGameState(), state)` in `migrate.ts`

### World Generation Configuration Pattern

When adding pre-worldgen configuration (like world seed or starting biome):

1. Create a module-level signal in `world.ts` to store the selection
2. Create setter/getter functions (e.g., `setStartingBiome()`)
3. If the option needs resolution (like 'random' -> actual value), add a resolve function
4. Call the resolve function in `worldgenGenerateWorld()` and pass to relevant defaults

## Game Time & Events

- `TICKS_PER_MINUTE = 5` — each tick = 12 seconds of game time; at 1x speed (~1 tick/sec), 1 real minute ≈ 12 game minutes
- `advanceTime()` is a pure function in `game-time.ts` — takes `GameTime` and numTicks, returns new `GameTime` with correct rollover
- Computed signals (`gameDay`, `gameHour`, `gameMinute`, `formattedGameTime`) read directly from `gamestate().clock`
- `scheduleEvent(triggerTime, callback)` in `game-events.ts` registers one-shot time triggers; recurring events re-register in their callback
- `gameTimeToMinutes()` converts `GameTime` to total minutes for comparison (Day 1 = minute 0)
- `processScheduledEvents()` separates toFire/remaining before executing — safe if callbacks schedule new events

### RxJS Event Pattern

For cross-cutting events (level-ups, season transitions, notifications):

1. Create a `Subject` in the helper file
2. Export a read-only observable (e.g., `reputationLevelUp$`)
3. Subscribe in service `init()` method for UI reactions

## Grid System

- Grid tiles use `[y][x]` indexing (row-major) — be careful with coordinate order
- `getAbsoluteTiles()` from room-shapes.ts converts shape-relative tiles to grid-absolute coordinates
- For grid tile lookup in templates, use a `Set<string>` of "x,y" keys for O(1) lookup vs O(n) array scan

### Adding Fields to GridTile

1. Update `createEmptyGrid()` in `grid.ts`
2. Fix any `toEqual` assertions in `grid.spec.ts` that check tile structure

### Adding Fields to Floor Type

1. Add to interface in `src/app/interfaces/floor.ts`
2. Add default in `defaultFloor()` in `src/app/helpers/defaults.ts`
3. Add migration in `migrateFloors()` in `src/app/helpers/floor.ts` (`saved.field ?? base.field`)
4. Update ALL `makeFloor()` helpers in spec files (~15 files) to include the new field
5. No changes needed to `worldgen.ts` if it uses `defaultFloor()`

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
- Room YAML lives in `gamedata/room/base.yml` — 13 rooms defined with varying production rates, costs, and adjacency bonuses
- `calculateInhabitantBonus(placedRoom, inhabitants)` returns `{ bonus, hasWorkers }` — bonus is additive sum of `(workerEfficiency - 1.0)` + `production_bonus` trait effectValues per assigned inhabitant
- `InhabitantDefinition` content type is `'inhabitant'` — loaded from `gamedata/inhabitant/base.yml` via ContentService; includes `restrictionTags: string[]` for room assignment restrictions
- `restrictionTags` on `InhabitantDefinition` matches against `inhabitantRestriction` on `RoomDefinition` — if restriction is null, any inhabitant allowed; otherwise tag must be in the array
- When adding fields to `InhabitantDefinition`, also update `ensureInhabitant()` in `content-initializers.ts` with defaults
- `canAssignInhabitantToRoom(def, roomDef, assignedCount)` checks restriction then capacity; `getEligibleInhabitants(allDefs, roomDef)` filters to eligible definitions
- `assignInhabitantToRoom(instanceId, roomId, roomTypeId)` enforces restrictions at the data level before updating state; `unassignInhabitantFromRoom(instanceId)` clears assignedRoomId
- `rulerBonuses: Record<string, number>` on `InhabitantDefinition` defines dungeon-wide bonuses for unique rulers — keys are bonus types (attack, fear, researchSpeed, fluxProduction, corruptionGeneration, invaderMorale), values are percentage modifiers
- `throne-room.ts` helper: `findThroneRoom(floors)` uses `findRoomIdByRole('throne')` to locate the throne, `getSeatedRulerInstance(floor, roomId)` finds the assigned inhabitant, `getActiveRulerBonuses(floors)` returns the seated ruler's bonus record
- Unique ruler creatures (Dragon, Lich, Demon Lord) are tier 4 with `restrictionTags: ['unique']` — they have `rulerBonuses`, `rulerFearLevel`, but empty `traits` since their bonuses are dungeon-wide, not room-specific
- `rulerFearLevel: number` on `InhabitantDefinition` — the fear level this ruler provides (Dragon=4, Lich=3, Demon Lord=5); `getThroneRoomFearLevel(floors)` returns null if no throne, 1 (EMPTY_THRONE_FEAR_LEVEL) if empty, or ruler's value
- TypeScript `Record<string, number>` properties must use bracket notation (`bonuses['attack']`) not dot notation in strict mode — TS4111 error otherwise
- `getThroneRoomPositionalBonuses(floors)` returns `ThronePositionalBonuses` — checks adjacent rooms for `throneAdjacencyEffects.goldProductionBonus` (data-driven, set in YAML), and checks central placement for ruler bonus multiplier
- `isRoomCentral(anchorX, anchorY, shapeWidth, shapeHeight, gridSize, threshold)` — pure function using Manhattan distance from room center to grid center; threshold=5 for Throne Room
- Room shape resolution in throne-room.ts uses `getEntry<RoomShape & IsContentItem>(shapeId)` — in tests, put shapes into `mockContent` Map and the mock `getEntry` returns them
- `areRoomsAdjacent` from `adjacency.ts` checks edge-sharing (not diagonal) — used for vault adjacency detection
- `workerEfficiency` of 1.0 = 0% bonus; only `production_bonus` effectType traits contribute to production bonuses; other trait types (defense_bonus, trap_bonus) are ignored
- `calculateAdjacencyBonus(placedRoom, adjacentRoomIds, allPlacedRooms)` returns additive bonus from gamedata adjacency rules — caller provides adjacentRoomIds from AdjacencyMap
- `getActiveAdjacencyBonuses(placedRoom, floor)` returns `ActiveAdjacencyBonus[]` with sourceRoomId, sourceRoomName, bonus, description — used for UI display of which adjacent rooms contribute bonuses
- `AdjacencyBonus` type has `description: string` field — displayed in tooltips; `ensureRoom()` defaults missing descriptions to empty string
- `calculateConditionalModifiers(placedRoom, inhabitants)` returns multiplicative modifier from inhabitant states — scared=0.5, hungry=0.75, normal=1.0; unique states only (Set dedup)
- Production formula: `Final = Base * (1 + inhabitantBonus + adjacencyBonus) * conditionalModifier`
- `PlacedRoom.appliedUpgradePathId?: string` tracks the chosen upgrade — optional field so existing PlacedRoom literals in tests don't break
- `room-upgrades.ts` helper: `canApplyUpgrade()` enforces mutual exclusivity (one upgrade per room), `applyUpgrade()` returns new PlacedRoom, `getAppliedUpgradeEffects()` returns effects array
- Upgrade effect types: `productionMultiplier` (scales base production), `maxInhabitantBonus` (adds to capacity), `fearReduction` (reduces fear level), `secondaryProduction` (adds new resource output)
- Room YAML upgrade paths are defined in YAML data only, never referenced by code

### Room Placement

- `placeRoomOnFloor(floor, room, shape)` — pure function that validates placement, marks grid tiles, and adds room to floor. Returns updated Floor or null
- `removeRoomFromFloor(floor, roomId, shape)` — pure function that clears grid tiles and removes room. Takes shape as parameter to stay pure/testable
- `placeRoom(roomTypeId, shapeId, anchorX, anchorY)` — async wrapper using `updateGamestate` on current floor
- `removeRoom(roomId)` — async wrapper resolving shape via content lookup
- Pure functions are testable without mocking gamestate or content — keep data manipulation separate from signal/state access

### Room Placement Mode

- `selectedRoomTypeId` signal — tracks which room type is selected for placement (null when not in placement mode)
- `enterPlacementMode(roomTypeId, shape)` — sets selectedRoomTypeId + placementPreviewShape
- `exitPlacementMode()` — clears selectedRoomTypeId + preview signals
- `executeRoomPlacement(x, y)` — full async flow: validate → check cost → pay → place → returns `{ success, error? }`
- Panel component uses `isSelected(roomId)` to highlight the active room type
- Clicking an already-selected room toggles off placement mode (same click to deselect)
- After successful placement, player stays in placement mode for rapid building (no auto-exit)

### Placement Preview Pattern

The room placement preview system uses module-level signals in `room-placement.ts`:

1. `placementPreviewShape` signal — set to the RoomShape being placed (null when not placing)
2. `placementPreviewPosition` signal — updated on mouse hover over grid tiles
3. `placementPreview` computed — combines shape + position + grid state to produce validated tile list
4. GridComponent uses a `previewTileSet` computed with a `Set<string>` of `"x,y"` keys for O(1) per-tile lookup
5. If ANY tile in the shape is invalid, ALL tiles show red (all-or-nothing validity)
6. Escape key calls `exitPlacementMode()` (clears selectedRoomTypeId + shape + position), then falls back to tile deselection
7. Right-click (`(contextmenu)`) on grid calls `exitPlacementMode()` + `event.preventDefault()` to suppress context menu
8. `(mouseleave)` on grid container calls `clearPreviewPosition()` — clears position only (not shape), so preview reappears on re-entry
9. Three levels of clearing: `clearPreviewPosition()` (position only) vs `clearPlacementPreview()` (shape + position) vs `exitPlacementMode()` (selectedRoomTypeId + shape + position)

### Room Visual Representation

- Room colors assigned per `roomTypeId` (not per room instance) — all rooms of the same type share a color
- `roomInfoMap` computed signal maps room instance IDs to `{color, name}` for O(1) lookup per tile
- Room name label rendered only on the anchor tile (first tile of the room shape) via `isRoomAnchor(x, y, roomId)`
- CSS custom property `--room-color` passed from template to SCSS for per-room dynamic coloring
- `color-mix(in oklch, var(--room-color) 80%, black)` creates a darker border from the room color

## Altar Room & Auto-Placement

- `autoPlaceRooms(floor)` finds all rooms with `autoPlace: true` and places them centered on the grid — called during `worldgenGenerateWorld()`
- `removable: boolean` field on `RoomDefinition` — `isRoomRemovable(roomTypeId)` in `room-placement.ts` checks this before allowing removal
- `autoPlace: boolean` field on `RoomDefinition` — rooms with `autoPlace: true` are excluded from the build panel and auto-placed during world generation
- `fearReductionAura: number` field on `RoomDefinition` — base aura value, overridden by upgrade `fearReductionAura` effect type
- Altar uses sequential upgrade levels (1→2→3) on the existing mutually-exclusive `appliedUpgradePathId` system — `getAltarLevel()` reads the `upgradeLevel` field from upgrade path definitions, `applyAltarUpgrade()` validates level ordering
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
- Use `vi.fn()` wrappers instead of inline mock implementations for controllable return values per test
- For `updateGamestate`, capture the updater function via `mockUpdateGamestate.mock.calls[0][0]` and execute it to verify state transformations
- When mocking `gamestate()` in tests with partial state, cast through `unknown` first: `as unknown as ReturnType<typeof gamestate>`

## Hallway System

- `hallway-placement.ts` manages the hallway build workflow via `HallwayBuildStep` signal: inactive → selectSource → selectDestination → preview
- `hallways.ts` has pure helper functions: `addHallwayToGrid()` marks tiles as `occupied: true, occupiedBy: 'hallway'`, `addHallway()` appends to hallway array
- Hallway data lives on each `Floor` object (`floor.hallways: Hallway[]`), not at world level
- To place a hallway: (1) `payCost({ crystals: cost })`, (2) create `Hallway` object with `rngUuid()`, (3) `updateGamestate` to update `floor.grid` via `addHallwayToGrid` and `floor.hallways` via `addHallway`
- `canAfford()` from resources.ts works inside `computed()` — it reads `gamestate()` internally so Angular tracks the dependency

### Hallway Pathfinding

BFS pathfinding for hallways between rooms:

1. Find empty tiles adjacent to source room (start set) and destination room (end set)
2. BFS from start set through unoccupied tiles to any tile in end set
3. Adjacent rooms (sharing an edge) still have valid hallway paths — the empty tiles around them don't overlap, so BFS finds a route through neighboring empties
4. Block hallway between same room (self-connection returns null)
5. `hallwayPreviewTileSet` uses `Set<string>` of `"x,y"` keys for O(1) per-tile lookup (same pattern as placement preview)
6. Click handler (`handleHallwayTileClick`) uses step-based state machine: `selectSource → selectDestination → preview`
7. In preview step, clicking a different room updates destination (re-pathfinds)

## Connection System

- Connections stored per-floor in `Floor.connections: Connection[]` — bidirectional links between adjacent rooms
- `Connection` type: `{ id, roomAId, roomBId, edgeTiles: TileOffset[] }`
- Query functions use `currentFloor()` and iterate connections — no adjacency map needed for connections (they're explicit, not geometric)
- When adding fields to `Floor` type, update: (1) `defaultFloor()`, (2) `migrateFloors()`, (3) all `makeFloor()` test helpers in spec files
- `addConnectionToFloor` returns null for duplicates — always check return value
- `validateConnection(floor, roomAId, roomBId)` checks: self-connection, room existence, adjacency, duplicates — returns `{ valid, error?, edgeTiles? }`
- `createConnection(roomAId, roomBId)` validates internally and auto-computes edge tiles — no `edgeTiles` param needed
- Edge tiles are computed via `getSharedEdges(tilesA, tilesB)` from adjacency.ts — returns `[tileFromA, tileFromB]` pairs
- `getAdjacentUnconnectedRooms(floor, roomId)` — returns IDs of adjacent rooms without an existing connection
- `getRoomConnections(floor, roomId)` — returns Connection[] for all connections involving a room
- Production system uses geometric adjacency (tile positions) NOT the connection system for adjacency bonuses — connections are a separate layer for logical linking

## UI Patterns

- DaisyUI progress bars use classes like `progress-error`, `progress-warning`, etc.
- Theme variables: `var(--b3)`, `var(--p)`, `var(--s)`, `var(--pf)`
- OKLCH color format works in Angular SCSS — the compiler converts them to browser-compatible formats
- SweetAlert2 pattern: `[swal]="templateRef"` on button + `<swal>` element with `(confirm)` event handler
- Angular view encapsulation adds attribute selectors — manual class additions in browser console won't match scoped styles
- `@ngneat/hotkeys` provides global keyboard shortcuts: `[hotkeys]="'SPACE'"` with `isGlobal` directive attr, `(hotkey)` event handler
- `appRequireSetup` / `appRequireNotSetup` directives show/hide elements based on setup state
- Navbar component already has pause button, pause menu (ESC), Space bar toggle — check before re-implementing
- Panel components follow card pattern: `card bg-base-100 shadow-xl` → `card-body p-4` → `card-title text-sm` for headers
- Panel components conditionally render using a computed signal (e.g., `throneRoom()` returns null if not relevant) and wrapping template in `@if`
- `panel-throne-room` component shows when a Throne Room tile is selected — reads from `selectedTile()`, `currentFloor()`, then finds the room via `findRoomIdByRole('throne')`
- Sidebar panels are added to `game-play.component.html` inside the `.sidebar` div — order matters for visual stacking
- `PanelResourcesComponent` displays all 7 resource types with progress bars and `+X/min` production rates — uses `productionRates` computed signal and `productionPerMinute()` helper
- `ensureContent()` in `content-initializers.ts` gracefully handles unknown content types by returning content as-is — prevents crashes when new YAML content types (e.g., currency) lack an initializer function

### Creating Panel Components

1. Create component in `src/app/components/panel-[name]/` with `.ts`, `.html`, `.scss` files
2. Use `ChangeDetectionStrategy.OnPush` in the component decorator
3. Import and add to `game-play.component.ts` imports array
4. Add `<app-panel-[name] />` to the sidebar div in `game-play.component.html`
5. Use DaisyUI card structure: `card > card-body > card-title` for consistent styling

### Dynamic Styling with CSS Variables

Pass colors from templates to SCSS using CSS custom properties:

```html
<div [style.--my-color]="getColor()"></div>
```

```scss
.element {
  border-color: var(--my-color);
}
```

### Shape Preview in Panels

For small shape preview icons in UI panels, use CSS grid with dynamic size:

```html
<div class="shape-preview" [style.--grid-size]="getShapeGridSize(room)">
  @for (tile of getShapeTiles(room); track tile.key) {
  <div class="shape-tile" [style.grid-column]="tile.x + 1" [style.grid-row]="tile.y + 1"></div>
  }
</div>
```

```scss
.shape-preview {
  display: grid;
  grid-template-columns: repeat(var(--grid-size), 8px);
  grid-template-rows: repeat(var(--grid-size), 8px);
  gap: 1px;
}
```

### Doorway Rendering Pattern

For rendering visual indicators on tile edges (like doorway connections):

1. Build a `Map<string, Set<string>>` computed signal from data (e.g., connections + grid)
2. Key: `"x,y"` string, Value: Set of directions (`'top'|'right'|'bottom'|'left'`)
3. For shared edges, add indicators to BOTH tiles — one direction on the roomA tile, the opposite on the roomB tile
4. Direction determined by checking which neighbor in the grid has the target `roomId`
5. Template: use `@if (getMethod(x, y); as dirs)` + `dirs.has('top')` to conditionally render
6. CSS: absolute positioned bars at 60% width, 3px thick — visible at ~30px tile sizes
7. `pointer-events: none` prevents doorway indicators from capturing mouse events

### Build Mode Mutual Exclusion

When multiple build modes exist (room placement, hallway build):

1. Each mode has its own helper file with enter/exit functions and signal state
2. `enterX()` calls `exitY()` for all other modes — one-way import direction (hallway-placement.ts → room-placement.ts)
3. UI components handle the reverse direction: `selectRoom()` calls `exitHallwayBuildMode()` before `enterPlacementMode()`
4. Grid component's Escape/right-click handlers check modes in priority order (hallway first, then room placement, then deselect)
5. This avoids circular dependencies between helper files

## Adding Generic Rooms

- **Generic rooms (non-unique, no special logic) only need YAML changes** — the existing placement, production, adjacency, and upgrade systems are fully data-driven. No helper code or component changes are needed.
- Room production values in YAML are **per tick**. To get per-minute rate, multiply by `TICKS_PER_MINUTE` (5). Example: 8 Food/min = `food: 1.6` in YAML.
- Adjacency bonuses in YAML reference room names (the build script auto-resolves names to UUIDs via `rewriteDataIds`).
- Room definitions live in `gamedata/room/base.yml`; room shapes in `gamedata/roomshape/base.yml`
- If a room references a shapeId that doesn't exist, create the shape first — the build will succeed but the room won't render
- `workerEfficiency` affects production via `totalBonus += workerEfficiency - 1.0` — a skeleton with `workerEfficiency: 0.7` applies a -0.3 penalty
- `fearIncrease` is a valid upgrade effect type for room upgrades — data-only for now, will be wired when fear system is implemented
- Test pattern for room-specific specs: mock `@helpers/content` with inline room/shape/inhabitant data, then test production, adjacency, upgrades via imported helper functions
- Passive rooms (`requiresWorkers: false`) still apply worker bonuses/penalties if inhabitants are assigned — `calculateInhabitantBonus` runs regardless of `requiresWorkers`, which only controls the "zero workers = zero production" gate
- Reuse existing shapes when possible rather than creating duplicates

## Production & Upgrade Integration

- **Upgrade effects are NOT yet wired into production calculations** — `productionMultiplier` and `secondaryProduction` upgrade effects from `room-upgrades.ts` are defined but not applied in `calculateTotalProduction()` or `calculateSingleRoomProduction()`. This needs to be done when upgrade UI is implemented.
- `processProduction(state)` in `gameloop.ts` is the entry point — called every tick, sums all room production, adds to resources capped at max
- `productionRates` is a computed signal that recalculates whenever `gamestate().world.floors` changes — used by `PanelResourcesComponent` for live rate display
- `calculateTotalProduction(floors)` builds adjacency maps on-the-fly per floor using `resolveRoomShape` + `getAbsoluteTiles` + `areRoomsAdjacent`
- TypeScript requires bracket notation for `Partial<Record<string, number>>` index access: `production['crystals']` not `production.crystals`
- `Object.entries()` on `Partial<Record<string, number>>` returns `[string, number | undefined][]` — must check `!amount` before comparisons
- `productionPerMinute(perTickRate)` — multiply by `TICKS_PER_MINUTE` (5) for display
- Formula: `final = base * (1 + inhabitantBonus + adjacencyBonus) * stateModifier * envModifier`
- Test pattern: use `depth: 0` and `biome: 'neutral'` in makeFloor for tests that don't test env modifiers
- Importing `gamestate` from `@helpers/state-game` in helper files is safe — no circular dependency with the production module chain

### Efficiency Calculation System

- `efficiency.ts` imports `getRoomDefinition` from `production.ts` (one-way, safe) — do NOT import from efficiency.ts in production.ts to avoid circular dependency
- `calculateInhabitantBonus` in production.ts already handles trait-room matching via `targetResourceType` — efficiency.ts provides a separate breakdown for UI display
- Trait-room matching: traits with `targetResourceType` only apply when the room produces that resource; `undefined` or `'all'` traits apply to any room
- `InhabitantTrait` has optional `targetResourceType?: string` field — existing traits without it always apply (backwards compatible)
- `calculateRoomEfficiency(room, inhabitants)` returns per-inhabitant breakdown for UI, while `calculateInhabitantBonus` returns a single bonus number for production

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

## Resource UI Display

- `PanelResourcesComponent` is a horizontal bar at the **top** of the game-play page (not in the sidebar) — wraps the game-play container in a flex-col with the resource bar above the sidebar+grid row
- `productionBreakdowns` computed signal in `production.ts` returns `Record<string, ResourceProductionBreakdown>` with per-resource-type breakdown (base, inhabitantBonus, adjacencyBonus, modifierEffect, final)
- Rich tooltips use custom CSS absolute positioning with a delay timer (250ms) — DaisyUI's `data-tip` tooltips only support plain text, so custom implementation is needed for HTML content
- Warning thresholds: `LOW_THRESHOLD = 0.2`, `CRITICAL_THRESHOLD = 0.1` — configurable constants, not hardcoded inline
- Production breakdown math: `inhabitantContrib = base * inhabitantBonus`, `adjacencyContrib = base * adjacencyBonus`, `modifierEffect = withBonuses * (modifier - 1)`

## Synergy Detection System

- `synergy.ts` implements a data-driven synergy system — synergy definitions are loaded from `gamedata/synergy/base.yml` via `getEntriesByType('synergy')`
- 5 condition types: `roomType`, `adjacentRoomType`, `connectedRoomType`, `inhabitantType`, `minInhabitants` — evaluated per-room using pure functions
- `evaluateAllSynergies(floors, synergies?)` returns `Map<string, SynergyDefinition[]>` mapping roomId → active synergies — builds adjacency map internally per floor
- `activeSynergyMap` computed signal caches results, re-evaluates when `gamestate()` changes — no explicit invalidation needed
- `getActiveSynergies(roomId)` convenience function reads from the computed signal
- To add new synergies, add entries to `gamedata/synergy/base.yml` — no code changes needed
- Connection-based conditions use `floor.connections` directly (pure) — don't import `areRoomsConnected` from connections.ts which reads from signals
- Synergies are floor-scoped (no cross-floor evaluation) — same pattern as adjacency bonuses

### Synergy Tooltip Pattern

- `SynergyTooltipComponent` is a sidebar panel (not a hover tooltip) that reads `selectedTile()` and `currentFloor()` via computed()
- Builds adjacency map internally (same pattern as production.ts) to evaluate synergies for the selected room
- `getPotentialSynergiesForRoom()` filters synergies where roomType matches but other conditions aren't met — returns missing conditions as human-readable strings
- `formatSynergyEffect()` formats effect values for display (e.g., "+15% crystals production")
- `describeCondition()` uses `getRoomDefinition()` from production.ts to get room names for condition descriptions
- When testing `synergy.ts` functions that import from `@helpers/production`, add `vi.mock('@helpers/production')` to provide `getRoomDefinition` — the mock must be placed before imports (hoisted by vitest)

## Training System

- `training.ts` helper: `processTraining(state)` runs each tick inside `updateGamestate` — mutates `state.world.inhabitants` in-place (same pattern as `processProduction` mutating `state.world.resources`)
- Training Grounds room is found via `findRoomIdByRole('trainingGrounds')` — no hardcoded ID
- `BASE_TRAINING_TICKS = TICKS_PER_MINUTE * 5` (25 ticks = 5 game-minutes of training)
- Training fields on `InhabitantInstance` are **optional** (`trained?`, `trainingProgress?`, `trainingBonuses?`) — avoids breaking 13+ spec files that create inhabitant mocks
- `deserializeInhabitants()` provides defaults for training fields via `??` — backwards-compatible with saved data that predates training
- Training adjacency effects are data-driven via `trainingAdjacencyEffects` field on `RoomDefinition` — `timeReduction` reduces training time, `statBonus` adds to all training stats. Set in `gamedata/room/base.yml` on rooms like Barracks and Altar.
- `getAdjacentRoomTypeIds(room, floor, tileMap?)` returns a Set of adjacent room type IDs — reusable for any room-specific adjacency checks
- New upgrade effect types: `trainingAttackBonus`, `trainingTimeMultiplier`, `trainingDefenseBonus` — handled in training.ts, transparent to existing room-upgrades.ts
- `trainingCompleted$` observable emits on training completion — subscribe in a service for notifications
- When adding optional fields to shared types (InhabitantInstance), prefer `?:` syntax over required fields to avoid cascade updates across all test files

## Trap System

- Trap definitions in `gamedata/trap/base.yml` — 5 types: Pit, Arrow, Rune, Magic, Fear Glyph
- `TrapDefinition` (content type) vs `TrapInstance` (runtime placed trap) vs `TrapInventoryEntry` (unplaced inventory)
- `TrapInstance` stored per-floor in `Floor.traps: TrapInstance[]` — similar to `Floor.hallways`
- `TrapInventoryEntry[]` stored in `GameStateWorld.trapInventory` — player's unplaced trap stock
- Trap placement: hallway tiles only, max 1 trap per tile, validated via `canPlaceTrap(floor, tileX, tileY)`
- Trap trigger: `rollTrapTrigger(trap, isRogue, roll)` — deterministic given a roll value for testability
- Rogue disarm: 60% chance to disarm instead of trigger, except `canBeDisarmed: false` traps (Rune Trap)
- Fear Glyph: only trap with `effectType: 'fear'` — applies 10 morale penalty in addition to damage
- `processTraps(state)` is a no-op hook for future tick-based trap mechanics — traps are event-driven (invasions)
- When adding fields to `Floor` type, must update ALL `makeFloor()` test helpers across ~15 spec files

### Trap Workshop / Crafting Queue System

- `trap-workshop.ts` helper: `processTrapCrafting(state)` runs each tick inside `updateGamestate` — mutates crafting queues in-place (same pattern as production/training)
- Trap Workshop room is found via `findRoomIdByRole('trapWorkshop')` — no hardcoded ID
- `BASE_CRAFTING_TICKS = TICKS_PER_MINUTE * 3` (15 ticks = 3 game-minutes)
- Crafting queues stored globally in `GameStateWorld.trapCraftingQueues: TrapCraftingQueue[]` (not per-floor)
- Each queue maps to a room by `roomId`, contains an ordered list of `TrapCraftingJob` objects
- Only the first job in each queue progresses each tick (FIFO processing)
- Worker speed bonus: each additional worker beyond first reduces time by 20%, capped at 0.4 multiplier (60% max reduction)
- New upgrade effect types: `craftingSpeedMultiplier`, `craftingCostMultiplier`, `craftingBonusDamage` — handled in trap-workshop.ts
- `canQueueTrap(roomId, floors)` validates: room is Trap Workshop, has at least 1 assigned inhabitant
- When mocking `@helpers/content` in trap-workshop tests, provide both `getEntriesByType` and `getEntry` mocks

## Invader System

- Invader definitions in `gamedata/invader/base.yml` — 6 classes: Warrior, Rogue, Mage, Cleric, Paladin, Ranger
- `InvaderDefinition` (content type) vs `InvaderInstance` (runtime with HP, status effects, ability states)
- `InvaderInstance.abilityStates: AbilityState[]` — reuses the same AbilityState type from combat system
- `InvaderInstance.statusEffects: StatusEffect[]` — tracks named effects with durations (shielded, marked, courage, etc.)
- `resolveInvaderAbility(invader, ability, targetIds, rng)` — pure function returning `AbilityResult | null`
- Invader abilities are CombatAbility entries referencing AbilityEffectDefinition by name via `effectType`
- **Mock content collision warning**: When mocking `@helpers/content` in tests, do NOT register abilities by name if effect names overlap (e.g., "Scout" effect vs "Scout" ability) — register abilities by ID only
- `createInvaderInstance(definition)` looks up ability IDs via `getEntry` to initialize ability states
- Cooldown/status helpers: `applyCooldown`, `tickCooldowns`, `applyStatusEffect`, `tickStatusEffects`, `hasStatusEffect`, `clearStatusEffects`, `applyHealing`

## Pathfinding System

- `pathfinding.ts` helper: `buildDungeonGraph(floor, roomFearLevels)` creates graph from Floor's rooms, connections, and hallways
- `DungeonGraph` uses adjacency list: `Map<string, PathEdge[]>` keyed by room ID
- `PathNode` stores roomId, roomTypeId, x/y (anchor), fearLevel
- `findPath(graph, start, goal, options)` — Dijkstra's algorithm (NOT A\* with Manhattan, because rooms connect at arbitrary distances via hallways making Manhattan inadmissible)
- Fear cost: when `morale < room.fearLevel`, edge cost is `baseCost * fearCostMultiplier` (default 3x)
- `PathfindingOptions`: `morale`, `fearCostMultiplier`, `blockedNodes: Set<string>`
- `findPathWithObjectives(graph, start, primaryGoal, secondaryObjectives, options)` — detours to secondary if cost < 2x direct path
- `recalculatePath(graph, current, goal, newBlockedNode, options)` — adds blocked node and re-pathfinds
- Empty path = no valid route (invader enters 'confused' state)
- Both connections and hallways create bidirectional edges with baseCost 1
- Graph is rebuilt when floor state changes (not incremental) — fast enough for ≤400 nodes

## Invasion Systems

### Invasion Trigger System

- `invasion-triggers.ts` helper: `processInvasionSchedule(state, rng?)` runs each tick inside `updateGamestate` — mutates `state.world.invasionSchedule` in-place
- `InvasionSchedule` stored in `GameStateWorld.invasionSchedule` — auto-persisted via IndexedDB
- Grace period: 30 days (configurable via `gracePeriodEnd` field), no invasions before it ends
- Escalating intervals: 15 days (day 30-59), 10 days (day 60-99), 7 days (day 100+), minimum 5 days
- Variance: +/- 2 days determined at scheduling time (not re-rolled), cannot push before grace period, min 3 days between invasions
- Warning: fires 2 game-minutes before invasion day start via `notify('Invasion', ...)` — dismissible via `warningDismissed` flag
- Special invasions: `addSpecialInvasion(schedule, type, currentDay, delay?)` — bypasses normal schedule, types: 'crusade' | 'raid' | 'bounty_hunter'
- Past-due handling: `shouldTriggerInvasion` uses `>=` so loading a save past the scheduled day triggers immediately
- RNG: pass `PRNG` (seedrandom) for testability, defaults to `rngRandom()` in production

### Invasion Composition System

- `invasion-composition.ts` helper: `calculateDungeonProfile(state)` → `DungeonProfile` with corruption/wealth/knowledge (0-100), size, threatLevel
- Dungeon profile is built by reading `invasionProfile` field from room definitions (data-driven) — rooms declare their dimension (corruption/wealth/knowledge) and weight in YAML
- Composition weights stored in YAML: `gamedata/invasion/composition-weights.yml` — content type `'invasion'`
- Weight profiles: balanced (all equal), highCorruption (Paladin+Cleric), highWealth (Rogue+Warrior), highKnowledge (Mage+Ranger)
- `getCompositionWeights(profile, config)` — if any dimension >60, uses corresponding weight profile; multiple highs get averaged
- `selectPartyComposition(profile, defs, weights, seed)` — pure function returning `InvaderDefinition[]`, testable without content mocks
- Party size: 3-5 (≤10 rooms), 6-10 (11-25 rooms), 11-15 (26+ rooms)
- Constraints: at least 1 warrior, no class >50% of party, balanced profiles have 3+ unique classes
- For statistical composition tests, run 50 iterations and check aggregate ratios (>40% threshold)
- `findLastIndex` not available in target — use manual reverse loop instead

### Invasion Objectives System

- `invasion-objectives.ts` helper: `assignInvasionObjectives(state, seed)` returns 1 primary (DestroyAltar) + 2 secondary objectives
- Objective eligibility is data-driven via `objectiveTypes` field on `RoomDefinition` — rooms declare which objective types they support in YAML
- Primary objective (DestroyAltar) uses `findRoomIdByRole('altar')` to locate the target
- 7 secondary templates: SlayMonster, StealTreasure, DefileLibrary, SealPortal, PlunderVault, RescuePrisoner, ScoutDungeon
- SlayMonster targets tier 2+ inhabitants — must look up `InhabitantDefinition` via `getEntry()` since `InhabitantInstance` has no `tier` field
- `InhabitantInstance` uses `instanceId` (NOT `id`) for targeting
- `resolveInvasionOutcome(objectives)` — altar destroyed = defeat (multiplier 0); victory = 1.0 + 0.25 per prevented - 0.25 per completed secondary
- When mocking `@helpers/content` for inhabitant tier lookups, use a `Map<string, unknown>` and `registerInhabitantDefs()` helper

### Invasion Win/Loss Conditions

- `invasion-win-loss.ts` helper: pure functions for checking invasion end conditions and resolving results
- Constants: `ALTAR_MAX_HP = 100`, `MAX_INVASION_TURNS = 30`, `SECONDARY_OBJECTIVES_FOR_VICTORY = 2`
- `InvasionState` type in `invasion.ts` tracks active invasion: turn counter, altar HP, invaders, objectives, defender/invader counts
- `checkInvasionEnd(state)` returns `InvasionEndReason | null` — priority: altar_destroyed > objectives_completed > all_invaders_eliminated > turn_limit_reached
- All state mutations are pure (return new state): `damageAltar`, `advanceInvasionTurn`, `markInvaderKilled`, `recordDefenderLoss`, `endInvasion`
- `damageAltar` auto-updates the DestroyAltar objective progress based on HP percentage

### Invasion Rewards System

- `invasion-rewards.ts` helper: pure functions for reward/penalty calculation, loot rolling, prisoner capture and handling
- Reward formula: +5 base rep, +1 per kill, +3 if all secondaries prevented. Experience = invaderCount _ 10 _ rewardMultiplier
- Penalty formula: 20% gold lost, -3 reputation, +10 crystals +5 essence per completed secondary
- Class-based loot: `CLASS_LOOT` record maps InvaderClassType to gold range + bonus resource
- Prisoner capture: `rollPrisonerCaptures()` with 30% chance per retreating invader
- 5 prisoner handling options (pure functions returning `PrisonerHandlingResult`): Execute, Ransom, Convert, Sacrifice, Experiment
- Altar rebuild cost: 100 crystals + 50 gold + 20 flux

### Turn-Based Invasion Combat

- `invasion-combat.ts` helper: pure functions for turn queue management, action validation/execution, and AI
- `Combatant` type unifies defenders and invaders: id, side, name, speed, hp/maxHp, attack, defense, hasActed, position
- `TurnQueue`: combatants sorted by speed (desc), defenders-first on ties. Tracks currentIndex and round number
- Turn flow: `buildTurnQueue` → `getCurrentActor` → execute action → `advanceTurn` → check `isRoundComplete` → `startNewRound`
- `startNewRound` removes dead combatants, resets hasActed, re-sorts, increments round
- Position system: `TilePosition = { x, y }`, cardinal adjacency only (no diagonals)
- `executeMove` / `executeAttack` / `executeWait`: all return `{ queue, result }` (pure, no mutation)
- `executeAttack` delegates to `resolveCombat` from combat.ts for d20-based hit/damage resolution
- AI (`resolveAiAction`): attack weakest adjacent enemy > move toward nearest enemy (manhattan) > wait

## Conditional State Modifiers

- `state-modifiers.ts` helper: per-creature state modifier lookup with fallback defaults
- `StateModifier` type: `productionMultiplier`, `foodConsumptionMultiplier`, optional `attackMultiplier`, `defenseMultiplier`
- `InhabitantDefinition` has optional `fearTolerance?: number` and `stateModifiers?: Partial<Record<InhabitantState, StateModifier>>`
- `isInhabitantScared(inhabitant, roomFearLevel)`: scared when fear > tolerance. `DEFAULT_FEAR_TOLERANCE = 2`
- `getStateModifier(definitionId, state)`: returns creature-specific modifier or fallback default
- `calculatePerCreatureProductionModifier(assignedInhabitants)`: averages per-creature production multipliers (replaces old flat state multiplication)
- Default fallbacks match old behavior: normal=1.0, scared=0.5, hungry=0.75 — creatures without YAML data get these
- Fear tolerance values: Slime=0, Goblin=1, Myconid=1, Kobold=2, Skeleton=4, Dragon=4, Lich=4, Demon Lord=4

## Conditional Production Modifiers

- `production-modifiers.ts` helper: registry-based production modifier system with time-of-day, floor depth, and biome modifiers — all data-driven from room definitions
- `ProductionModifierContext`: `{ roomTypeId, floorDepth, floorBiome, hour }` — all data needed to evaluate modifiers
- `calculateProductionModifiers(context)` — multiplies all registry modifiers together, returns combined multiplier
- `evaluateModifiers(context)` — returns array of active modifier results for UI display
- Time-of-day and biome bonuses are read from `timeOfDayBonus` and `biomeBonuses` fields on `RoomDefinition` — not hardcoded
- `getBiomeBonus(biome, roomTypeId)` — pure function returning multiplier (1.0 + bonus). Exported for direct use.
- Depth: +5% per floor depth level (DEPTH_BONUS_PER_LEVEL = 0.05)
- Production pipeline: `calculateTotalProduction(floors, hour?)` — optional `hour` param. When omitted, env modifiers = 1.0

## Research Tree YAML Conventions

- Each branch uses a thematic secondary resource: Dark=essence, Arcane=flux, Engineering=gold
- Cost scaling pattern across tiers: T1=10 research, T2=25/5, T3=50/15, T4=100/30/15 tertiary, T5=200/60/30, T6=400/120/60
- Root nodes (tier 1) are defined in `base.yml`; branch-specific nodes (tier 2+) go in `dark.yml`, `arcane.yml`, `engineering.yml`
- Tree structure: 3 paths from root at tier 2, specializations at tier 3, cross-path combinations at tier 4, convergence at tier 5-6
- Research prerequisites use `prerequisiteResearchIds` key (not `prerequisites`) — this naming allows `rewriteDataIds()` to auto-resolve names to UUIDs at build time. YAML files use human-readable research node names; the build script converts them to UUIDs.

## Gamedata Build-Time Validation

When adding build-time validation for a content type:

1. Add a validation function (e.g., `validateResearchTree()`) to `scripts/gamedata-build.ts`
2. Call it between `processFiles()` and `rewriteDataIds()` — data is loaded but IDs haven't been rewritten
3. Access data via `allData['contenttype']` — contains all entries from all YAML files merged
4. On failure: `console.error()` + `process.exit(1)` to halt the build

## GameState Type Gotchas

- Season type is `'growth' | 'harvest' | 'darkness' | 'storms'` (NOT 'spring'/'summer' etc.)
- ResearchState fields: `completedNodes`, `activeResearch`, `activeResearchProgress`, `activeResearchStartTick` (NOT `unlockedNodeIds`/`activeResearchId`)
- `GameStateWorld` has both top-level `grid` and `floors[].grid` — the top-level grid is **legacy**; always use `currentFloor()?.grid` for room operations
- Module-level constants/functions must be placed BEFORE the `@Component` decorator — placing them between decorator and class causes compilation error

## Biome Restrictions

- `biome-restrictions.ts` defines `BIOME_RESTRICTIONS` config map: biome → room name → `{ blocked?: boolean, maxPerFloor?: number }`
- `canBuildRoomOnFloor(roomTypeId, biome, floor)` is the main validation function — resolves room name via `getEntry`, then checks the config map
- `getRoomBiomeRestrictionInfo()` provides UI display data including count info for `maxPerFloor` rules
- Integrated into `executeRoomPlacement()` in room-placement.ts — checked after unique room check, before affordability
- Panel-room-select uses `isBiomeRestricted()`, `getBiomeRestrictionTooltip()`, `getBiomeLimitLabel()` for UI feedback
- Restriction rules reference room names (strings) not IDs — if a room name changes in YAML, the restriction map must be updated too
- Rooms that don't exist yet (e.g., Torture Chamber) are excluded from restriction rules until they're added to gamedata

## Miscellaneous

- Use `rngChoice(array)` from `@helpers/rng` for equal-probability random selection
- `BIOME_DATA` in `@interfaces/biome` provides display info (name, description, color) for UI rendering
