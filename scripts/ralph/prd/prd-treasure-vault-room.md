# PRD: Treasure Vault Room

## Introduction
The Treasure Vault is a Tier 2 economic room that provides a +50% Gold storage capacity bonus and generates passive Gold income. It uses a 3x3 square footprint, supports 1 inhabitant (upgradeable to 2), and has a medium base fear level due to Mimic risk. Adjacency bonuses with Altar and Trap Workshop rooms encourage fortified placement near the dungeon's core.

## Goals
- Implement a fully functional Treasure Vault room with 3x3 square layout
- Provide +50% Gold storage capacity bonus
- Generate passive Gold income
- Support 1 inhabitant with upgradeable capacity to 2
- Implement medium fear level with Mimic risk mechanic
- Define and implement adjacency bonuses for Vault+Altar, Vault+Trap Workshop

## User Stories

### US-001: Treasure Vault Room Definition
**Description:** As a developer, I want the Treasure Vault defined in YAML gamedata so that it is available through the content pipeline.

**Acceptance Criteria:**
- [ ] A `treasure-vault.yaml` file exists in the appropriate `gamedata/` directory
- [ ] Fields include: id, name, description, shape (3x3), storageBonus, passiveIncome, maxInhabitants, baseFearLevel, mimicRisk, upgradePaths, adjacencyBonuses
- [ ] The shape is a 3x3 square (9 tile offsets)
- [ ] The YAML compiles to valid JSON via `npm run gamedata:build`
- [ ] Typecheck/lint passes

### US-002: 3x3 Square Room Placement
**Description:** As a dungeon builder, I want to place the Treasure Vault as a 3x3 square room on the grid.

**Acceptance Criteria:**
- [ ] The Treasure Vault occupies a 3x3 square of tiles (9 tiles total)
- [ ] Placement validates that all 9 tiles are unoccupied
- [ ] The room renders correctly on the grid with the Vault sprite
- [ ] No rotation needed for a symmetric 3x3 shape
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Gold Storage Capacity Bonus
**Description:** As a dungeon builder, I want the Treasure Vault to increase my Gold storage capacity by 50% so that I can stockpile more Gold.

**Acceptance Criteria:**
- [ ] Building a Treasure Vault increases Gold storage cap by +50%
- [ ] The bonus is applied when the room is placed and removed if the room is demolished
- [ ] Multiple Treasure Vaults stack their bonuses
- [ ] The increased storage cap is reflected in the resource UI display
- [ ] Typecheck/lint passes

### US-004: Passive Gold Generation
**Description:** As a dungeon builder, I want the Treasure Vault to generate passive Gold over time without needing inhabitants.

**Acceptance Criteria:**
- [ ] The Vault generates a defined amount of Gold per minute (e.g., 2 Gold/min base)
- [ ] Passive generation occurs even with 0 inhabitants assigned
- [ ] Having an inhabitant assigned increases Gold generation (e.g., +100% per inhabitant)
- [ ] Gold generation is added to the Gold resource pool via ResourceManager
- [ ] Generation stops if Gold storage is at capacity
- [ ] Typecheck/lint passes

### US-005: Inhabitant Capacity
**Description:** As a dungeon builder, I want the Treasure Vault to hold 1 inhabitant (2 when upgraded) to boost Gold generation.

**Acceptance Criteria:**
- [ ] Base capacity is 1 inhabitant
- [ ] Attempting to assign a 2nd inhabitant is rejected with feedback
- [ ] After the capacity upgrade, the limit increases to 2
- [ ] Current/max inhabitant count is displayed on the room UI
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-006: Medium Fear Level (Mimic Risk)
**Description:** As a developer, I want the Treasure Vault to have medium fear due to the risk of Mimics lurking among the treasure.

**Acceptance Criteria:**
- [ ] The Vault's base fear level is set to Medium (2)
- [ ] Fear is thematically linked to "Mimic risk" in the description
- [ ] Fear level integrates with the fear tracking system
- [ ] Typecheck/lint passes

