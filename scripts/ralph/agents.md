# Ralph Agent Patterns

Consolidated learnings for future iterations.

## Adding New Content Types

When adding a new content type (like `reputationaction`, `roomshape`, etc.):

1. Add the type to `ContentType` union in `src/app/interfaces/identifiable.ts`
2. Add `ensureX` initializer in `src/app/helpers/content-initializers.ts`
3. Create `gamedata/[type]/base.yml` folder with YAML content

Build script auto-discovers new folders in gamedata/ - no script changes needed.

## Adding Fields to GameStateWorld

When adding new fields to `GameStateWorld`:

1. Add the field to the interface in `src/app/interfaces/state-game.ts`
2. Add default factory in `src/app/helpers/defaults.ts` (e.g., `defaultSeasonState()`)
3. Update `defaultGameState()` to include the new field
4. Update `worldgenGenerateWorld()` in `worldgen.ts` to include the field
5. Migration is handled automatically by `merge(defaultGameState(), state)` in `migrate.ts`

## World Generation Configuration Pattern

When adding pre-worldgen configuration (like world seed or starting biome):

1. Create a module-level signal in `world.ts` to store the selection
2. Create setter/getter functions (e.g., `setStartingBiome()`)
3. If the option needs resolution (like 'random' -> actual value), add a resolve function
4. Call the resolve function in `worldgenGenerateWorld()` and pass to relevant defaults

## Helper Function Patterns

- **Pure functions** for testability: take state as input, return new state (grid, hallway, reputation helpers all follow this)
- **Computed signals** for derived state: `currentFloor`, `currentFloorBiome`, etc.
- **Default to safe values**: use `??` operator (e.g., `floor?.biome ?? 'neutral'`)

## Grid Coordinates

Grid uses **row-major indexing**: `grid[y][x]` - be careful with coordinate order.

## Content Retrieval Type Constraint

When using `getEntry<T>()`, the type must satisfy `T & IsContentItem`:

```typescript
getEntry<ReputationAction & IsContentItem>(actionId);
```

## Persistence

- `indexedDbSignal` auto-persists on `set()`/`update()` - no manual save needed
- `migrateGameState()` uses `merge()` from es-toolkit to fill missing fields from defaults
- **Array fields need explicit migration** — `merge()` merges arrays by index (not replace), which corrupts multi-element data like `floors[]`. Add a dedicated `migrateX()` function (like `migrateResources`, `migrateFloors`) and call it after `merge()` in `migrateGameState()`

## RxJS Event Pattern

For cross-cutting events (level-ups, season transitions, notifications):

1. Create a `Subject` in the helper file
2. Export a read-only observable (e.g., `reputationLevelUp$`)
3. Subscribe in service `init()` method for UI reactions

## Testing Helper Functions That Call Other Helpers

When testing functions that depend on other helper modules (e.g., `createFloor` calling `canAfford`/`payCost`):

1. Use `vi.fn()` wrappers instead of inline mock implementations for controllable return values per test
2. Mock the dependency module: `vi.mock('@helpers/resources', () => ({ canAfford: (...args) => mockCanAfford(...args) }))`
3. Use `beforeEach` to set default mock return values, override in individual tests as needed
4. For `updateGamestate`, capture the updater function via `mockUpdateGamestate.mock.calls[0][0]` and execute it to verify state transformations

## Import Rules

Lint rule `typescript-paths/absolute-import` requires `@helpers/x` not `./x` in test imports.

## DaisyUI Theming

- Theme variables: `var(--b3)`, `var(--p)`, `var(--s)`, `var(--pf)`
- Progress bar colors: `progress-error`, `progress-warning`, `progress-info`, `progress-success`
- OKLCH format: `oklch(var(--wa))` for warning color, etc.

## Adding Fields to GridTile

When adding new fields to `GridTile`:

1. Update `createEmptyGrid()` in `grid.ts`
2. Fix any `toEqual` assertions in `grid.spec.ts` that check tile structure

## Research Tree YAML Conventions

