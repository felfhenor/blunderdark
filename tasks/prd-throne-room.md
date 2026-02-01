# PRD: Throne Room

## Introduction
The Throne Room is a unique 4x4 square room that houses a single powerful ruler creature. It provides dungeon-wide bonuses based on which creature is seated on the throne. The room has variable fear depending on the ruler and benefits from adjacency to Vaults and central placement. Only one Throne Room can exist per dungeon.

## Goals
- Define the Throne Room as a unique 4x4 square room (only 1 per dungeon)
- Support exactly 1 inhabitant that must be a Unique-tier creature
- Apply dungeon-wide bonuses based on the seated ruler
- Implement variable fear level tied to the ruler
- Define adjacency bonuses for Vault and central placement

## User Stories

### US-001: Throne Room YAML Definition
**Description:** As a developer, I want the Throne Room defined in YAML gamedata with the unique constraint.

**Acceptance Criteria:**
- [ ] A `throne-room.yaml` file exists in `gamedata/rooms/`
- [ ] Fields include: id, name, description, shape (4x4 square), maxInhabitants (1), isUnique (true), sprite reference
- [ ] Inhabitant restriction: only creatures tagged as "Unique" tier can be assigned
- [ ] Fear level field is set to "variable" (derived from ruler)
- [ ] `npm run gamedata:build` compiles without errors
- [ ] Typecheck/lint passes

### US-002: Unique Room Enforcement
**Description:** As a developer, I want only one Throne Room per dungeon so that it feels special.

**Acceptance Criteria:**
- [ ] The room placement system checks for existing Throne Rooms before allowing placement
- [ ] If a Throne Room already exists, the build option is grayed out with an explanatory tooltip
- [ ] The uniqueness check is enforced at the data level, not just UI
- [ ] Unit test verifies placement is rejected when a Throne Room already exists
- [ ] Typecheck/lint passes

### US-003: Unique Creature Restriction
**Description:** As a player, I want only Unique creatures assignable to the Throne so that the ruler is always exceptional.

**Acceptance Criteria:**
- [ ] The inhabitant assignment UI only shows Unique-tier creatures for the Throne Room
- [ ] Non-Unique creatures cannot be assigned even programmatically
- [ ] If the current ruler is removed, the Throne Room provides no bonuses
- [ ] An empty Throne Room displays a "No Ruler" state
- [ ] Typecheck/lint passes

### US-004: Dungeon-Wide Bonus - Dragon Ruler
**Description:** As a developer, I want a Dragon on the throne to grant combat bonuses dungeon-wide.

**Acceptance Criteria:**
- [ ] Dragon ruler grants: +10% Attack to all defenders, +5% Fear in all rooms
- [ ] Bonuses are applied as computed modifiers to relevant signals
- [ ] Bonuses are removed when the Dragon is unassigned
- [ ] Unit test verifies bonus application and removal
- [ ] Typecheck/lint passes

### US-005: Dungeon-Wide Bonus - Lich Ruler
**Description:** As a developer, I want a Lich on the throne to grant research and magic bonuses dungeon-wide.

**Acceptance Criteria:**
- [ ] Lich ruler grants: +20% research speed, +15% Flux production
- [ ] Bonuses are applied as computed modifiers
- [ ] Bonuses are removed when the Lich is unassigned
- [ ] Unit test verifies bonus application and removal
- [ ] Typecheck/lint passes

### US-006: Dungeon-Wide Bonus - Demon Lord Ruler
**Description:** As a developer, I want a Demon Lord on the throne to grant corruption and fear bonuses.

**Acceptance Criteria:**
- [ ] Demon Lord ruler grants: +25% corruption generation, +10% Fear in all rooms, -10% invader starting morale
- [ ] Bonuses are applied as computed modifiers
- [ ] Bonuses are removed when the Demon Lord is unassigned
- [ ] Unit test verifies bonus application and removal
- [ ] Typecheck/lint passes

### US-007: Variable Fear Level
**Description:** As a developer, I want the Throne Room's fear level to depend on the seated ruler.

