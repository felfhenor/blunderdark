# PRD: Combat Abilities Integration

## Introduction

The turn-based combat system has a fully built ability framework — 17 combat abilities, 13 effect types, activation logic, state management, buff/evasion helpers — but none of it fires during combat. The integration point in `invasion-combat.ts` (line 217-218) is explicitly stubbed out with a placeholder comment, and `processCombatRound()` in `invasion-process.ts` only handles attack/miss/kill actions.

This PRD wires the existing ability system into the combat loop so that both invaders and inhabitants can use abilities as AI-chosen actions during turn-based combat, with full status effect mechanics and battle log feedback.

## Goals

- Make all 17 existing combat abilities functional during invasions
- Add 'ability' as an AI-chosen turn action alongside attack/move/wait
- Implement all 13 effect types with mechanical consequences (Stun skips turns, Mark amplifies damage, Heal restores HP, Scout reveals rooms, etc.)
- Give inhabitants (defenders) combat abilities by adding `combatAbilityIds` to `InhabitantContent` and creating defender ability YAML
- Track and tick ability cooldowns, status effect durations, and buff states per combatant per round
- Log all ability activations to the battle log with descriptive messages

## User Stories

### US-001: Extend Combatant with ability and status tracking

**Description:** As a developer, I need combatants in the turn queue to carry their ability states and status effects so the combat system can resolve abilities without external lookups.

**Acceptance Criteria:**
- [ ] `Combatant` type in `src/app/interfaces/invasion.ts` gains `abilityStates: AbilityState[]` and `statusEffects: StatusEffect[]` fields
- [ ] `AbilityState` in `src/app/interfaces/combat.ts` gains `passiveActivated: boolean` (default `false`) to track first-activation cost for passive abilities (Evasion, Berserk)
- [ ] `StatusEffect` type (currently on `InvaderInstance` in `src/app/interfaces/invader.ts`) is moved/shared to `src/app/interfaces/combat.ts` so both invaders and inhabitants can use it
- [ ] `invasionCombatCreateCombatant()` accepts ability states and status effects, populating the new fields
- [ ] In `invasion-process.ts`, when building combatants for a room, invader combatants are created with their `InvaderInstance.abilityStates` and `InvaderInstance.statusEffects`; defender combatants are created with empty arrays (until US-010 adds inhabitant abilities)
- [ ] Existing tests in `invasion-combat.spec.ts` updated to pass the new fields (default to empty arrays)
- [ ] Typecheck/lint passes

### US-002: Tick cooldowns and status durations each round

**Description:** As a developer, I need ability cooldowns to decrement and status effects to expire so abilities become available again and buffs/debuffs wear off naturally.

**Acceptance Criteria:**
- [ ] At the start of each new round (in `invasionCombatStartNewRound()`), all combatants' `abilityStates` are ticked via `combatAbilityTickStates()` and `statusEffects` are ticked (decrement duration, remove expired)
- [ ] After combat ends for a room, surviving invaders' `InvaderInstance.abilityStates` are synced back from the `Combatant` so cooldowns persist across rooms
- [ ] Unit tests verify cooldowns decrement and expired statuses are removed
- [ ] Typecheck/lint passes

### US-003: Add ability as an available combat action

**Description:** As a developer, I need to remove the placeholder at line 217 of `invasion-combat.ts` and make 'ability' a valid action when any ability is off cooldown.

**Acceptance Criteria:**
- [ ] `invasionCombatGetAvailableActions()` includes `'ability'` in the returned array when the actor has at least one ability with `currentCooldown === 0`
- [ ] Placeholder comment at line 217-218 is removed
- [ ] New helper `invasionCombatGetReadyAbilities(actor: Combatant): AbilityState[]` returns abilities where `currentCooldown === 0`
- [ ] New helper `invasionCombatGetAbilityTargets(actor: Combatant, ability: CombatAbilityContent, allCombatants: Combatant[]): Combatant[]` returns valid targets based on `targetType` (self → actor, single/aoe → enemies for damage/debuffs, allies for heals/buffs)
- [ ] Unit tests for available actions with/without ready abilities
- [ ] Typecheck/lint passes

### US-004: AI decision-making for ability usage

**Description:** As a developer, I need the AI to intelligently choose when to use abilities versus normal attacks, considering the tactical situation.