- UUID pattern per branch: dark=`aa000001`, arcane=`aa000002`, engineering=`aa000003`
- Each branch uses a thematic secondary resource: Dark=essence, Arcane=flux, Engineering=gold
- Cost scaling pattern across tiers: T1=10 research, T2=25/5, T3=50/15, T4=100/30/15 tertiary, T5=200/60/30, T6=400/120/60
- Root nodes (tier 1) are defined in `base.yml`; branch-specific nodes (tier 2+) go in `dark.yml`, `arcane.yml`, `engineering.yml`
- Tree structure: 3 paths from root at tier 2, specializations at tier 3, cross-path combinations at tier 4, convergence at tier 5-6

## Gamedata Build-Time Validation

When adding build-time validation for a content type:

1. Add a validation function (e.g., `validateResearchTree()`) to `scripts/gamedata-build.ts`
2. Call it between `processFiles()` and `rewriteDataIds()` — data is loaded but IDs haven't been rewritten
3. Access data via `allData['contenttype']` — contains all entries from all YAML files merged
4. On failure: `console.error()` + `process.exit(1)` to halt the build
5. Research prerequisites use raw UUIDs (not name references) because `rewriteDataIds` only transforms keys matching content type folder names

## Gamedata Notes

- `public/json/` is gitignored (generated output) - only commit YAML source files
- Empty YAML files cause non-fatal "doc is not iterable" errors - pre-existing issue
- Use separate folders for different content types to avoid build script merging issues

## Random Selection

Use `rngChoice(array)` from `@helpers/rng` for equal-probability random selection.

## Biome Data

`BIOME_DATA` in `@interfaces/biome` provides display info (name, description, color) for UI rendering.

## Creating Panel Components

When creating new panel components for the game-play sidebar:

1. Create component in `src/app/components/panel-[name]/` with `.ts`, `.html`, `.scss` files
2. Use `ChangeDetectionStrategy.OnPush` in the component decorator
3. Import and add to `game-play.component.ts` imports array
4. Add `<app-panel-[name] />` to the sidebar div in `game-play.component.html`
5. Use DaisyUI card structure: `card > card-body > card-title` for consistent styling

## Confirmation Dialogs (SweetAlert2)

Use `@sweetalert2/ngx-sweetalert2` for confirmation dialogs:

1. Import `SweetAlert2Module` in the component's `imports` array
2. Add `[swal]="mySwal"` directive on the trigger button
3. Add `<swal #mySwal title="..." (confirm)="onConfirm()"></swal>` in the template
4. The `(confirm)` event fires only when user clicks the confirm button

## Dynamic Styling with CSS Variables

Pass colors from templates to SCSS using CSS custom properties:

```html
<div [style.--my-color]="getColor()"></div>
```

```scss
.element {
  border-color: var(--my-color);
}
```

## Placement Preview Pattern

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

## OKLCH Colors in Angular

OKLCH color format works in SCSS files — the Angular compiler converts them to browser-compatible formats. Example: `oklch(0.65 0.2 145)` compiles to `rgb(17, 173, 50)`.

## Production System Integration

- `processProduction(state)` mutates `state.world.resources` in-place within the `updateGamestate` callback — safe in tick mode (same pattern as clock mutation)
- `calculateTotalProduction(floors)` builds adjacency maps on-the-fly per floor using `resolveRoomShape` + `getAbsoluteTiles` + `areRoomsAdjacent`
- Production formula: `Final = Base * (1 + inhabitantBonus + adjacencyBonus) * conditionalModifier`
- TypeScript requires bracket notation for `Partial<Record<string, number>>` index access: `production['crystals']` not `production.crystals`
- `Object.entries()` on `Partial<Record<string, number>>` returns `[string, number | undefined][]` — must check `!amount` before comparisons
- `productionRates` computed signal — aggregate per-tick rates, reactively updates from `gamestate().world.floors`
- `productionPerMinute(perTickRate)` — multiply by `TICKS_PER_MINUTE` (5) for display
- `calculateSingleRoomProduction(room, floor)` — per-room production with all bonuses/modifiers
- `getRoomProductionRates(roomId)` — finds room across floors, returns its individual production
- Importing `gamestate` from `@helpers/state-game` in helper files is safe — no circular dependency with the production module chain

## Efficiency Calculation System