**Acceptance Criteria:**
- [ ] Empty Throne Room: fear level 1 (low)
- [ ] Dragon ruler: fear level 4 (high)
- [ ] Lich ruler: fear level 3 (medium-high)
- [ ] Demon Lord ruler: fear level 5 (very high)
- [ ] Fear level is a `computed()` signal derived from the current ruler
- [ ] Fear integrates with the fear propagation system
- [ ] Typecheck/lint passes

### US-008: Adjacency Bonus - Vault
**Description:** As a developer, I want the Throne Room to benefit from Vault adjacency so that placement near treasure is rewarded.

**Acceptance Criteria:**
- [ ] When adjacent to a Vault, the Throne Room grants an additional +5% gold production dungeon-wide
- [ ] Adjacency is detected using the existing adjacency system
- [ ] Bonus is recalculated when rooms are added or removed
- [ ] Unit test verifies adjacency bonus
- [ ] Typecheck/lint passes

### US-009: Adjacency Bonus - Central Placement
**Description:** As a developer, I want central Throne Room placement to grant a range bonus so that map positioning matters.

**Acceptance Criteria:**
- [ ] "Central" is defined as the Throne Room being within 5 tiles of the floor center
- [ ] Central placement grants: +10% to all dungeon-wide ruler bonuses
- [ ] The centrality check runs at placement time and when the floor layout changes
- [ ] Unit test verifies centrality bonus
- [ ] Typecheck/lint passes

### US-010: Throne Room UI
**Description:** As a player, I want the Throne Room to have a distinct UI showing the current ruler and bonuses.

**Acceptance Criteria:**
- [ ] Clicking the Throne Room shows: current ruler (or "Empty"), active bonuses, fear level
- [ ] Ruler portrait/sprite is displayed prominently
- [ ] Dungeon-wide bonuses are listed with their values
- [ ] An "Assign Ruler" button allows selecting from eligible Unique creatures
- [ ] Component uses OnPush change detection
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-011: Throne Room Unit Tests
**Description:** As a developer, I want comprehensive tests for the Throne Room mechanics.

**Acceptance Criteria:**
- [ ] Test: Only one Throne Room per dungeon
- [ ] Test: Only Unique creatures can be assigned
- [ ] Test: Dragon ruler bonuses apply correctly
- [ ] Test: Lich ruler bonuses apply correctly
- [ ] Test: Demon Lord ruler bonuses apply correctly
- [ ] Test: Empty throne provides no bonuses
- [ ] Test: Vault adjacency bonus
- [ ] Test: Central placement bonus
- [ ] Tests placed in `src/app/helpers/rooms/throne-room.spec.ts`
- [ ] All tests pass with `npm run test`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The Throne Room must be a unique 4x4 room (max 1 per dungeon).
- FR-2: Only Unique-tier creatures can be assigned as ruler.
- FR-3: Dungeon-wide bonuses must vary based on the seated ruler.
- FR-4: Fear level must dynamically reflect the current ruler.
- FR-5: Adjacency to Vault and central placement must grant additional bonuses.

## Non-Goals (Out of Scope)
- Throne Room combat during invasions (ruler defends normally)
- Ruler succession events or challenges
- Throne Room decorations or cosmetic customization
- Multiple rulers or council mechanics

## Technical Considerations
- Depends on room shape system (Issue #3) for 4x4 placement
- Depends on room data structure (Issue #5) for room definition
- Ruler bonuses should be implemented as global modifier signals in the game state
- Variable fear uses a `computed()` signal that reads the current ruler's fear contribution
- Centrality calculation uses Manhattan distance to floor center
- Unique creature tag must be defined on inhabitant data for filtering

## Success Metrics
- Throne Room loads and enforces uniqueness correctly
- Ruler bonuses are accurate and update reactively
- Fear level changes dynamically with ruler assignment
- Players find the Throne Room strategically valuable

## Open Questions
- What other Unique creatures can rule the throne beyond Dragon, Lich, Demon Lord?
- Should the Throne Room have upgrade levels?
- Does destroying the Throne Room during invasion have special consequences?
- Should the ruler provide a combat bonus when defending the Throne Room itself?
