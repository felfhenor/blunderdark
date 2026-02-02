# PRD: Room Upgrade System

## Introduction
The room upgrade system provides a UI and underlying logic for upgrading rooms along mutually exclusive upgrade paths. Players can view available upgrades, see costs, choose a path (which locks out alternatives), and apply upgrades immediately. Upgrades are tiered, with Tier 1 upgrades unlocking Tier 2 options. Upgraded rooms display a visual indicator.

## Goals
- Provide a clear upgrade UI for each room
- Display available upgrades with costs and effects
- Enforce mutually exclusive upgrade path choices
- Support tiered upgrades (Tier 1 unlocks Tier 2)
- Apply upgrade effects immediately upon purchase
- Show visual indicators on upgraded rooms

## User Stories

### US-001: Upgrade Panel UI
**Description:** As a dungeon builder, I want to open an upgrade panel for a room so that I can see my upgrade options.

**Acceptance Criteria:**
- [ ] Clicking/selecting a room shows an "Upgrades" tab or button
- [ ] The upgrade panel lists all available upgrade paths for the room
- [ ] Each path shows its name, description, cost, and effect
- [ ] Already-chosen upgrades are highlighted; locked-out paths are grayed out
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-002: Display Upgrade Costs
**Description:** As a dungeon builder, I want to see the resource cost of each upgrade so that I can plan my spending.

**Acceptance Criteria:**
- [ ] Each upgrade shows its cost in the relevant resource type(s)
- [ ] The player's current resource balance is shown for comparison
- [ ] Affordable upgrades have an active "Purchase" button
- [ ] Unaffordable upgrades have a disabled button with "Insufficient resources"
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-003: Mutually Exclusive Path Selection
**Description:** As a dungeon builder, I want choosing one upgrade path to lock out the alternatives so that my choices are meaningful.

**Acceptance Criteria:**
- [ ] Selecting an upgrade path shows a confirmation dialog
- [ ] After confirming, the chosen path is applied and alternatives are permanently locked
- [ ] Locked paths show a "Locked" indicator with a reason (e.g., "Chose Efficiency Path")
- [ ] The lock is permanent and persists across save/load
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-004: Tiered Upgrade Unlocking
**Description:** As a dungeon builder, I want Tier 1 upgrades to unlock Tier 2 options so that rooms can be progressively enhanced.

**Acceptance Criteria:**
- [ ] Tier 2 upgrades are hidden or grayed out until a Tier 1 upgrade is purchased
- [ ] After purchasing a Tier 1 upgrade, its corresponding Tier 2 options appear
- [ ] Tier 2 upgrades may also have mutually exclusive paths
- [ ] The upgrade panel clearly indicates tier levels
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-005: Apply Upgrade Effects Immediately
**Description:** As a dungeon builder, I want upgrade effects to take effect immediately so that I see the benefit right away.

**Acceptance Criteria:**
- [ ] Production bonuses apply in the next tick after purchase
- [ ] Capacity increases allow immediate inhabitant assignment
- [ ] Fear level changes propagate immediately
- [ ] The room's stats display updates to reflect the upgrade
- [ ] Typecheck/lint passes

### US-006: Visual Upgrade Indicator
**Description:** As a dungeon builder, I want upgraded rooms to look different on the grid so that I can see my progress at a glance.

**Acceptance Criteria:**
- [ ] Upgraded rooms show a small icon/badge on the grid (e.g., star, level number)
- [ ] The indicator changes with upgrade tier (e.g., bronze star for T1, silver for T2)
- [ ] Non-upgraded rooms do not show the indicator
- [ ] The indicator does not obscure important room information
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

### US-007: Upgrade Data Model
**Description:** As a developer, I want a typed data model for room upgrades so that upgrades are consistent and serializable.

**Acceptance Criteria:**
- [ ] A `RoomUpgrade` type is defined with: `id`, `name`, `description`, `tier`, `pathId`, `cost`, `effects`
- [ ] An `UpgradeEffect` type defines what the upgrade changes (e.g., `{ field: 'maxInhabitants', modifier: 2 }`)
- [ ] Room instances in game state track `appliedUpgrades: string[]` and `lockedPaths: string[]`
- [ ] The data model supports arbitrary upgrade tiers
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Each room type must define its available upgrade paths in gamedata.
- FR-2: The UI must display all upgrades with costs, effects, and availability status.
- FR-3: Choosing an upgrade path must permanently lock out alternatives at the same tier.
- FR-4: Tier 2 upgrades must require a Tier 1 upgrade in the same path.
- FR-5: Upgrade effects must apply immediately to the room's stats and behavior.
- FR-6: Upgraded rooms must display a visual indicator on the grid.

## Non-Goals (Out of Scope)
- Specific upgrade definitions per room type (handled by room-specific PRDs #26-#31)
- Upgrade refunds or resetting
- Global upgrades that affect all rooms
- Upgrade prerequisites beyond tier gating

## Technical Considerations
- Depends on room data structure (Issue #5) and resource management (Issue #7).
- Upgrade definitions should be part of room YAML gamedata, nested under each room type.
- The upgrade panel should be a standalone Angular component with OnPush change detection.
- Use Angular Signals to track applied upgrades and reactively update room stats.
- The `effects` field should support multiple effect types: stat modifiers, capacity changes, fear changes, production multipliers.
- Consider a strategy pattern for applying different effect types.

## Success Metrics
- Players can browse, purchase, and benefit from upgrades without errors
- Mutually exclusive paths are enforced correctly
- Tiered unlocking works as designed
- Upgrade state persists across save/load
- Visual indicators appear correctly on upgraded rooms

## Open Questions
- Should there be a maximum number of upgrade tiers (2? 3?)?
- Can upgrades be previewed before purchase (show projected stats)?
- Should there be a global upgrade log showing all upgrades purchased?
