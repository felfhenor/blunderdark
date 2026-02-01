# PRD: Prestige Features

## Introduction
Prestige Features are rare, powerful room attachments with dramatic effects and significant costs. These include Elder Runes, Void Gate, Time Dilation Field, Phylactery, and Dragon's Hoard Core. They represent end-game customization options that transform rooms into extraordinary assets with both benefits and risks.

## Goals
- Implement five prestige features with high-impact, unique mechanics
- Define all features in YAML gamedata with appropriate high costs
- Integrate with the feature attachment system (Issue #97)
- Some features introduce risk/reward mechanics (Void Gate, Time Dilation)
- Dragon's Hoard Core is a unique feature (only one can exist in the dungeon)

## User Stories

### US-001: Elder Runes Feature
**Description:** As a player, I want to attach Elder Runes so that the room gains massive production and becomes magically enhanced.

**Acceptance Criteria:**
- [ ] Elder Runes is defined in gamedata with: high cost, bonuses (+50% production, magical room tag)
- [ ] Room production increases by 50% for all resource types
- [ ] The room gains a `magical` tag that other systems can query
- [ ] Visual indicator shows rune symbols on the room
- [ ] Magical rooms may qualify for special interactions (future-proofing)
- [ ] Unit tests verify production bonus and magical tag
- [ ] Typecheck/lint passes

### US-002: Void Gate Feature
**Description:** As a player, I want to attach a Void Gate so that a random creature is summoned once per day, accepting the risk it could be hostile.

**Acceptance Criteria:**
- [ ] Void Gate is defined in gamedata with: high cost, bonus (daily creature summon)
- [ ] Once per in-game day, the Void Gate summons a random creature from a weighted pool
- [ ] The pool includes beneficial creatures (70% chance) and hostile creatures (30% chance)
- [ ] Hostile creatures attack inhabitants in the room upon arrival
- [ ] The summon event is logged in the event system
- [ ] A cooldown timer shows when the next summon will occur
- [ ] Unit tests verify summon frequency and pool weighting
- [ ] Typecheck/lint passes

### US-003: Time Dilation Field Feature
**Description:** As a player, I want to attach a Time Dilation Field so that the room operates at 150% speed with high maintenance cost.

**Acceptance Criteria:**
- [ ] Time Dilation Field is defined in gamedata with: high cost, bonus (150% speed), maintenance cost
- [ ] All production, XP gain, and timers in the room run at 150% speed
- [ ] The room consumes additional resources per tick as maintenance (defined in gamedata)
- [ ] If maintenance resources are unavailable, the field deactivates temporarily
- [ ] Visual indicator shows a time-distortion effect on the room
- [ ] Unit tests verify speed multiplier and maintenance consumption
- [ ] Typecheck/lint passes

### US-004: Phylactery Feature
**Description:** As a player, I want to attach a Phylactery so that dead inhabitants in the room respawn as undead.

**Acceptance Criteria:**
- [ ] Phylactery is defined in gamedata with: high cost, bonus (undead respawn)
- [ ] When an inhabitant dies in a room with a Phylactery, they respawn as an undead variant after a delay
- [ ] The undead variant retains partial stats from the original (e.g., 75% of original stats)
- [ ] Respawn delay is defined in gamedata (e.g., 30 seconds)
- [ ] Each Phylactery has a maximum number of respawns before it is consumed
- [ ] Unit tests verify respawn trigger, stat conversion, and consumption limit
- [ ] Typecheck/lint passes

### US-005: Dragon's Hoard Core Feature (Unique)
**Description:** As a player, I want to attach a Dragon's Hoard Core to one room in my dungeon so that it generates massive Gold with greatly increased storage.

**Acceptance Criteria:**
- [ ] Dragon's Hoard Core is defined in gamedata with: very high cost, bonuses (+5 Gold/min, +100% Gold storage), unique flag
- [ ] Only one Dragon's Hoard Core can exist in the entire dungeon
- [ ] Attempting to attach a second one shows an error message
- [ ] The room generates 5 Gold per minute and doubles Gold storage capacity
- [ ] Removing the Core allows placing it in a different room
- [ ] The feature selection UI shows "Already placed" if the Core exists elsewhere
- [ ] Unit tests verify uniqueness constraint and Gold bonuses
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-006: Unique Feature Constraint System
**Description:** As a developer, I want a system to enforce unique feature constraints so that features flagged as unique can only exist once in the dungeon.

**Acceptance Criteria:**
- [ ] Features can have a `unique: true` flag in their gamedata definition
- [ ] The feature attachment system checks the unique constraint before allowing attachment
- [ ] A helper function `isUniqueFeaturePlaced(featureId)` scans all rooms for the feature
- [ ] The feature selection panel disables unique features that are already placed
- [ ] Unit tests verify unique constraint enforcement
- [ ] Typecheck/lint passes

### US-007: Prestige Features Gamedata
**Description:** As a developer, I want all prestige features defined in YAML so that they integrate with the content pipeline.

**Acceptance Criteria:**
- [ ] All five prestige features are defined in `gamedata/feature/` YAML files
- [ ] Each definition includes: id, name, description, category (`prestige`), cost, bonuses, unique flag (where applicable)
- [ ] Cost values are significantly higher than environmental and functional features
- [ ] The build pipeline compiles and validates all definitions
- [ ] `ContentService` serves prestige features queryable by category
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: Elder Runes must increase production by 50% and tag the room as magical
- FR-2: Void Gate must summon a random creature once per in-game day with risk of hostiles
- FR-3: Time Dilation Field must run the room at 150% speed with ongoing maintenance cost
- FR-4: Phylactery must respawn dead inhabitants as undead with partial stats
- FR-5: Dragon's Hoard Core must generate 5 Gold/min and double Gold storage, and be unique
- FR-6: The system must enforce unique feature constraints across the dungeon

## Non-Goals (Out of Scope)
- Prestige feature crafting or discovery quests
- Feature evolution or upgrading
- Cross-room prestige feature synergies
- Visual animations for prestige features (handled by Issues #119/120)

## Technical Considerations
- Depends on Issue #97 (Feature Attachment System) for slot mechanics
- Depends on Issue #7 (Room Types) for room data integration
- Void Gate daily summon requires integration with the day/night cycle timer
- Time Dilation Field requires modifying the room's tick multiplier in the game loop
- Phylactery respawn requires integration with the inhabitant death system
- Unique constraint checking must scan all rooms efficiently (consider maintaining a set of placed unique feature IDs)

## Success Metrics
- All five prestige features function correctly with their unique mechanics
- Dragon's Hoard Core uniqueness is enforced without bypass
- Void Gate summon rates match configured probabilities over many cycles
- Time Dilation Field correctly speeds up room operations and consumes maintenance

## Open Questions
- Should prestige features require a minimum room level or type?
- Can the Phylactery respawn boss-type inhabitants?
- Should the Void Gate hostile creature difficulty scale with dungeon progression?
