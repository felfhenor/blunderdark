# PRD: Corruption Effects Rework

## Introduction

Corruption currently has a handful of hardcoded effects at fixed thresholds (dark upgrades at 50, crusade at 200, mutations every 500) and a hardcoded 4-level system (low/medium/high/critical) that drives UI styling. This rework makes corruption a truly unbounded resource with a rich, data-driven progression of effects defined in YAML. A new `corruptioneffect` gamedata type replaces all hardcoded thresholds, levels, and effects. Effects can be positive or negative, passive or event-based, and triggered at fixed thresholds or repeating intervals — giving designers full control over the corruption experience without touching TypeScript.

## Goals

- Remove the hardcoded `CorruptionLevel` system (`low`/`medium`/`high`/`critical`) entirely
- Introduce a new `corruptioneffect` gamedata type that defines thresholds, probabilities, conditions, cooldowns, and effect parameters in YAML
- Migrate all 3 existing corruption effects (dark upgrades, crusades, mutations) into the new data-driven system
- Add new effects — both positive (dark empowerment, research bonuses, resource grants) and negative (sickness, shadow rifts) — to create a rich corruption progression
- Drive all corruption-related visuals (grid overlays, progress bar colors, badge labels) from effect data rather than hardcoded levels
- Support both "passive" effects (active while corruption >= threshold) and "event" effects (fire once when triggered)
- Support both fixed-threshold and repeating-interval triggers

## User Stories

### US-001: Define CorruptionEffectContent interface and gamedata schema
**Description:** As a developer, I need a TypeScript interface and YAML schema for corruption effects so the content pipeline can validate and compile them.

**Acceptance Criteria:**
- [ ] New interface `CorruptionEffectContent` in `src/app/interfaces/content-corruption-effect.ts` with fields: `id`, `name`, `description`, `triggerType` (`threshold` | `interval`), `triggerValue` (number), `oneTime` (boolean), `retriggerable` (boolean), `probability` (number), `cooldownMinutes` (number), `conditions` (object with optional `requiresResearch`, `minFloorDepth`, `minInhabitants`), `behavior` (`passive` | `event`), `effectType` (string enum), `effectParams` (type-specific object), `notification` (optional object with `title`, `message`, `severity`), `visualEffect` (optional object with `gridClass`, `progressBarClass`)
- [ ] New branded ID type `CorruptionEffectId`
- [ ] Interface exported from the `@interfaces` barrel
- [ ] Schema generation works (`npm run schemas:generate`)
- [ ] Typecheck passes (`npm run build:app`)

### US-002: Add corruptioneffect to the content pipeline
**Description:** As a developer, I need the build scripts to compile corruption effect YAML files so they are available at runtime.

**Acceptance Criteria:**
- [ ] New gamedata folder `gamedata/corruptioneffect/` is recognized by the build pipeline
- [ ] `ContentService` loads corruption effects alongside other content types
- [ ] Content verification (`content-verify.ts`) validates corruption effect entries (unique IDs and names)
- [ ] `npm run gamedata:build` succeeds
- [ ] `npm run build:app` succeeds

### US-003: Create YAML entries for migrated existing effects
**Description:** As a developer, I need to convert the 3 existing hardcoded corruption effects into YAML entries so they work through the new data-driven system.

**Acceptance Criteria:**
- [ ] **Dark Upgrade Unlock**: `triggerType: threshold`, `triggerValue: 50`, `behavior: event`, `oneTime: true`, `effectType: unlock`, `effectParams: { feature: dark_upgrades }`
- [ ] **Crusade Invasion**: `triggerType: threshold`, `triggerValue: 200`, `behavior: event`, `retriggerable: true`, `effectType: trigger_invasion`, `effectParams: { invasionType: crusade }`
- [ ] **Corruption Mutation**: `triggerType: interval`, `triggerValue: 500`, `behavior: event`, `effectType: mutate_inhabitant`, `effectParams: { includeNegative: true }`
- [ ] All entries have real UUIDs and globally unique names
- [ ] `npm run gamedata:build` succeeds

### US-004: Create YAML entries for new positive effects
**Description:** As a player, I want corruption to provide some benefits at certain thresholds so there's a reason to let it grow rather than always purifying.

