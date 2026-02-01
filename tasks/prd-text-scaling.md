# PRD: Text Scaling

## Introduction
Players have varying visual acuity and screen sizes. Blunderdark needs a text scaling option that allows players to increase or decrease the base font size across the entire application. This ensures readability on high-DPI displays, small laptop screens, and for players with low vision, while preventing layout breakage at all supported scale levels.

## Goals
- Provide 4 text scaling options: 75%, 100%, 125%, 150%
- All text in the application scales proportionally when the setting is changed
- UI layouts adjust gracefully to prevent text overlap, truncation, or broken layouts at all scale levels
- The setting persists across sessions via `localStorageSignal`
- The setting is accessible from the UI options panel

## User Stories

### US-001: Add Text Scale Option to GameOptions
**Description:** As a developer, I want to extend `GameOptions` with a `textScale` numeric field so that the user's preferred text scale is stored alongside other UI options.

**Acceptance Criteria:**
- [ ] `GameOptions` in `src/app/interfaces/state-options.ts` includes a `textScale` field of type `number`
- [ ] Default value is `100`
- [ ] Allowed values are constrained to `75 | 100 | 125 | 150`
- [ ] The option is persisted via `localStorageSignal`
- [ ] Typecheck/lint passes

### US-002: Apply Text Scale to Document Root
**Description:** As a developer, I want a reactive effect that sets the root `font-size` CSS property based on the `textScale` option so that all `rem`-based text scales proportionally.

**Acceptance Criteria:**
- [ ] `ThemeService` reads `textScale` via `getOption`
- [ ] An `effect()` sets `document.documentElement.style.fontSize` to the corresponding percentage value (e.g., `75%`, `100%`, `125%`, `150%`)
- [ ] Changing the option at runtime updates text size immediately without a page reload
- [ ] At 100%, the font size matches the browser default (16px)
- [ ] Typecheck/lint passes

### US-003: Add Text Scale Selector to Options UI
**Description:** As a player, I want a control in the UI options panel to select my preferred text size so that I can adjust readability to my needs.

**Acceptance Criteria:**
- [ ] `PanelOptionsUIComponent` displays a labeled control (slider, radio group, or segmented button) for text scale
- [ ] Options displayed: 75%, 100%, 125%, 150%
- [ ] Current selection is visually indicated
- [ ] A live preview label shows sample text at the current scale
- [ ] Selecting an option immediately updates the option signal and persists the choice
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-004: Audit Layouts at All Scale Levels
**Description:** As a player, I want the UI to remain usable at 150% text scale so that no text is clipped, overlapping, or causing scroll issues.

**Acceptance Criteria:**
- [ ] Home page renders correctly at 75%, 100%, 125%, and 150%
- [ ] Game play page (navbar, panels, modals) renders correctly at all scale levels
- [ ] Options panel itself renders correctly at all scale levels (the controls must remain accessible)
- [ ] Modal dialogs do not overflow the viewport at 150%
- [ ] Tooltip and notification text scales correctly
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Ensure Fixed-Size Elements Are Unaffected
**Description:** As a developer, I want sprite images, icon sizes, and canvas/game-board elements to remain at their intended pixel sizes regardless of text scale so that only text is affected.

**Acceptance Criteria:**
- [ ] `AtlasImageComponent` and `AtlasAnimationComponent` render sprites at their defined pixel dimensions at all text scale levels
- [ ] Icon components (`IconComponent`, `IconStatComponent`, etc.) maintain consistent sizing
- [ ] Game board grid (if applicable) does not scale with text
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-006: Add Unit Tests for Text Scale Option
**Description:** As a developer, I want tests confirming the text scale option is correctly stored, retrieved, and defaulted so that regressions are caught.

**Acceptance Criteria:**
- [ ] Test in `src/app/helpers/` verifies default value is `100`
- [ ] Test verifies that setting each valid value (75, 100, 125, 150) is stored and retrieved correctly
- [ ] Tests pass via `npm run test`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must provide a `textScale` option with discrete values: 75, 100, 125, 150.
- FR-2: When a user changes the text scale, all text rendered using relative units (`rem`, `em`) must scale proportionally.
- FR-3: The scaling must be achieved by modifying the root `font-size` so that the entire `rem`-based sizing cascade adjusts automatically.
- FR-4: The selected text scale must persist across browser sessions and Electron restarts via localStorage.
- FR-5: Elements sized in absolute units (`px`) -- such as sprites, icons, and game board tiles -- must not be affected by text scale changes.

## Non-Goals (Out of Scope)
- Arbitrary percentage values (only 75%, 100%, 125%, 150% are supported)
- Per-element font size overrides
- Scaling of non-text visual elements (sprites, images, game board)
- Browser-level zoom integration (this is an in-app setting independent of browser zoom)

## Technical Considerations
- DaisyUI and Tailwind CSS use `rem` units extensively, so changing the root `font-size` will cascade correctly through most of the UI.
- Some components may use `px` values for text; these will need to be audited and converted to `rem` if they should scale.
- The `ThemeService` already manages root-level DOM attributes via `effect()`; this is the natural place to add root font-size management.
- At 150% scale, some compact layouts (particularly the options panel and modals) may need `overflow` adjustments or flexible height.
- The `localStorageSignal` in `src/app/helpers/signal.ts` handles persistence.

## Success Metrics
- All text in the application scales correctly at each of the 4 supported levels
- No layout breakage (overflow, overlap, truncation) at any scale level on a 1280x720 minimum viewport
- Option persists correctly across page reloads
- No visual regression at the default 100% scale

## Open Questions
- Should the text scale setting also affect line-height and spacing proportionally?
- Is 75% a useful lower bound, or should the minimum be 100%?
- Should we support a "fit to screen" mode that auto-selects a scale based on viewport size?
