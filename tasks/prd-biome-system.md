# PRD: Biome System

## Introduction
Each dungeon floor can have a biome type that affects what can be built, production bonuses, and visual theming. Five biome types exist: Volcanic, Flooded, Crystal, Corrupted, and Fungal. Floors can also be neutral (no biome). Biomes are assigned at floor creation and stored as part of floor data.

## Goals
- Define 5 biome types plus a neutral option
- Assign biome at floor creation (random or player-chosen)
- Store biome as part of floor data
- Provide a foundation for biome restrictions and bonuses
- Display biome information in the UI

## User Stories

### US-001: Biome Type Definitions
**Description:** As a developer, I want biome types defined as game data so that other systems can reference them.

**Acceptance Criteria:**
- [ ] Define `BiomeType` as a union type: `'volcanic' | 'flooded' | 'crystal' | 'corrupted' | 'fungal' | 'neutral'`
- [ ] Define `Biome` type with: type, name, description, color/theme
- [ ] Biome data stored in YAML gamedata or TypeScript constants
- [ ] Each biome has a display name and short description
- [ ] Typecheck/lint passes

### US-002: Biome Assignment at Floor Creation
**Description:** As a player, I want to choose or receive a random biome when creating a new floor so that each floor has unique characteristics.

**Acceptance Criteria:**
- [ ] Floor creation UI includes biome selection
- [ ] Player can choose a specific biome or select "Random"
- [ ] Random selection picks from all 5 biome types with equal probability
- [ ] "Neutral" is always available as an explicit choice
- [ ] Selected biome is stored on the floor data
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-003: Biome Storage in Floor Data
**Description:** As a developer, I want biome stored as part of floor data so that it persists and is accessible to other systems.

**Acceptance Criteria:**
- [ ] Add `biome` field to the `Floor` type
- [ ] Biome is set at floor creation and persists to IndexedDB
- [ ] Biome is immutable after floor creation (cannot be changed)
- [ ] Default biome for the starting floor is `'neutral'`
- [ ] Typecheck/lint passes

### US-004: Biome Information Display
**Description:** As a player, I want to see the biome of each floor so that I can plan my building strategy.

**Acceptance Criteria:**
- [ ] Floor selector shows biome icon/name next to each floor
- [ ] Floor detail panel shows biome description and effects summary
- [ ] Biome-specific color tinting on the floor selector entry
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Biome Query API
**Description:** As a developer, I want to query a floor's biome so that restriction and bonus systems can use it.

**Acceptance Criteria:**
- [ ] `FloorService.getFloorBiome(floorId: string): BiomeType` method
- [ ] `FloorService.currentFloorBiome` computed signal
- [ ] Biome data is accessible synchronously (no async loading)
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Five biome types must be defined: Volcanic, Flooded, Crystal, Corrupted, Fungal.
- FR-2: Each floor must have a biome assigned at creation (including neutral).
- FR-3: Biome must be immutable after floor creation.
- FR-4: Biome must be visible in the floor UI.
- FR-5: Biome data must be queryable by other services.

## Non-Goals (Out of Scope)
- Biome-specific room restrictions (covered by #52)
- Biome production bonuses (covered by #53)
- Visual biome theming on the grid (future enhancement)
- Biome evolution or transformation

## Technical Considerations
- Depends on Floor Creation System (#46) for floor data model
- Biome definitions could be YAML in `gamedata/` for consistency with content pipeline
- Consider adding biome sprites to `gameassets/` for UI icons
- Biome type should be a simple string union for easy serialization

## Success Metrics
- All 5 biomes plus neutral are selectable at floor creation
- Biome persists correctly across save/load
- Biome is displayed in floor UI
- Other systems can query biome data without issues

## Open Questions
- Should biome selection cost vary by biome type?
- Can biomes be discovered/unlocked or are all available from the start?
- Should there be a visual preview of the biome before selection?