**Acceptance Criteria:**
- [ ] `invasionCombatResolveAiAction()` is updated to consider abilities with the following priority:
  1. **Heal** — if a heal ability is ready AND any ally is below 50% HP, heal the lowest-HP ally
  2. **Buff self** — if a self-buff ability (Shield Wall) is ready AND not already active, use it
  3. **Debuff enemy** — if a debuff ability (Stun, Mark, Dispel) is ready AND valid targets exist, use it on the highest-priority target
  4. **Damage ability** — if a damage ability is ready AND targets are in range, use it (prefer AOE when multiple targets)
  5. **Scout** — if Ranger has Scout ability ready and hasn't scouted yet, reveal rooms ahead
  6. **Normal attack** — if adjacent to an enemy
  7. **Move toward enemy** — if no abilities or attacks available
  8. **Wait** — last resort
  - Note: Disarm is a **room-entry passive**, not a combat turn action — it's handled in the room-entry phase, not here
  - Note: Berserk and Evasion are **first-activation passives** — they trigger automatically (consuming a turn the first time), not via AI decision
- [ ] AI prefers abilities over normal attacks when abilities deal more damage
- [ ] AI does not waste abilities on nearly-dead enemies (damage abilities prefer targets with enough HP to warrant it)
- [ ] Unit tests for AI choosing abilities in different scenarios
- [ ] Typecheck/lint passes

### US-005: Execute ability action and apply results

**Description:** As a developer, I need `invasionCombatExecuteAbility()` to resolve an ability, apply its effects, and return an enriched `ActionResult`.

**Acceptance Criteria:**
- [ ] New function `invasionCombatExecuteAbility(queue: TurnQueue, actorId: CombatantId, abilityId: CombatAbilityId, targetId: CombatantId | undefined, rng: () => number)` resolves the ability and returns `{ queue: TurnQueue; result: ActionResult }`
- [ ] `ActionResult` type gains an optional `abilityActivation: AbilityActivation` field for ability action results
- [ ] The function calls `combatAbilityTryActivate()` to roll proc chance and get activation data
- [ ] On successful activation: applies damage to targets (reducing HP, marking dead), applies status effects, puts ability on cooldown
- [ ] On failed proc: the turn is still consumed (actor chose to try the ability), no effect applied
- [ ] For AOE abilities: damage/status applied to all valid targets
- [ ] Returns updated `TurnQueue` with modified combatants
- [ ] Unit tests for ability execution with various effect types
- [ ] Typecheck/lint passes

### US-006: Handle ability results in processCombatRound

**Description:** As a developer, I need `processCombatRound()` in `invasion-process.ts` to handle the new `'ability'` action type alongside the existing `'attack'` handling.

**Acceptance Criteria:**
- [ ] When `actionResult.action === 'ability'` and `actionResult.abilityActivation` exists, process the activation's effects:
  - Damage: update `invasion.invaderHpMap` for invaders, check for kills, apply morale on death
  - Status applied: sync status effects back to `InvaderInstance` if target is an invader
  - Heal: update combatant HP (capped at maxHp)