- `efficiency.ts` imports `getRoomDefinition` from `production.ts` (one-way, safe) — do NOT import from efficiency.ts in production.ts to avoid circular dependency
- `calculateInhabitantBonus` in production.ts already handles trait-room matching via `targetResourceType` — efficiency.ts provides a separate breakdown for UI display
- Trait-room matching: traits with `targetResourceType` only apply when the room produces that resource; `undefined` or `'all'` traits apply to any room
- `InhabitantTrait` has optional `targetResourceType?: string` field — existing traits without it always apply (backwards compatible)
- `calculateRoomEfficiency(room, inhabitants)` returns per-inhabitant breakdown for UI, while `calculateInhabitantBonus` returns a single bonus number for production
- When mocking `gamestate()` in tests with partial state, cast through `unknown` first: `as unknown as ReturnType<typeof gamestate>`

## Room Placement

- `placeRoomOnFloor(floor, room, shape)` — pure function that validates placement, marks grid tiles, and adds room to floor. Returns updated Floor or null.
- `removeRoomFromFloor(floor, roomId, shape)` — pure function that clears grid tiles and removes room. Takes shape as parameter to stay pure/testable.
- `placeRoom(roomTypeId, shapeId, anchorX, anchorY)` — async wrapper using `updateGamestate` on current floor
- `removeRoom(roomId)` — async wrapper resolving shape via content lookup
- Pure functions are testable without mocking gamestate or content — keep data manipulation separate from signal/state access
- Grid tiles use `[y][x]` indexing — `newGrid[t.y][t.x]` not `newGrid[t.x][t.y]`

## Room Placement Mode

- `selectedRoomTypeId` signal — tracks which room type is selected for placement (null when not in placement mode)
- `enterPlacementMode(roomTypeId, shape)` — sets selectedRoomTypeId + placementPreviewShape
- `exitPlacementMode()` — clears selectedRoomTypeId + preview signals
- `executeRoomPlacement(x, y)` — full async flow: validate → check cost → pay → place → returns `{ success, error? }`
- Panel component uses `isSelected(roomId)` to highlight the active room type
- Clicking an already-selected room toggles off placement mode (same click to deselect)
- After successful placement, player stays in placement mode for rapid building (no auto-exit)
- Importing `canAfford`/`payCost` from `@helpers/resources` and `getEntry` from `@helpers/content` in room-placement.ts is safe (no circular deps)

## Shape Preview in Panels

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

## Room Visual Representation

- Room colors assigned per `roomTypeId` (not per room instance) — all rooms of the same type share a color
- `roomInfoMap` computed signal maps room instance IDs to `{color, name}` for O(1) lookup per tile
- Room name label rendered only on the anchor tile (first tile of the room shape) via `isRoomAnchor(x, y, roomId)`
- CSS custom property `--room-color` passed from template to SCSS for per-room dynamic coloring
- `color-mix(in oklch, var(--room-color) 80%, black)` creates a darker border from the room color

## Connection System