**Acceptance Criteria:**
- [ ] **Dark Empowerment** (threshold 75, passive): +10% dark essence production. `effectType: production_modifier`, `effectParams: { resource: essence, multiplier: 1.10 }`
- [ ] **Corrupted Vigor** (threshold 150, passive): +10% inhabitant combat stats. `effectType: combat_modifier`, `effectParams: { stat: all, multiplier: 1.10 }`
- [ ] **Abyssal Harvest** (interval 400, event): 50% chance to grant bonus essence. `effectType: resource_grant`, `effectParams: { resource: essence, amount: 10 }`, `probability: 0.5`
- [ ] **Corruption Mastery** (threshold 500, passive): +15% dark research speed. `effectType: research_modifier`, `effectParams: { branch: dark, multiplier: 1.15 }`
- [ ] **Dark Magnetism** (threshold 1000, passive): +10% chance for recruited inhabitants to have rare traits. `effectType: recruitment_modifier`, `effectParams: { rareTraitChance: 0.10 }`
- [ ] All entries have real UUIDs, globally unique names, and appropriate notification text
- [ ] `npm run gamedata:build` succeeds

### US-005: Create YAML entries for new negative effects
**Description:** As a player, I want high corruption to carry escalating risks so managing corruption remains a meaningful strategic choice.

**Acceptance Criteria:**
- [ ] **Corruption Sickness** (threshold 300, passive): one random stationed inhabitant loses 15% efficiency. `effectType: inhabitant_debuff`, `effectParams: { efficiencyMultiplier: 0.85, targetCount: 1 }`
- [ ] **Shadow Rift** (interval 750, event): triggers a mini shadow invasion. `effectType: trigger_invasion`, `effectParams: { invasionType: shadow_rift }`, `probability: 0.75`
- [ ] Both entries have real UUIDs, globally unique names, and warning-severity notifications
- [ ] `npm run gamedata:build` succeeds

### US-006: Create YAML entries for visual effects (replacing corruption levels)
**Description:** As a player, I want the dungeon's visual atmosphere to change as corruption grows, driven by data-defined thresholds rather than hardcoded levels.

**Acceptance Criteria:**
- [ ] **Corruption Aura I** (threshold 50, passive): subtle purple tint. `effectType: visual`, `visualEffect: { gridClass: corruption-aura-1, progressBarClass: progress-warning }`
- [ ] **Corruption Aura II** (threshold 100, passive): medium purple overlay. `effectType: visual`, `visualEffect: { gridClass: corruption-aura-2, progressBarClass: progress-warning }`
- [ ] **Corruption Aura III** (threshold 200, passive): heavy purple overlay with pulsing animation. `effectType: visual`, `visualEffect: { gridClass: corruption-aura-3, progressBarClass: progress-error }`
- [ ] All entries have real UUIDs and globally unique names
- [ ] `npm run gamedata:build` succeeds

### US-007: Build the corruption effect processing engine
**Description:** As a developer, I need a new effect processor that reads corruption effect definitions from gamedata and evaluates them each tick, replacing the hardcoded `corruptionEffectProcess` and `corruptionThresholdProcess`.

**Acceptance Criteria:**
- [ ] New function `corruptionEffectProcessAll(state)` replaces both `corruptionEffectProcess` and `corruptionThresholdProcess` in the game loop
- [ ] For **threshold effects**: tracks which thresholds have been crossed using persisted state; fires events on first crossing; supports `oneTime` (never re-fires) and `retriggerable` (re-fires if corruption drops below and rises above again)
- [ ] For **interval effects**: tracks the last corruption milestone at which each effect fired; fires when corruption crosses the next interval milestone (e.g., 500, 1000, 1500 for a 500-interval effect)
- [ ] Respects `probability` — rolls RNG before firing event effects
- [ ] Respects `cooldownMinutes` — skips effects still on cooldown
- [ ] Respects `conditions` — checks required research, floor depth, inhabitant count before firing
- [ ] Lint passes (`npm run lint`)
- [ ] Tests pass (`npm run test`)
- [ ] Build passes (`npm run build:app`)

