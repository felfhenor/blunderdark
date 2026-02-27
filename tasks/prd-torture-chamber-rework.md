# PRD: Torture Chamber Rework — 3-Stage Sequential Processing

## Introduction

The Torture Chamber currently offers two actions: extract (research points) and convert (prisoner → tier-1 inhabitant). After winning an invasion, players also get 5 immediate prisoner actions (execute, ransom, convert, sacrifice, experiment). These overlap heavily — both systems offer conversion and research extraction — making the Torture Chamber feel redundant. There's no compelling reason to build and staff the room when you can get the same outcomes instantly after an invasion.

This rework removes all immediate post-invasion prisoner actions and redesigns the Torture Chamber as a 3-stage sequential processing pipeline. Each prisoner passes through **Interrogate → Extract → Break**, yielding unique rewards at each stage. Two new systems are introduced: **Trait Runes** (extractable items that grant permanent bonuses to inhabitants) and a **Runeworking Room** (where runes are embedded into inhabitants). The result is a prisoner pipeline where every captured invader has significant strategic value and the Torture Chamber is the only way to process them.

## Goals

- Make the Torture Chamber the sole mechanism for processing prisoners (remove all immediate post-invasion prisoner actions)
- Create a 3-stage sequential pipeline (Interrogate → Extract → Break) with distinct, non-overlapping rewards at each stage
- Add prisoner escape pressure (3-day timer) to create urgency around building and using the chamber
- Introduce Trait Runes as a new inventory item type extracted from prisoners, tied to invader class
- Introduce the Runeworking Room as a new crafting room for embedding runes into inhabitants
- Add interrogation buffs that provide stacking combat bonuses for the next invasion
- Upgrade conversion output from tier-1 to tier-2 inhabitants with inherited stats when processed through the full pipeline

## User Stories

### US-001: Remove immediate post-invasion prisoner actions
**Description:** As a player, after winning an invasion my captured prisoners are automatically stored in the dungeon without any immediate action prompt, so that the Torture Chamber becomes the only way to process them.

**Acceptance Criteria:**
- [ ] `InvasionPrisonersPhaseComponent` is deleted
- [ ] `PanelInvasionBattleComponent` skips the `'prisoners'` phase — after `'rewards'` it goes directly to dismiss
- [ ] `PrisonerAction` type and `PrisonerHandlingResult` type are removed from `invasion.ts`
- [ ] `invasionRewardHandlePrisoner()` and all per-action handler functions are removed from `invasion-rewards.ts`
- [ ] `invasionRewardApplyPrisonerAction()` is removed from `invasion-reward-apply.ts`
- [ ] `invasionRewardApplyVictory()` still adds captured prisoners to `state.world.prisoners` (no change needed — already does this)
- [ ] Imports of deleted components/functions are cleaned up across the codebase
- [ ] `BattlePhase` type no longer includes `'prisoners'`
- [ ] Typecheck/lint passes

### US-002: Add prisoner escape mechanic
**Description:** As a player, I need urgency to process prisoners because they escape after 3 days, so I can't hoard them indefinitely and must prioritize building a Torture Chamber.

**Acceptance Criteria:**
- [ ] A new function `prisonerEscapeProcess(state)` checks all prisoners in `state.world.prisoners`
- [ ] Any prisoner where `state.clock.day - prisoner.captureDay >= 3` is removed from the array
- [ ] Prisoners currently being processed in the Torture Chamber (referenced by `tortureJob.prisonerId`) are NOT eligible for escape
- [ ] The escape check runs once per game-day (not every tick) — use a day-change detection pattern
- [ ] A notification is emitted when prisoners escape (e.g., "A captured warrior has escaped!")
- [ ] The escape check is called from `gameloop.ts` in the appropriate tick processing section
- [ ] Typecheck/lint passes

### US-003: Redesign TortureJob for 3-stage processing
**Description:** As a developer, I need the `TortureJob` type and torture chamber state to support a 3-stage sequential pipeline so each prisoner progresses through Interrogate → Extract → Break.

