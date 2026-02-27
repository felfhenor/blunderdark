# PRD: Invasion Rework — Longer, Less Deterministic Invasions

## Introduction

Invasions currently feel too short and too hard to win. Invaders always enter floor 0 at the farthest room from the altar and path linearly through the dungeon, making invasions predictable. The max 30-turn limit with 2-4 ticks per room means most invasions resolve in under a minute. Completing just 2 secondary objectives triggers an instant player defeat, which feels punishing and abrupt.

This rework addresses all of these issues:
- **Random entry point on any floor** — invaders "drill in" to a random room, making dungeon layout matter everywhere.
- **Objectives-first pathing** — invaders always pursue secondary objectives before the altar, naturally lengthening invasions.
- **Longer pacing** — increased tick budgets and turn limits give defenders more chances to fight.
- **Reduced determinism** — randomized entry, suboptimal pathing, random mid-invasion events, and variable compositions.
- **Scoring system replaces binary defeat** — completed objectives weaken the altar rather than causing instant defeat, creating a sliding scale of outcomes.

## Goals

- Make invasion entry point unpredictable (any room on any floor, except altar)
- Ensure invaders always pursue secondary objectives before pathing to the altar
- Increase invasion duration by ~2-3x through higher tick budgets and turn limits
- Add randomness to pathing (occasional suboptimal routes, exploration)
- Add random mid-invasion events (reinforcements, desertion, infighting, environmental hazards)
- Increase variance in party size and class distribution
- Replace the "2 completed objectives = defeat" condition with a scoring system where completed objectives weaken the altar

## User Stories

### US-001: Randomize invasion entry point to any floor/room

**Description:** As a player, I want invaders to drill into a random room on any floor so that I can't predict where they'll enter and must defend my entire dungeon.

**Acceptance Criteria:**
- [ ] `invasionFindEntryRoom()` in `invasion-process.ts` selects a random non-altar, non-transport room from any floor (not just floor 0)
- [ ] The selected room and its floor index are stored in `ActiveInvasion` (add `entryFloorIndex` field if needed)
- [ ] The altar room is excluded from entry selection
- [ ] Transport rooms (stairs/elevators) are excluded from entry selection
- [ ] The warning system (`invasionTriggerGenerateWarning()`) uses the same randomized entry logic so the player sees where invaders will drill in
- [ ] Multi-floor pathing (`buildMultiFloorPath()`) works correctly when starting from any floor (not just floor 0) — invaders path to objectives on their starting floor first, then use transport rooms to reach other floors
- [ ] If the dungeon has only 1 room (the altar), invaders still enter that room (edge case)
- [ ] Typecheck/lint passes
- [ ] Existing invasion tests updated

### US-002: Objectives-first pathing

**Description:** As a player, I want invaders to always pursue their secondary objectives before heading to the altar, so invasions last longer and I have more time to wear them down.

**Acceptance Criteria:**
- [ ] `buildMultiFloorPath()` and `pathfindingFindWithObjectives()` are reworked so that all secondary objective rooms are visited BEFORE the altar room
- [ ] If secondary objectives are on multiple floors, invaders path to objective floors first, then path to the altar floor last
- [ ] If secondary objectives are on the same floor as the altar, invaders visit objective rooms before routing to the altar
- [ ] If no secondary objectives are assigned (edge case), invaders path directly to the altar as before
- [ ] The path stored in `ActiveInvasion.path` reflects this objectives-first ordering
- [ ] Battle log entries show invaders arriving at objective rooms before the altar
- [ ] Typecheck/lint passes
- [ ] Existing invasion tests updated

### US-003: Increase tick budgets and turn limits

**Description:** As a player, I want invasions to last longer so combat feels more meaningful and I have more opportunities for my defenders and traps to matter.

**Acceptance Criteria:**
- [ ] `INVASION_BASE_TICKS_PER_ROOM` increased from 2 to 4 (rooms take longer to clear)
- [ ] `INVASION_TICKS_PER_DEFENDER` increased from 2 to 3 (more defenders = proportionally longer fights)
- [ ] `INVASION_WIN_LOSS_MAX_TURNS` increased from 30 to 60
- [ ] `MAX_ROUNDS_PER_ROOM` in `invasion-combat.ts` increased from 10 to 15
- [ ] Hallway traversal speed remains 1 tile per tick (unchanged — hallways already add meaningful time)
- [ ] Typecheck/lint passes
- [ ] Existing invasion tests updated for new constants

### US-004: Randomized pathing — suboptimal route choices

**Description:** As a player, I want invaders to occasionally take unexpected routes through my dungeon, so I can't perfectly predict their path.

**Acceptance Criteria:**
- [ ] When building the invasion path, there is a configurable chance (e.g., 20-30%) that invaders pick a non-shortest route between waypoints
- [ ] "Non-shortest route" means selecting a path that includes 1-2 extra rooms beyond the optimal path (not a completely random walk)
- [ ] The randomization is seeded per invasion so it's consistent within a single invasion (no path flickering)
- [ ] The pathfinding still respects fear costs on rooms (high-fear rooms are still avoided, but the avoidance is less perfect)
- [ ] The path deviation is bounded — invaders never take a path more than 50% longer than optimal
- [ ] Typecheck/lint passes

