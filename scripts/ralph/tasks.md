# Ralph Task Ordering

A prioritized list of features based on dependencies and logical progression.

## Status Summary

- **Complete:** 13 features (grid-system, resource-manager, adjacency-detection, biome-system, inhabitant-data-model, tetromino-room-shapes, hallway-data-structure, reputation-tracking, seasonal-cycle-system, floor-creation-system, room-placement-validation partial, research-tree-data-structure partial)
- **Remaining:** ~109 features

---

## Phase 1: Complete Partial Features

These features have some stories done. Complete them first.

| Priority | Feature | Remaining | Depends On |
|----------|---------|-----------|------------|
| ~~1.1~~ | ~~`floor-creation-system`~~ | ~~COMPLETE~~ | ~~grid-system~~ |
| 1.2 | `research-tree-data-structure` | US-003 through US-007 | none |
| 1.3 | `room-placement-validation` | US-004, US-005 | grid-system, tetromino-room-shapes |

---

## Phase 2: Core Gameplay Systems

These unlock the main gameplay loop: building rooms that produce resources.

| Priority | Feature | Stories | Depends On |
|----------|---------|---------|------------|
| 2.1 | `time-system` | 5 | none |
| 2.2 | `production-calculation-system` | 6 | resource-manager, adjacency-detection |
| 2.3 | `room-placement-ui` | 6 | grid-system, tetromino-room-shapes, room-placement-validation |
| 2.4 | `direct-adjacency-connection` | 4 | adjacency-detection |
| 2.5 | `hallway-placement-tool` | 5 | grid-system, hallway-data-structure |

---

## Phase 3: First Functional Rooms

Build the first rooms so players can actually play.

| Priority | Feature | Stories | Depends On |
|----------|---------|---------|------------|
| 3.1 | `throne-room` | 6 | room-placement-ui |
| 3.2 | `crystal-mine-room` | 5 | room-placement-ui, production-calculation-system |
| 3.3 | `mushroom-grove-room` | 5 | room-placement-ui, production-calculation-system |
| 3.4 | `altar-room` | 8 | room-placement-ui |
| 3.5 | `room-removal` | 4 | room-placement-ui |

---

## Phase 4: Inhabitant Management

Allow recruiting and assigning creatures to rooms.

| Priority | Feature | Stories | Depends On |
|----------|---------|---------|------------|
| 4.1 | `inhabitant-recruitment-system` | 3 | inhabitant-data-model, resource-manager |
| 4.2 | `inhabitant-assignment-system` | 4 | inhabitant-data-model, room-placement-ui |
| 4.3 | `inhabitant-roster-ui` | 5 | inhabitant-data-model |
| 4.4 | `efficiency-calculation` | 5 | inhabitant-assignment-system, production-calculation-system |

---

## Phase 5: Resource UI & Feedback

Show players their economy status.

| Priority | Feature | Stories | Depends On |
|----------|---------|---------|------------|
| 5.1 | `resource-ui-display` | 5 | resource-manager |
| 5.2 | `adjacency-bonus-system` | 5 | adjacency-detection, production-calculation-system |
| 5.3 | `synergy-detection-logic` | 4 | adjacency-detection |
| 5.4 | `synergy-tooltip-system` | 4 | synergy-detection-logic |

---

## Phase 6: Additional Rooms (Production)

More room variety for economic depth.

| Priority | Feature | Stories | Depends On |
|----------|---------|---------|------------|
| 6.1 | `shadow-library-room` | 6 | room-placement-ui, production-calculation-system |
| 6.2 | `soul-well-room` | 5 | room-placement-ui, production-calculation-system |
| 6.3 | `treasure-vault-room` | 5 | room-placement-ui |
| 6.4 | `underground-lake-room` | 5 | room-placement-ui |
| 6.5 | `ley-line-nexus-room` | 5 | room-placement-ui |

---

## Phase 7: Combat Foundation

Combat system for invasions and training.

| Priority | Feature | Stories | Depends On |
|----------|---------|---------|------------|
| 7.1 | `basic-combat-resolution` | 7 | inhabitant-data-model |
| 7.2 | `special-combat-abilities` | 6 | basic-combat-resolution |
| 7.3 | `barracks-room` | 5 | room-placement-ui, basic-combat-resolution |
| 7.4 | `training-grounds-room` | 5 | room-placement-ui, basic-combat-resolution |

---

## Phase 8: Traps & Defense

Passive defense mechanisms.

| Priority | Feature | Stories | Depends On |
|----------|---------|---------|------------|
| 8.1 | `trap-system` | 6 | grid-system |
| 8.2 | `trap-workshop-room` | 5 | room-placement-ui, trap-system |