### US-008: Implement passive effect tracking
**Description:** As a developer, I need to track which passive effects are currently active so modifiers can be applied and removed dynamically.

**Acceptance Criteria:**
- [ ] New computed signal `corruptionActivePassiveEffects` returns the list of passive effects whose threshold is currently met (corruption >= triggerValue and conditions satisfied)
- [ ] Active passive effects are recalculated reactively when corruption changes
- [ ] Passive effects are used by production, combat, and research systems to look up active modifiers
- [ ] When corruption drops below a passive effect's threshold, the effect is no longer in the active list
- [ ] Lint passes (`npm run lint`)
- [ ] Tests pass (`npm run test`)
- [ ] Build passes (`npm run build:app`)

### US-009: Implement effect type handlers
**Description:** As a developer, I need TypeScript handlers for each `effectType` so the engine can execute effects when they fire.

**Acceptance Criteria:**
- [ ] `unlock` handler: sets the specified feature flag (migrated from existing dark upgrade logic)
- [ ] `trigger_invasion` handler: triggers the specified invasion type (migrated from existing crusade logic; new `shadow_rift` type added)
- [ ] `mutate_inhabitant` handler: applies a random mutation (migrated from existing mutation logic)
- [ ] `production_modifier` handler: passive effects looked up by production pipeline to apply multipliers
- [ ] `combat_modifier` handler: passive effects looked up by combat system to apply stat multipliers
- [ ] `research_modifier` handler: passive effects looked up by research system to apply speed multipliers
- [ ] `recruitment_modifier` handler: passive effects looked up by recruitment to adjust rare trait chances
- [ ] `resource_grant` handler: grants the specified resource amount when the event fires
- [ ] `inhabitant_debuff` handler: selects random stationed inhabitants and applies efficiency debuff while active
- [ ] `visual` handler: no gameplay logic — purely read by UI components for styling
- [ ] Lint passes (`npm run lint`)
- [ ] Tests pass (`npm run test`)
- [ ] Build passes (`npm run build:app`)

### US-010: Update corruption effect persisted state
**Description:** As a developer, I need to update the `CorruptionEffectState` interface to generically track which effects have fired, rather than tracking specific named flags.