### US-005: Random mid-invasion events

**Description:** As a player, I want unpredictable events during invasions that can help or hinder either side, adding tension and replayability.

**Acceptance Criteria:**
- [ ] A new `invasionProcessRandomEvent()` function is called once per room entry (not per tick) with a configurable trigger chance (e.g., 15% per room)
- [ ] At least 4 event types are implemented, with magnitude scaling based on threat level (low threat = minor effects, high threat = more impactful):
  - **Invader Infighting:** Two random invaders deal minor damage to each other (morale penalty). Damage scales with threat. Log: "Disagreement breaks out among the invaders!"
  - **Reinforcements:** 1-2 additional invaders join the party (count and stats scale with threat level). Log: "Reinforcements arrive to bolster the invasion!"
  - **Desertion:** 1 random non-leader invader flees (removed from party). At high threat, may also cause a morale penalty to remaining invaders. Log: "[Name] loses nerve and flees the dungeon!"
  - **Environmental Hazard:** All invaders in the current room take minor damage (e.g., cave-in, gas leak). Damage scales with threat. Log: "The dungeon itself lashes out at the intruders!"
- [ ] Events are logged to the battle log with descriptive messages
- [ ] Events appear in the invasion HUD as they happen
- [ ] The event system is extensible (easy to add more event types later)
- [ ] Typecheck/lint passes

### US-006: Variable invasion compositions

**Description:** As a player, I want invasion parties to feel more varied in size and composition, so each invasion feels distinct.

**Acceptance Criteria:**
- [ ] Party size ranges are widened: current ranges (3-5, 6-10, 11-15) gain +/- 2 variance (so 1-7, 4-12, 9-17 effective ranges, still clamped to minimum 2)
- [ ] Class distribution has more variance — instead of strictly following weight tables, each class weight gets a random +/- 20% modifier before normalization
- [ ] Rare "themed" invasions have a small chance (10-15%): all-rogue stealth raid, all-paladin crusade, mage-heavy arcane assault, etc. These override normal composition weights
- [ ] Themed invasions have paired secondary objectives that match the theme (e.g., stealth raid → StealTreasure/PlunderVault, crusade → SealPortal, arcane assault → DefileLibrary). If the paired objective isn't eligible, fall back to random selection
- [ ] Themed invasions get a unique log entry at invasion start (e.g., "A stealth raid approaches!")
- [ ] The warrior-guaranteed rule (at least 1 warrior) is relaxed for themed invasions
- [ ] Typecheck/lint passes
- [ ] Existing composition tests updated

### US-007: Scoring system — objectives weaken the altar instead of causing instant defeat

**Description:** As a player, I want completed secondary objectives to weaken my altar rather than instantly losing, so invasions have a sliding scale of outcomes instead of binary win/lose.

**Acceptance Criteria:**
- [ ] Remove the `objectives_completed` win condition from `invasionWinLossCheck()` — completing 2+ secondaries no longer causes instant player defeat
- [ ] Each completed secondary objective applies a debuff to the altar: reduce its effective max HP by 15% per completed objective for the remainder of this invasion
- [ ] The altar HP debuff stacks (2 completed objectives = 30% max HP reduction, 3 = 45%, etc.) but cannot reduce altar max HP below 10% of its original value
- [ ] The altar's current HP is clamped to the new reduced max (so completing an objective can deal indirect damage)
- [ ] The invasion HUD shows the altar's debuffed max HP so the player understands the stakes
- [ ] Post-battle results show how many objectives were completed and the resulting altar debuff
- [ ] Reward multiplier formula is updated: base 1.0, +0.25 per prevented secondary, -0.15 per completed secondary (instead of the current +-0.25)
- [ ] Player can still only lose by altar destruction (HP reaching 0)
- [ ] Typecheck/lint passes
- [ ] Existing win/loss tests updated

### US-008: Update post-battle results to show new scoring

**Description:** As a player, I want the post-battle results screen to clearly show how objectives affected the altar and my overall performance.

**Acceptance Criteria:**
- [ ] Results phase shows altar HP remaining as a percentage (e.g., "Altar: 45% HP remaining")
- [ ] Results phase shows each secondary objective status: prevented / completed, with the altar debuff amount
- [ ] If the altar was weakened by objectives, show the effective max HP vs original max HP
- [ ] Reward multiplier is displayed so the player understands why they got more or fewer rewards
- [ ] Typecheck/lint passes

### US-009: Update invasion warning to show entry floor

**Description:** As a player, I want the pre-invasion warning to tell me which floor the invaders will drill into, so I have a brief window to prepare.

**Acceptance Criteria:**
- [ ] The invasion warning badge tooltip shows the entry floor (e.g., "Drilling into Floor 2")
- [ ] The entry room name is shown if known (e.g., "Drilling into Gold Mine on Floor 2")
- [ ] The warning still shows invader composition and objectives as before
- [ ] Typecheck/lint passes

