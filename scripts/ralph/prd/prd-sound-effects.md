# PRD: Sound Effects

## Introduction
Blunderdark currently has a `SoundService` with basic UI sound effects (clicks, hover, success, error, item pickup, loading, victory). The game needs a comprehensive sound effects system covering room placement, resource collection, combat events, ambient biome sounds, and additional UI feedback. This feature expands the SFX library and integrates sound triggers throughout the game's systems.

## Goals
- Add sound effects for room placement/building actions
- Add sound effects for resource collection (coins, gems, food, Flux)
- Add combat sound effects (attack, hit, miss, death)
- Expand UI click/interaction sounds for completeness
- Add ambient background sounds per biome type
- Maintain existing volume control and mute functionality
- All new sounds follow the existing `SoundService` architecture

## User Stories

### US-001: Add Room Placement Sound Effects
**Description:** As a player, I want to hear a satisfying building/placement sound when I place a room in my dungeon so that the action feels impactful.

**Acceptance Criteria:**
- [ ] New SFX identifier(s) added to the `SFX` type: `'room-place'`, `'room-upgrade'`, `'room-remove'`
- [ ] Audio files added to `./audio/sfx/`
- [ ] `soundsToLoad` and `soundVolumeMixing` records in `SoundService` updated
- [ ] Sound plays when a room is successfully placed, upgraded, or removed
- [ ] Typecheck/lint passes

### US-002: Add Resource Collection Sound Effects
**Description:** As a player, I want distinct sounds when I collect different resource types so that I have audio feedback for resource generation.

**Acceptance Criteria:**
- [ ] New SFX identifiers added: `'resource-coin'`, `'resource-gem'`, `'resource-food'`, `'resource-flux'`
- [ ] Each resource type has an audibly distinct sound
- [ ] Audio files added to `./audio/sfx/`
- [ ] `soundsToLoad` and `soundVolumeMixing` records updated
- [ ] Sounds trigger when resources are collected/generated
- [ ] Sounds do not overlap excessively during rapid collection (debounce or queue)
- [ ] Typecheck/lint passes

### US-003: Add Combat Sound Effects
**Description:** As a player, I want combat encounters to have appropriate sound effects so that battles feel engaging and I get audio feedback on hits, misses, and defeats.

**Acceptance Criteria:**
- [ ] New SFX identifiers added: `'combat-attack'`, `'combat-hit'`, `'combat-miss'`, `'combat-death'`, `'combat-defend'`
- [ ] Audio files added to `./audio/sfx/`
- [ ] `soundsToLoad` and `soundVolumeMixing` records updated
- [ ] Each combat event triggers the corresponding sound
- [ ] Combat sounds have appropriate volume mixing relative to other SFX
- [ ] Typecheck/lint passes

### US-004: Add Ambient Biome Sounds
**Description:** As a player, I want subtle ambient background sounds that change based on the current biome so that each environment feels distinct.

**Acceptance Criteria:**
- [ ] A new ambient sound system is created (separate from SFX and BGM, or layered on top of BGM)
- [ ] At least one ambient loop per biome type (e.g., lava bubbling for volcanic, water dripping for flooded, crystal hum for crystalline, spore puffs for fungal)
- [ ] Ambient sounds loop seamlessly
- [ ] Ambient volume is tied to the SFX volume setting (or a separate ambient volume control)
- [ ] Ambient sounds crossfade when changing biomes
- [ ] Typecheck/lint passes

### US-005: Implement SFX Debouncing for Rapid Events
**Description:** As a developer, I want a debounce or throttle mechanism for sound effects so that rapid-fire events (e.g., many resources collected per tick) do not overwhelm the audio output.

**Acceptance Criteria:**
- [ ] A configurable debounce/throttle is implemented for SFX playback per sound type
- [ ] Rapid consecutive plays of the same SFX are throttled (e.g., max once per 100ms)
- [ ] Different SFX types can play simultaneously without throttling each other
- [ ] The existing `sfx$` observable in helpers can support throttled playback
- [ ] Typecheck/lint passes