- [ ] Kill handling for ability damage reuses the same kill-tracking logic as normal attacks (mark killed, update invasion state, push to `killedInvaderClasses` / `killedDefenderIds`)
- [ ] Failed ability proc still advances the turn (no battle log for failed proc — it just looks like the unit didn't act)
- [ ] Typecheck/lint passes

### US-007: Implement damage effects (Damage, Magic Damage)

**Description:** As a player, I want damage abilities like Backstab, Arcane Bolt, and Turn Undead to deal their stated damage during combat.

**Acceptance Criteria:**
- [ ] **Damage** effect: deals `attacker.attack * (ability.value / 100)` physical damage, reduced by defender's defense (min 1 damage)
- [ ] **Magic Damage** effect: deals `attacker.attack * (ability.value / 100)` damage that **ignores defense** entirely
- [ ] AOE damage abilities (Breath Weapon, Turn Undead) hit all enemies
- [ ] Single-target damage abilities (Backstab, Death Bolt, Smite Evil, Arcane Bolt) hit one target
- [ ] Mark status amplifies damage: if target has `'marked'` status, multiply damage by `(1 + markValue / 100)`
- [ ] Unit tests verify damage calculation for both physical and magic, with and without mark
- [ ] Typecheck/lint passes

### US-008: Implement buff effects (Buff Attack, Buff Defense, Evasion)

**Description:** As a player, I want buff abilities like Shield Wall, Berserk Rage, and Wraith Evasion to modify combat stats and dodge chances.

**Acceptance Criteria:**
- [ ] **Buff Defense** (Shield Wall, Lich Shield): applies `'shielded'` status for `duration` turns. While active, defense is increased by `value`%. Uses existing `combatAbilityApplyShieldBuff()` during attack resolution
- [ ] **Buff Attack** (Berserk Rage): **first-activation passive** — the first time HP drops below `chance`% threshold, the unit's turn is consumed to activate Berserk (battle log: "{Name} enters a Berserk Rage!"). After that initial activation, the attack bonus applies automatically on subsequent turns without consuming actions. Uses existing `combatAbilityApplyBerserkBuff()` during attack resolution
- [ ] **Evasion** (Wraith Evasion): **first-activation passive** — the first time an incoming attack would trigger an evasion roll, the defender's next turn is consumed to "phase" (battle log: "{Name} phases out of reality!"). After the initial activation, evasion rolls happen automatically on subsequent incoming attacks without consuming turns. Uses existing `combatAbilityCheckEvasion()`
- [ ] Track first-activation state: add `passiveActivated: boolean` to `AbilityState` (default `false`). When a passive triggers for the first time, set to `true` and mark the combatant as having used their next turn. On subsequent triggers, skip the turn cost
- [ ] Buff effects are checked during `invasionCombatExecuteAttack()` to modify the attacker's effective stats before the hit roll
- [ ] Evasion check runs before the d20 hit roll — if evaded, skip the roll entirely
- [ ] Unit tests for each buff type
- [ ] Typecheck/lint passes

### US-009: Implement debuff effects (Stun, Mark, Dispel)

**Description:** As a player, I want debuff abilities like Petrifying Gaze, Mark Target, and Dispel to hinder enemies.

**Acceptance Criteria:**
- [ ] **Stun**: applies `'stunned'` status for `duration` turns. A stunned combatant **skips their turn** (auto-waits). Check in `invasionCombatResolveAiAction()` or `invasionCombatExecuteAiTurn()` — if actor has `'stunned'` status, return a wait action immediately
- [ ] **Mark**: applies `'marked'` status for `duration` turns. Marked targets take `value`% extra damage from ALL sources (integrated in US-007 damage calculation)
- [ ] **Dispel**: removes ALL active status effects (buffs and debuffs) from the target. Clears the target's `statusEffects` array
- [ ] Stun battle log: "{Name} is stunned and cannot act!"
- [ ] Unit tests for stun skip, mark amplification, dispel clearing
- [ ] Typecheck/lint passes

### US-010: Implement heal and resurrect effects

**Description:** As a player, I want the Cleric's Heal ability to restore ally HP and Resurrect to revive fallen allies.

**Acceptance Criteria:**
- [ ] **Heal**: restores HP to target equal to `target.maxHp * (ability.value / 100)`, capped at maxHp. Targets allies only. AI targets the lowest-HP ally (defined in US-004)
- [ ] **Resurrect**: if a dead ally exists in the combatant list (HP <= 0), revive them with `ability.value`% of maxHp. `overrideTargetsHit: 1` means only one target is resurrected. The revived combatant rejoins the turn queue. **Cooldown is the only limiter** — set Resurrect's YAML cooldown to 5+ turns so it fires at most once or twice per room fight. No extra "once per combat" flag needed
- [ ] Heals cannot target enemies; resurrect cannot target already-alive combatants
- [ ] Battle log: "{Name} heals {Target} for {amount} HP!" / "{Name} resurrects {Target}!"
- [ ] Unit tests for heal cap, resurrect dead-only targeting
- [ ] Typecheck/lint passes

### US-011: Implement non-combat effects (Scout, Disarm)

**Description:** As a player, I want the Ranger's Scout ability to reveal rooms ahead and the Rogue's Disarm Trap to neutralize traps.

**Acceptance Criteria:**
- [ ] **Scout**: reveals `ability.value` rooms ahead on the invasion path **from the current position forward** (only unvisited rooms ahead, never rooms already passed). "Reveals" means the invasion skips the trap-trigger phase for those rooms (invaders know what's coming). Implementation: mark rooms as "scouted" on `ActiveInvasion` (add `scoutedRoomIds: string[]` field). When processing room entry, if room is scouted, skip trap triggers
- [ ] **Disarm**: **room-entry passive** — when an invader with Disarm Trap enters a room with a trap, automatically roll `ability.value`% chance to disarm before traps fire. On success, the trap does not trigger and battle log says "disarmed {trap name}". This integrates with the existing trap-trigger logic in `invasion-process.ts`. Disarm is NOT a combat turn action — it triggers during the room-entry phase since its YAML has cooldown: 0 and it concerns trap interaction, not turn-based fighting
- [ ] Scout AI usage: Ranger uses Scout as a combat turn action during the current room's fight. It reveals rooms ahead on the path from `currentRoomIndex + 1` onward
- [ ] Battle log: "{Name} scouts ahead, revealing {N} rooms!" / "{Name} disarms {trap}!"
- [ ] Unit tests for scout room marking, disarm roll success/failure
- [ ] Typecheck/lint passes

### US-012: Implement Fear Immunity effect

**Description:** As a player, I want the Paladin's Aura of Courage to protect invader allies from fear/morale penalties.

**Acceptance Criteria:**
- [ ] **Fear Immunity**: applies `'courage'` status to all allies (AOE, self-targeting side). While active, morale penalties from ally deaths are ignored for affected combatants
- [ ] Integration with `moraleApplyAllyDeath()`: check if the dying unit's allies have `'courage'` status; if so, skip the morale penalty
- [ ] Aura of Courage is passive (cooldown: 0, chance: 100) — AI uses it as first action in combat
- [ ] Battle log: "{Name}'s Aura of Courage bolsters allies against fear!"
- [ ] Unit tests for morale skip with courage status
- [ ] Typecheck/lint passes

### US-013: Add combat abilities to inhabitants

**Description:** As a developer, I need inhabitants (defenders) to have combat abilities so they can use special moves during invasions.

**Acceptance Criteria:**
- [ ] `InhabitantContent` in `src/app/interfaces/content-inhabitant.ts` gains optional `combatAbilityIds?: CombatAbilityId[]` field
- [ ] `InhabitantInstance` in `src/app/interfaces/inhabitant.ts` gains `abilityStates: AbilityState[]` and `statusEffects: StatusEffect[]` fields (both optional, defaulting to `[]`)
- [ ] Schema generation picks up the new YAML field
- [ ] Inhabitant YAML (`gamedata/inhabitant/base.yml`) updated — at minimum, assign existing abilities where appropriate (e.g., a tank inhabitant gets Shield Wall, a caster gets a damage ability). Reuse ability UUIDs from `gamedata/combatability/base.yml`
- [ ] Create 4-6 new defender-flavored abilities in `gamedata/combatability/base.yml` (e.g., Dungeon Ward — defense buff, Shadow Strike — single target damage, Venom Spit — AOE damage, Dark Healing — self heal). Generate real UUIDs
- [ ] When creating defender combatants in `invasion-process.ts`, populate `abilityStates` from the inhabitant's content definition
- [ ] Gamedata builds successfully (`npm run gamedata:build`)
- [ ] Typecheck/lint passes

### US-014: Battle log entries for all ability activations

**Description:** As a player, I want to see ability usage in the battle log so I understand what happened during combat.

**Acceptance Criteria:**
- [ ] New `BattleLogEntryType` values: `'ability_use'`, `'ability_heal'`, `'ability_buff'`, `'ability_debuff'`, `'ability_scout'`, `'ability_disarm'`
- [ ] Each ability activation produces a descriptive battle log entry:
  - Damage: "{Actor} uses {Ability} on {Target} for {damage} damage!"
  - AOE Damage: "{Actor} uses {Ability}, hitting {N} targets for {damage} damage each!"
  - Heal: "{Actor} uses {Ability} on {Target}, restoring {amount} HP!"
  - Buff: "{Actor} uses {Ability}, gaining {effect} for {N} turns!"
  - Debuff: "{Actor} uses {Ability} on {Target}, inflicting {status} for {N} turns!"
  - Evasion (passive): "{Target} evades {Actor}'s attack!"
  - Scout: "{Actor} scouts ahead, revealing {N} rooms!"
  - Disarm: "{Actor} disarms {trap name}!"
  - Kill via ability: "{Actor}'s {Ability} kills {Target}!" (separate entry after damage)
- [ ] Battle log `details` object includes `{ abilityName, effectType, damage?, statusApplied?, duration? }` for filtering/display
- [ ] Typecheck/lint passes

### US-015: Sync combat state back to game state

**Description:** As a developer, I need ability states and status effects from the combat system to persist on the underlying invader/inhabitant instances so effects carry across rooms.

**Acceptance Criteria:**
- [ ] After combat resolves for a room (win or loss), surviving invaders' `InvaderInstance.abilityStates` and `statusEffects` are updated from the `Combatant` state
- [ ] Surviving inhabitants' `InhabitantInstance.abilityStates` and `statusEffects` are similarly synced back (only relevant after US-013)
- [ ] HP syncing for invaders (already done via `invaderHpMap`) continues to work alongside ability state syncing
- [ ] Status effects with remaining duration persist; expired ones are already filtered out
- [ ] Unit tests verify round-trip: ability used in room 1 → cooldown persists → still on cooldown when room 2 combat starts
- [ ] Typecheck/lint passes

## Functional Requirements

- FR-1: `Combatant` type must include `abilityStates: AbilityState[]` and `statusEffects: StatusEffect[]`
- FR-2: 'ability' must appear as an available action when any ability has `currentCooldown === 0`
- FR-3: AI must choose abilities according to the priority order defined in US-004
- FR-4: `invasionCombatExecuteAbility()` must resolve ability activation, apply all effects, and return updated turn queue
- FR-5: Ability cooldowns must decrement by 1 at the start of each new combat round
- FR-6: Status effect durations must decrement by 1 each round; expired effects are removed
- FR-7: Stunned combatants must skip their turn (auto-wait)
- FR-8: Marked targets must take bonus damage from all sources
- FR-9: Evasion must be checked before each incoming attack as a first-activation passive — the first trigger consumes the defender's next turn, subsequent triggers are free
- FR-10: Berserk must auto-activate when HP drops below threshold as a first-activation passive — the first trigger consumes the unit's turn, subsequent applications are free
- FR-11: Shield/defense buffs must modify effective defense during attack resolution
- FR-12: Heal must restore HP capped at maxHp
- FR-13: Resurrect must revive one dead ally with partial HP
- FR-14: Dispel must clear all status effects from target
- FR-15: Fear Immunity must block morale penalties for affected units
- FR-16: Scout must mark rooms as scouted, skipping trap triggers for those rooms
- FR-17: Disarm must roll against trap automatically during room entry (passive, not a combat action), preventing trap trigger on success
- FR-18: `InhabitantContent` must support optional `combatAbilityIds` field
- FR-19: All ability activations must produce battle log entries
- FR-20: Ability states must persist across rooms on surviving combatants
- FR-21: Magic Damage must ignore the defender's defense stat entirely

## Non-Goals

- No player-facing ability UI controls (abilities are AI-chosen, not player-chosen)
- No ability animations or visual effects beyond battle log text
- No ability upgrade/leveling system
- No ability learning/unlocking mechanic (abilities are defined on content, not earned)
- No cross-invasion ability persistence (cooldowns reset between invasions)
- No new invader classes or invader YAML changes (only inhabitant abilities are new content)

## Technical Considerations

- **Two ability resolution paths exist**: `combat-abilities.ts` (`combatAbilityTryActivate`) and `invaders.ts` (`invaderResolveAbility`). Consolidate on `combatAbilityTryActivate` as the canonical path for in-combat resolution since it works with `CombatUnit`. `invaderResolveAbility` can remain for pre-combat/out-of-combat checks or be deprecated
- **`Combatant` is a lightweight type** — adding fields requires updating all creation points (`invasionCombatCreateCombatant`) and test helpers
- **`StatusEffect` is currently defined only on `InvaderInstance`** — it needs to be shared to `src/app/interfaces/combat.ts` so both sides can use it
- **Immutability**: all combat functions return new objects (no mutation). Ability state changes must follow this pattern
- **RNG**: all random rolls must use the seeded `rng` parameter, never `Math.random`, to maintain deterministic replays
- **Content lookups**: use `contentGetEntry<CombatAbilityContent>(abilityId)` to resolve ability definitions from IDs stored in `abilityStates`
- **Gamedata pipeline**: new inhabitant abilities require YAML entries with real UUIDs, globally unique names, and a `gamedata:build` to compile

## Success Metrics

- All 17 existing combat abilities fire during invasions when conditions are met
- Inhabitants can use abilities during combat defense
- Battle log shows ability usage alongside normal attacks
- No regression in existing combat tests
- Invasions feel more tactically varied — Mages cast Arcane Bolt, Warriors raise Shield Wall, Clerics heal, Rangers scout ahead

## Resolved Decisions

- **Passive abilities (Evasion, Berserk) consume the turn on first activation only.** The first time the passive triggers, the unit's turn is spent on the activation (with a battle log message). Subsequent triggers in the same combat are free. This adds a tactical cost without making passives useless. Tracked via `passiveActivated: boolean` on `AbilityState`.
- **Resurrect is limited by high cooldown only.** Set YAML cooldown to 5+ turns — no extra "once per combat" flag needed. This naturally limits it to 1-2 uses per room fight.
- **Scout only reveals rooms ahead.** Reveals the next N unvisited rooms on the invasion path from `currentRoomIndex + 1` forward. Already-entered rooms are irrelevant.
- **Disarm is a room-entry passive.** When the invader party enters a trapped room, a Rogue with Disarm Trap auto-rolls before traps fire. It is NOT a combat turn action. This matches the YAML (cooldown: 0) and the existing trap-trigger flow in `invasion-process.ts`.
