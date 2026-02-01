# PRD: Biome Restrictions

## Introduction
Biomes restrict which rooms can be built on a floor. Volcanic floors cannot have water-based rooms, flooded floors cannot have fire/dark rooms, and so on. These restrictions force strategic decisions about floor specialization and encourage diverse dungeon layouts.

## Goals
- Enforce biome-specific room placement restrictions
- Validate room placement against the floor's biome before building
- Display clear feedback when a room is restricted
- Support biome-specific room limits (e.g., max 5 Crystal Mines)

## User Stories

### US-001: Restriction Data Definition
**Description:** As a developer, I want biome restrictions defined as data so that they are easy to maintain and extend.

**Acceptance Criteria:**
- [ ] Define restriction rules as a configuration map: biome type -> list of restricted room types
- [ ] Volcanic: Cannot build Underground Lake, Mushroom Grove
- [ ] Flooded: Cannot build Soul Well, Torture Chamber
- [ ] Crystal Cave: Max 5 Crystal Mines per floor
- [ ] Corrupted: Cannot build pure/harmony rooms (list TBD based on room roster)
- [ ] Fungal: No specific restrictions (but has bonuses)
- [ ] Neutral: No restrictions
- [ ] Typecheck/lint passes

### US-002: Room Placement Validation
**Description:** As a developer, I want room placement to check biome restrictions so that invalid rooms cannot be built.

**Acceptance Criteria:**
- [ ] Before placing a room, check the floor's biome against the restriction rules
- [ ] If room type is restricted by the biome, block placement
- [ ] If room type has a count limit (Crystal Mine cap), check current count on the floor
- [ ] Return a specific error message explaining why placement is blocked
- [ ] Typecheck/lint passes

### US-003: Restriction Feedback in Build UI
**Description:** As a player, I want to see which rooms I cannot build on the current floor so that I don't waste time trying.

**Acceptance Criteria:**
- [ ] In the room build menu, restricted rooms are grayed out or marked
- [ ] Hovering over a restricted room shows the reason (e.g., "Cannot build Underground Lake on Volcanic floors")
- [ ] Rooms at their biome limit show remaining count (e.g., "Crystal Mine 3/5")
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-004: Restriction Check Helper
**Description:** As a developer, I want a pure helper function for restriction checks so that it can be tested and reused.

**Acceptance Criteria:**
- [ ] Create `canBuildRoomOnFloor(roomType: string, biome: BiomeType, currentRoomCounts: Record<string, number>): { allowed: boolean; reason?: string }`
- [ ] Function handles both binary restrictions (allowed/not) and count limits
- [ ] Function is pure (no service dependencies)
- [ ] Typecheck/lint passes

### US-005: Restriction Unit Tests
**Description:** As a developer, I want tests for biome restriction validation so that rules are enforced correctly.

**Acceptance Criteria:**
- [ ] Test: Underground Lake blocked on Volcanic floor
- [ ] Test: Soul Well blocked on Flooded floor
- [ ] Test: Crystal Mine allowed up to 5 on Crystal Cave floor
- [ ] Test: Crystal Mine blocked at 5+ on Crystal Cave floor
- [ ] Test: All rooms allowed on Neutral floor
- [ ] Tests in `src/app/helpers/biome-restrictions.spec.ts`
- [ ] All tests pass with `npm run test`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Biome restrictions must prevent building specified room types on restricted floors.
- FR-2: Count-limited rooms must be capped at the biome-specific maximum.
- FR-3: Restricted rooms must be visually indicated in the build menu.
- FR-4: Restriction reasons must be communicated to the player.

## Non-Goals (Out of Scope)
- Biome bonuses (covered by #53)
- Room upgrades affected by biome
- Biome evolution that changes restrictions
- Override mechanics (research to bypass restrictions)

## Technical Considerations
- Depends on Room Placement (#4) and Biome System (#51)
- Restriction config could be in `gamedata/` YAML or TypeScript constants
- Integrate with existing room placement validation pipeline
- Types in `src/app/interfaces/`

## Success Metrics
- All biome restrictions are enforced correctly
- Players receive clear feedback on why a room cannot be built
- No restricted rooms can be placed through any code path
- Unit tests cover all restriction rules

## Open Questions
- Should Fungal biome have any restrictions?
- What rooms count as "pure/harmony" for Corrupted biome restriction?
- Can restrictions be lifted through research or special buildings?