### US-007: Mimic Risk Event
**Description:** As a dungeon builder, I want a periodic Mimic risk event that can occur in the Treasure Vault.

**Acceptance Criteria:**
- [ ] A Mimic event has a small periodic chance to trigger (e.g., 5% per cycle)
- [ ] When triggered, a Mimic attacks the assigned inhabitant or steals Gold
- [ ] Having a combat-capable inhabitant assigned reduces or eliminates the risk
- [ ] Mimic events are logged in the game event feed
- [ ] Typecheck/lint passes

### US-008: Upgrade Path - Reinforced Vault
**Description:** As a dungeon builder, I want a reinforcement upgrade that increases storage bonus and eliminates Mimic risk.

**Acceptance Criteria:**
- [ ] Upgrade increases Gold storage bonus from +50% to +100%
- [ ] Upgrade eliminates Mimic risk entirely
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-009: Upgrade Path - Investment Vault
**Description:** As a dungeon builder, I want an investment upgrade that increases passive Gold generation.

**Acceptance Criteria:**
- [ ] Upgrade doubles passive Gold generation rate
- [ ] Upgrade increases max inhabitants from 1 to 2
- [ ] Upgrade has a defined resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-010: Upgrade Path - Dragon's Hoard
**Description:** As a dungeon builder, I want a prestige upgrade that provides a Fear aura and massive storage.

**Acceptance Criteria:**
- [ ] Upgrade increases Gold storage bonus to +200%
- [ ] Upgrade increases fear level to High (3), generating fear to deter invaders
- [ ] Upgrade has a high resource cost
- [ ] Choosing this path locks out alternatives at this tier
- [ ] Typecheck/lint passes

### US-011: Adjacency Bonuses
**Description:** As a dungeon builder, I want the Treasure Vault to receive adjacency bonuses from specific room types.

**Acceptance Criteria:**
- [ ] Vault + Altar adjacency: +25% passive Gold generation
- [ ] Vault + Trap Workshop adjacency: Mimic risk reduced by 50%, traps protect against Gold theft
- [ ] Bonuses are defined in gamedata and activate via the adjacency bonus system
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The Treasure Vault must be defined in YAML gamedata with all required fields.
- FR-2: The room must use a 3x3 square tile layout.
- FR-3: The Vault must provide +50% Gold storage capacity when placed.
- FR-4: Passive Gold generation must occur without requiring inhabitants.
- FR-5: Inhabitant capacity must be 1 (base) upgradeable to 2.
- FR-6: Three mutually exclusive upgrade paths must be implemented.
- FR-7: Adjacency bonuses for Vault+Altar, Vault+Trap Workshop must be defined.
- FR-8: Mimic risk events must trigger periodically with defined outcomes.

## Non-Goals (Out of Scope)
- Gold spending mechanics (handled by other systems)
- Mimic as a full inhabitant type (handled by Issue #53)
- Room placement UI generics (handled by earlier issues)
- Trap mechanics (handled by Trap Workshop)

## Technical Considerations
- Depends on room shape system (Issue #3), room data structure (Issue #5), and resource system (Issue #7).
- Gold storage capacity should be a computed value that sums base + all Vault bonuses.
- Passive generation should integrate with the game loop tick system.
- Mimic risk events should use a random number generator seeded per game tick.
- The storage bonus removal on demolish must be handled carefully to avoid negative storage.

## Success Metrics
- Treasure Vault correctly increases Gold storage capacity by 50%
- Passive Gold generation works with and without inhabitants
- Mimic risk events trigger at the correct rate
- All 3 upgrade paths function correctly and are mutually exclusive
- Adjacency bonuses activate correctly

## Open Questions
- What is the exact passive Gold generation rate?
- How does Mimic risk interact with the Mimic inhabitant type (Issue #53)?
- Should Gold overflow be handled if the Vault is demolished while at capacity?
- What happens to stored Gold if the Vault is destroyed during an invasion?