**Acceptance Criteria:**
- [ ] `TortureJob` in `room-shape.ts` is updated to: `{ prisonerId, currentStage: 'interrogate' | 'extract' | 'break', stageAction?: 'research' | 'rune' | 'convert' | 'execute' | 'sacrifice', ticksRemaining, targetTicks }`
- [ ] `stageAction` is only set when the stage offers a choice (Extract: 'research'|'rune', Break: 'convert'|'execute'|'sacrifice')
- [ ] Stage 1 (Interrogate) has no choice — it always produces intel + buff
- [ ] Each stage has its own base tick duration constant: `TORTURE_INTERROGATE_BASE_TICKS = 3`, `TORTURE_EXTRACT_BASE_TICKS = 4`, `TORTURE_BREAK_BASE_TICKS = 4`
- [ ] Completion event types in `torture.ts` are updated to cover all 3 stages: `TortureInterrogateCompleteEvent`, `TortureExtractCompleteEvent`, `TortureBreakCompleteEvent`
- [ ] RxJS Subjects are created for each completion event type
- [ ] Typecheck/lint passes

### US-004: Implement Stage 1 — Interrogate
**Description:** As a player, when I start processing a prisoner in the Torture Chamber, the first stage is Interrogation which reveals the next invasion's composition and grants a stacking combat buff.

**Acceptance Criteria:**
- [ ] When a prisoner is placed in the Torture Chamber, the job starts at stage `'interrogate'`
- [ ] On completion, the next pending invasion's composition (invader classes and count) is revealed — stored in game state so the UI can display it
- [ ] On completion, an `InterrogationBuff` is added to `state.world.interrogationBuffs` with `attackBonusPercent` and `defenseBonusPercent` calculated as `(HP + ATK + DEF + SPD) / 10`
- [ ] Interrogation buffs stack additively across multiple interrogations
- [ ] After interrogation completes, the job automatically advances to stage `'extract'` and pauses (waiting for player to choose extract action)
- [ ] A notification fires: "Interrogation complete — intel gathered on the next invasion"
- [ ] The `TortureInterrogateCompleteEvent` observable fires with relevant data
- [ ] Typecheck/lint passes

### US-005: Implement Stage 2 — Extract
**Description:** As a player, after interrogation I choose to either extract research points or a trait rune from the prisoner, so I get a meaningful reward before the final stage.

**Acceptance Criteria:**
- [ ] After interrogation completes, the UI shows two choices: "Extract Research" or "Extract Rune"
- [ ] Player selects a choice, which sets `stageAction` to `'research'` or `'rune'` and starts the stage timer
- [ ] **Research path:** On completion, grants research points using existing formula `(hp + attack + defense + speed) / 3`
- [ ] **Rune path:** On completion, creates a `TraitRune` item in `state.world.traitRunes` inventory, typed to the prisoner's invader class
- [ ] Only one rune type exists per invader class (warrior, rogue, mage, cleric, paladin, ranger) — specific effects are TBD/placeholder
- [ ] After extraction completes, the job advances to stage `'break'` and pauses (waiting for player to choose break action)
- [ ] A notification fires with the extraction result
- [ ] The `TortureExtractCompleteEvent` observable fires
- [ ] Typecheck/lint passes

### US-006: Implement Stage 3 — Break
**Description:** As a player, after extraction I choose the prisoner's final fate: convert to an inhabitant, execute for fear/reputation, or sacrifice for resources.

**Acceptance Criteria:**
- [ ] After extraction completes, the UI shows three choices: "Convert", "Execute", "Sacrifice"
- [ ] Player selects a choice, which sets `stageAction` and starts the stage timer
- [ ] **Convert:** On completion, creates a tier-2 "Broken Prisoner" inhabitant (HP 35, ATK 14, DEF 10, SPD 12, efficiency 0.90) with `instanceStatBonuses` of 33% of the prisoner's original stats (floored). Success rate is 80% flat (no class variance) since the prisoner is already broken
- [ ] **Execute:** On completion, grants fear (+2) and reputation (+1 Terror). Prisoner is destroyed.
- [ ] **Sacrifice:** On completion, grants a random resource boon (flux, essence, or research, 10-25 amount). Prisoner is destroyed.
- [ ] On any completion, the prisoner is removed from `state.world.prisoners` and the `tortureJob` is cleared
- [ ] A notification fires with the break result
- [ ] The `TortureBreakCompleteEvent` observable fires
- [ ] Typecheck/lint passes