**Acceptance Criteria:**
- [ ] Replace the current `CorruptionEffectState` fields (`darkUpgradeUnlocked`, `lastMutationCorruption`, `lastCrusadeCorruption`, `warnedThresholds`) with generic tracking: `firedOneTimeEffects: CorruptionEffectId[]` (effects that have fired and won't fire again), `lastIntervalValues: Record<CorruptionEffectId, number>` (last corruption value at which each interval effect fired), `lastTriggerTimes: Record<CorruptionEffectId, number>` (game-time of last trigger for cooldowns), `retriggeredEffects: Record<CorruptionEffectId, boolean>` (tracks whether retriggerable effects are "armed" to fire again)
- [ ] Migration logic in `defaults.ts` converts old state format to new format for existing saves
- [ ] Lint passes (`npm run lint`)
- [ ] Tests pass (`npm run test`)
- [ ] Build passes (`npm run build:app`)

### US-011: Update UI — remove corruption levels, use effect-driven display
**Description:** As a player, I want the corruption UI to show which effects are active and upcoming rather than a simple 4-level badge.

**Acceptance Criteria:**
- [ ] Remove the `CorruptionLevel` type and `corruptionLevel` / `corruptionGetLevel` function
- [ ] `panel-resources` corruption tooltip: replace level badge with a list of active passive effects and their descriptions; show next upcoming threshold/interval and what it will trigger
- [ ] `panel-resources` progress bar: color driven by the highest active visual effect's `progressBarClass` (default to neutral if no visual effect is active)
- [ ] `resource-bar-top` corruption display: same changes as panel-resources (effect-driven color, no level badge)
- [ ] Grid component: replace `corruption-{level}` class binding with classes from active visual effects' `gridClass` values
- [ ] Grid SCSS: rename `corruption-medium/high/critical` classes to `corruption-aura-1/2/3` (or keep both temporarily and remove old ones)
- [ ] Remove `corruptionThresholdWarning$` Subject and related warning code — effect notifications replace threshold warnings
- [ ] Lint passes (`npm run lint`)
- [ ] Tests pass (`npm run test`)
- [ ] Build passes (`npm run build:app`)
- [ ] Verify in browser using dev-browser skill

### US-012: Update corruption resistance research to scale effect thresholds
**Description:** As a player, I want the "Corruption Control" research bonus to scale all effect thresholds upward so corruption resistance remains meaningful.

**Acceptance Criteria:**
- [ ] The `corruptionResistance` research bonus scales all effect `triggerValue`s upward (e.g., 10% resistance makes a 200 threshold become 220)
- [ ] Scaling is applied dynamically at evaluation time, not baked into gamedata
- [ ] Both threshold and interval effects are scaled
- [ ] The tooltip shows scaled threshold values when resistance is active
- [ ] Lint passes (`npm run lint`)
- [ ] Tests pass (`npm run test`)
- [ ] Build passes (`npm run build:app`)

### US-013: Remove old hardcoded corruption effect code
**Description:** As a developer, I need to clean up the old corruption code that is replaced by the new system.

**Acceptance Criteria:**
- [ ] Delete `src/app/interfaces/corruption.ts` (`CorruptionLevel` type)
- [ ] Delete or gut `src/app/interfaces/corruption-effect.ts` (old `CorruptionEffectState`, `CorruptionEffectEvent` — replaced by new generic state)
- [ ] Delete or gut `src/app/interfaces/corruption-threshold.ts` (old `CorruptionThresholdWarning`)
- [ ] Remove hardcoded threshold constants from `src/app/helpers/corruption.ts` (`CORRUPTION_THRESHOLD_*`)
- [ ] Remove `corruptionEffectProcess` and `corruptionThresholdProcess` from the game loop (replaced by `corruptionEffectProcessAll`)
- [ ] Remove old `corruption-effects.ts` and `corruption-thresholds.ts` helper files (logic moved to new engine)
- [ ] Update `notify.service.ts` to use new effect notification system instead of old event types
- [ ] Update `panel-room-info` dark upgrade visibility to check the new generic `firedOneTimeEffects` state
- [ ] All references to removed code updated throughout codebase
- [ ] Lint passes (`npm run lint`)
- [ ] Tests pass (`npm run test`)
- [ ] Build passes (`npm run build:app`)

### US-014: Write unit tests for the corruption effect engine
**Description:** As a developer, I need tests for the new corruption effect system to ensure thresholds, intervals, probabilities, conditions, and cooldowns work correctly.

**Acceptance Criteria:**
- [ ] Test: threshold effect fires when corruption crosses the threshold
- [ ] Test: one-time threshold effect does not fire again
- [ ] Test: retriggerable threshold effect re-fires after corruption drops and rises
- [ ] Test: interval effect fires at each milestone (500, 1000, 1500...)
- [ ] Test: probability < 1.0 causes some triggers to be skipped
- [ ] Test: cooldown prevents rapid re-triggering
- [ ] Test: conditions block effects when not met (missing research, insufficient depth/inhabitants)
- [ ] Test: passive effects activate/deactivate as corruption crosses threshold
- [ ] Test: corruption resistance scales thresholds
- [ ] Test: save state migration converts old format to new format
- [ ] All tests pass (`npm run test`)

## Functional Requirements

- FR-1: Add a `corruptioneffect` gamedata type with YAML files in `gamedata/corruptioneffect/`
- FR-2: Each effect defines `triggerType` (threshold or interval), `triggerValue`, `behavior` (passive or event), `effectType`, and `effectParams`
- FR-3: Threshold effects fire when corruption >= `triggerValue`; interval effects fire every `triggerValue` corruption
- FR-4: Effects support `oneTime` (never re-fires), `retriggerable` (re-fires on re-crossing), and repeating interval modes
- FR-5: Effects support `probability` (0-1 chance of firing), `cooldownMinutes`, and `conditions` (research, depth, inhabitant requirements)
- FR-6: Passive effects apply their modifiers continuously while active (corruption >= threshold); modifiers are removed when corruption drops below
- FR-7: Event effects fire once when triggered and are tracked in persisted state
- FR-8: The `CorruptionLevel` type and all hardcoded level logic is removed
- FR-9: Grid visual effects are driven by active visual-type corruption effects' `gridClass` values
- FR-10: UI corruption display (progress bar, badge, tooltip) is driven by active effects rather than hardcoded levels
- FR-11: Corruption tooltip shows active effects and next upcoming threshold/interval
- FR-12: Corruption resistance research scales all effect `triggerValue`s proportionally
- FR-13: Old `CorruptionEffectState` is migrated to a generic format that tracks fired effects by ID
- FR-14: Existing saves are migrated automatically (old dark-upgrade/crusade/mutation state mapped to new effect IDs)
- FR-15: All 3 existing effects (dark upgrades, crusades, mutations) continue to function identically through the new system
- FR-16: 5 new positive effects and 2 new negative effects are added (see US-004 and US-005)
- FR-17: 3 visual effects at thresholds 50, 100, and 200 replace the old level-based grid styling

## Non-Goals

- No changes to corruption generation mechanics (rooms, inhabitants, features, depth, day/night, seasons all remain as-is)
- No changes to corruption spending mechanics (research costs, alchemy, merchant trades)
- No changes to Purification Chamber or corruption reduction mechanics
- No changes to victory conditions that reference corruption (Terror Lord, Harmonious Kingdom)
- No scripting or expression language for effect conditions — conditions are a fixed set of fields
- No effect stacking or combining (each effect is independent)
- No player-facing "corruption effect tree" or discovery UI — effects simply happen at thresholds
- No changes to corruption as an invasion profile dimension

## Technical Considerations

- **Content pipeline**: The `corruptioneffect` folder needs to be added to the gamedata build script, content verification, and `ContentService` loading. Follow the same pattern as other gamedata types (rooms, inhabitants, etc.).
- **Passive effect performance**: `corruptionActivePassiveEffects` should be a `computed()` signal derived from `corruptionCurrent()` to avoid recalculating every tick. The list of all corruption effects is static (from gamedata), so only the corruption value comparison needs to be reactive.
- **Effect handler registry**: Use a simple map of `effectType` -> handler function. Each handler receives the effect definition and game state. This keeps the engine generic and makes adding new effect types easy.
- **Save migration**: The old `CorruptionEffectState` shape (`darkUpgradeUnlocked`, `lastMutationCorruption`, etc.) needs to be detected and converted to the new generic shape. Map old fields to the corresponding effect IDs from the new YAML entries.
- **Production/combat/research integration**: These systems need to query the active passive effects list for applicable modifiers. Consider a helper like `corruptionGetActiveModifier(effectType, filterFn)` that returns the combined multiplier from all active corruption effects of a given type.
- **Grid class binding**: The grid component currently uses `[class.corruption-medium]="corruptionLevel() === 'medium'"` etc. Replace with a computed that returns the set of `gridClass` values from all active visual effects, and bind those dynamically.
- **Notification refactor**: The `NotifyService` currently subscribes to `corruptionEffectEvent$`. Replace this with a generic event emitter that the effect engine fires, using the `notification` field from each effect definition for the toast content.

## Success Metrics

- All 3 existing corruption effects work identically to before (no player-visible regression)
- Adding a new corruption effect requires only a YAML entry — no TypeScript changes unless a new `effectType` is needed
- Players experience a richer corruption progression with meaningful choices at each threshold
- Positive effects at moderate corruption levels incentivize strategic corruption management rather than always purifying to zero
- Visual corruption atmosphere scales smoothly through 3 data-driven tiers

## Open Questions

- Should the corruption tooltip show ALL defined effects (with "locked"/"upcoming" states) or only active and next-upcoming ones?
- Should passive modifier values be shown numerically in the tooltip (e.g., "+10% essence production") or as descriptive text?
- Exact numerical balance for new effect thresholds and modifier values — the values in this PRD are placeholders
- Should the Shadow Rift invasion type use existing invader compositions or introduce new shadow-themed invaders?
- Should corruption resistance research scale interval values the same way as thresholds (e.g., 10% resistance makes the 500 mutation interval become 550)?
