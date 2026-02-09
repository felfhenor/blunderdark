# Ralph Agent Patterns

Consolidated learnings from progress.txt for future iterations.

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

## GameState Type Gotchas

- Season type is `'growth' | 'harvest' | 'darkness' | 'storms'` (NOT 'spring'/'summer' etc.)
- ResearchState fields: `completedNodes`, `activeResearch`, `activeResearchProgress`, `activeResearchStartTick` (NOT `unlockedNodeIds`/`activeResearchId`)
- `GameStateWorld` has both top-level `grid` and `floors[].grid` — the top-level grid is **legacy**; always use `currentFloor()?.grid` for room operations
- Module-level constants/functions must be placed BEFORE the `@Component` decorator — placing them between decorator and class causes compilation error