### US-007: Create Trait Rune content type and inventory
**Description:** As a developer, I need a new `traitrune` content type and inventory system so that runes extracted from prisoners can be stored and later used in the Runeworking room.

**Acceptance Criteria:**
- [ ] New `gamedata/traitrune/` folder with YAML definitions for 6 runes (one per invader class)
- [ ] Each rune has: unique UUID `id`, unique `name`, `description`, `invaderClass` reference, placeholder `effects` (empty or minimal — specific effects are TBD)
- [ ] New `src/app/interfaces/content-traitrune.ts` with `TraitRuneId` branded type and `TraitRuneContent` type extending `IsContentItem & HasDescription`
- [ ] Exported from `src/app/interfaces/index.ts` barrel
- [ ] `'traitrune'` added to `ContentType` union in `identifiable.ts`
- [ ] `ensureTraitRune()` initializer added to `content-initializers.ts`
- [ ] `TraitRune` runtime type defined in a new `src/app/interfaces/traitrune.ts`: `{ id: TraitRuneInstanceId, runeTypeId: TraitRuneId, sourceInvaderClass: InvaderClassType }`
- [ ] `state.world.traitRunes: TraitRune[]` added to `GameStateWorld`
- [ ] State defaults, worldgen, and spec `makeGameState()` helpers updated with `traitRunes: []`
- [ ] Typecheck/lint passes

### US-008: Create interrogation buff system
**Description:** As a developer, I need an interrogation buff data structure and consumption mechanism so that buffs from interrogation stack and are applied to the next invasion's defenders.

**Acceptance Criteria:**
- [ ] `InterrogationBuff` type defined in `src/app/interfaces/torture.ts`: `{ attackBonusPercent: number, defenseBonusPercent: number, sourceInvaderClass: InvaderClassType }`
- [ ] `state.world.interrogationBuffs: InterrogationBuff[]` added to `GameStateWorld`
- [ ] State defaults, worldgen, and spec helpers updated with `interrogationBuffs: []`
- [ ] A helper function `interrogationBuffGetTotals(buffs)` sums all stacked buff percentages into a single `{ attackBonusPercent, defenseBonusPercent }` result
- [ ] When an invasion starts (defender combatant creation in `invasion-process.ts`), the summed buff is applied as a percentage modifier to all defender attack/defense stats
- [ ] After the invasion starts, `state.world.interrogationBuffs` is cleared (consumed)
- [ ] Typecheck/lint passes

### US-009: Create tier-2 "Broken Prisoner" inhabitant definition
**Description:** As a developer, I need a new tier-2 inhabitant definition for prisoners that have been fully processed through the 3-stage pipeline, producing a stronger unit than the old tier-1 converted prisoner.

**Acceptance Criteria:**
- [ ] New entry in `gamedata/inhabitant/converted.yml` for "Broken Prisoner" — tier 2 with base stats: HP 35, ATK 14, DEF 10, SPD 12
- [ ] Worker efficiency 0.90 reflecting the thorough breaking process
- [ ] `restrictionTags` includes `'converted'` (same restrictions as current converted prisoners)
- [ ] All 4 `stateModifiers` defined (normal/scared/hungry/starving)
- [ ] `tortureCreateBrokenInhabitant(prisoner)` helper creates an `InhabitantInstance` with `instanceStatBonuses` inheriting 33% of the original prisoner's ATK/DEF/SPD (floored)
- [ ] Name format: `"{PrisonerName} (Broken)"`
- [ ] Typecheck/lint passes

### US-010: Add rune slot to InhabitantInstance
**Description:** As a developer, I need inhabitants to have a slot for an equipped trait rune so the Runeworking room can embed runes into them.

**Acceptance Criteria:**
- [ ] `InhabitantInstance` gains optional field `equippedRuneId?: TraitRuneInstanceId`
- [ ] Field is undefined by default (no rune equipped)
- [ ] No existing tests break from the addition (optional field)
- [ ] Typecheck/lint passes

### US-011: Create Runeworking Room definition and scaffolding
**Description:** As a player, I want a Runeworking room where I can embed trait runes into inhabitants, giving them permanent bonuses.