- Connections stored per-floor in `Floor.connections: Connection[]` — bidirectional links between adjacent rooms
- `Connection` type: `{ id, roomAId, roomBId, edgeTiles: TileOffset[] }`
- Query functions use `currentFloor()` and iterate connections — no adjacency map needed for connections (they're explicit, not geometric)
- When adding fields to `Floor` type, update: (1) `defaultFloor()`, (2) `migrateFloors()`, (3) all `makeFloor()` test helpers in spec files (production.spec.ts, room-placement.spec.ts, floor.spec.ts)
- `addConnectionToFloor` returns null for duplicates — always check return value
- `validateConnection(floor, roomAId, roomBId)` checks: self-connection, room existence, adjacency, duplicates — returns `{ valid, error?, edgeTiles? }`
- `createConnection(roomAId, roomBId)` validates internally and auto-computes edge tiles — no `edgeTiles` param needed
- Edge tiles are computed via `getSharedEdges(tilesA, tilesB)` from adjacency.ts — returns `[tileFromA, tileFromB]` pairs
- `getAdjacentUnconnectedRooms(floor, roomId)` — returns IDs of adjacent rooms without an existing connection
- `getRoomConnections(floor, roomId)` — returns Connection[] for all connections involving a room
- Production system uses geometric adjacency (tile positions) NOT the connection system for adjacency bonuses — connections are a separate layer for logical linking

## Doorway Rendering Pattern

For rendering visual indicators on tile edges (like doorway connections):

1. Build a `Map<string, Set<string>>` computed signal from data (e.g., connections + grid)
2. Key: `"x,y"` string, Value: Set of directions (`'top'|'right'|'bottom'|'left'`)
3. For shared edges, add indicators to BOTH tiles — one direction on the roomA tile, the opposite on the roomB tile
4. Direction determined by checking which neighbor in the grid has the target `roomId`
5. Template: use `@if (getMethod(x, y); as dirs)` + `dirs.has('top')` to conditionally render
6. CSS: absolute positioned bars at 60% width, 3px thick — visible at ~30px tile sizes
7. `pointer-events: none` prevents doorway indicators from capturing mouse events

## Build Mode Mutual Exclusion

When multiple build modes exist (room placement, hallway build):

1. Each mode has its own helper file with enter/exit functions and signal state
2. `enterX()` calls `exitY()` for all other modes — one-way import direction (hallway-placement.ts → room-placement.ts)
3. UI components handle the reverse direction: `selectRoom()` calls `exitHallwayBuildMode()` before `enterPlacementMode()`
4. Grid component's Escape/right-click handlers check modes in priority order (hallway first, then room placement, then deselect)
5. This avoids circular dependencies between helper files

## Hallway Pathfinding Pattern

BFS pathfinding for hallways between rooms:

1. Find empty tiles adjacent to source room (start set) and destination room (end set)
2. BFS from start set through unoccupied tiles to any tile in end set
3. Adjacent rooms (sharing an edge) still have valid hallway paths — the empty tiles around them don't overlap, so BFS finds a route through neighboring empties
4. Block hallway between same room (self-connection returns null)
5. `hallwayPreviewTileSet` uses `Set<string>` of `"x,y"` keys for O(1) per-tile lookup (same pattern as placement preview)
6. Click handler (`handleHallwayTileClick`) uses step-based state machine: `selectSource → selectDestination → preview`
7. In preview step, clicking a different room updates destination (re-pathfinds)

## Synergy Tooltip Pattern

- `SynergyTooltipComponent` is a sidebar panel (not a hover tooltip) that reads `selectedTile()` and `currentFloor()` via computed()
- Builds adjacency map internally (same pattern as production.ts) to evaluate synergies for the selected room
- `getPotentialSynergiesForRoom()` filters synergies where roomType matches but other conditions aren't met — returns missing conditions as human-readable strings
- `formatSynergyEffect()` formats effect values for display (e.g., "+15% crystals production")
- `describeCondition()` uses `getRoomDefinition()` from production.ts to get room names for condition descriptions
- When testing `synergy.ts` functions that import from `@helpers/production`, add `vi.mock('@helpers/production')` to provide `getRoomDefinition` — the mock must be placed before imports (hoisted by vitest)

## Adding Rooms via YAML

- Room definitions live in `gamedata/room/base.yml`; room shapes in `gamedata/roomshape/base.yml`
- If a room references a shapeId that doesn't exist, create the shape first — the build will succeed but the room won't render
- Production values in YAML are **per tick**. With `TICKS_PER_MINUTE = 5`, divide desired per-minute rate by 5 (e.g., 3 research/min = 0.6/tick)
- `workerEfficiency` affects production via `totalBonus += workerEfficiency - 1.0` — a skeleton with `workerEfficiency: 0.7` applies a -0.3 penalty, so `0.6 base * (1 - 0.3) = 0.42` actual
- `fearIncrease` is a valid upgrade effect type for room upgrades (used by Forbidden Knowledge) — data-only for now, will be wired when fear system is implemented
- Test pattern for room-specific specs: mock `@helpers/content` with inline room/shape/inhabitant data, then test production, adjacency, upgrades via imported helper functions
- When a PRD references systems that don't exist yet (e.g., corruption, skeleton spawning), implement what fits in current architecture and mark deferred stories with notes explaining dependencies
- Passive rooms (`requiresWorkers: false`) still apply worker bonuses/penalties if inhabitants are assigned — `calculateInhabitantBonus` runs regardless of `requiresWorkers`, which only controls the "zero workers = zero production" gate
- Reuse existing shapes when possible rather than creating duplicates (e.g., Soul Well uses existing 3x3 square `60e19fcd`)

## Training System

- `training.ts` helper: `processTraining(state)` runs each tick inside `updateGamestate` — mutates `state.world.inhabitants` in-place (same pattern as `processProduction`)
- `TRAINING_GROUNDS_TYPE_ID = 'aa100001-0001-0001-0001-000000000012'`
- `BASE_TRAINING_TICKS = TICKS_PER_MINUTE * 5` (25 ticks = 5 game-minutes)
- Training fields on `InhabitantInstance` are **optional** (`trained?`, `trainingProgress?`, `trainingBonuses?`) to avoid breaking existing test mocks
- `deserializeInhabitants()` provides defaults for training fields via `??` — backwards-compatible
- Training adjacency effects checked directly in training.ts (not via YAML adjacency bonus system): Barracks -20% time, Altar +1 all stats
- New upgrade effect types: `trainingAttackBonus`, `trainingTimeMultiplier`, `trainingDefenseBonus` — handled in training.ts
- `trainingCompleted$` observable emits on training completion — subscribe in service for notifications
- When adding optional fields to shared types (InhabitantInstance), prefer `?:` over required to avoid cascade updates across all test files
- `getAdjacentRoomTypeIds(room, floor, tileMap?)` is a reusable function returning `Set<string>` of adjacent room type IDs

## Trap System

- Trap definitions in `gamedata/trap/base.yml` — 5 types: Pit, Arrow, Rune, Magic, Fear Glyph
- UUID prefix for traps: `aa800001-0001-0001-0001-00000000000X`
- `TrapDefinition` (content type) vs `TrapInstance` (runtime placed trap) vs `TrapInventoryEntry` (unplaced inventory)
- `TrapInstance` stored per-floor in `Floor.traps: TrapInstance[]` — similar to `Floor.hallways`
- `TrapInventoryEntry[]` stored in `GameStateWorld.trapInventory` — player's unplaced trap stock
- Trap placement: hallway tiles only, max 1 trap per tile, validated via `canPlaceTrap(floor, tileX, tileY)`
- Trap trigger: `rollTrapTrigger(trap, isRogue, roll)` — deterministic given a roll value for testability
- Rogue disarm: 60% chance to disarm instead of trigger, except `canBeDisarmed: false` traps (Rune Trap)
- Fear Glyph: only trap with `effectType: 'fear'` — applies 10 morale penalty in addition to damage
- `processTraps(state)` is a no-op hook for future tick-based trap mechanics — traps are event-driven (invasions)
- When adding fields to `Floor` type, must update ALL `makeFloor()` test helpers across ~15 spec files

## Adding Fields to Floor Type

When adding a new required field to the `Floor` type:

1. Add to interface in `src/app/interfaces/floor.ts`
2. Add default in `defaultFloor()` in `src/app/helpers/defaults.ts`
3. Add migration in `migrateFloors()` in `src/app/helpers/floor.ts` (`saved.field ?? base.field`)
4. Update ALL `makeFloor()` helpers in spec files (~15 files) to include the new field
5. No changes needed to `worldgen.ts` if it uses `defaultFloor()`

## Trap Workshop / Crafting Queue System

- `trap-workshop.ts` helper: `processTrapCrafting(state)` runs each tick inside `updateGamestate` — mutates crafting queues in-place (same pattern as production/training)
- `TRAP_WORKSHOP_TYPE_ID = 'aa100001-0001-0001-0001-000000000013'`
- `BASE_CRAFTING_TICKS = TICKS_PER_MINUTE * 3` (15 ticks = 3 game-minutes)
- Crafting queues stored globally in `GameStateWorld.trapCraftingQueues: TrapCraftingQueue[]` (not per-floor)
- Each queue maps to a room by `roomId`, contains an ordered list of `TrapCraftingJob` objects
- Only the first job in each queue progresses each tick (FIFO processing)
- Worker speed bonus: each additional worker beyond first reduces time by 20%, capped at 0.4 multiplier (60% max reduction)
- New upgrade effect types: `craftingSpeedMultiplier`, `craftingCostMultiplier`, `craftingBonusDamage` — handled in trap-workshop.ts
- `canQueueTrap(roomId, floors)` validates: room is Trap Workshop, has at least 1 assigned inhabitant
- `getCraftingCostForRoom(placedRoom, baseCost)` applies cost multiplier upgrades to resource costs
- `getCraftingTicksForRoom(placedRoom, workerCount)` applies speed multiplier upgrades + worker bonus
- `getTrapWorkshopInfo(roomId, state)` returns full workshop state for UI rendering
- When mocking `@helpers/content` in trap-workshop tests, provide both `getEntriesByType` and `getEntry` mocks

## Invader System

- Invader definitions in `gamedata/invader/base.yml` — 6 classes: Warrior, Rogue, Mage, Cleric, Paladin, Ranger
- UUID prefix for invaders: `aa900001-0001-0001-0001-00000000000X`
- `InvaderDefinition` (content type) vs `InvaderInstance` (runtime with HP, status effects, ability states)
- `InvaderInstance.abilityStates: AbilityState[]` — reuses the same AbilityState type from combat system
- `InvaderInstance.statusEffects: StatusEffect[]` — tracks named effects with durations (shielded, marked, courage, etc.)
- `resolveInvaderAbility(invader, ability, targetIds, rng)` — pure function returning `AbilityResult | null`
- AbilityResult: `{ effectType, value, duration, targetIds, cooldownApplied }` — caller applies results
- Invader abilities are CombatAbility entries referencing AbilityEffectDefinition by name via `effectType`
- New ability effects: Heal, Disarm, Magic Damage, Dispel, Fear Immunity, Scout, Mark
- New combat abilities: Shield Wall, Disarm Trap, Backstab, Arcane Bolt, Dispel, Heal, Turn Undead, Smite Evil, Aura of Courage, Scout, Mark Target
- **Mock content collision warning**: When mocking `@helpers/content` in tests, do NOT register abilities by name if effect names overlap (e.g., "Scout" effect vs "Scout" ability) — register abilities by ID only
- `createInvaderInstance(definition)` looks up ability IDs via `getEntry` to initialize ability states
- Cooldown/status helpers: `applyCooldown`, `tickCooldowns`, `applyStatusEffect`, `tickStatusEffects`, `hasStatusEffect`, `clearStatusEffects`, `applyHealing`

## Pathfinding System

- `pathfinding.ts` helper: `buildDungeonGraph(floor, roomFearLevels)` creates graph from Floor's rooms, connections, and hallways
- `DungeonGraph` uses adjacency list: `Map<string, PathEdge[]>` keyed by room ID
- `PathNode` stores roomId, roomTypeId, x/y (anchor), fearLevel
- `findPath(graph, start, goal, options)` — Dijkstra's algorithm (NOT A* with Manhattan, because rooms connect at arbitrary distances via hallways making Manhattan inadmissible)
- Fear cost: when `morale < room.fearLevel`, edge cost is `baseCost * fearCostMultiplier` (default 3x)
- `PathfindingOptions`: `morale`, `fearCostMultiplier`, `blockedNodes: Set<string>`
- `findPathWithObjectives(graph, start, primaryGoal, secondaryObjectives, options)` — detours to secondary if cost < 2x direct path
- `recalculatePath(graph, current, goal, newBlockedNode, options)` — adds blocked node and re-pathfinds
- Empty path = no valid route (invader enters 'confused' state)
- Both connections and hallways create bidirectional edges with baseCost 1
- Graph is rebuilt when floor state changes (not incremental) — fast enough for ≤400 nodes

## Invasion Trigger System

- `invasion-triggers.ts` helper: `processInvasionSchedule(state, rng?)` runs each tick inside `updateGamestate` — mutates `state.world.invasionSchedule` in-place
- `InvasionSchedule` stored in `GameStateWorld.invasionSchedule` — auto-persisted via IndexedDB
- Grace period: 30 days (configurable via `gracePeriodEnd` field), no invasions before it ends
- Escalating intervals: 15 days (day 30-59), 10 days (day 60-99), 7 days (day 100+), minimum 5 days
- Variance: +/- 2 days determined at scheduling time (not re-rolled), cannot push before grace period, min 3 days between invasions
- Warning: fires 2 game-minutes before invasion day start (day N, hour 0, minute 0) via `notify('Invasion', ...)` — dismissible via `warningDismissed` flag
- Special invasions: `addSpecialInvasion(schedule, type, currentDay, delay?)` — bypasses normal schedule, types: 'crusade' | 'raid' | 'bounty_hunter'
- Past-due handling: `shouldTriggerInvasion` uses `>=` so loading a save past the scheduled day triggers immediately
- Computed signals: `nextInvasionDay`, `invasionWarningActive`, `isInGracePeriodSignal`, `invasionGracePeriodEnd`, `invasionHistory`
- RNG: pass `PRNG` (seedrandom) for testability, defaults to `rngRandom()` in production
- `NotificationCategory` type extended with `'Invasion'` for warning notifications

## Invasion Composition System

- `invasion-composition.ts` helper: `calculateDungeonProfile(state)` → `DungeonProfile` with corruption/wealth/knowledge (0-100), size, threatLevel
- Composition weights stored in YAML: `gamedata/invasion/composition-weights.yml` — content type `'invasion'`
- Weight profiles: balanced (all equal), highCorruption (Paladin+Cleric), highWealth (Rogue+Warrior), highKnowledge (Mage+Ranger)
- `getCompositionWeights(profile, config)` — if any dimension >60, uses corresponding weight profile; multiple highs get averaged
- `selectPartyComposition(profile, defs, weights, seed)` — pure function returning `InvaderDefinition[]`, testable without content mocks
- `generateInvasionParty(profile, seed)` — wraps selectPartyComposition + createInvaderInstance for full `InvaderInstance[]`
- Party size: 3-5 (≤10 rooms), 6-10 (11-25 rooms), 11-15 (26+ rooms)
- Constraints: at least 1 warrior, no class >50% of party, balanced profiles have 3+ unique classes
- `ensureClassDiversity()` swaps members of the most-represented class with missing classes
- Profile calculation: corruption = resource + soul wells, wealth = gold ratio + treasure rooms, knowledge = research nodes + library rooms
- Room type IDs used: Shadow Library (000004), Soul Well (000005), Treasure Vault (000008), Crystal Mine (000002), Ley Line Nexus (000011)
- For statistical composition tests, run 50 iterations and check aggregate ratios (>40% threshold)
- `findLastIndex` not available in target — use manual reverse loop instead

## Adding Fields to GameStateWorld (Updated)

When adding new fields to `GameStateWorld`:

1. Add the field to the interface in `src/app/interfaces/state-game.ts`
2. Add default factory in `src/app/helpers/defaults.ts` (e.g., `defaultInvasionSchedule()`)
3. Update `defaultGameState()` to include the new field
4. Update `worldgenGenerateWorld()` in `worldgen.ts` to include the field
5. Update `makeGameState()` helpers in test files that construct full GameState objects (production.spec.ts, training.spec.ts, trap-workshop.spec.ts, invasion-triggers.spec.ts)
6. Migration is handled automatically by `merge(defaultGameState(), state)` in `migrate.ts`

## Invasion Objectives System

- `invasion-objectives.ts` helper: `assignInvasionObjectives(state, seed)` returns 1 primary (DestroyAltar) + 2 secondary objectives
- 7 secondary templates: SlayMonster, StealTreasure, DefileLibrary, SealPortal, PlunderVault, RescuePrisoner, ScoutDungeon
- Each template has `isEligible(state)` and `getTargetId(state)` — eligibility checked against game state (room types, inhabitants)
- SlayMonster targets tier 2+ inhabitants — must look up `InhabitantDefinition` via `getEntry()` since `InhabitantInstance` has no `tier` field
- `InhabitantInstance` uses `instanceId` (NOT `id`) for targeting
- `resolveInvasionOutcome(objectives)` — altar destroyed = defeat (multiplier 0); victory = 1.0 + 0.25 per prevented - 0.25 per completed secondary
- Progress calculators: `calculateSlayMonsterProgress(currentHp, maxHp)`, `calculateStealTreasureProgress(goldLooted, goldTarget)`, `calculateSealPortalProgress(turnsSpent, turnsRequired)`
- Room type IDs for objectives: Altar (000009), Treasure Vault (000008), Shadow Library (000004), Ley Line Nexus (000011), Soul Well (000005)
- When mocking `@helpers/content` for inhabitant tier lookups, use a `Map<string, unknown>` and `registerInhabitantDefs()` helper

## GameState Type Gotchas

- Season type is `'growth' | 'harvest' | 'darkness' | 'storms'` (NOT 'spring'/'summer' etc.)
- ResearchState fields: `completedNodes`, `activeResearch`, `activeResearchProgress`, `activeResearchStartTick` (NOT `unlockedNodeIds`/`activeResearchId`)
- `GameStateWorld` has both top-level `grid` and `floors[].grid` — the top-level grid is **legacy**; always use `currentFloor()?.grid` for room operations
- Module-level constants/functions must be placed BEFORE the `@Component` decorator — placing them between decorator and class causes compilation error
