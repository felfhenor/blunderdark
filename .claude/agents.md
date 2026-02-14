# Agents Knowledge Base

Reusable patterns and learnings for agents working on Blunderdark.

## Data-Driven ID Policy

- **NEVER hardcode content UUIDs in TypeScript code.** All room IDs, trap IDs, invader IDs, etc. are assigned at build time from YAML. Code must not reference specific content items by their UUID.
- **Use `roomRoleFindById(role)` from `room-roles.ts`** to look up rooms that have special gameplay logic (e.g., `'altar'`, `'throne'`, `'trainingGrounds'`, `'trapWorkshop'`). The `role` field is set in `gamedata/room/base.yml`.
- **Use data fields on `RoomDefinition`** to drive behavior: `timeOfDayBonus`, `biomeBonuses`, `invasionProfile`, `objectiveTypes`, `trainingAdjacencyEffects`, `throneAdjacencyEffects`. Add new optional fields when rooms need new behavior — don't match on IDs.
- **Synergies are defined in `gamedata/synergy/base.yml`**, loaded via `contentGetEntriesByType('synergy')` — not hardcoded in TypeScript.
- **In spec files**, define test-local arbitrary UUID constants — these are not hardcoded production references, they're test fixtures.
- **All gamedata UUIDs must be real v4 UUIDs** — generate with `crypto.randomUUID()` in Node.js.

## Circular Dependency Avoidance

- **Do NOT import from `@helpers/notify` in helper files that have tests.** The `notify.ts` file imports `uiIsPageVisible` from the `@helpers` barrel, which triggers the entire barrel export chain including `state-game.ts` → `defaults.ts` → `rngUuid()`. This causes `ReferenceError: Cannot access '__vite_ssr_import_1__' before initialization` in Vitest.
- **Pattern:** Return data from helper functions and let Angular components call `notifyError()`/`notifySuccess()` instead. This decouples validation from notification and is more testable.

## Content Pipeline

- New content types require 3 things: (1) add to `ContentType` union in `src/app/interfaces/identifiable.ts`, (2) add `ensureX` initializer to `src/app/helpers/content-initializers.ts`, (3) create `gamedata/[type]/` folder with YAML
- Content types retrieved via `contentGetEntry<T>` must use `T & IsContentItem` to satisfy type constraint
- Build script auto-discovers new folders in `gamedata/` — no script changes needed
- `public/json/` is gitignored (generated output) — only commit YAML source files
- Empty YAML files cause non-fatal "doc is not iterable" errors — pre-existing issue
- Use separate folders for different content types to avoid build script merging issues

## State Management

- Helper functions use pure functions (take state as param, return new state) — consistent immutable pattern
- **Computed signals** for derived state: `floorCurrent`, `floorCurrentBiome`, etc.
- **Default to safe values**: use `??` operator (e.g., `floor?.biome ?? 'neutral'`)
- `updateGamestate()` is async and handles both tick-mode and direct signal updates
- `migrateGameState()` uses `merge()` from es-toolkit, but complex state (resources, floors) needs explicit migration functions
- **Array fields need explicit migration** — `merge()` merges arrays by index (not replace), which corrupts multi-element data like `floors[]`. Add a dedicated `migrateX()` function (like `resourceMigrate`, `floorMigrate`) and call it after `merge()` in `migrateGameState()`
- When adding fields to `GameStateWorld`, also update `worldgen.ts` return value and `defaults.ts`
- When adding fields to `GameStateClock`, also update `defaults.ts` clock section
- The gameloop mutates `state.clock` in-place within the `updateGamestate` callback — safe because it operates on the tick-local copy
- `signalIndexedDb` auto-persists on `set()`/`update()` — no manual save needed

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
2. Create setter/getter functions (e.g., `worldSetStartingBiome()`)
3. If the option needs resolution (like 'random' -> actual value), add a resolve function
4. Call the resolve function in `worldgenGenerateWorld()` and pass to relevant defaults

## Game Time & Events

- `GAME_TIME_TICKS_PER_MINUTE = 5` — each tick = 12 seconds of game time; at 1x speed (~1 tick/sec), 1 real minute ≈ 12 game minutes
- `gameTimeAdvance()` is a pure function in `game-time.ts` — takes `GameTime` and numTicks, returns new `GameTime` with correct rollover
- Computed signals (`gameTimeDay`, `gameTimeHour`, `gameTimeMinute`, `gameTimeFormatted`) read directly from `gamestate().clock`
- `gameEventSchedule(triggerTime, callback)` in `game-events.ts` registers one-shot time triggers; recurring events re-register in their callback
- `gameEventTimeToMinutes()` converts `GameTime` to total minutes for comparison (Day 1 = minute 0)
- `gameEventProcess()` separates toFire/remaining before executing — safe if callbacks schedule new events

### RxJS Event Pattern

For cross-cutting events (level-ups, season transitions, notifications):

1. Create a `Subject` in the helper file
2. Export a read-only observable (e.g., `reputationLevelUp$`)
3. Subscribe in service `init()` method for UI reactions

## Grid System

- Grid tiles use `[y][x]` indexing (row-major) — be careful with coordinate order
- `roomShapeGetAbsoluteTiles()` from room-shapes.ts converts shape-relative tiles to grid-absolute coordinates
- For grid tile lookup in templates, use a `Set<string>` of "x,y" keys for O(1) lookup vs O(n) array scan

### Adding Fields to GridTile

1. Update `GridTile` type in `src/app/interfaces/grid.ts`
2. Update `gridCreateEmpty()` in `grid.ts` with the new field's default
3. Fix `toEqual` assertions in `grid.spec.ts` that check tile structure
4. Update ALL GridTile object literals across helpers: `room-placement.ts`, `hallways.ts`
5. Update ALL GridTile object literals across spec files: `grid.spec.ts`, `hallway-placement.spec.ts`, `hallways.spec.ts`, `room-placement.spec.ts`, `room-removal.spec.ts`, `traps.spec.ts` — use `replace_all` on the `hallwayId: undefined, connectionType:` pattern for efficiency
6. If adding a new `TileOccupant` value, update the union type in `grid.ts`

### Adding Fields to GameStateWorld

When adding a field to `GameStateWorld` (e.g., `stairs: StairInstance[]`):
1. Add to `GameStateWorld` interface in `state-game.ts`
2. Add default in `defaultGameState()` in `defaults.ts`
3. Add to `worldgenGenerateWorld()` return in `worldgen.ts`
4. Add to ALL `makeGameState()` / world object literals in spec files (~10 files): `breeding-pits.spec.ts`, `dark-forge.spec.ts`, `production.spec.ts`, `research-progress.spec.ts`, `research-unlocks.spec.ts`, `spawning-pool.spec.ts`, `summoning-circle.spec.ts`, `torture-chamber.spec.ts`, `training.spec.ts`, `trap-workshop.spec.ts`
5. Migration handled automatically by `merge(defaultGameState(), state)` in `migrate.ts`

### Cross-Floor Feature Pattern (Stairs/Elevators/Portals)

For features spanning multiple floors:
1. Store globally in `GameStateWorld` (not per-floor) since they span two floors
2. Mark grid tiles on BOTH connected floors via the per-floor grid
3. Use `verticalTransportFloorsAreConnected()` for connectivity (BFS on unified graph)
4. Use `verticalTransportCalculateTravelTicks()` for optimal travel time (Dijkstra on weighted graph)
5. Gate cross-floor inhabitant assignment on connectivity
6. Travel speeds: stairs=5 ticks/floor, elevators=3 ticks/floor, portals=0 ticks
7. Filter traveling inhabitants from production calculations
8. Process travel ticks in gameloop alongside other tick-based processes

### Vertical Transport Helpers

- `vertical-transport.ts` — unified graph-based connectivity and travel time for stairs + elevators + portals
- `elevators.ts` — elevator placement, extension (add floor), shrink (remove floor), removal
- `portals.ts` — 2-step portal placement (source → destination), portal removal
- `stairs.ts` — stair placement and removal (adjacent floors only, same grid position)

### Multi-Mode Placement (Avoiding Circular Dependencies)

When multiple placement modes are mutually exclusive (stairs, elevators, portals, rooms, hallways):
- **Do NOT have helper files import each other's exit functions** — this creates circular deps
- **Handle mutual exclusion at the UI layer** (e.g., `panel-floor-selector` component) by calling the previous mode's exit function before entering a new mode
- **Exception:** One-way dependencies are OK (e.g., `portals.ts` can import `elevatorPlacementExit` since portals depend on elevators but not vice versa)

### Adding Fields to Floor Type

1. Add to interface in `src/app/interfaces/floor.ts`
2. Add default in `defaultFloor()` in `src/app/helpers/defaults.ts`
3. Add migration in `floorMigrate()` in `src/app/helpers/floor.ts` (`saved.field ?? base.field`)
4. Update ALL `makeFloor()` helpers in spec files (~15 files) to include the new field
5. No changes needed to `worldgen.ts` if it uses `defaultFloor()`

## Room Rotation System

- `Rotation` type is `0 | 1 | 2 | 3` (0°, 90°, 180°, 270° clockwise) — defined in `room-shape.ts`
- `PlacedRoom.rotation?: Rotation` — optional field (0 is default), stored on placed rooms for grid reconstruction
- `roomShapeRotateTile90(tile, height)` rotates a single point 90° CW: `(x, y) → (h-1-y, x)` — pure function in `room-shapes.ts`
- `roomShapeRotateTiles(tiles, w, h, rotation)` applies N 90° rotations, swapping w/h each step — returns `{ tiles, width, height }`
- `roomShapeGetRotated(shape, rotation)` returns a new RoomShape with rotated tiles — returns original for rotation 0
- `roomShapeResolve(placedRoom)` now applies `placedRoom.rotation` — all downstream systems (production, adjacency, connections) automatically handle rotated rooms
- `roomPlacementRotation` signal tracks current rotation during placement; `roomPlacementRotate()` increments by 1 (mod 4) and updates the preview shape
- `roomPlacementEnterMode()` stores the base (unrotated) shape internally; rotation always applies to the base shape, not incrementally
- R key and right-click rotate during placement; Escape exits placement mode
- `throne-room.ts` uses `contentGetEntry<RoomShape>()` directly instead of `roomShapeResolve()` — safe because the Throne Room's 3x3 square shape is rotationally symmetric

## Room & Production System

- `PlacedRoom` type in `room-shape.ts` includes `roomTypeId` linking to the content definition — when adding fields to this type, update all test PlacedRoom literals in `room-shapes.spec.ts`
- `RoomDefinition` type in `room.ts` includes `production: RoomProduction`, `requiresWorkers: boolean`, `adjacencyBonuses: AdjacencyBonus[]`, `isUnique: boolean`, `maxInhabitants: number` (-1 = unlimited), `inhabitantRestriction: string | undefined`, `fearLevel: number | 'variable'`
- When adding fields to `RoomDefinition`, also update `ensureRoom()` in `content-initializers.ts` with defaults — the initializer is what populates missing fields from YAML
- `roomPlacementIsUniqueTypePlaced(floors, roomTypeId)` checks all floors for an existing room of that type — used for dungeon-wide unique constraint enforcement
- `roomPlacementPlacedTypeIds` computed signal exposes the set of room type IDs placed across all floors — reactive for UI bindings
- Unique room enforcement is at the data level (`roomPlacementExecute`) and the UI level (`panel-room-select` disables button with tooltip)
- `productionGetBase(roomTypeId)` returns `{}` for rooms with no production or non-existent room types — callers don't need to handle undefined
- `productionGetRoomDefinition(roomTypeId)` returns `undefined` for non-existent types — callers must check
- Room YAML lives in `gamedata/room/base.yml` — 13 rooms defined with varying production rates, costs, and adjacency bonuses
- `productionCalculateInhabitantBonus(placedRoom, inhabitants)` returns `{ bonus, hasWorkers }` — bonus is additive sum of `(workerEfficiency - 1.0)` + `production_bonus` trait effectValues per assigned inhabitant
- `InhabitantDefinition` content type is `'inhabitant'` — loaded from `gamedata/inhabitant/base.yml` via ContentService; includes `restrictionTags: string[]` for room assignment restrictions
- `restrictionTags` on `InhabitantDefinition` matches against `inhabitantRestriction` on `RoomDefinition` — if restriction is null, any inhabitant allowed; otherwise tag must be in the array
- When adding fields to `InhabitantDefinition`, also update `ensureInhabitant()` in `content-initializers.ts` with defaults
- `inhabitantCanAssignToRoom(def, roomDef, assignedCount)` checks restriction then capacity; `inhabitantGetEligible(allDefs, roomDef)` filters to eligible definitions
- `inhabitantAssignToRoom(instanceId, roomId, roomTypeId)` enforces restrictions at the data level before updating state; `inhabitantUnassignFromRoom(instanceId)` clears assignedRoomId
- `rulerBonuses: Record<string, number>` on `InhabitantDefinition` defines dungeon-wide bonuses for unique rulers — keys are bonus types (attack, fear, researchSpeed, fluxProduction, corruptionGeneration, invaderMorale), values are percentage modifiers
- `throne-room.ts` helper: `throneRoomFind(floors)` uses `roomRoleFindById('throne')` to locate the throne, `throneRoomGetSeatedRulerInstance(floor, roomId)` finds the assigned inhabitant, `throneRoomGetActiveRulerBonuses(floors)` returns the seated ruler's bonus record
- Unique ruler creatures (Dragon, Lich, Demon Lord) are tier 4 with `restrictionTags: ['unique']` — they have `rulerBonuses`, `rulerFearLevel`, but empty `traits` since their bonuses are dungeon-wide, not room-specific
- `rulerFearLevel: number` on `InhabitantDefinition` — the fear level this ruler provides (Dragon=4, Lich=3, Demon Lord=5); `throneRoomGetFearLevel(floors)` returns null if no throne, 1 (THRONE_ROOM_EMPTY_FEAR_LEVEL) if empty, or ruler's value
- TypeScript `Record<string, number>` properties must use bracket notation (`bonuses['attack']`) not dot notation in strict mode — TS4111 error otherwise
- `throneRoomGetPositionalBonuses(floors)` returns `ThronePositionalBonuses` — checks adjacent rooms for `throneAdjacencyEffects.goldProductionBonus` (data-driven, set in YAML), and checks central placement for ruler bonus multiplier
- `throneRoomIsRoomCentral(anchorX, anchorY, shapeWidth, shapeHeight, gridSize, threshold)` — pure function using Manhattan distance from room center to grid center; threshold=5 for Throne Room
- Room shape resolution in throne-room.ts uses `contentGetEntry<RoomShape & IsContentItem>(shapeId)` — in tests, put shapes into `mockContent` Map and the mock `contentGetEntry` returns them
- `adjacencyAreRoomsAdjacent` from `adjacency.ts` checks edge-sharing (not diagonal) — used for vault adjacency detection
- `workerEfficiency` of 1.0 = 0% bonus; only `production_bonus` effectType traits contribute to production bonuses; other trait types (defense_bonus, trap_bonus) are ignored
- `productionCalculateAdjacencyBonus(placedRoom, adjacentRoomIds, allPlacedRooms)` returns additive bonus from gamedata adjacency rules — caller provides adjacentRoomIds from AdjacencyMap
- `productionGetActiveAdjacencyBonuses(placedRoom, floor)` returns `ActiveAdjacencyBonus[]` with sourceRoomId, sourceRoomName, bonus, description — used for UI display of which adjacent rooms contribute bonuses
- `AdjacencyBonus` type has `description: string` field — displayed in tooltips; `ensureRoom()` defaults missing descriptions to empty string
- `productionCalculateConditionalModifiers(placedRoom, inhabitants)` returns multiplicative modifier from inhabitant states — scared=0.5, hungry=0.75, normal=1.0; unique states only (Set dedup)
- Production formula: `Final = Base * (1 + inhabitantBonus + adjacencyBonus) * conditionalModifier`
- `PlacedRoom.appliedUpgradePathId?: string` tracks the chosen upgrade — optional field so existing PlacedRoom literals in tests don't break
- `room-upgrades.ts` helper: `roomUpgradeCanApply()` enforces mutual exclusivity (one upgrade per room), `roomUpgradeApply()` returns new PlacedRoom, `roomUpgradeGetAppliedEffects()` returns effects array
- Upgrade effect types: `productionMultiplier` (scales base production), `maxInhabitantBonus` (adds to capacity), `fearReduction` (reduces fear level), `secondaryProduction` (adds new resource output)
- Room YAML upgrade paths are defined in YAML data only, never referenced by code