---

## Phase 9: Invasion System

The main threat/challenge loop.

| Priority | Feature | Stories | Depends On |
|----------|---------|---------|------------|
| 9.1 | `multiple-invader-types` | 3 | none |
| 9.2 | `invader-pathfinding` | 4 | grid-system, hallway-data-structure |
| 9.3 | `invasion-trigger-system` | 3 | time-system |
| 9.4 | `invasion-composition-logic` | 4 | multiple-invader-types |
| 9.5 | `invasion-objectives-system` | 5 | invasion-trigger-system |
| 9.6 | `invasion-win-loss-conditions` | 3 | basic-combat-resolution |
| 9.7 | `invasion-rewards-system` | 5 | invasion-win-loss-conditions |
| 9.8 | `turn-based-invasion-mode` | 8 | invasion-trigger-system, basic-combat-resolution |

---

## Phase 10: Modifier Systems

Production modifiers add strategic depth.

| Priority | Feature | Stories | Depends On |
|----------|---------|---------|------------|
| 10.1 | `conditional-state-modifiers` | 6 | production-calculation-system |
| 10.2 | `conditional-production-modifiers` | 6 | production-calculation-system |
| 10.3 | `biome-bonuses` | 5 | biome-system, production-calculation-system |
| 10.4 | `biome-restrictions` | 5 | biome-system, room-placement-ui |
| 10.5 | `floor-depth-modifiers` | 4 | floor-creation-system |
| 10.6 | `day-night-production-modifiers` | 4 | time-system, production-calculation-system |
| 10.7 | `season-specific-bonuses` | 5 | seasonal-cycle-system, production-calculation-system |

---

## Phase 11: Fear & Hunger Systems

Inhabitant needs create management challenge.

| Priority | Feature | Stories | Depends On |
|----------|---------|---------|------------|
| 11.1 | `hunger-system` | 4 | inhabitant-data-model, resource-manager |
| 11.2 | `fear-level-tracking` | 4 | inhabitant-data-model |
| 11.3 | `fear-propagation` | 4 | fear-level-tracking, adjacency-detection |
| 11.4 | `fear-hunger-ui-indicators` | 4 | hunger-system, fear-level-tracking |
| 11.5 | `morale-system` | 4 | fear-level-tracking, hunger-system |

---

## Phase 12: Corruption System

Risk/reward mechanic.

| Priority | Feature | Stories | Depends On |
|----------|---------|---------|------------|
| 12.1 | `corruption-resource` | 4 | resource-manager |
| 12.2 | `corruption-generation` | 4 | corruption-resource |
| 12.3 | `corruption-effects` | 5 | corruption-resource |
| 12.4 | `corruption-threshold-triggers` | 4 | corruption-effects |

---

## Phase 13: Research System

Unlock new content over time.

| Priority | Feature | Stories | Depends On |
|----------|---------|---------|------------|
| 13.1 | `research-progress-system` | 5 | research-tree-data-structure, resource-manager |
| 13.2 | `research-ui` | 6 | research-tree-data-structure |
| 13.3 | `research-unlocks` | 5 | research-progress-system |

---

## Phase 14: Reputation Effects

Reputation unlocks special abilities.

| Priority | Feature | Stories | Depends On |
|----------|---------|---------|------------|
| 14.1 | `reputation-effects` | 6 | reputation-tracking |

---

## Phase 15: Advanced Rooms

Specialized and powerful rooms.

| Priority | Feature | Stories | Depends On |
|----------|---------|---------|------------|
| 15.1 | `spawning-pool-room` | 5 | room-placement-ui |
| 15.2 | `breeding-pits-room` | 6 | room-placement-ui, inhabitant-data-model |
| 15.3 | `summoning-circle-room` | 6 | room-placement-ui |
| 15.4 | `dark-forge-room` | 6 | room-placement-ui |
| 15.5 | `alchemy-lab-room` | 6 | room-placement-ui |
| 15.6 | `torture-chamber-room` | 5 | room-placement-ui |

---

## Phase 16: Multi-Floor & Connections

Vertical dungeon expansion.

| Priority | Feature | Stories | Depends On |
|----------|---------|---------|------------|
| 16.1 | `floor-navigation-ui` | 5 | floor-creation-system |
| 16.2 | `vertical-connections-stairs` | 5 | floor-creation-system |
| 16.3 | `vertical-connections-elevators-portals` | 6 | vertical-connections-stairs |
| 16.4 | `connection-cost-system` | 4 | vertical-connections-stairs |
| 16.5 | `hallway-pathfinding` | 5 | hallway-data-structure |