### US-010: Update invasion HUD for multi-floor entry

**Description:** As a player, I want the real-time invasion HUD to correctly display progress when invaders enter on non-floor-0 levels.

**Acceptance Criteria:**
- [ ] The HUD path visualization works correctly when the invasion starts on any floor (not just floor 0)
- [ ] Current floor indicator shows which floor the invaders are currently on
- [ ] Cross-floor transitions are visually indicated in the HUD
- [ ] Typecheck/lint passes

## Functional Requirements

- FR-1: Entry room selection must exclude the altar room and transport rooms from candidacy
- FR-2: Entry room is selected uniformly at random from all eligible rooms across all floors
- FR-3: Invaders always path to all secondary objective rooms before pathing to the altar
- FR-4: Multi-floor pathing must work when starting from any floor, using transport rooms to traverse between floors
- FR-5: Base ticks per room increased to 4; ticks per defender increased to 3; max turns increased to 60; max rounds per room increased to 15
- FR-6: Pathing includes a 20-30% chance of suboptimal route selection per waypoint transition, bounded to 50% longer than optimal
- FR-7: Random events trigger with ~15% chance per room entry, selecting from at least 4 event types
- FR-8: Party size ranges gain +/- 2 variance; class weights gain +/- 20% random modifier
- FR-9: 10-15% chance of themed invasion that overrides normal composition with a class-focused party and paired secondary objectives
- FR-10: Completed secondary objectives reduce altar effective max HP by 15% each (stacking, minimum 10% max HP)
- FR-11: The `objectives_completed` instant-defeat condition is removed
- FR-12: Reward multiplier formula: base 1.0, +0.25 per prevented secondary, -0.15 per completed secondary
- FR-13: Invasion warning shows entry floor and room name
- FR-14: All random choices use the game's RNG system for reproducibility
- FR-15: Random event magnitude scales with current threat level (low threat = minor, high threat = more impactful)
- FR-16: Invasion warning shows both the entry floor AND the specific room name

## Non-Goals

- No player-controlled combat (combat remains AI-resolved)
- No multi-wave/staggered invasions (single wave, but longer)
- No siege/camp-and-retreat mechanics
- No changes to the grace period or base invasion scheduling intervals
- No changes to the morale system itself (though objectives-first pathing gives fear rooms more opportunities to matter)
- No changes to combat ability mechanics (handled by separate PRD)
- No changes to prisoner mechanics
- No new invader classes
- No changes to the anti-turtling (focused assault) system beyond what's needed for the new scoring model

## Design Considerations

- The invasion warning badge (`badge-invasion-warning`) needs to show entry floor info — extend the existing tooltip
- The invasion HUD (`hud-invasion`) already shows path progress and altar HP — it needs to display the debuffed max HP and handle multi-floor starts
- Post-battle results (`invasion-results-phase`) needs a new "Altar Status" section showing debuff effects
- Random events should use the existing battle log system and HUD event display
- Themed invasion names should appear in the warning badge and battle results

## Technical Considerations

- `invasionFindEntryRoom()` currently hardcodes floor 0 — needs to iterate all floors and collect eligible rooms
- `buildMultiFloorPath()` assumes entry on floor 0 and ascending to deeper floors — needs to handle arbitrary start floor with bi-directional floor traversal
- The pathfinding graph builder (`buildDungeonGraph()`) already works per-floor — multi-floor pathing needs to compose floor graphs correctly regardless of start floor
- Random event system should be a simple array of event handler functions for extensibility
- Altar max HP debuff should be tracked on `ActiveInvasion` (e.g., `altarMaxHpMultiplier: number`) rather than mutating the altar's actual HP field
- The suboptimal pathing can be implemented by adding random weight noise to the pathfinding graph edges before running Dijkstra/BFS
- All randomness must use the game's seeded RNG (`rng*` helpers) for deterministic replay

## Success Metrics

- Average invasion duration increases from ~10-15 turns to ~25-40 turns
- Player win rate increases (fewer instant-defeat-by-objectives scenarios)
- No two consecutive invasions feel identical (different entry points, paths, events, compositions)
- Players engage with defending all floors, not just floor 0
- The altar HP scoring system creates interesting near-miss outcomes (altar survives at low HP)

## Resolved Design Decisions

- **Entry point:** Fully random across all floors and rooms (uniform distribution). No weighting by room value.
- **Themed invasions:** Have paired secondary objectives matching the theme (stealth raid → StealTreasure/PlunderVault, crusade → SealPortal, arcane assault → DefileLibrary). Falls back to random if paired objective isn't eligible.
- **Altar debuff:** 15% max HP reduction per completed objective (stacking, min 10% max HP). At 2 objectives = 30% reduction, 3 = 45%.
- **Random event scaling:** Event magnitude scales with threat level. Low threat = minor effects, high threat = more impactful (more reinforcements, higher hazard damage, morale penalties on desertion).
- **Warning detail:** Player sees both the specific room name AND the floor number (e.g., "Drilling into Gold Mine on Floor 2").