### Tile-Level A* Pathfinding

- `tilePathfindingFindPath(grid, start, end)` — A* on GridState with Manhattan heuristic, binary min-heap; returns `TileOffset[] | null`
- `tilePathfindingFindRoomToRoomPath(floor, roomAId, roomBId)` — finds shortest empty-tile path between room edges; evaluates all edge-adjacent empty tile pairs; prefers fewer turns on equal-length paths
- Uses `getRoomTilesFromGrid(grid, roomId)` to read room tiles directly from GridState (avoids content service dependency, keeping functions pure and testable without mocks)
- Separate from room-level graph pathfinding (`pathfindingFindPath`) which uses Dijkstra on `DungeonGraph` nodes
- Both tile-level functions live in `pathfinding.ts` alongside the room-level functions
- `heapPush`/`heapPop` are private min-heap helpers with f-score primary sort and tie-breaker secondary sort

### Hallway Cost System

- `HALLWAY_PLACEMENT_COST_PER_TILE = 5` (Crystals) — defined in `hallway-placement.ts`
- `calculateHallwayCost(path)` — pure function: `path.length * 5`
- `hallwayPlacementPreviewCost` — computed signal using `calculateHallwayCost`
- `hallwayPlacementCanAfford` — computed signal using `resourceCanAfford({ crystals: cost })`
- `hallwayPlacementConfirm()` — deducts crystals via `resourcePayCost` before creating hallway
- **Direct adjacency connections are free** — `connectionAddToFloor` has no resource logic

### Room Placement

- `roomPlacementPlaceOnFloor(floor, room, shape)` — pure function that validates placement, marks grid tiles, and adds room to floor. Returns updated Floor or null
- `roomPlacementRemoveFromFloor(floor, roomId, shape)` — pure function that clears grid tiles and removes room. Takes shape as parameter to stay pure/testable
- `roomPlacementPlace(roomTypeId, shapeId, anchorX, anchorY)` — async wrapper using `updateGamestate` on current floor
- `roomPlacementRemove(roomId)` — async wrapper resolving shape via content lookup
- Pure functions are testable without mocking gamestate or content — keep data manipulation separate from signal/state access

### Room Placement Mode

- `roomPlacementSelectedTypeId` signal — tracks which room type is selected for placement (null when not in placement mode)
- `roomPlacementEnterMode(roomTypeId, shape)` — sets roomPlacementSelectedTypeId + roomPlacementPreviewShape
- `roomPlacementExitMode()` — clears roomPlacementSelectedTypeId + preview signals
- `roomPlacementExecute(x, y)` — full async flow: validate → check cost → pay → place → returns `{ success, error? }`
- Panel component uses `isSelected(roomId)` to highlight the active room type
- Clicking an already-selected room toggles off placement mode (same click to deselect)
- After successful placement, player stays in placement mode for rapid building (no auto-exit)

### Placement Preview Pattern

The room placement preview system uses module-level signals in `room-placement.ts`:

1. `roomPlacementPreviewShape` signal — set to the RoomShape being placed (null when not placing)
2. `roomPlacementPreviewPosition` signal — updated on mouse hover over grid tiles
3. `roomPlacementPreview` computed — combines shape + position + grid state to produce validated tile list
4. GridComponent uses a `previewTileSet` computed with a `Set<string>` of `"x,y"` keys for O(1) per-tile lookup
5. If ANY tile in the shape is invalid, ALL tiles show red (all-or-nothing validity)
6. Escape key calls `roomPlacementExitMode()` (clears roomPlacementSelectedTypeId + shape + position), then falls back to tile deselection
7. Right-click (`(contextmenu)`) on grid calls `roomPlacementExitMode()` + `event.preventDefault()` to suppress context menu
8. `(mouseleave)` on grid container calls `roomPlacementClearPreviewPosition()` — clears position only (not shape), so preview reappears on re-entry
9. Three levels of clearing: `roomPlacementClearPreviewPosition()` (position only) vs `roomPlacementClearPreview()` (shape + position) vs `roomPlacementExitMode()` (roomPlacementSelectedTypeId + shape + position)

### Room Visual Representation

- Room colors assigned per `roomTypeId` (not per room instance) — all rooms of the same type share a color
- `roomInfoMap` computed signal maps room instance IDs to `{color, name}` for O(1) lookup per tile
- Room name label rendered only on the anchor tile (first tile of the room shape) via `isRoomAnchor(x, y, roomId)`
- CSS custom property `--room-color` passed from template to SCSS for per-room dynamic coloring
- `color-mix(in oklch, var(--room-color) 80%, black)` creates a darker border from the room color

## Altar Room & Auto-Placement

- `altarRoomAutoPlace(floor)` finds all rooms with `autoPlace: true` and places them centered on the grid — called during `worldgenGenerateWorld()`
- `removable: boolean` field on `RoomDefinition` — `roomPlacementIsRemovable(roomTypeId)` in `room-placement.ts` checks this before allowing removal
- `autoPlace: boolean` field on `RoomDefinition` — rooms with `autoPlace: true` are excluded from the build panel and auto-placed during world generation
- `fearReductionAura: number` field on `RoomDefinition` — base aura value, overridden by upgrade `fearReductionAura` effect type
- Altar uses sequential upgrade levels (1→2→3) on the existing mutually-exclusive `appliedUpgradePathId` system — `altarRoomGetLevel()` reads the `upgradeLevel` field from upgrade path definitions, `altarRoomApplyUpgrade()` validates level ordering
- `altarRoomGetEffectiveFearLevel(floor, room, baseFearLevel)` reduces fear for rooms adjacent to the Altar — returns 'variable' unchanged, otherwise clamps to 0
- `altarRoomIsAdjacent(floor, room)` uses `adjacencyAreRoomsAdjacent()` from adjacency.ts — checks edge-sharing between room tiles and Altar tiles
- `panel-altar` component follows same pattern as `panel-throne-room` — shows when selected tile is the Altar, displays level/aura/recruitment/upgrade UI
- When adding new fields to `RoomDefinition`, update defaults in `ensureRoom()` AND update all mock `RoomDefinition` objects in test files (mushroom-grove.spec.ts, inhabitants.spec.ts, etc.)

## Room Removal System

- `room-removal.ts` is the main orchestration helper — `roomRemovalExecute()` handles validation, grid clearing, inhabitant unassignment, and resource refund in one atomic operation
- `roomRemovalCalculateRefund(cost)` returns 50% of each resource rounded down (Math.floor) — pure function, easy to test
- `roomRemovalGetInfo(roomId)` returns a preview of what removal would do (room name, refund, displaced inhabitant names, canRemove flag) — used by the confirmation dialog
- `roomRemovalExecute()` does a single `updateGamestate()` call for grid + inhabitant changes, then separate `resourceAdd()` calls for refund — refund is capped at resource max by `resourceAdd()`
- The removal UI lives in `panel-room-info` component — `canRemoveRoom` computed checks `roomPlacementIsRemovable()`, disabled button shown for non-removable rooms
- SweetAlert2 confirmation dialog uses `[swal]="removeSwal"` + `<swal>` pattern with dynamic `[title]` and `[text]` bindings from computed signals
- `roomPlacementRemoveFromFloor()` preserves hallway data (`hallwayId`, `connectionType`) on tiles when clearing room data — important for tiles that have both room and hallway occupancy

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
- `hallways.ts` has pure helper functions: `hallwayAddToGrid()` marks tiles as `occupied: true, occupiedBy: 'hallway'`, `hallwayAdd()` appends to hallway array
- Hallway data lives on each `Floor` object (`floor.hallways: Hallway[]`), not at world level
- To place a hallway: (1) `resourcePayCost({ crystals: cost })`, (2) create `Hallway` object with `rngUuid()`, (3) `updateGamestate` to update `floor.grid` via `hallwayAddToGrid` and `floor.hallways` via `hallwayAdd`
- `resourceCanAfford()` from resources.ts works inside `computed()` — it reads `gamestate()` internally so Angular tracks the dependency

### Hallway Pathfinding

BFS pathfinding for hallways between rooms:

1. Find empty tiles adjacent to source room (start set) and destination room (end set)
2. BFS from start set through unoccupied tiles to any tile in end set
3. Adjacent rooms (sharing an edge) still have valid hallway paths — the empty tiles around them don't overlap, so BFS finds a route through neighboring empties
4. Block hallway between same room (self-connection returns null)
5. `hallwayPlacementPreviewTileSet` uses `Set<string>` of `"x,y"` keys for O(1) per-tile lookup (same pattern as placement preview)
6. Click handler (`hallwayPlacementHandleTileClick`) uses step-based state machine: `selectSource → selectDestination → preview`
7. In preview step, clicking a different room updates destination (re-pathfinds)

## Floor Navigation

- `PanelFloorSelectorComponent` in `panel-floor-selector/` — sidebar panel for floor selection, creation, and detail viewing
- `PanelFloorMinimapComponent` in `panel-floor-minimap/` — minimap overview of all floors with simplified CSS grid (3px tiles)
- Floor indicator ("Floor X / Y") in `game-play.component.html` resource bar area
- PageUp/PageDown keyboard shortcuts on `GamePlayComponent` via `host` bindings — navigate floors by index
- Grid only renders `floorCurrent()` — non-active floors are never in the DOM (signal-driven, no explicit `@if` needed)
- Floor entries in selector show depth number, biome icon, floor name, and room count
- No global "invasion is active" signal exists yet — keyboard shortcut invasion-mode disable deferred

## Connection System