**Acceptance Criteria:**
- [ ] New room entry in `gamedata/room/crafting.yml` for "Runeworking Chamber" with: unique UUID, cost, shape, role `'runeworking'`, `requiresWorkers: true`, `maxInhabitants: 1`, `isUnique: true`
- [ ] Room role `'runeworking'` added to room roles system
- [ ] New `src/app/helpers/runeworking.ts` with scaffolding: base tick constant, `runeworkingCanStart()` validation, `runeworkingProcess()` tick processor (takes rune + inhabitant, embeds rune on completion), RxJS Subject for completion
- [ ] `RuneworkingJob` type added to `room-shape.ts`: `{ runeId: TraitRuneInstanceId, inhabitantInstanceId: InhabitantInstanceId, ticksRemaining, targetTicks }`
- [ ] `PlacedRoom` gains optional `runeworkingJob?: RuneworkingJob`
- [ ] `runeworkingProcess()` wired into `gameloop.ts`
- [ ] On completion: rune removed from `state.world.traitRunes`, `equippedRuneId` set on the inhabitant instance
- [ ] New `src/app/components/panel-runeworking/` component with basic UI: select rune from inventory, select inhabitant (must not already have a rune), start job, show progress
- [ ] Typecheck/lint passes

### US-012: Update Torture Chamber UI for 3-stage pipeline
**Description:** As a player, I want the Torture Chamber panel to clearly show the current stage, available choices, and progress for the active prisoner being processed.

**Acceptance Criteria:**
- [ ] Panel shows available prisoners with escape countdown (days remaining)
- [ ] Selecting a prisoner starts Stage 1 (Interrogate) automatically
- [ ] Active job display shows: current stage name, progress bar, prisoner name/stats
- [ ] Between stages, the UI pauses and presents the choice for the next stage (Extract: research vs rune; Break: convert vs execute vs sacrifice)
- [ ] Stage completion results are shown in a modal (same pattern as current)
- [ ] Completed stages are visually indicated (e.g., checkmarks or greyed-out stage indicators)
- [ ] A 3-step stage indicator (Interrogate → Extract → Break) shows overall pipeline progress
- [ ] Typecheck/lint passes

### US-013: Remove old Torture Chamber upgrades
**Description:** As a developer, I need to remove the three existing torture chamber room upgrades since the room mechanics have fundamentally changed and old upgrades no longer apply.

**Acceptance Criteria:**
- [ ] `gamedata/roomupgrade/torture-chamber.yml` entries are removed (file deleted or emptied)
- [ ] Torture Chamber room definition in `gamedata/room/crafting.yml` has `roomUpgradeIds` cleared
- [ ] Any references to torture upgrade IDs or effects (speed multiplier, conversion bonus) are removed from `torture-chamber.ts`
- [ ] Room upgrade UI no longer shows upgrades for the Torture Chamber
- [ ] Research nodes that unlock these upgrades are removed or re-targeted (check `gamedata/research/`)
- [ ] `content-verify.ts` checks still pass
- [ ] Typecheck/lint passes

### US-014: Add research nodes for Runeworking Room and rune extraction
**Description:** As a player, I need to research rune extraction and the Runeworking Room before they become available, integrating them into the existing research tree progression.

**Acceptance Criteria:**
- [ ] A research node unlocks the ability to extract runes (Stage 2 rune option) — without this research, only the "Extract Research" option is available
- [ ] A research node unlocks the Runeworking Room for construction
- [ ] Research nodes are placed in an appropriate tree with reasonable prerequisites and costs
- [ ] `content-verify.ts` checks pass (research has unlocks, unlocks reference valid targets)
- [ ] Typecheck/lint passes

### US-015: Update tests for new torture system
**Description:** As a developer, I need to update existing tests and add new tests for the reworked torture system.

**Acceptance Criteria:**
- [ ] `torture-chamber.spec.ts` updated to test 3-stage processing: interrogate → extract → break
- [ ] Tests cover: stage progression, each extract choice (research/rune), each break choice (convert/execute/sacrifice)
- [ ] Tests cover: prisoner escape after 3 days, prisoner in active job not escaping
- [ ] Tests cover: interrogation buff creation and stacking
- [ ] Tests cover: trait rune inventory management
- [ ] `invasion-rewards.spec.ts` updated to remove prisoner action handler tests
- [ ] All removed functions/types no longer referenced in any test file
- [ ] `npm run test` passes
- [ ] `npm run lint` passes

