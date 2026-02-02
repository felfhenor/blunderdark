# PRD: Biome Visual Theming

## Introduction
Blunderdark's dungeon spans multiple biomes (volcanic, flooded, crystalline, fungal, etc.), but currently these biomes lack distinct visual identities. This feature gives each biome a unique visual theme including floor tiles/backgrounds, color palettes, ambient particles, and UI indicators. The goal is for players to immediately recognize which biome they are viewing through visual cues alone.

## Goals
- Each biome has a unique floor/background tileset rendered in the dungeon view
- Each biome uses a distinct color palette applied to room backgrounds, borders, and UI elements
- Each biome has ambient visual particles (lava bubbles, water drops, crystal shimmers, fungal spores)
- The current biome name is displayed prominently in the game UI
- Biome visuals are defined in YAML gamedata and compiled via the content pipeline
- Biome transitions (moving between biome areas) are visually smooth

## User Stories

### US-001: Define Biome Visual Data in YAML
**Description:** As a content designer, I want to define each biome's visual properties (color palette, tileset reference, particle type, display name) in YAML so that biome visuals are data-driven and easy to modify.

**Acceptance Criteria:**
- [ ] Biome YAML schema includes fields: `id`, `name`, `displayName`, `colorPalette` (primary, secondary, accent, background), `tilesetId`, `ambientParticleType`
- [ ] At least 4 biomes defined: Volcanic, Flooded, Crystalline, Fungal
- [ ] YAML compiles successfully via `npm run gamedata:build`
- [ ] TypeScript types are generated via `npm run schemas:generate`
- [ ] Typecheck/lint passes

### US-002: Create Biome Tileset Assets
**Description:** As a developer, I want floor/background tile images for each biome so that the dungeon floor visually represents the biome.

**Acceptance Criteria:**
- [ ] Tile images created for each biome (at least 1 base tile per biome)
- [ ] Tiles are placed in `gameassets/` and included in sprite atlas generation
- [ ] Tiles are seamlessly tileable (edges match when repeated)
- [ ] Sprite atlas builds successfully via `npm run gamedata:art:spritesheets`
- [ ] Typecheck/lint passes

### US-003: Render Biome Floor Tiles in Dungeon View
**Description:** As a player, I want the dungeon floor to use the biome-specific tileset so that I can visually distinguish different biome areas.

**Acceptance Criteria:**
- [ ] The dungeon/room rendering system reads the biome's `tilesetId` from content data
- [ ] Floor tiles are rendered using `AtlasImageComponent` or equivalent
- [ ] Tiles tile seamlessly across the dungeon grid
- [ ] Different biome areas show their respective floor tiles
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-004: Apply Biome Color Palette to Room UI
**Description:** As a player, I want rooms in different biomes to use the biome's color palette for borders, backgrounds, and accents so that biome identity is reinforced.

**Acceptance Criteria:**
- [ ] Room components read the biome's color palette from content data
- [ ] Room card/tile borders use the biome's primary color
- [ ] Room card/tile backgrounds use the biome's background color (with appropriate opacity)
- [ ] Accent elements (icons, highlights) use the biome's accent color
- [ ] Colors are applied via CSS custom properties scoped to biome containers
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Display Biome Name in Game UI
**Description:** As a player, I want the current biome name displayed in the game UI (e.g., in the navbar or a status panel) so that I always know which biome I am viewing.

**Acceptance Criteria:**
- [ ] Biome display name is shown in a visible location (navbar, sidebar header, or breadcrumb)
- [ ] The name updates when the player navigates to a different biome area
- [ ] The biome name uses the biome's accent color for visual consistency
- [ ] The display is readable at all text scale levels (75%-150%)
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-006: Implement Biome Ambient Particles
**Description:** As a player, I want each biome to have subtle ambient particles so that environments feel alive (lava sparks in volcanic, water drops in flooded, etc.).