- Connections stored per-floor in `Floor.connections: Connection[]` — bidirectional links between adjacent rooms
- `Connection` type: `{ id, roomAId, roomBId, edgeTiles: TileOffset[] }`
- Query functions use `floorCurrent()` and iterate connections — no adjacency map needed for connections (they're explicit, not geometric)
- When adding fields to `Floor` type, update: (1) `defaultFloor()`, (2) `floorMigrate()`, (3) all `makeFloor()` test helpers in spec files
- `connectionAddToFloor` returns null for duplicates — always check return value
- `connectionValidate(floor, roomAId, roomBId)` checks: self-connection, room existence, adjacency, duplicates — returns `{ valid, error?, edgeTiles? }`
- `connectionCreate(roomAId, roomBId)` validates internally and auto-computes edge tiles — no `edgeTiles` param needed
- Edge tiles are computed via `adjacencyGetSharedEdges(tilesA, tilesB)` from adjacency.ts — returns `[tileFromA, tileFromB]` pairs
- `connectionGetAdjacentUnconnected(floor, roomId)` — returns IDs of adjacent rooms without an existing connection
- `connectionGetRoomConnections(floor, roomId)` — returns Connection[] for all connections involving a room
- Production system uses geometric adjacency (tile positions) NOT the connection system for adjacency bonuses — connections are a separate layer for logical linking

## UI Patterns

- **NEVER use inline styles** — do not use `[style.property]="value"` or `[style]="string"` in templates. Use Tailwind classes for static values (e.g., `text-white` instead of `[style.color]="'white'"`). For dynamic values, use CSS custom properties: set via `[style.--my-var]="dynamicValue"` in the template, consume via `var(--my-var)` in SCSS. This applies to all style properties including `width`, `height`, `background-color`, `border-color`, `grid-column`, etc.
- DaisyUI progress bars use classes like `progress-error`, `progress-warning`, etc.
- Theme variables: `var(--b3)`, `var(--p)`, `var(--s)`, `var(--pf)`
- OKLCH color format works in Angular SCSS — the compiler converts them to browser-compatible formats
- **Prefer CSS variables over raw oklch values** — use DaisyUI vars (`--su`, `--wa`, `--er`, `--in`, `--p`, `--b2`, `--bc`, `--n`, `--nc`, etc.) via `oklch(var(--su))` for status colors, backgrounds, and borders. Only use raw oklch for deliberate visual effects (corruption purple overlays, room color palettes) or specific shades with no DaisyUI equivalent (e.g., orange between warning and error). Use fallbacks for content color vars: `oklch(var(--suc, 0.9 0.05 145))`
- SweetAlert2 pattern: `[swal]="templateRef"` on button + `<swal>` element with `(confirm)` event handler
- Angular view encapsulation adds attribute selectors — manual class additions in browser console won't match scoped styles
- `@ngneat/hotkeys` provides global keyboard shortcuts: `[hotkeys]="'SPACE'"` with `isGlobal` directive attr, `(hotkey)` event handler
- **Tooltips**: Use `@ngneat/helipopper` (`TippyDirective`) for all tooltips — never hand-roll tooltip logic with `setTimeout`, DOM manipulation, or manual positioning, and never use the HTML `title` attribute. Pattern: `[tp]="templateRef"` on the trigger element + `<ng-template #templateRef>` for rich content, or `[tp]="'string'"` for plain text. Use `[tpDelay]="250"` for hover delay and `[tpClassName]="'game-tooltip'"` for the dark theme. See `icon-skill.component` for the canonical example with `ng-template`.
- `appRequireSetup` / `appRequireNotSetup` directives show/hide elements based on setup state
- Navbar component already has pause button, pause menu (ESC), Space bar toggle — check before re-implementing
- Panel components follow card pattern: `card bg-base-100 shadow-xl` → `card-body p-4` → `card-title text-sm` for headers
- Panel components conditionally render using a computed signal (e.g., `throneRoom()` returns null if not relevant) and wrapping template in `@if`
- `panel-throne-room` component shows when a Throne Room tile is selected — reads from `gridSelectedTile()`, `floorCurrent()`, then finds the room via `roomRoleFindById('throne')`
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

Always use CSS custom properties for dynamic values — never set CSS properties directly via `[style.property]`. Set the variable in the template and consume it in SCSS:

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
  <div class="shape-tile" [style.--tile-col]="tile.x + 1" [style.--tile-row]="tile.y + 1"></div>
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

.shape-tile {
  grid-column: var(--tile-col);
  grid-row: var(--tile-row);
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
3. UI components handle the reverse direction: `selectRoom()` calls `hallwayPlacementExit()` before `roomPlacementEnterMode()`
4. Grid component's Escape/right-click handlers check modes in priority order (hallway first, then room placement, then deselect)
5. This avoids circular dependencies between helper files

## Adding Generic Rooms

- **Generic rooms (non-unique, no special logic) only need YAML changes** — the existing placement, production, adjacency, and upgrade systems are fully data-driven. No helper code or component changes are needed.
- Room production values in YAML are **per tick**. To get per-minute rate, multiply by `GAME_TIME_TICKS_PER_MINUTE` (5). Example: 8 Food/min = `food: 1.6` in YAML.
- Adjacency bonuses in YAML reference room names (the build script auto-resolves names to UUIDs via `rewriteDataIds`).
- Room definitions live in `gamedata/room/base.yml`; room shapes in `gamedata/roomshape/base.yml`
- If a room references a shapeId that doesn't exist, create the shape first — the build will succeed but the room won't render
- `workerEfficiency` affects production via `totalBonus += workerEfficiency - 1.0` — a skeleton with `workerEfficiency: 0.7` applies a -0.3 penalty
- `fearIncrease` is a valid upgrade effect type for room upgrades — data-only for now, will be wired when fear system is implemented
- Test pattern for room-specific specs: mock `@helpers/content` with inline room/shape/inhabitant data, then test production, adjacency, upgrades via imported helper functions
- Passive rooms (`requiresWorkers: false`) still apply worker bonuses/penalties if inhabitants are assigned — `productionCalculateInhabitantBonus` runs regardless of `requiresWorkers`, which only controls the "zero workers = zero production" gate
- Reuse existing shapes when possible rather than creating duplicates

## Production & Upgrade Integration

- **Upgrade effects are NOT yet wired into production calculations** — `productionMultiplier` and `secondaryProduction` upgrade effects from `room-upgrades.ts` are defined but not applied in `productionCalculateTotal()` or `productionCalculateSingleRoom()`. This needs to be done when upgrade UI is implemented.
- `productionProcess(state)` in `gameloop.ts` is the entry point — called every tick, sums all room production, adds to resources capped at max
- `productionRates` is a computed signal that recalculates whenever `gamestate().world.floors` changes — used by `PanelResourcesComponent` for live rate display
- `productionCalculateTotal(floors)` builds adjacency maps on-the-fly per floor using `roomShapeResolve` + `roomShapeGetAbsoluteTiles` + `adjacencyAreRoomsAdjacent`
- TypeScript requires bracket notation for `Partial<Record<string, number>>` index access: `production['crystals']` not `production.crystals`
- `Object.entries()` on `Partial<Record<string, number>>` returns `[string, number | undefined][]` — must check `!amount` before comparisons
- `productionPerMinute(perTickRate)` — multiply by `GAME_TIME_TICKS_PER_MINUTE` (5) for display
- Formula: `final = base * (1 + inhabitantBonus + adjacencyBonus) * stateModifier * envModifier`
- Test pattern: use `depth: 0` and `biome: 'neutral'` in makeFloor for tests that don't test env modifiers
- Importing `gamestate` from `@helpers/state-game` in helper files is safe — no circular dependency with the production module chain

### Efficiency Calculation System

- `efficiency.ts` imports `productionGetRoomDefinition` from `production.ts` (one-way, safe) — do NOT import from efficiency.ts in production.ts to avoid circular dependency
- `productionCalculateInhabitantBonus` in production.ts already handles trait-room matching via `targetResourceType` — efficiency.ts provides a separate breakdown for UI display
- Trait-room matching: traits with `targetResourceType` only apply when the room produces that resource; `undefined` or `'all'` traits apply to any room
- `InhabitantTrait` has optional `targetResourceType?: string` field — existing traits without it always apply (backwards compatible)
- `efficiencyCalculateRoom(room, inhabitants)` returns per-inhabitant breakdown for UI, while `productionCalculateInhabitantBonus` returns a single bonus number for production

## Inhabitant Capacity & Assignment

- `roomUpgradeGetEffectiveMaxInhabitants(placedRoom, roomDef)` in `room-upgrades.ts` returns base + `maxInhabitantBonus` from upgrade effects — returns -1 for unlimited
- `inhabitantCanAssignToRoom(def, roomDef, count, placedRoom?)` accepts optional `PlacedRoom` to use effective capacity from upgrades; without it, falls back to `roomDef.maxInhabitants`
- `inhabitantAssignToRoom()` searches `state.world.floors` to find the `PlacedRoom` by room ID — this is necessary because `PlacedRoom` lives on `Floor.rooms`, not on `GameStateWorld` directly
- **Inhabitants exist in two places:** `GameStateWorld.inhabitants` (used by inhabitant management functions) and `Floor.inhabitants` (used by production, throne room, and UI panels) — be careful which you query
- `panel-room-info` component shows inhabitant count, assigned list with Remove buttons, and eligible unassigned inhabitants with Assign buttons — only for rooms with `maxInhabitants !== 0`
- When mocking `room-upgrades` in `inhabitants.spec.ts`, use `vi.mock('@helpers/room-upgrades')` to control `roomUpgradeGetEffectiveMaxInhabitants` return values without needing the content system

## Assignment System

- `assignment.ts` helper: `assignmentCanAssignToRoom(roomId)` returns `AssignmentValidation` with allowed/reason/currentCount/maxCapacity — handles room lookup across floors, room type lookup, effective capacity from upgrades
- `assignmentGetRoomInfo(roomId)` returns `{ currentCount, maxCapacity }` or null — lighter version for UI indicators
- `assignmentGetCount(roomId)` and `assignmentIsInhabitantAssigned(instanceId)` — simple query helpers
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
- Uses `gamestate().world.inhabitants` directly (not `floorCurrent().inhabitants`) since roster is dungeon-wide, not floor-scoped
- `allEntries` computed builds `RosterEntry[]` with instance, definition, and resolved room name — maps over `gamestate().world.inhabitants` and looks up defs via `contentGetEntry`
- Room name resolution: iterate `state.world.floors` to find the room matching `assignedRoomId`, then `productionGetRoomDefinition()` for the name
- Filter tabs use signal + computed pattern: `activeFilter` signal drives `filteredEntries` computed
- Detail view uses `selectedInhabitantId` signal; `availableRooms` computed lists all rooms with `maxInhabitants !== 0` and their `assignmentCanAssignToRoom` status
- For reassignment from roster: unassign first, then assign — `inhabitantAssignToRoom` rejects already-assigned inhabitants
- Panel placed in sidebar between floor-selector and room-info panels for easy access

## Inhabitant Recruitment System

- `recruitment.ts` helper: `recruitmentRecruit(def)` handles validation (altar check, roster limit, tier gate, affordability), cost deduction via `resourcePayCost()`, and instance creation via `inhabitantAdd()` in one async call
- `recruitmentGetRecruitable()` returns all non-unique inhabitant definitions sorted by tier then name — filters out `restrictionTags: ['unique']` (rulers)
- `recruitmentGetShortfall(cost, resources)` is a pure function taking cost and resources as params — avoids `computed()` issues in Vitest
- `RECRUITMENT_DEFAULT_MAX_INHABITANTS = 50` — configurable roster cap; `recruitmentIsRosterFull` computed signal checks `inhabitants.length >= max`
- `recruitmentUnlockedTier` computed signal returns `1` — placeholder for future progression system (research/upgrades)
- Recruitment UI lives in `panel-altar` component (not a separate component) — the Altar panel expands to show recruitable inhabitants when the altar is selected
- `RecruitableEntry` type bundles def, affordable flag, locked flag, shortfall, and costEntries for efficient template binding
- When testing `recruitment.ts`, mock `altarRoomCanRecruit` as a simple function `() => mockHasAltar` — Angular `computed()` signals at module level don't work in Vitest, so test only the pure functions via `await import()`
- `IsContentItem` type has `__type` but NOT `__key` — don't add `__key` to test mock objects

## Resource UI Display

- `PanelResourcesComponent` is a horizontal bar at the **top** of the game-play page (not in the sidebar) — wraps the game-play container in a flex-col with the resource bar above the sidebar+grid row
- `productionBreakdowns` computed signal in `production.ts` returns `Record<string, ResourceProductionBreakdown>` with per-resource-type breakdown (base, inhabitantBonus, adjacencyBonus, modifierEffect, final)
- Rich tooltips use custom CSS absolute positioning with a delay timer (250ms) — DaisyUI's `data-tip` tooltips only support plain text, so custom implementation is needed for HTML content
- Warning thresholds: `LOW_THRESHOLD = 0.2`, `CRITICAL_THRESHOLD = 0.1` — configurable constants, not hardcoded inline
- Production breakdown math: `inhabitantContrib = base * inhabitantBonus`, `adjacencyContrib = base * adjacencyBonus`, `modifierEffect = withBonuses * (modifier - 1)`
- Food warning banner uses `hungerGetWarningLevel()` and `hungerCalculateTotalConsumption()` from hunger.ts — computes estimated minutes remaining from `food / consumptionPerTick / GAME_TIME_TICKS_PER_MINUTE`
- Dismissible warnings use a signal + setTimeout pattern: `dismissFoodWarning()` sets signal to true, then resets after 60s

## Fear/Hunger UI Indicators

- `FearIndicatorComponent` in `src/app/components/fear-indicator/` — accepts `roomId` input, renders color-coded badge (Low=green, Medium=yellow, High=orange, VeryHigh=red), hides at fear 0
- `HungerIndicatorComponent` in `src/app/components/hunger-indicator/` — accepts `inhabitantId` input, renders state badge (Hungry=yellow, Starving=red, Inappetent=gray), hides when fed/normal
- Both use signal-based tooltip mechanism with 250ms delay (matching `panel-resources` pattern)
- Fear indicators are placed on grid anchor tiles at `top: 2px; right: 2px` via `.fear-grid-badge` CSS class in `grid.component.scss`
- Hunger indicators are placed inline next to inhabitant names in `panel-room-info.component.html`
- Both components read from existing computed signals (`fearLevelBreakdownMap`, `gamestate().world.inhabitants`) — no new state management needed
- Grid imports `FearIndicatorComponent`; `panel-room-info` imports `HungerIndicatorComponent` — no changes to `game-play.component.ts` needed since they're child components of already-imported parents

## Synergy Detection System

- `synergy.ts` implements a data-driven synergy system — synergy definitions are loaded from `gamedata/synergy/base.yml` via `contentGetEntriesByType('synergy')`
- 5 condition types: `roomType`, `adjacentRoomType`, `connectedRoomType`, `inhabitantType`, `minInhabitants` — evaluated per-room using pure functions
- `synergyEvaluateAll(floors, synergies?)` returns `Map<string, SynergyDefinition[]>` mapping roomId → active synergies — builds adjacency map internally per floor
- `synergyActiveMap` computed signal caches results, re-evaluates when `gamestate()` changes — no explicit invalidation needed
- `synergyGetActive(roomId)` convenience function reads from the computed signal
- To add new synergies, add entries to `gamedata/synergy/base.yml` — no code changes needed
- Connection-based conditions use `floor.connections` directly (pure) — don't import `connectionAreConnected` from connections.ts which reads from signals
- Synergies are floor-scoped (no cross-floor evaluation) — same pattern as adjacency bonuses

### Synergy Tooltip Pattern

- `SynergyTooltipComponent` is a sidebar panel (not a hover tooltip) that reads `gridSelectedTile()` and `floorCurrent()` via computed()
- Builds adjacency map internally (same pattern as production.ts) to evaluate synergies for the selected room
- `synergyGetPotentialForRoom()` filters synergies where roomType matches but other conditions aren't met — returns missing conditions as human-readable strings
- `synergyFormatEffect()` formats effect values for display (e.g., "+15% crystals production")
- `describeCondition()` uses `productionGetRoomDefinition()` from production.ts to get room names for condition descriptions
- When testing `synergy.ts` functions that import from `@helpers/production`, add `vi.mock('@helpers/production')` to provide `productionGetRoomDefinition` — the mock must be placed before imports (hoisted by vitest)

## Training System

- `training.ts` helper: `trainingProcess(state)` runs each tick inside `updateGamestate` — mutates `state.world.inhabitants` in-place (same pattern as `productionProcess` mutating `state.world.resources`)
- Training Grounds room is found via `roomRoleFindById('trainingGrounds')` — no hardcoded ID
- `TRAINING_BASE_TICKS = GAME_TIME_TICKS_PER_MINUTE * 5` (25 ticks = 5 game-minutes of training)
- Training fields on `InhabitantInstance` are **optional** (`trained?`, `trainingProgress?`, `trainingBonuses?`) — avoids breaking 13+ spec files that create inhabitant mocks
- `inhabitantDeserialize()` provides defaults for training fields via `??` — backwards-compatible with saved data that predates training
- Training adjacency effects are data-driven via `trainingAdjacencyEffects` field on `RoomDefinition` — `timeReduction` reduces training time, `statBonus` adds to all training stats. Set in `gamedata/room/base.yml` on rooms like Barracks and Altar.
- `trainingGetAdjacentRoomTypeIds(room, floor, tileMap?)` returns a Set of adjacent room type IDs — reusable for any room-specific adjacency checks
- New upgrade effect types: `trainingAttackBonus`, `trainingTimeMultiplier`, `trainingDefenseBonus` — handled in training.ts, transparent to existing room-upgrades.ts
- `trainingCompleted$` observable emits on training completion — subscribe in a service for notifications
- When adding optional fields to shared types (InhabitantInstance), prefer `?:` syntax over required fields to avoid cascade updates across all test files

## Trap System

- Trap definitions in `gamedata/trap/base.yml` — 5 types: Pit, Arrow, Rune, Magic, Fear Glyph
- `TrapDefinition` (content type) vs `TrapInstance` (runtime placed trap) vs `TrapInventoryEntry` (unplaced inventory)
- `TrapInstance` stored per-floor in `Floor.traps: TrapInstance[]` — similar to `Floor.hallways`
- `TrapInventoryEntry[]` stored in `GameStateWorld.trapInventory` — player's unplaced trap stock
- Trap placement: hallway tiles only, max 1 trap per tile, validated via `trapCanPlace(floor, tileX, tileY)`
- Trap trigger: `trapRollTrigger(trap, isRogue, roll)` — deterministic given a roll value for testability
- Rogue disarm: 60% chance to disarm instead of trigger, except `canBeDisarmed: false` traps (Rune Trap)
- Fear Glyph: only trap with `effectType: 'fear'` — applies 10 morale penalty in addition to damage
- `trapProcess(state)` is a no-op hook for future tick-based trap mechanics — traps are event-driven (invasions)
- When adding fields to `Floor` type, must update ALL `makeFloor()` test helpers across ~15 spec files

### Trap Workshop / Crafting Queue System

- `trap-workshop.ts` helper: `trapWorkshopProcess(state)` runs each tick inside `updateGamestate` — mutates crafting queues in-place (same pattern as production/training)
- Trap Workshop room is found via `roomRoleFindById('trapWorkshop')` — no hardcoded ID
- `TRAP_WORKSHOP_BASE_CRAFTING_TICKS = GAME_TIME_TICKS_PER_MINUTE * 3` (15 ticks = 3 game-minutes)
- Crafting queues stored globally in `GameStateWorld.trapCraftingQueues: TrapCraftingQueue[]` (not per-floor)
- Each queue maps to a room by `roomId`, contains an ordered list of `TrapCraftingJob` objects
- Only the first job in each queue progresses each tick (FIFO processing)
- Worker speed bonus: each additional worker beyond first reduces time by 20%, capped at 0.4 multiplier (60% max reduction)
- New upgrade effect types: `craftingSpeedMultiplier`, `craftingCostMultiplier`, `craftingBonusDamage` — handled in trap-workshop.ts
- `trapWorkshopCanQueue(roomId, floors)` validates: room is Trap Workshop, has at least 1 assigned inhabitant
- When mocking `@helpers/content` in trap-workshop tests, provide both `contentGetEntriesByType` and `contentGetEntry` mocks

### Spawning Pool System

- `spawning-pool.ts` helper: `spawningPoolProcess(state)` runs each tick inside `updateGamestate` — creates inhabitants automatically on a timer
- File-to-prefix: `spawning-pool.ts` → `spawningPool` / `SPAWNING_POOL`
- Spawning Pool room is found via `roomRoleFindById('spawningPool')` — no hardcoded ID
- `SPAWNING_POOL_DEFAULT_RATE = GAME_TIME_TICKS_PER_MINUTE * 5` (25 ticks = 5 game-minutes between spawns)
- Timer state stored on `PlacedRoom.spawnTicksRemaining?: number` — per-room instance state, not global
- Room config stored on `RoomDefinition`: `spawnRate?: number`, `spawnType?: string`, `spawnCapacity?: number` — data-driven from YAML
- Capacity checks unassigned inhabitants globally (not per-pool) — `spawningPoolCountUnassigned()` filters `assignedRoomId === undefined`
- `spawningPoolCreateInhabitant(def)` creates full `InhabitantInstance` with random name suffix via `rngChoice()`
- After spawning, `floor.inhabitants` must be synced with `state.world.inhabitants` — same dual-location pattern as hunger system
- `spawningPoolSpawn$` observable emits `SpawningPoolEvent` for notifications — same RxJS Subject pattern as training/corruption
- Upgrade effect types: `spawnRateReduction` (reduces timer), `spawnCapacityBonus` (increases max unassigned), `spawnTypeChange` (switches to Skeleton)
- Content lookup uses spawn type name (e.g., 'Goblin', 'Skeleton') via `contentGetEntry()` — names must match inhabitant definition names in YAML
- When mocking for tests: mock `@helpers/content`, `@helpers/room-roles`, `@helpers/rng`; register room def, inhabitant defs by name in mockContent Map

## Invader System

- Invader definitions in `gamedata/invader/base.yml` — 6 classes: Warrior, Rogue, Mage, Cleric, Paladin, Ranger
- `InvaderDefinition` (content type) vs `InvaderInstance` (runtime with HP, status effects, ability states)
- `InvaderInstance.abilityStates: AbilityState[]` — reuses the same AbilityState type from combat system
- `InvaderInstance.statusEffects: StatusEffect[]` — tracks named effects with durations (shielded, marked, courage, etc.)
- `invaderResolveAbility(invader, ability, targetIds, rng)` — pure function returning `AbilityResult | undefined`
- Invader abilities are CombatAbility entries referencing AbilityEffectDefinition by name via `effectType`
- **Mock content collision warning**: When mocking `@helpers/content` in tests, do NOT register abilities by name if effect names overlap (e.g., "Scout" effect vs "Scout" ability) — register abilities by ID only
- `invaderCreateInstance(definition)` looks up ability IDs via `contentGetEntry` to initialize ability states
- Cooldown/status helpers: `invaderApplyCooldown`, `invaderTickCooldowns`, `invaderApplyStatusEffect`, `invaderTickStatusEffects`, `invaderHasStatusEffect`, `invaderClearStatusEffects`, `invaderApplyHealing`

## Pathfinding System

- `pathfinding.ts` helper: `pathfindingBuildDungeonGraph(floor, roomFearLevels)` creates graph from Floor's rooms, connections, and hallways
- `DungeonGraph` uses adjacency list: `Map<string, PathEdge[]>` keyed by room ID
- `PathNode` stores roomId, roomTypeId, x/y (anchor), fearLevel
- `pathfindingFindPath(graph, start, goal, options)` — Dijkstra's algorithm (NOT A\* with Manhattan, because rooms connect at arbitrary distances via hallways making Manhattan inadmissible)
- Fear cost: when `morale < room.fearLevel`, edge cost is `baseCost * fearCostMultiplier` (default 3x)
- `PathfindingOptions`: `morale`, `fearCostMultiplier`, `blockedNodes: Set<string>`
- `pathfindingFindWithObjectives(graph, start, primaryGoal, secondaryObjectives, options)` — detours to secondary if cost < 2x direct path
- `pathfindingRecalculate(graph, current, goal, newBlockedNode, options)` — adds blocked node and re-pathfinds
- Empty path = no valid route (invader enters 'confused' state)
- Both connections and hallways create bidirectional edges with baseCost 1
- Graph is rebuilt when floor state changes (not incremental) — fast enough for ≤400 nodes

## Invasion Systems

### Invasion Trigger System

- `invasion-triggers.ts` helper: `invasionTriggerProcessSchedule(state, rng?)` runs each tick inside `updateGamestate` — mutates `state.world.invasionSchedule` in-place
- `InvasionSchedule` stored in `GameStateWorld.invasionSchedule` — auto-persisted via IndexedDB
- Grace period: 30 days (configurable via `gracePeriodEnd` field), no invasions before it ends
- Escalating intervals: 15 days (day 30-59), 10 days (day 60-99), 7 days (day 100+), minimum 5 days
- Variance: +/- 2 days determined at scheduling time (not re-rolled), cannot push before grace period, min 3 days between invasions
- Warning: fires 2 game-minutes before invasion day start via `notify('Invasion', ...)` — dismissible via `warningDismissed` flag
- Special invasions: `invasionTriggerAddSpecial(schedule, type, currentDay, delay?)` — bypasses normal schedule, types: 'crusade' | 'raid' | 'bounty_hunter'
- Past-due handling: `invasionTriggerShouldTrigger` uses `>=` so loading a save past the scheduled day triggers immediately
- RNG: pass `PRNG` (seedrandom) for testability, defaults to `rngRandom()` in production

### Invasion Composition System

- `invasion-composition.ts` helper: `invasionCompositionCalculateDungeonProfile(state)` → `DungeonProfile` with corruption/wealth/knowledge (0-100), size, threatLevel
- Dungeon profile is built by reading `invasionProfile` field from room definitions (data-driven) — rooms declare their dimension (corruption/wealth/knowledge) and weight in YAML
- Composition weights stored in YAML: `gamedata/invasion/composition-weights.yml` — content type `'invasion'`
- Weight profiles: balanced (all equal), highCorruption (Paladin+Cleric), highWealth (Rogue+Warrior), highKnowledge (Mage+Ranger)
- `invasionCompositionGetWeights(profile, config)` — if any dimension >60, uses corresponding weight profile; multiple highs get averaged
- `invasionCompositionSelectParty(profile, defs, weights, seed)` — pure function returning `InvaderDefinition[]`, testable without content mocks
- Party size: 3-5 (≤10 rooms), 6-10 (11-25 rooms), 11-15 (26+ rooms)
- Constraints: at least 1 warrior, no class >50% of party, balanced profiles have 3+ unique classes
- For statistical composition tests, run 50 iterations and check aggregate ratios (>40% threshold)
- `findLastIndex` not available in target — use manual reverse loop instead

### Invasion Objectives System

- `invasion-objectives.ts` helper: `invasionObjectiveAssign(state, seed)` returns 1 primary (DestroyAltar) + 2 secondary objectives
- Objective eligibility is data-driven via `objectiveTypes` field on `RoomDefinition` — rooms declare which objective types they support in YAML
- Primary objective (DestroyAltar) uses `roomRoleFindById('altar')` to locate the target
- 7 secondary templates: SlayMonster, StealTreasure, DefileLibrary, SealPortal, PlunderVault, RescuePrisoner, ScoutDungeon
- SlayMonster targets tier 2+ inhabitants — must look up `InhabitantDefinition` via `contentGetEntry()` since `InhabitantInstance` has no `tier` field
- `InhabitantInstance` uses `instanceId` (NOT `id`) for targeting
- `invasionObjectiveResolveOutcome(objectives)` — altar destroyed = defeat (multiplier 0); victory = 1.0 + 0.25 per prevented - 0.25 per completed secondary
- When mocking `@helpers/content` for inhabitant tier lookups, use a `Map<string, unknown>` and `registerInhabitantDefs()` helper

### Invasion Win/Loss Conditions

- `invasion-win-loss.ts` helper: pure functions for checking invasion end conditions and resolving results
- Constants: `INVASION_WIN_LOSS_ALTAR_MAX_HP = 100`, `INVASION_WIN_LOSS_MAX_TURNS = 30`, `INVASION_WIN_LOSS_SECONDARY_OBJECTIVES_FOR_VICTORY = 2`
- `InvasionState` type in `invasion.ts` tracks active invasion: turn counter, altar HP, invaders, objectives, defender/invader counts
- `invasionWinLossCheckEnd(state)` returns `InvasionEndReason | undefined` — priority: altar_destroyed > objectives_completed > all_invaders_eliminated > turn_limit_reached
- All state mutations are pure (return new state): `invasionWinLossDamageAltar`, `invasionWinLossAdvanceTurn`, `invasionWinLossMarkKilled`, `invasionWinLossRecordDefenderLoss`, `invasionWinLossEnd`
- `invasionWinLossDamageAltar` auto-updates the DestroyAltar objective progress based on HP percentage

### Invasion Rewards System

- `invasion-rewards.ts` helper: pure functions for reward/penalty calculation, loot rolling, prisoner capture and handling
- Reward formula: +5 base rep, +1 per kill, +3 if all secondaries prevented. Experience = invaderCount _ 10 _ rewardMultiplier
- Penalty formula: 20% gold lost, -3 reputation, +10 crystals +5 essence per completed secondary
- Class-based loot: `CLASS_LOOT` record maps InvaderClassType to gold range + bonus resource
- Prisoner capture: `invasionRewardRollPrisonerCaptures()` with 30% chance per retreating invader
- 5 prisoner handling options (pure functions returning `PrisonerHandlingResult`): Execute, Ransom, Convert, Sacrifice, Experiment
- Altar rebuild cost: 100 crystals + 50 gold + 20 flux

### Turn-Based Invasion Combat

- `invasion-combat.ts` helper: pure functions for turn queue management, action validation/execution, and AI
- `Combatant` type unifies defenders and invaders: id, side, name, speed, hp/maxHp, attack, defense, hasActed, position
- `TurnQueue`: combatants sorted by speed (desc), defenders-first on ties. Tracks currentIndex and round number
- Turn flow: `invasionCombatBuildTurnQueue` → `invasionCombatGetCurrentActor` → execute action → `invasionCombatAdvanceTurn` → check `invasionCombatIsRoundComplete` → `invasionCombatStartNewRound`
- `invasionCombatStartNewRound` removes dead combatants, resets hasActed, re-sorts, increments round
- Position system: `TilePosition = { x, y }`, cardinal adjacency only (no diagonals)
- `invasionCombatExecuteMove` / `invasionCombatExecuteAttack` / `invasionCombatExecuteWait`: all return `{ queue, result }` (pure, no mutation)
- `invasionCombatExecuteAttack` delegates to `combatResolve` from combat.ts for d20-based hit/damage resolution
- AI (`invasionCombatResolveAiAction`): attack weakest adjacent enemy > move toward nearest enemy (manhattan) > wait

## Conditional State Modifiers

- `state-modifiers.ts` helper: per-creature state modifier lookup with fallback defaults
- `StateModifier` type: `productionMultiplier`, `foodConsumptionMultiplier`, optional `attackMultiplier`, `defenseMultiplier`
- `InhabitantDefinition` has optional `fearTolerance?: number` and `stateModifiers?: Partial<Record<InhabitantState, StateModifier>>`
- `stateModifierIsInhabitantScared(inhabitant, roomFearLevel)`: scared when fear > tolerance. `STATE_MODIFIER_FEAR_TOLERANCE_DEFAULT = 2`
- `stateModifierGet(definitionId, state)`: returns creature-specific modifier or fallback default
- `stateModifierCalculatePerCreatureProduction(assignedInhabitants)`: averages per-creature production multipliers (replaces old flat state multiplication)
- Default fallbacks: normal=1.0, scared=0.5, hungry=0.5, starving=0.1 — creatures without YAML data get these
- Fear tolerance values: Slime=0, Goblin=1, Myconid=1, Kobold=2, Skeleton=4, Dragon=4, Lich=4, Demon Lord=4

## Conditional Production Modifiers

- `production-modifiers.ts` helper: registry-based production modifier system with time-of-day and biome modifiers — all data-driven from room definitions
- `ProductionModifierContext`: `{ roomTypeId, floorDepth, floorBiome, hour }` — all data needed to evaluate modifiers
- `productionModifierCalculate(context)` — multiplies all registry modifiers together, returns combined multiplier
- `productionModifierEvaluate(context)` — returns array of active modifier results for UI display
- Time-of-day and biome bonuses are read from `timeOfDayBonus` and `biomeBonuses` fields on `RoomDefinition` — not hardcoded
- `productionModifierGetBiomeBonus(biome, roomTypeId)` — pure function returning multiplier (1.0 + bonus). Exported for direct use.
- Production pipeline: `productionCalculateTotal(floors, hour?)` — optional `hour` param. When omitted, env modifiers = 1.0

## Floor Depth Modifiers

- `floor-modifiers.ts` helper: resource-specific production modifiers based on floor depth — defined in `FLOOR_MODIFIER_TIERS` config array
- `floorModifierGet(depth)` returns `FloorDepthResourceModifier[]` for a given depth — each has `resourceType`, `percentage`, `description`
- `floorModifierGetMultiplier(depth, resourceType)` returns the multiplier (1.0 + percentage) for a specific resource at a given depth
- Depth modifiers are applied **per-resource** in the production pipeline (not as a generic multiplier) — this is different from time-of-day/biome which are per-room
- Tier config: Floor 1 (+20% food, -10% corruption), Floors 2-3 (baseline), Floors 4-6 (+10% crystals/gold, +5% corruption, -15% food), Floors 7-9 (+20% crystals/gold, +10% corruption, -30% food), Floor 10 (+50% flux/essence/corruption, -50% food)
- When adding or modifying floor depth modifiers, update `FLOOR_MODIFIER_TIERS` in `floor-modifiers.ts` — no code changes needed
- Tests that don't test depth modifiers should use `depth: 0` (no tier match → 1.0 multiplier for all resources)
- The old flat `PRODUCTION_MODIFIER_DEPTH_BONUS_PER_LEVEL` (5% per depth) was removed and replaced by this per-resource system

## Day/Night Production Modifiers

- `day-night-modifiers.ts` helper: phase-based global production modifiers (resource-type and creature-type)
- `DayNightPhase` type: `'day' | 'night' | 'dawn' | 'dusk'` — day=7-17, night=0-5 & 19-23, dawn=6, dusk=18
- `dayNightGetPhase(hour)` returns the current phase
- `dayNightGetResourceModifier(hour, resourceType)` returns per-resource multiplier: food +25% day, corruption +50% night, flux +100% dawn/dusk
- `dayNightGetCreatureModifier(hour, creatureType)` returns per-creature-type multiplier: undead -10% day, +30% night
- `dayNightCalculateCreatureProductionModifier(hour, inhabitants, roomId)` calculates weighted modifier based on undead/non-undead worker ratio in a room — uses content lookup
- `dayNightCalculateCreatureProductionModifierPure(hour, creatureTypes)` pure version for testing without content dependency
- Both resource and creature modifiers are applied in the production pipeline alongside envModifier and depthModifier — all multiplicative
- Day/night modifiers only apply when `hour` is provided to production functions (same pattern as envModifier)
- `InhabitantDefinition.type` field identifies creature types: 'creature', 'undead', 'fungal', 'ooze', 'dragon', 'demon' — used for creature-type modifiers
- Active modifiers displayed as badges in `PanelResourcesComponent` below the resource bar

## Season-Specific Bonuses

- `season-bonuses.ts` helper: season-based global production modifiers, recruitment cost multipliers, spawn rate modifiers, and flag queries
- Follows the same hardcoded config array pattern as `day-night-modifiers.ts` and `floor-modifiers.ts`
- `seasonBonusGetResourceModifier(season, resourceType)` returns per-resource multiplier: Growth food 1.5x, Harvest all 1.2x, Darkness corruption 2.0x, Storms flux 1.8x
- `seasonBonusGetRecruitmentCostMultiplier(season)` returns cost multiplier: Growth 0.75x (only season with discount)
- `seasonBonusGetSpawnRateModifier(season, creatureType)` returns spawn rate multiplier: Darkness dark 1.5x
- `seasonBonusIsMerchantVisitEnabled(season)` → true only during Harvest
- `seasonBonusAreRandomEventsEnabled(season)` → true only during Storms
- Season modifiers applied in production pipeline as additional multiplicative factor alongside dayNightResourceMod and depthModifier
- `recruitmentGetAdjustedCost(cost, season)` pure function in `recruitment.ts` applies season recruitment discount with `Math.ceil` rounding
- Gamedata content type `'seasonbonus'` with YAML at `gamedata/seasonbonus/base.yml` — 4 entries (one per season)
- When mocking `gamestate()` in tests that call `recruitmentRecruit()`, the mock must include `world.season.currentSeason` — use a season with 1.0 recruitment multiplier (e.g., 'harvest') to avoid affecting existing cost assertions
- File-to-prefix: `season-bonuses.ts` → `seasonBonus` / `SEASON_BONUS`

## Hunger System

- `hunger.ts` helper: tick-based food consumption and hunger state management
- File-to-prefix: `hunger.ts` → `hunger` / `HUNGER`
- `foodConsumptionRate` on `InhabitantDefinition` is in "food per game-hour" units — converted to per-tick via `rate / HUNGER_TICKS_PER_HOUR` (300 ticks/hour)
- `hungerProcess(state)` runs each tick BEFORE `productionProcess(state)` so production penalties apply immediately
- Inappetent inhabitants (`foodConsumptionRate <= 0`) are always 'normal' — Skeleton and Lich are inappetent (undead don't eat)
- Hunger state transition: normal → hungry (30 game-minutes without food) → starving (60 game-minutes)
- Recovery rate: 2 ticks of hunger recovered per tick when food is available (faster recovery than degradation)
- Scared state is preserved — hunger system only overrides 'normal', 'hungry', 'starving' states
- `floor.inhabitants` and `world.inhabitants` are SEPARATE copies — hunger system must sync state changes to both via `hungerSyncFloorInhabitants(state)` using a Map lookup
- `hungerGetWarningLevel(foodCurrent, totalConsumptionPerTick)` is a pure function for testability — the RxJS Subject/Observable pattern for warnings doesn't work reliably in Vitest when the module is loaded with vi.mock'd dependencies
- `InhabitantState` union includes `'starving'` — added alongside the existing `'normal' | 'scared' | 'hungry'`
- `STATE_MODIFIER_DEFAULTS` in `state-modifiers.ts` includes `starving: { productionMultiplier: 0.1, foodConsumptionMultiplier: 0.5 }`
- When adding optional fields to `InhabitantInstance` (like `hungerTicksWithoutFood`), update `inhabitantDeserialize()` to provide defaults via `??`

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
- `GameStateWorld` has both top-level `grid` and `floors[].grid` — the top-level grid is **legacy**; always use `floorCurrent()?.grid` for room operations
- Module-level constants/functions must be placed BEFORE the `@Component` decorator — placing them between decorator and class causes compilation error

## Biome Restrictions

- `biome-restrictions.ts` defines `BIOME_RESTRICTION_MAP` config map: biome → room name → `{ blocked?: boolean, maxPerFloor?: number }`
- `biomeRestrictionCanBuild(roomTypeId, biome, floor)` is the main validation function — resolves room name via `contentGetEntry`, then checks the config map
- `biomeRestrictionGetRoomInfo()` provides UI display data including count info for `maxPerFloor` rules
- Integrated into `roomPlacementExecute()` in room-placement.ts — checked after unique room check, before affordability
- Panel-room-select uses `isBiomeRestricted()`, `getBiomeRestrictionTooltip()`, `getBiomeLimitLabel()` for UI feedback
- Restriction rules reference room names (strings) not IDs — if a room name changes in YAML, the restriction map must be updated too
- Rooms that don't exist yet (e.g., Torture Chamber) are excluded from restriction rules until they're added to gamedata

## Fear Level System

- `fear-level.ts` helper: per-room effective fear calculation with breakdown (base, inhabitant modifier, upgrade adjustment, altar aura reduction, propagated fear)
- File-to-prefix: `fear-level.ts` → `fearLevel` / `FEAR_LEVEL`
- `fearModifier` on `InhabitantDefinition` — positive values increase room fear (Skeleton=1, Dragon=2, Lich=1, Demon Lord=2), negative values decrease it (Myconid=-1), zero for common workers (Goblin, Kobold, Slime)
- `fearPropagationDistance` on `InhabitantDefinition` — how far this inhabitant extends fear propagation from its room (default 1). Dragon=2, Demon Lord=2, all others=1
- `FearLevelBreakdown` type: `{ baseFear, inhabitantModifier, upgradeAdjustment, altarAuraReduction, propagatedFear, propagationSources, effectiveFear }` — all components of the fear calculation
- `FearPropagationSource` type: `{ sourceRoomId, sourceRoomName, amount }` — identifies where propagated fear comes from
- `fearLevelBreakdownMap` computed signal returns `Map<string, FearLevelBreakdown>` for all rooms across all floors — reads `gamestate()` so it auto-updates
- `fearLevelRoomMap` computed signal returns simplified `Map<string, number>` (roomId → effectiveFear) — for pathfinding consumption
- Fear is clamped to [0, 4]: None(0), Low(1), Medium(2), High(3), Very High(4)
- **Fear propagation**: rooms with source fear >= High (3) propagate to adjacent rooms. High propagates +1, Very High propagates +2. Attenuates by -1 per step beyond distance 1
- **Source fear** = baseFear + inhabitantModifier (unclamped, pre-upgrades/altar) — used for propagation checks to avoid feedback loops
- Propagation uses `fearLevelBuildAdjacencyMap(floor)` which calls `roomShapeResolve`/`roomShapeGetAbsoluteTiles`/`adjacencyAreRoomsAdjacent` — must mock `@helpers/room-shapes` in tests
- `fearLevelCalculateAllForFloor` does 3 passes: (1) individual breakdowns, (2) propagation via BFS, (3) recalculate effective fear with propagation
- `fearLevelCalculateAllPropagation` is a pure function taking adjacency map and data maps — testable without mocks
- Room YAML already had `fearLevel` field (number | 'variable') — 'variable' resolves via `throneRoomGetFearLevel()`
- Upgrade effects: `fearReduction` (negative adjustment) and `fearIncrease` (positive adjustment) from `roomUpgradeGetAppliedEffects()`
- Altar aura reduction only applies to rooms adjacent to the Altar — uses `altarRoomIsAdjacent()` and `altarRoomGetFearReductionAura()`
- Fear is derived state (computed from existing gamestate), NOT stored as a new field — no migration needed
- Dependencies: `@helpers/content`, `@helpers/room-upgrades`, `@helpers/altar-room`, `@helpers/throne-room`, `@helpers/state-game`, `@helpers/production`, `@helpers/room-shapes`, `@helpers/adjacency` — no circular deps

## Morale System

- `morale.ts` helper: party-level invader morale (0-100) tracked via Angular signals during invasions
- File-to-prefix: `morale.ts` → `morale` / `MORALE`
- Morale is party-level (single value for whole invader party), NOT per-invader
- `moraleCurrent` signal (WritableSignal<number>), `moraleEventLog` signal (WritableSignal<MoraleEvent[]>), `moraleIsRetreating` signal (WritableSignal<boolean>)
- `moraleInit()` resets to 100 and clears log/retreating — call at start of each invasion
- `moraleApply(eventType, delta, turn, description)` updates signal, logs event, triggers retreat if ≤ 0
- Convenience functions: `moraleApplyAllyDeath(invader, turn)`, `moraleApplyTrapTrigger(isFearGlyph, turn)`, `moraleApplyFearRoomEntry(fearLevel, invaders, turn)`, `moraleApplyRoomCapture(isHighValue, turn)`
- Penalties: ally death -10, cleric/paladin death -15, trap -5, Fear Glyph -10, high-fear room (≥3) -15
- Bonuses: room capture +10, high-value room +15
- Paladin Aura of Courage negates high-fear room penalty — checked via `moralePartyHasPaladinAura()` looking for 'courage' status effect on alive invaders
- `MoraleEventType`: `'ally_death' | 'trap_trigger' | 'high_fear_room' | 'room_capture'`
- `'morale_broken'` added to `InvasionEndReason` union in `invasion.ts`
- `invasionWinLossIsMoraleBroken(state, retreating?)` in invasion-win-loss.ts — reads `moraleIsRetreating()` signal, with optional parameter override for pure testing
- Morale broken check priority: after all_invaders_eliminated, before turn_limit_reached
- Traps already have `moralePenalty` field on `TrapTriggerResult` — `def.effectType === 'fear'` gives 10, others 0. Morale system consumes this via `moraleApplyTrapTrigger()`
- `MoraleBarComponent` in `src/app/components/morale-bar/` — inline template, color-coded progress (green >60, yellow 30-60, red <30), floating text on changes, hover event log
- Component auto-hides when morale is full and no events have occurred — shows during active invasions

## Corruption System

- `corruption.ts` helper: dedicated corruption functions wrapping the generic resource system
- File-to-prefix: `corruption.ts` → `corruption` / `CORRUPTION`
- Corruption has NO hard cap — `max: Number.MAX_SAFE_INTEGER` in `defaultResources()`, allowing unlimited accumulation
- `CorruptionLevel` type: `'low' | 'medium' | 'high' | 'critical'` — thresholds at 0, 50, 100, 200
- `corruptionCurrent` computed signal reads from `gamestate().world.resources.corruption.current`
- `corruptionLevel` computed signal derives level from current value
- `corruptionGetLevel(value)` pure function for use in non-signal contexts (tests, templates)
- `corruptionGetLevelDescription(level)` returns human-readable effect description per level
- `corruptionAdd(amount)` / `corruptionSpend(amount)` / `corruptionCanAfford(amount)` — convenience wrappers around `updateGamestate`
- Corruption is displayed separately from other resources in `panel-resources` — no progress bar (uncapped), uses level-based color coding and badge instead
- Panel-resources splits `RESOURCE_DISPLAY` into `resources` (non-corruption) and `corruptionDisplay` (corruption only) for differentiated rendering
- Corruption already existed as a `ResourceType` — the corruption-resource feature added dedicated helper functions, level tracking, and enhanced UI
- **Corruption generation has two separate pipelines:**
  - **Room-based**: corruption production values in room YAML (e.g., `corruption: 0.4` on Soul Well) flow through the standard `productionProcess` pipeline — no special code needed, just YAML data
  - **Inhabitant-based**: `corruptionGeneration` field on `InhabitantDefinition` (per-minute rate) is processed by `corruptionGenerationProcess(state)` — a separate function called in gameloop.ts after productionProcess
- `corruptionGenerationCalculateInhabitantRate(inhabitants, lookupDef?)` accepts optional lookup function for testability — defaults to `contentGetEntry` in production, injectable in tests
- `corruptionGenerationProcess(state)` mutates state in-place (same pattern as productionProcess, hungerProcess) — applies day/night modifier via `dayNightGetResourceModifier()`
- `corruptionGenerationCalculateTotalPerMinute(inhabitantRatePerTick, roomRatePerTick)` combines both pipelines for UI display
- When using `await import()` inside `vi.mock()` test files, the `it()` callback must be `async` — esbuild will reject `await` in non-async functions at transform time

## Corruption Effects System

- `corruption-effects.ts` helper: tick-based threshold processing for dark upgrade unlock (50), mutations (100), and crusade (200)
- File-to-prefix: `corruption-effects.ts` → `corruptionEffect` / `CORRUPTION_EFFECT`
- `corruptionEffectProcess(state, rng?)` runs each tick inside `updateGamestate` — checks corruption thresholds and triggers effects
- `corruptionEffectEvent$` Subject emits `CorruptionEffectEvent` with types: `dark_upgrade_unlocked`, `mutation_applied`, `crusade_triggered`
- `CorruptionEffectState` stored in `GameStateWorld.corruptionEffects` — tracks `darkUpgradeUnlocked` (one-way boolean), `lastMutationCorruption`, `lastCrusadeCorruption`
- Dark upgrade unlock is one-way — once `darkUpgradeUnlocked` is true, it stays true even if corruption drops below 50
- Mutations and crusades track "last corruption" to detect threshold crossings — dropping below threshold resets tracking, allowing re-trigger on re-crossing
- `RoomUpgradePath.requiresDarkUpgrade?: boolean` — upgrade paths with this flag are gated behind corruption 50 unlock
- `roomUpgradeGetAvailable(placedRoom, darkUpgradeUnlocked?)` filters dark upgrades; `roomUpgradeGetVisible(placedRoom, darkUpgradeUnlocked?)` returns all with lock status for UI
- `roomUpgradeCanApply(placedRoom, upgradePathId, darkUpgradeUnlocked?)` rejects dark upgrades when not unlocked
- NotifyService subscribes to `corruptionEffectEvent$` to show toastr notifications (info for unlock/mutation, warning for crusade)
- Grid component uses `[attr.data-corruption]="corruptionLevel()"` for CSS-only visual corruption effects — no new DOM elements needed
- Corruption visual effects use inset `box-shadow` for edge tinting, `::after` pseudo-elements with `radial-gradient` for vein effects, and `@keyframes` for critical-level pulsing

## Corruption Threshold Warnings

- `corruption-thresholds.ts` helper: pre-threshold warning system that monitors corruption approaching 50/100/200 thresholds
- File-to-prefix: `corruption-thresholds.ts` → `corruptionThreshold` / `CORRUPTION_THRESHOLD`
- Warns at 80% of each threshold (40, 80, 160) — `CORRUPTION_THRESHOLD_WARNING_FACTOR = 0.8`
- `corruptionThresholdProcess(state)` runs each tick after `corruptionEffectProcess` — checks warnings and updates `warnedThresholds` in state
- `corruptionThresholdWarning$` Subject emits `CorruptionThresholdWarning` events for UI consumption (NotifyService can subscribe)
- `corruptionThresholdNext` computed signal returns next uncrossed threshold for UI display
- Warning tracking persisted in `CorruptionEffectState.warnedThresholds: number[]` — auto-cleared on threshold crossing or corruption drop
- **Testing RxJS Subjects in Vitest**: Use `vi.spyOn(subject$, 'next')` pattern instead of `.subscribe()` — subscription-based testing fails when the module is loaded via `await import()` with `vi.mock()` dependencies. The spy approach works because it hooks directly into the module-scoped Subject instance.

## Reputation Effects System

- `reputation-effects.ts` helper: data-driven reputation effects engine evaluating active effects based on reputation levels
- File-to-prefix: `reputation-effects.ts` → `reputationEffect` / `REPUTATION_EFFECT`
- Content type `'reputationeffect'` in `gamedata/reputationeffect/base.yml` — 17 effects across 5 reputation types
- `ReputationEffectContent` type: `id`, `name`, `description`, `reputationType`, `minimumLevel`, `effectType`, `effectValue`, `targetId?`
- `ReputationEffectType` union: `'unlock_room' | 'modify_event_rate' | 'attract_creature' | 'modify_production' | 'modify_invasion_rate'`
- All pure functions accept optional `allEffects` param to avoid content system mocking in tests — pass test fixtures directly
- `reputationEffectGetActive(reputation, allEffects?)` returns active effects by comparing current level against minimumLevel
- `reputationEffectGetInvasionRateMultiplier(reputation, allEffects?)` groups by reputation type, takes strongest per type, multiplies across types
- `reputationEffectGetProductionMultiplier(resourceType, reputation, allEffects?)` returns combined multiplier for a specific resource
- `reputationEffectActive` computed signal re-evaluates when `gamestate().world.reputation` changes
- Branded ID cast pattern: `(effect.id ?? 'UNKNOWN') as ReputationEffectContent['id']` to satisfy TypeScript branded types in ensure functions
- Active effects UI lives in `panel-reputation` component — shows below reputation bars when effects are active

## Breeding Pits System

- `breeding-pits.ts` helper: `breedingPitsProcess(state)` runs each tick inside `updateGamestate` — processes breeding jobs (hybrid creation) and mutation jobs
- File-to-prefix: `breeding-pits.ts` → `breeding` / `BREEDING`
- Breeding Pits room is found via `roomRoleFindById('breedingPits')` — no hardcoded ID
- `BREEDING_BASE_TICKS = GAME_TIME_TICKS_PER_MINUTE * 5` (25 ticks = 5 game-minutes), `MUTATION_BASE_TICKS = GAME_TIME_TICKS_PER_MINUTE * 3` (15 ticks = 3 game-minutes)
- New content type `breedingrecipe` in `gamedata/breedingrecipe/base.yml` — 5 recipes with `parentInhabitantAId`/`parentInhabitantBId` auto-ID-resolved by build script
- `BreedingJob` and `MutationJob` types stored on `PlacedRoom` — per-room instance state (same pattern as `spawnTicksRemaining` on Spawning Pool)
- `breedingFindRecipe(parentADefId, parentBDefId)` is order-independent — checks both A→B and B→A combinations
- `breedingCreateHybrid(parentA, parentB, recipe, statBonusMultiplier)` averages parent stats + applies recipe `statBonuses` — creates full `InhabitantInstance` with `isHybrid: true` and `hybridParentIds`
- Mutation outcomes: positive (60%, +20% to random stat), neutral (25%, no change), negative (15%, -15% to random stat) — weighted roll via cumulative threshold
- `mutated: boolean` flag on `InhabitantInstance` prevents re-mutation; `mutationBonuses` stores stat changes
- Adjacency effects are data-driven via `breedingAdjacencyEffects` field on `RoomDefinition` — `hybridTimeReduction`, `mutationOddsBonus`, `researchBonus`
- `breedingGetAdjacentRoomTypeIds(room, floor)` reuses `roomShapeResolve`/`roomShapeGetAbsoluteTiles`/`adjacencyAreRoomsAdjacent` — same adjacency pattern as training/production
- `breedingCompleted$` / `mutationCompleted$` RxJS Subjects for cross-cutting event notifications — same pattern as `trainingCompleted$`, `spawningPoolSpawn$`
- Upgrade effect types: `breedingTimeReduction` (reduces hybrid creation time), `mutationOddsBonus` (improves positive mutation chance), `breedingCapacityBonus` (increases max inhabitants)
- When mocking for tests: mock `@helpers/content`, `@helpers/room-roles`, `@helpers/room-upgrades`, `@helpers/rng`; register room def and inhabitant defs in mockContent Map
- On breeding completion, both parent inhabitants are removed from `state.world.inhabitants` and the hybrid is added — `floor.inhabitants` must be synced (same dual-location pattern as hunger/spawning)
- `InhabitantInstance` fields added: `mutated?: boolean`, `isHybrid?: boolean`, `hybridParentIds?: string[]`, `mutationBonuses?: Partial<InhabitantStats>` — all optional to avoid breaking existing test mocks
- `inhabitantDeserialize()` provides defaults for new fields via `??` — backwards-compatible with saved data

## Summoning Circle System

- `summoning-circle.ts` helper: `summoningCircleProcess(state)` runs each tick inside `updateGamestate` — processes summon jobs and temporary inhabitant expiry
- File-to-prefix: `summoning-circle.ts` → `summoning` / `SUMMONING`
- Summoning Circle room is found via `roomRoleFindById('summoningCircle')` — no hardcoded ID
- `SUMMONING_BASE_TICKS = GAME_TIME_TICKS_PER_MINUTE * 4` (20 ticks = 4 game-minutes)
- New content type `summonrecipe` in `gamedata/summonrecipe/base.yml` — 5 recipes with `resultInhabitantId` auto-ID-resolved by build script
- `SummonJob` type stored on `PlacedRoom.summonJob` — per-room instance state (same pattern as `breedingJob` on Breeding Pits)
- `InhabitantInstance` fields: `isSummoned?: boolean`, `isTemporary?: boolean`, `temporaryTicksRemaining?: number` — all optional
- Summoned inhabitants use `restrictionTags: [summoned]` to prevent normal altar recruitment
- Recipe tier gating: base rooms only see `tier: 'rare'`; Greater Summoning upgrade unlocks `tier: 'advanced'` via `summonTierUnlock` effect
- Temporary inhabitants auto-despawn when `temporaryTicksRemaining <= 0` — Binding Mastery upgrade applies `summonDurationMultiplier: 1.5`
- **Critical**: newly created temporary inhabitants must NOT have their timer decremented on the same tick they spawn — track `newTemporaryIds` Set and skip in expiry loop
- Adjacency effects are data-driven via `summoningAdjacencyEffects` field on `RoomDefinition` — `summonTimeReduction` (Library, -25%) and `summonStatBonus` (Soul Well, +2)
- `summoningCompleted$` / `summoningExpired$` RxJS Subjects for cross-cutting event notifications — same pattern as breeding/training/spawning
- Upgrade effect types: `summonTierUnlock` (unlocks advanced recipes), `summonDurationMultiplier` (longer temp helpers), `summonStatBonus` (flat stat bonus)
- When mocking for tests: mock `@helpers/content`, `@helpers/room-roles`, `@helpers/room-upgrades`, `@helpers/rng`, `@helpers/room-shapes`, `@helpers/adjacency`
- After summoning completion, `floor.inhabitants` must be synced with `state.world.inhabitants` — same dual-location pattern as hunger/spawning/breeding

## Dark Forge System

- `dark-forge.ts` helper: `darkForgeProcess(state)` runs each tick inside `updateGamestate` — processes crafting queues and completes items to forge inventory
- File-to-prefix: `dark-forge.ts` → `darkForge` / `DARK_FORGE`
- Dark Forge room is found via `roomRoleFindById('darkForge')` — no hardcoded ID
- `DARK_FORGE_BASE_CRAFTING_TICKS = GAME_TIME_TICKS_PER_MINUTE * 4` (20 ticks = 4 game-minutes)
- New content type `forgerecipe` in `gamedata/forgerecipe/base.yml` — 7 recipes across basic and advanced tiers
- `ForgeCraftingQueue` stored globally in `GameStateWorld.forgeCraftingQueues` (not per-floor) — same pattern as `trapCraftingQueues`
- `ForgeInventoryEntry[]` stored in `GameStateWorld.forgeInventory` — completed crafted items
- Recipe tier gating: base rooms see `tier: 'basic'`; Infernal Forge upgrade unlocks `tier: 'advanced'` via `forgingTierUnlock` effect
- Worker speed bonus: same as trap workshop — each additional worker beyond first reduces time by 20%, capped at 0.4 multiplier
- Adjacency effects are data-driven via `forgingAdjacencyEffects` field on `RoomDefinition` — `forgingSpeedBonus` (Crystal Mine, 0.30), `forgingStatBonus` (Training Grounds, +1), `forgingEffectivenessBonus` (Trap Workshop, 0.20)
- Upgrade effect types: `forgingSpeedMultiplier` (Master Forge, -25% time), `forgingTierUnlock` (Infernal Forge, unlocks advanced), `forgingStatBonus` (Infernal Forge, +2 all stats), `maxInhabitantBonus` (Master Forge, +2 capacity)
- `darkForgeCompleted$` RxJS Subject for cross-cutting event notifications — same pattern as training/spawning/breeding/summoning
- When mocking for tests: mock `@helpers/content`, `@helpers/room-roles`, `@helpers/rng`, `@helpers/room-shapes`, `@helpers/adjacency`
- `InhabitantState` valid values are `'normal' | 'scared' | 'hungry' | 'starving'` — do NOT use `'idle'` in test fixtures

## Alchemy Lab System

- `alchemy-lab.ts` helper: `alchemyLabProcess(state)` runs each tick inside `updateGamestate` — continuous conversion room (not queue-based like Dark Forge)
- File-to-prefix: `alchemy-lab.ts` → `alchemyLab` / `ALCHEMY_LAB`
- Alchemy Lab room is found via `roomRoleFindById('alchemyLab')` — no hardcoded ID
- `ALCHEMY_LAB_BASE_TICKS = GAME_TIME_TICKS_PER_MINUTE * 3` (15 ticks = 3 game-minutes)
- New content type `alchemyrecipe` in `gamedata/alchemyrecipe/base.yml` — 3 recipes (1 basic, 2 advanced)
- `AlchemyConversion[]` stored globally in `GameStateWorld.alchemyConversions` — one conversion per room (continuous cycle, not queue)
- Conversion flow: consume input at cycle start → increment progress each tick → produce output on completion → reset cycle automatically
- `inputConsumed` boolean on `AlchemyConversion` tracks whether resources were consumed for the current cycle — prevents double consumption
- Recipe tier gating: base rooms only see `tier: 'basic'`; Advanced Alchemy upgrade unlocks `tier: 'advanced'` via `alchemyTierUnlock` effect
- Worker speed scaling: 25% reduction per extra worker beyond first, capped at 0.5 multiplier (different from Dark Forge/Trap Workshop which use 20%/0.4)
- Adjacency effects are data-driven via `alchemyAdjacencyEffects` field on `RoomDefinition` — `alchemySpeedBonus` (Crystal Mine, 0.20), `alchemyCostReduction` (Mushroom Grove, 0.15)
- Upgrade effect types: `alchemyCostMultiplier` (Efficient Distillation, 0.6×), `alchemyTierUnlock` (Advanced Alchemy, unlocks advanced recipes), `maxInhabitantBonus` (Expanded Capacity, +2)
- `alchemyLabCompleted$` RxJS Subject for cross-cutting event notifications — subscription-based testing fails with `vi.mock` + `await import()`, use side-effect verification instead
- When mocking for tests: mock `@helpers/content`, `@helpers/room-roles`, `@helpers/rng`, `@helpers/room-shapes`, `@helpers/adjacency`; use `vi.mocked(contentGetEntriesByType)` pattern (not `require()`)
- `PlacedRoom` type requires `shapeId` field — include it in test `makePlacedRoom()` helpers

## Miscellaneous

- Use `rngChoice(array)` from `@helpers/rng` for equal-probability random selection
- `BIOME_DATA` in `@interfaces/biome` provides display info (name, description, color) for UI rendering
- Do not use `null` as a return type, optional type, or anywhere in the codebase — use `undefined` instead for consistency and to avoid confusion
- Prefer to use popups/modals over separate pages for new features.

## Helper Function Naming Convention

All exported runtime symbols (functions, signals, constants) in `src/app/helpers/` follow a **prefix-based naming convention** that ties each export to its source file.

### Rules

1. **Prefix** = semantic camelCase of the file name
   - `state-game.ts` -> `gamestate`
   - `room-shapes.ts` -> `roomShape`
   - `invasion-combat.ts` -> `invasionCombat`

2. **Function/signal names**: prefix + descriptive suffix in camelCase
   - `getInhabitant` (in `inhabitants.ts`) -> `inhabitantGet`
   - `calculateTotalProduction` (in `production.ts`) -> `productionCalculateTotal`

3. **SCREAMING_SNAKE constants**: SCREAMING_SNAKE version of prefix + descriptive suffix
   - `ALL_ICONS` (in `icons.ts`) -> `ICON_ALL`
   - `NIGHT_START` (in `production-modifiers.ts`) -> `PRODUCTION_MODIFIER_NIGHT_START`

4. **Types and interfaces are NOT renamed** -- only runtime exports get the prefix.

5. **Non-exported (internal) functions are NOT renamed**.

6. **Logging functions** (`log`, `info`, `warn`, `debug`, `error`) are exempt.

7. **`ensureContent`** in `content-initializers.ts` is exempt.

### File-to-Prefix Mapping

| File                       | Prefix (camelCase)    | Prefix (SCREAMING_SNAKE) |
| -------------------------- | --------------------- | ------------------------ |
| `adjacency.ts`             | `adjacency`           | `ADJACENCY`              |
| `altar-room.ts`            | `altarRoom`           | `ALTAR_ROOM`             |
| `analytics.ts`             | `analytics`           | `ANALYTICS`              |
| `assignment.ts`            | `assignment`          | `ASSIGNMENT`             |
| `biome-restrictions.ts`    | `biomeRestriction`    | `BIOME_RESTRICTION`      |
| `breeding-pits.ts`         | `breeding`            | `BREEDING`               |
| `clipboard.ts`             | `clipboard`           | `CLIPBOARD`              |
| `combat.ts`                | `combat`              | `COMBAT`                 |
| `combat-abilities.ts`      | `combatAbility`       | `COMBAT_ABILITY`         |
| `connections.ts`           | `connection`          | `CONNECTION`             |
| `content.ts`               | `content`             | `CONTENT`                |
| `corruption.ts`            | `corruption`          | `CORRUPTION`             |
| `corruption-thresholds.ts` | `corruptionThreshold` | `CORRUPTION_THRESHOLD`   |
| `day-night-modifiers.ts`   | `dayNight`            | `DAY_NIGHT`              |
| `debug.ts`                 | `debug`               | `DEBUG`                  |
| `defaults.ts`              | `default`             | `DEFAULT`                |
| `discord.ts`               | `discord`             | `DISCORD`                |
| `efficiency.ts`            | `efficiency`          | `EFFICIENCY`             |
| `fear-level.ts`            | `fearLevel`           | `FEAR_LEVEL`             |
| `floor.ts`                 | `floor`               | `FLOOR`                  |
| `floor-modifiers.ts`       | `floorModifier`       | `FLOOR_MODIFIER`         |
| `game-events.ts`           | `gameEvent`           | `GAME_EVENT`             |
| `game-init.ts`             | `game`                | `GAME`                   |
| `game-time.ts`             | `gameTime`            | `GAME_TIME`              |
| `gameloop.ts`              | `gameloop`            | `GAMELOOP`               |
| `grid.ts`                  | `grid`                | `GRID`                   |
| `hallway-placement.ts`     | `hallwayPlacement`    | `HALLWAY_PLACEMENT`      |
| `hallways.ts`              | `hallway`             | `HALLWAY`                |
| `hunger.ts`                | `hunger`              | `HUNGER`                 |
| `icons.ts`                 | `icon`                | `ICON`                   |
| `inhabitants.ts`           | `inhabitant`          | `INHABITANT`             |
| `invaders.ts`              | `invader`             | `INVADER`                |
| `invasion-combat.ts`       | `invasionCombat`      | `INVASION_COMBAT`        |
| `invasion-composition.ts`  | `invasionComposition` | `INVASION_COMPOSITION`   |
| `invasion-objectives.ts`   | `invasionObjective`   | `INVASION_OBJECTIVE`     |
| `invasion-rewards.ts`      | `invasionReward`      | `INVASION_REWARD`        |
| `invasion-triggers.ts`     | `invasionTrigger`     | `INVASION_TRIGGER`       |
| `invasion-win-loss.ts`     | `invasionWinLoss`     | `INVASION_WIN_LOSS`      |
| `migrate.ts`               | `migrate`             | `MIGRATE`                |
| `morale.ts`                | `morale`              | `MORALE`                 |
| `notify.ts`                | `notify`              | `NOTIFY`                 |
| `pathfinding.ts`           | `pathfinding`         | `PATHFINDING`            |
| `production.ts`            | `production`          | `PRODUCTION`             |
| `production-modifiers.ts`  | `productionModifier`  | `PRODUCTION_MODIFIER`    |
| `recruitment.ts`           | `recruitment`         | `RECRUITMENT`            |
| `reputation.ts`            | `reputation`          | `REPUTATION`             |
| `reputation-effects.ts`   | `reputationEffect`    | `REPUTATION_EFFECT`      |
| `resources.ts`             | `resource`            | `RESOURCE`               |
| `rng.ts`                   | `rng`                 | `RNG`                    |
| `room-placement.ts`        | `roomPlacement`       | `ROOM_PLACEMENT`         |
| `room-removal.ts`          | `roomRemoval`         | `ROOM_REMOVAL`           |
| `room-roles.ts`            | `roomRole`            | `ROOM_ROLE`              |
| `room-shapes.ts`           | `roomShape`           | `ROOM_SHAPE`             |
| `room-upgrades.ts`         | `roomUpgrade`         | `ROOM_UPGRADE`           |
| `scheduler.ts`             | `scheduler`           | `SCHEDULER`              |
| `season.ts`                | `season`              | `SEASON`                 |
| `season-bonuses.ts`        | `seasonBonus`         | `SEASON_BONUS`           |
| `setup.ts`                 | `setup`               | `SETUP`                  |
| `sfx.ts`                   | `sfx`                 | `SFX`                    |
| `signal.ts`                | `signal`              | `SIGNAL`                 |
| `spawning-pool.ts`         | `spawningPool`        | `SPAWNING_POOL`          |
| `state-game.ts`            | `gamestate`           | `GAMESTATE`              |
| `summoning-circle.ts`      | `summoning`           | `SUMMONING`              |
| `state-modifiers.ts`       | `stateModifier`       | `STATE_MODIFIER`         |
| `state-options.ts`         | `options`             | `OPTIONS`                |
| `synergy.ts`               | `synergy`             | `SYNERGY`                |
| `throne-room.ts`           | `throneRoom`          | `THRONE_ROOM`            |
| `timer.ts`                 | `timer`               | `TIMER`                  |
| `training.ts`              | `training`            | `TRAINING`               |
| `trap-workshop.ts`         | `trapWorkshop`        | `TRAP_WORKSHOP`          |
| `traps.ts`                 | `trap`                | `TRAP`                   |
| `ui.ts`                    | `ui`                  | `UI`                     |
| `version.ts`               | `version`             | `VERSION`                |
| `world.ts`                 | `world`               | `WORLD`                  |
| `worldgen.ts`              | `worldgen`            | `WORLDGEN`               |

### Examples

```typescript
// Good - follows the convention
export const floorCurrent = computed(...);       // floor.ts
export function resourceGet(type): number {...}  // resources.ts
export const ICON_ALL = {...};                   // icons.ts

// Bad - old style without prefix
export const currentFloor = computed(...);
export function getResource(type): number {...}
export const ALL_ICONS = {...};
```

### Important Notes

- Type property names (fields on interfaces/types) do NOT follow this convention.
  The type `SeasonState` keeps `currentSeason`, `dayInSeason`, etc. as field names.
- Observable subjects with `$` suffix keep the prefix: `notifyNotification$`, `reputationAward$`.
- When a name already starts with the prefix, it's kept as-is: `gameloop()`, `gamestate()`, `options()`.

## Content Interface Convention

Every gamedata content type has a corresponding `content-{type}.ts` file in `src/app/interfaces/` with a branded ID and a `{Type}Content` type.

### Pattern

```typescript
// src/app/interfaces/content-{type}.ts
import type { Branded, IsContentItem } from '@interfaces/identifiable';
import type { HasDescription } from '@interfaces/traits';

export type {Type}Id = Branded<string, '{Type}Id'>;

export type {Type}Content = IsContentItem &
  HasDescription & {  // only if the content has a description field
    id: {Type}Id;
    // ... type-specific fields from the YAML data
  };
```

### Naming Rules

| Convention        | Example                                       |
| ----------------- | --------------------------------------------- |
| File name         | `content-abilityeffect.ts`, `content-room.ts` |
| Branded ID type   | `AbilityEffectId`, `RoomId`                   |
| Content type name | `AbilityEffectContent`, `RoomContent`         |

### Trait Extensions

- **All** content types extend `IsContentItem` (provides `id`, `name`, `__type`)
- Extend `HasDescription` if the YAML data includes a `description` field
- Extend `HasSprite` if the YAML data includes a `sprite` field (e.g., invader, trap)
- Extend `HasAnimation` if the content has `sprite` + `frames` fields (e.g., hero, monster, pet)

### Complete Content Type Mapping

| ContentType        | File                          | Branded ID           | Content Type              | Extends                                         |
| ------------------ | ----------------------------- | -------------------- | ------------------------- | ----------------------------------------------- |
| `abilityeffect`    | `content-abilityeffect.ts`    | `AbilityEffectId`    | `AbilityEffectContent`    | `IsContentItem`                                 |
| `combatability`    | `content-combatability.ts`    | `CombatAbilityId`    | `CombatAbilityContent`    | `IsContentItem & HasDescription`                |
| `hero`             | `content-hero.ts`             | `HeroId`             | `HeroContent`             | `IsContentItem & HasDescription & HasAnimation` |
| `inhabitant`       | `content-inhabitant.ts`       | `InhabitantId`       | `InhabitantContent`       | `IsContentItem & HasDescription`                |
| `invader`          | `content-invader.ts`          | `InvaderId`          | `InvaderContent`          | `IsContentItem & HasDescription & HasSprite`    |
| `invasion`         | `content-invasion.ts`         | `InvasionId`         | `InvasionContent`         | `IsContentItem`                                 |
| `item`             | `content-item.ts`             | `ItemId`             | `ItemContent`             | `IsContentItem & HasDescription & HasSprite`    |
| `monster`          | `content-monster.ts`          | `MonsterId`          | `MonsterContent`          | `IsContentItem & HasDescription & HasAnimation` |
| `pet`              | `content-pet.ts`              | `PetId`              | `PetContent`              | `IsContentItem & HasDescription & HasAnimation` |
| `reputationaction` | `content-reputationaction.ts` | `ReputationActionId` | `ReputationActionContent` | `IsContentItem & HasDescription`                |
| `reputationeffect` | `content-reputationeffect.ts` | `ReputationEffectId` | `ReputationEffectContent` | `IsContentItem & HasDescription`                |
| `research`         | `content-research.ts`         | `ResearchId`         | `ResearchContent`         | `IsContentItem & HasDescription`                |
| `room`             | `content-room.ts`             | `RoomId`             | `RoomContent`             | `IsContentItem & HasDescription`                |
| `roomshape`        | `content-roomshape.ts`        | `RoomShapeId`        | `RoomShapeContent`        | `IsContentItem`                                 |
| `seasonbonus`      | `content-seasonbonus.ts`      | `SeasonBonusId`      | `SeasonBonusContent`      | `IsContentItem & HasDescription`                |
| `stage`            | `content-stage.ts`            | `StageId`            | `StageContent`            | `IsContentItem & HasDescription`                |
| `synergy`          | `content-synergy.ts`          | `SynergyId`          | `SynergyContent`          | `IsContentItem & HasDescription`                |
| `breedingrecipe`   | `content-breedingrecipe.ts`   | `BreedingRecipeId`   | `BreedingRecipeContent`   | `IsContentItem & HasDescription`                |
| `summonrecipe`     | `content-summonrecipe.ts`     | `SummonRecipeId`     | `SummonRecipeContent`     | `IsContentItem & HasDescription`                |
| `trap`             | `content-trap.ts`             | `TrapId`             | `TrapContent`             | `IsContentItem & HasDescription & HasSprite`    |
| `trinket`          | `content-trinket.ts`          | `TrinketId`          | `TrinketContent`          | `IsContentItem & HasDescription & HasSprite`    |
| `weapon`           | `content-weapon.ts`           | `WeaponId`           | `WeaponContent`           | `IsContentItem & HasDescription & HasSprite`    |

### Adding a New Content Type

1. Add the type string to `ContentType` union in `identifiable.ts`
2. Create `content-{type}.ts` with branded ID and content type following the pattern above
3. Export from `src/app/interfaces/index.ts`
4. Add `ensure{Type}()` initializer to `content-initializers.ts`
5. Create `gamedata/{type}/` folder with YAML
6. Update this table

## Research Progress System

- `research-progress.ts` helper: `researchProcess(state)` runs each tick inside `updateGamestate` — advances active research progress by `RESEARCH_BASE_PROGRESS_PER_TICK * speedModifier`
- `ResearchNode` has `requiredTicks: number` — configurable per node in YAML (T1=50, T2=150, T3=300, T4=500, T5=750, T6=1000)
- `ResearchState` in `GameStateWorld`: `{ completedNodes, activeResearch, activeResearchProgress, activeResearchStartTick }`
- `researchStart(nodeId)` validates prerequisites, deducts resources via `resourcePayCost()`, sets `activeResearch`
- `researchCancel()` clears `activeResearch` and progress — resources NOT refunded, progress lost entirely
- `researchCanStart(nodeId, researchState)` returns `{ canStart, error? }` — checks: no active research, node exists, not already completed, prerequisites met, can afford
- Speed modifier: `researchCalculateSpeedModifier(floors)` = `1 + (libraryBonus + rulerBonus)` — Library rooms (any room producing `research` resource) add `RESEARCH_LIBRARY_BONUS_PER_ROOM` (0.1) each; ruler `researchSpeed` bonus from throne room
- `researchCompleted$` observable emits `{ nodeId, nodeName }` on completion — subscribe in services for notifications
- Prerequisites reference resolved UUIDs at runtime (build script resolves names from YAML via `rewriteDataIds`)

## Research UI

- `GameResearchComponent` at `/game/research` — full-page research tree view, added as a child route under `/game` in `game.routes.ts`
- Adding new game pages: add route to `game.routes.ts`, the `GameComponent` parent provides navbar via `<router-outlet>`
- `PanelResearchSummaryComponent` — sidebar panel in game-play showing active research name, progress bar, and "Open" button to navigate to `/game/research`
- Node states derived from `ResearchState`: completed (green), active (pulsing blue), available (glowing yellow), locked (dimmed)
- Branch tab navigation uses `signal<ResearchBranch>` — no routing needed for tabs, just signal state
- Nodes arranged by tier (computed from `branchNodes`) with tier labels and connector lines between tiers
- Detail panel shows on node click: description, cost, prerequisites (with missing prereq names), and action buttons
- `DecimalPipe` from `@angular/common` must be imported in standalone components that use the `| number` pipe

## Research Unlock System

- `research-unlocks.ts` helper: `researchUnlockProcessCompletion(nodeId, state)` is the synchronous in-place mutation called from `researchProcess()` during the game tick — applies unlock effects atomically in the same state update
- `researchUnlockOnComplete(nodeId)` is the async version using `updateGamestate()` — available for external callers but NOT used during tick processing
- `UnlockEffect` is a union type with 5 variants: `RoomUnlock`, `InhabitantUnlock`, `AbilityUnlock`, `UpgradeUnlock`, `PassiveBonusUnlock` — defined in `interfaces/research.ts`
- `UnlockedContent` tracked in `ResearchState.unlockedContent`: `{ rooms: string[], inhabitants: string[], abilities: string[], upgrades: string[], passiveBonuses: [] }`
- Query functions: `researchUnlockIsUnlocked(type, id)`, `researchUnlockIsResearchGated(type, id)`, `researchUnlockGetRequiredResearchName(type, id)`, `researchUnlockGetPassiveBonuses(bonusType)`
- `researchUnlock$` observable emits `{ nodeId, nodeName, unlocks }` — subscribed in `NotifyService` for toast notifications
- Research nodes reference content by UUID in YAML `unlocks[].targetId` — NOT auto-resolved by `rewriteDataIds()` because `targetId` doesn't match any content type name pattern
- Build-time validation in `gamedata-build.ts` checks all `targetId` references point to valid content IDs
- Room gating: `panel-room-select` uses `isResearchLocked(room)` to grey out and disable research-gated rooms with "Requires: [Research Name]" tooltip
- Inhabitant gating: `panel-altar` adds `researchLocked` and `researchRequirement` fields to `RecruitableEntry` — shows "Requires: [Research Name]" for locked creatures
- When adding new fields to `ResearchState`, all spec files with inline `ResearchState` objects must be updated (check with `grep researchState` or look for `research:` in `makeGameState` helpers)

## Torture Chamber / Prisoner System

- **Prisoners stored in `GameStateWorld.prisoners: CapturedPrisoner[]`** — persistent world-level storage, not per-room. Prisoners are captured during invasions (see `invasionRewardRollPrisonerCaptures`) and consumed by torture chamber processing.
- **`TortureJob` on `PlacedRoom`** — follows same pattern as `BreedingJob`, `MutationJob`, `SummonJob`: `{ prisonerId, action, ticksRemaining, targetTicks }`. Job types: `'extract'` (research gain) and `'convert'` (new inhabitant).
- **Conversion success rates** match `CONVERT_SUCCESS_RATES` in `invasion-rewards.ts` — warrior 30%, rogue 50%, mage 20%, cleric 10%, paladin 5%, ranger 35%. The torture chamber replicates these as `TORTURE_CONVERT_SUCCESS_RATES`.
- **Converted Prisoner inhabitant** has `restrictionTags: ['converted']` to exclude from recruitment panel, `workerEfficiency: 0.80` (-20% penalty), and `corruptionGeneration: 0.1`.
- **`tortureAdjacencyEffects`** — new optional field on `RoomDefinition` with `tortureSpeedBonus` and `tortureConversionBonus`. Added to Soul Well (speed +15%) and Barracks (conversion +10%).
- **Extra corruption during processing** — `TORTURE_CORRUPTION_PER_TICK_WHILE_PROCESSING = 0.12` added directly to `corruption.current` each tick while a job is active.
- **When adding new fields to `GameStateWorld`**, 16 spec files have `makeGameState` helpers that need updating. Some older spec files (invasion, hunger, corruption) were missing `forgeInventory`, `forgeCraftingQueues`, and `alchemyConversions` — add all missing fields when touching them.
