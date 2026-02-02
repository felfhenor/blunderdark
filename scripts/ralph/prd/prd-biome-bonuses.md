# PRD: Biome Bonuses

## Introduction
Each biome provides production bonuses to specific room types on its floor. Volcanic floors boost forges, flooded floors enhance lakes, crystal caves improve mines, corrupted floors amplify dark rooms, and fungal biomes boost groves. These bonuses incentivize building room types that synergize with the floor's biome.

## Goals
- Apply automatic production bonuses based on floor biome and room type
- Bonuses are percentage-based multipliers on room output
- Display active biome bonuses in the UI
- Bonuses stack with other modifier sources

## User Stories

### US-001: Biome Bonus Definitions
**Description:** As a developer, I want biome bonuses defined as data so that they are maintainable and testable.

**Acceptance Criteria:**
- [ ] Define bonus rules: biome type -> room type -> percentage bonus
- [ ] Volcanic: Forges +50% efficiency
- [ ] Flooded: Lakes +50% production
- [ ] Crystal Cave: Mines +40% output
- [ ] Corrupted: Dark rooms +100% Corruption generation
- [ ] Fungal: Groves +60% output
- [ ] Neutral: No bonuses
- [ ] Typecheck/lint passes

### US-002: Bonus Application to Production
**Description:** As a developer, I want biome bonuses to integrate with the resource production system so that affected rooms produce more.

**Acceptance Criteria:**
- [ ] Biome bonuses are applied as multipliers tagged with source `'biome'`
- [ ] Only rooms matching the biome's bonus room type receive the bonus
- [ ] Bonuses stack multiplicatively with other modifier sources
- [ ] Bonuses apply automatically (no player action needed)
- [ ] Typecheck/lint passes

### US-003: Biome Bonus Computation Helper
**Description:** As a developer, I want a helper function to compute biome bonuses so that logic is testable.

**Acceptance Criteria:**
- [ ] Create `getBiomeBonus(biome: BiomeType, roomType: string): number` returning the multiplier (e.g., 1.5 for +50%)
- [ ] Returns 1.0 for rooms not affected by the biome
- [ ] Returns 1.0 for neutral biome
- [ ] Function is pure
- [ ] Typecheck/lint passes

### US-004: Biome Bonus Display
**Description:** As a player, I want to see biome bonuses for the current floor so that I understand the benefits of each biome.

**Acceptance Criteria:**
- [ ] Show biome bonus in room detail panel when a room benefits from the biome
- [ ] Display format: "Biome Bonus: +50% (Volcanic)" next to production values
- [ ] Show biome bonuses in floor info panel as a summary
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Biome Bonus Unit Tests
**Description:** As a developer, I want tests for biome bonus calculations so that bonuses are verified.

**Acceptance Criteria:**
- [ ] Test: Forge on Volcanic floor returns 1.5 multiplier
- [ ] Test: Lake on Flooded floor returns 1.5 multiplier
- [ ] Test: Mine on Crystal Cave floor returns 1.4 multiplier
- [ ] Test: Non-matching room returns 1.0 multiplier
- [ ] Test: Neutral biome returns 1.0 for all rooms
- [ ] Tests in `src/app/helpers/biome-bonuses.spec.ts`
- [ ] All tests pass with `npm run test`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Each biome must grant production bonuses to specific room types.
- FR-2: Bonuses must be percentage-based multipliers.
- FR-3: Bonuses must integrate with the existing production modifier pipeline.
- FR-4: Active bonuses must be visible in the UI.

## Non-Goals (Out of Scope)
- Biome restrictions (covered by #52)
- Biome-specific visual effects on rooms
- Bonus stacking from multiple biomes (one biome per floor)
- Research to modify biome bonuses

## Technical Considerations
- Depends on Resource Production (#9) and Biome System (#51)
- Bonus configuration alongside restriction config
- Use the same modifier stacking approach as time-of-day and depth modifiers
- Helper in `src/app/helpers/biome-bonuses.ts`

## Success Metrics
- Production rates on biome floors match expected bonus values
- Bonuses display correctly in the UI
- Unit tests cover all biome/room combinations
- No performance impact from bonus calculations

## Open Questions
- Should "dark rooms" for Corrupted biome be an explicit list or a room tag?
- Can biome bonuses exceed 100%?
- Should bonuses scale with floor depth?