### US-006: Expand UI Interaction Sounds
**Description:** As a player, I want consistent audio feedback for all UI interactions so that buttons, toggles, modals, and navigation feel responsive.

**Acceptance Criteria:**
- [ ] Existing UI sounds (`ui-click`, `ui-hover`, `ui-error`, `ui-success`) are verified to play on all relevant interactions
- [ ] New SFX added if needed: `'ui-toggle'`, `'ui-modal-open'`, `'ui-modal-close'`, `'ui-navigate'`
- [ ] Modal open/close triggers appropriate sounds
- [ ] Tab switching in options panel triggers a click sound
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-007: Add Volume Mixing Configuration
**Description:** As a developer, I want per-category volume mixing so that different sound categories (UI, combat, resources, ambient) have appropriate relative volumes.

**Acceptance Criteria:**
- [ ] Each SFX has a mixing coefficient in `soundVolumeMixing` tuned for its category
- [ ] UI sounds are subtle (0.3-0.5 multiplier)
- [ ] Combat sounds are prominent (0.8-1.5 multiplier)
- [ ] Resource sounds are moderate (0.5-0.8 multiplier)
- [ ] Ambient sounds are quiet (0.2-0.4 multiplier)
- [ ] Typecheck/lint passes

### US-008: Add Unit Tests for New SFX Types
**Description:** As a developer, I want tests confirming all new SFX identifiers are registered in the sound loading maps.

**Acceptance Criteria:**
- [ ] Test verifies every value in the `SFX` type union has a corresponding entry in `soundsToLoad`
- [ ] Test verifies every value in the `SFX` type union has a corresponding entry in `soundVolumeMixing`
- [ ] Tests pass via `npm run test`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must support room placement sounds (`room-place`, `room-upgrade`, `room-remove`).
- FR-2: The system must support resource collection sounds with distinct audio per resource type.
- FR-3: The system must support combat sounds for attack, hit, miss, death, and defend events.
- FR-4: The system must support ambient biome loops that change based on the active biome.
- FR-5: Rapid-fire SFX triggers must be debounced/throttled to prevent audio overload.
- FR-6: All new sounds must respect the existing `sfxPlay` toggle and `sfxVolume` setting.
- FR-7: New SFX must be loaded at application init alongside existing sounds.

## Non-Goals (Out of Scope)
- 3D positional audio or spatial sound
- User-configurable per-category volume sliders (single SFX volume is sufficient for now)
- Procedural/synthesized sound effects (all sounds are pre-recorded audio files)
- Sound packs or downloadable audio content

## Technical Considerations
- The existing `SoundService` uses Web Audio API with `AudioContext`, `AudioBufferSourceNode`, and `GainNode`. All new sounds follow this pattern.
- The `sfx$` observable (from `@helpers`) is the existing mechanism for triggering SFX from anywhere in the app. New game systems should emit SFX events through this channel.
- Audio files should be MP3 format, short duration (under 2 seconds for SFX), and compressed to minimize load time.
- The `SFX` type in `src/app/interfaces/sfx.ts` and the `soundsToLoad`/`soundVolumeMixing` records in `SoundService` must stay in sync.
- Ambient sounds are longer loops and may need separate `AudioBufferSourceNode` instances with `loop = true`, similar to BGM but at a lower volume layer.
- Dependencies on "all major game systems" means sound integration will be incremental as room placement, combat, and resource systems are built.

## Success Metrics
- Every major player action (room placement, resource collection, combat event) has associated audio feedback
- No audio overload during rapid game events (resource ticks, combat rounds)
- Ambient sounds loop cleanly without pops or gaps
- All sounds respect mute and volume settings
- Audio loads without increasing app startup time by more than 500ms

## Open Questions
- Should ambient sounds have a separate volume slider, or share the SFX volume?
- How many simultaneous SFX should be supported before oldest sounds are culled?
- Should combat sounds vary based on weapon/attack type, or use generic sounds initially?
- What is the audio file budget (total MB) for all SFX to keep load times reasonable?