## Functional Requirements

- FR-1: Prisoners captured after invasion are auto-stored with no immediate action prompt
- FR-2: Prisoners escape after 3 in-game days if not being processed in a Torture Chamber
- FR-3: The Torture Chamber processes one prisoner at a time through 3 sequential stages: Interrogate → Extract → Break
- FR-4: Stage 1 (Interrogate) reveals next invasion composition and adds a stacking combat buff (attack% + defense%)
- FR-5: Stage 2 (Extract) offers a choice: research points OR a trait rune (class-specific)
- FR-6: Stage 3 (Break) offers a choice: convert to tier-2 inhabitant (with inherited stats), execute (fear+rep), or sacrifice (resources)
- FR-7: Interrogation buffs stack across multiple prisoners and are consumed when the next invasion starts
- FR-8: Trait runes are stored in `state.world.traitRunes` as inventory items, one type per invader class
- FR-9: The Runeworking Room takes a rune + inhabitant and permanently embeds the rune (one rune per inhabitant)
- FR-10: Converted prisoners from the full pipeline are tier-2 "Broken Prisoner" inhabitants with stat bonuses from original prisoner stats
- FR-11: Each stage has its own tick duration, processing generates corruption
- FR-12: Notifications fire for stage completions, prisoner escapes, and rune embedding

## Non-Goals (Out of Scope)

- Specific trait rune effects (what each class rune actually does to an inhabitant) — placeholder only, detailed effects are a follow-up
- Runeworking Room upgrades or adjacency bonuses — just basic functionality
- Torture Chamber upgrades — removed, may be re-added in a future iteration
- Rebalancing invasion difficulty or prisoner capture rates
- Visual/sprite work for new rooms or runes
- Migration of existing save data (prisoners in old format, existing converted inhabitants)

## Technical Considerations

- **State migration:** Adding `traitRunes` and `interrogationBuffs` to `GameStateWorld` requires updating `defaults.ts`, `worldgen.ts`, and `makeGameState()` across ~16 spec files
- **Content pipeline:** New `traitrune` content type requires the full checklist: gamedata folder, interface, barrel export, ContentType union, initializer, verify script
- **Room role:** New `'runeworking'` role needs to be added to the room role registry
- **Branded IDs:** New types needed: `TraitRuneInstanceId` for runtime rune instances, `TraitRuneId` for content rune definitions
- **No UUID hardcoding:** All content lookups must use name-based or role-based lookups, never hardcoded UUIDs
- **Notify import restriction:** Pure helper files (torture-chamber.ts, runeworking.ts) must NOT import `@helpers/notify` — return data and let components handle notifications
- **Dual inhabitant storage:** When creating new inhabitants (conversion), must update both `state.world.inhabitants` and `floor.inhabitants` arrays

## Success Metrics

- Torture Chamber is the sole mechanism for prisoner processing (no other path exists)
- Each stage yields a distinct, non-overlapping reward
- Player feels urgency to build the Torture Chamber early due to escape timer
- Trait rune system creates a new strategic layer (even with placeholder effects)
- Full pipeline (all 3 stages) feels significantly more rewarding than the old instant actions

## Resolved Design Decisions

- **Stage tick durations:** Interrogate 3 min (3 ticks), Extract 4 min (4 ticks), Break 4 min (4 ticks). Total: 11 min per prisoner.
- **Broken Prisoner base stats:** HP 35, ATK 14, DEF 10, SPD 12, worker efficiency 0.90
- **Inherited stat bonus:** 33% of prisoner's original stats as `instanceStatBonuses` (floored)
- **Interrogation buff formula:** `(prisoner HP + ATK + DEF + SPD) / 10` as both attackBonusPercent and defenseBonusPercent. Stacks additively.
- **Runeworking Room:** Unique (one per dungeon), `isUnique: true`
- **Trait rune names:** Yes, globally unique across all content types (enforced by build script)
- **Research gating:** Add basic research nodes to unlock the Runeworking Room and rune extraction ability, integrated into existing research trees

## Open Questions

- None — all design decisions resolved
