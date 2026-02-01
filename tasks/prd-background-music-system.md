# PRD: Background Music System

## Introduction
Blunderdark already has a foundational BGM system with a `SoundService` that loads audio, a `BGMService` that switches tracks based on navigation, and crossfade support. However, the current implementation is minimal: it supports only `menu` and `game-casual` tracks in practice, with `game-threatened` and `game-explore` defined but not triggered by game state. This feature expands the BGM system to include 3-5 distinct music tracks tied to game states (menu, casual gameplay, invasion/threat, exploration, victory), with seamless looping, proper crossfading, and full volume controls.

## Goals
- Support 3-5 music tracks mapped to distinct game states: menu, casual gameplay, invasion/threatened, exploration, and victory
- Seamless looping with no audible gaps or pops at loop boundaries
- Smooth crossfade transitions (configurable duration) when switching between tracks
- Volume control accessible in the options panel with real-time adjustment
- Music automatically changes based on game state signals (paused, active, under invasion, exploring, victory)

## User Stories

### US-001: Define Game State to BGM Mapping
**Description:** As a developer, I want a clear mapping between game states and BGM tracks so that the `BGMService` can automatically select the appropriate music.

**Acceptance Criteria:**
- [ ] A mapping type/constant defines which `BGM` track plays for each game state: `'menu'`, `'game-casual'`, `'game-threatened'`, `'game-explore'`, and a victory sting
- [ ] The `BGM` type in `src/app/interfaces/sfx.ts` includes all required track identifiers
- [ ] The mapping is documented in code comments
- [ ] Typecheck/lint passes

### US-002: Implement Game State Detection for BGM Triggers
**Description:** As a developer, I want `BGMService` to reactively detect the current game state (idle, under invasion, exploring, victory) from game signals so that it triggers the correct BGM.

**Acceptance Criteria:**
- [ ] `BGMService` reads relevant game state signals (e.g., invasion active, exploration mode, victory condition)
- [ ] When the game loop is not running (menu/pause), `menu` BGM plays
- [ ] During normal gameplay, `game-casual` plays
- [ ] During an invasion event, `game-threatened` plays
- [ ] During exploration, `game-explore` plays
- [ ] On victory, a victory track/sting plays (non-looping or single loop)
- [ ] Transitions happen via the existing crossfade mechanism
- [ ] Typecheck/lint passes

### US-003: Improve Crossfade Implementation
**Description:** As a player, I want music transitions to be smooth and seamless so that track changes do not produce jarring audio jumps.

**Acceptance Criteria:**
- [ ] Crossfade duration is configurable via a constant (default 2 seconds, as currently defined)
- [ ] The outgoing track fades out while the incoming track fades in simultaneously (true crossfade, not sequential fade-out then fade-in)
- [ ] No audio pops or clicks during transitions
- [ ] If the same track is already playing, no crossfade occurs (avoid restarting the same track)
- [ ] Typecheck/lint passes

### US-004: Ensure Seamless Loop Points
**Description:** As a player, I want background music to loop without audible gaps or pops so that the music feels continuous.

**Acceptance Criteria:**
- [ ] All BGM tracks are loaded as `AudioBuffer` and played with `loop = true`
- [ ] Loop points are at the natural start/end of the audio buffer (no silence padding)
- [ ] Audio files are verified to have clean loop boundaries (no clicks at wrap point)
- [ ] Typecheck/lint passes

### US-005: Volume Control in Options Panel
**Description:** As a player, I want a volume slider for background music in the options panel so that I can adjust the music level to my preference.

**Acceptance Criteria:**
- [ ] The existing `bgmVolume` option (already in `GameOptions`) is exposed as a slider in `PanelOptionsUIComponent`
- [ ] Slider range is 0 to 1 (or 0% to 100%) with reasonable step increments
- [ ] Changing the slider updates BGM volume in real-time without restarting the track
- [ ] A mute toggle (the existing `bgmPlay` option) is available alongside the volume slider
- [ ] Volume setting persists across sessions
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-006: Add Victory Music Sting
**Description:** As a player, I want a special music track to play when I achieve a victory condition so that the moment feels rewarding.

**Acceptance Criteria:**
- [ ] A `'victory'` BGM identifier is added to the `BGM` type (or reuse the existing `victory` SFX if appropriate)
- [ ] The victory track plays once (not looping) when a victory condition is met
- [ ] After the victory track ends, music returns to the appropriate state BGM
- [ ] Typecheck/lint passes

### US-007: Add Unit Tests for BGM State Mapping
**Description:** As a developer, I want tests verifying the game state to BGM mapping logic so that track selection regressions are caught.

**Acceptance Criteria:**
- [ ] Test verifies that menu state maps to `'menu'` BGM
- [ ] Test verifies that normal gameplay maps to `'game-casual'`
- [ ] Test verifies that invasion state maps to `'game-threatened'`
- [ ] Tests pass via `npm run test`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must support at least 4 BGM tracks: menu, game-casual, game-threatened, and game-explore, plus a victory sting.
- FR-2: BGM must automatically change when the game state changes (e.g., invasion starts, exploration begins).
- FR-3: Track transitions must use crossfading with a configurable duration (default 2 seconds).
- FR-4: All tracks must loop seamlessly with no audible artifacts at the loop point.
- FR-5: The player must be able to adjust BGM volume and toggle BGM on/off from the options panel.
- FR-6: BGM state must be managed reactively using Angular Signals and `effect()`.

## Non-Goals (Out of Scope)
- Dynamic/adaptive music that layers instruments based on game intensity
- User-uploaded custom music tracks
- Music for individual room types or specific biomes (covered by biome theming if needed)
- Audio visualization or equalizer display

## Technical Considerations
- The existing `SoundService` already implements `AudioContext`, `AudioBuffer` loading, `GainNode` volume control, and crossfade via `linearRampToValueAtTime`. This feature extends rather than replaces the current implementation.
- The `BGMService` currently tracks `'menu' | 'game' | ''` as place signals; this needs to be expanded to track more granular game states.
- Dependencies on issues #41 (invasion system) and #101 (victory conditions) mean that some BGM triggers may need stub/placeholder logic until those features are implemented.
- Audio files should be MP3 format (consistent with existing files in `./audio/bgm/`) and kept under 5MB each for reasonable load times.
- The Web Audio API's `AudioBufferSourceNode.loop` property handles seamless looping natively.

## Success Metrics
- BGM correctly transitions between all defined game states with no audible gaps or pops
- Crossfade transitions are smooth with no audio artifacts
- Volume changes apply in real-time
- Players can mute and unmute BGM without disrupting the current track position
- All settings persist across sessions

## Open Questions
- Should the crossfade duration be user-configurable, or is a fixed 2-second default sufficient?
- What are the exact game state signals for invasion and exploration? (Depends on #41 and #101)
- Should there be a brief silence/transition between menu and game BGM, or always crossfade?
- What happens to BGM when the game is paused -- fade out, reduce volume, or switch to menu music?