---

## Phase 17: Additional Inhabitants

More creature variety.

| Priority | Feature | Stories | Depends On |
|----------|---------|---------|------------|
| 17.1 | `additional-tier2-inhabitants` | 3 | inhabitant-data-model |
| 17.2 | `orc-inhabitant` | 3 | inhabitant-data-model |
| 17.3 | `wraith-inhabitant` | 3 | inhabitant-data-model |
| 17.4 | `stone-elemental-inhabitant` | 3 | inhabitant-data-model |
| 17.5 | `mimic-inhabitant` | 3 | inhabitant-data-model |
| 17.6 | `lich-inhabitant` | 3 | inhabitant-data-model |
| 17.7 | `legendary-inhabitants` | 4 | inhabitant-data-model |

---

## Phase 18: Fusion System

Combining inhabitants for new creatures.

| Priority | Feature | Stories | Depends On |
|----------|---------|---------|------------|
| 18.1 | `fusion-recipes-system` | 5 | inhabitant-data-model |
| 18.2 | `fusion-interface` | 5 | fusion-recipes-system |
| 18.3 | `hybrid-stat-generation` | 4 | fusion-recipes-system |

---

## Phase 19: Environmental Features

Grid features and attachments.

| Priority | Feature | Stories | Depends On |
|----------|---------|---------|------------|
| 19.1 | `environmental-features` | 5 | grid-system |
| 19.2 | `feature-attachment-system` | 4 | environmental-features |
| 19.3 | `functional-features` | 5 | feature-attachment-system |

---

## Phase 20: Victory & Progression

End-game goals.

| Priority | Feature | Stories | Depends On |
|----------|---------|---------|------------|
| 20.1 | `victory-path-implementation` | 6 | reputation-tracking |
| 20.2 | `victory-progress-tracking-ui` | 5 | victory-path-implementation |
| 20.3 | `prestige-features` | 6 | victory-path-implementation |

---

## Phase 21: Merchant & Events

Additional gameplay variety.

| Priority | Feature | Stories | Depends On |
|----------|---------|---------|------------|
| 21.1 | `merchant-system` | 6 | resource-manager |
| 21.2 | `seasonal-events` | 5 | seasonal-cycle-system |

---

## Phase 22: Save System

Data persistence and management.

| Priority | Feature | Stories | Depends On |
|----------|---------|---------|------------|
| 22.1 | `autosave` | 4 | comprehensive-save-system |
| 22.2 | `comprehensive-save-system` | 6 | none |
| 22.3 | `multiple-save-slots` | 5 | comprehensive-save-system |
| 22.4 | `save-file-versioning` | 4 | comprehensive-save-system |

---

## Phase 23: UI Polish (Can Be Done Anytime)

These have no gameplay dependencies.

| Priority | Feature | Stories | Depends On |
|----------|---------|---------|------------|
| 23.1 | `camera-controls` | 6 | none |
| 23.2 | `contextual-tooltips` | 7 | none |
| 23.3 | `help-menu` | 3 | none |
| 23.4 | `tutorial-sequence` | 8 | none |
| 23.5 | `colorblind-modes` | 6 | none |
| 23.6 | `text-scaling` | 6 | none |
| 23.7 | `ui-contrast-options` | 5 | none |

---

## Phase 24: Audio & Visual Polish (Can Be Done Anytime)

| Priority | Feature | Stories | Depends On |
|----------|---------|---------|------------|
| 24.1 | `animation-system` | 10 | none |
| 24.2 | `particle-effects` | 4 | none |
| 24.3 | `sound-effects` | 8 | none |
| 24.4 | `background-music-system` | 6 | none |
| 24.5 | `biome-visual-theming` | 9 | biome-system |
| 24.6 | `visual-time-indicators` | 5 | time-system |

---

## Phase 25: Performance (When Needed)

| Priority | Feature | Stories | Depends On |
|----------|---------|---------|------------|
| 25.1 | `performance-profiling` | 4 | none |
| 25.2 | `memory-optimization` | 5 | none |
| 25.3 | `load-time-optimization` | 4 | none |
| 25.4 | `pathfinding-optimization` | 4 | invader-pathfinding |

---

## Notes

- **Dependencies are approximate** - check individual PRDs for exact requirements
- **Phases 23-25 can be interleaved** - they don't block gameplay features
- **Combat phases (7-9) can be deferred** if focusing on economic gameplay first
- **Each phase builds on previous** - complete Phase N before starting Phase N+1 for best results