**Acceptance Criteria:**
- [ ] Each biome has an `ambientParticleType` that maps to a particle preset
- [ ] Volcanic: orange/red floating embers drifting upward
- [ ] Flooded: blue water droplets/bubbles drifting downward
- [ ] Crystalline: white/cyan sparkle/glint particles with stationary twinkle
- [ ] Fungal: green/yellow spores with slow random drift
- [ ] Particles are only active for biomes currently visible on screen
- [ ] Particles integrate with the particle system (from Issue #119) or a standalone lightweight implementation
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-007: Implement Biome Transition Visual
**Description:** As a player, I want a smooth visual transition when moving between biome areas so that the change is not jarring.

**Acceptance Criteria:**
- [ ] When navigating from one biome area to another, floor tiles crossfade or slide transition
- [ ] Color palette shifts smoothly (CSS transition on custom properties)
- [ ] Ambient particles fade out for the old biome and fade in for the new biome
- [ ] Transition duration is 300-500ms
- [ ] Typecheck/lint passes

### US-008: Ensure Biome Visuals Work with Accessibility Options
**Description:** As a player using colorblind mode or high contrast, I want biome visuals to remain distinguishable so that biomes are identifiable regardless of accessibility settings.

**Acceptance Criteria:**
- [ ] Biome color palettes remain distinguishable under all 3 colorblind modes
- [ ] Biome names (text labels) provide a non-color method of identification
- [ ] Floor tilesets have distinct patterns (not just colors) to aid identification
- [ ] High contrast mode does not wash out biome-specific coloring
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-009: Add Unit Tests for Biome Content Loading
**Description:** As a developer, I want tests verifying that biome visual data loads correctly from compiled JSON so that content pipeline changes do not break biome rendering.

**Acceptance Criteria:**
- [ ] Test verifies `ContentService` loads biome data with all required visual fields
- [ ] Test verifies each biome has a valid `colorPalette` with primary, secondary, accent, and background
- [ ] Test verifies each biome has a `tilesetId` that references a valid atlas entry
- [ ] Tests pass via `npm run test`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must support at least 4 visually distinct biome themes defined in YAML gamedata.
- FR-2: Each biome must have a unique floor tileset, color palette, and ambient particle type.
- FR-3: Room components must apply biome-specific colors via CSS custom properties.
- FR-4: The current biome name must be displayed in the game UI.
- FR-5: Biome visual data must be loaded via `ContentService` from compiled JSON.
- FR-6: Biome transitions must be visually smooth with fade/slide effects.
- FR-7: Biome visuals must remain distinguishable under all accessibility modes.

## Non-Goals (Out of Scope)
- Biome-specific music (covered by BGM system, Issue #117)
- Biome-specific sound effects (covered by Sound Effects, Issue #118)
- Biome-specific gameplay mechanics (this feature is visual only)
- Procedurally generated biome layouts
- More than 6 biome types in the initial implementation

## Technical Considerations
- The content pipeline (`scripts/` build scripts) must be extended to handle biome visual metadata in YAML and output it in compiled JSON.
- Sprite atlas generation (`npm run gamedata:art:spritesheets`) must include biome floor tiles from `gameassets/`.
- CSS custom properties (e.g., `--biome-primary`, `--biome-secondary`, `--biome-accent`, `--biome-bg`) can be set on biome container elements to cascade biome colors to child components.
- The `StageContent` type in `src/app/interfaces/content-stage.ts` may need to be extended with visual properties, or a separate `BiomeVisual` type created.
- Dependency on Issue #51 (biome system) means the underlying biome data model must exist before visual theming can be fully integrated.
- Biome ambient particles should integrate with the particle system from Issue #119 if available, or use a simpler standalone CSS animation approach.
- DaisyUI theme colors and biome colors should not conflict; biome colors are applied within the game content area, not to the overall UI chrome.

## Success Metrics
- Players can identify each biome type by visual appearance alone (without reading the name)
- All 4+ biomes have distinct floor tiles, color palettes, and ambient particles
- Biome transitions are smooth with no visual glitches
- Biome visuals work correctly with colorblind modes, high contrast, and text scaling
- Content creators can add new biomes by editing YAML without code changes

## Open Questions
- Should biome color palettes override DaisyUI theme colors within game content areas, or layer on top?
- How many tile variants per biome are needed to avoid visual repetition?
- Should rooms within a biome have biome-tinted sprites, or only the floor/background?
- Are there biomes beyond the initial 4 that should be planned for (e.g., Abyssal, Mechanical, Frozen)?
