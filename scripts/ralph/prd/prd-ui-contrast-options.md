# PRD: UI Contrast Options

## Introduction
Some players have difficulty reading text or distinguishing UI elements when contrast ratios are low. Blunderdark uses DaisyUI themes which vary in contrast levels. This feature adds a dedicated high contrast mode toggle that increases the contrast between foreground and background elements, ensures text meets WCAG AA contrast ratios, and makes interactive elements more visually distinct.

## Goals
- Provide a toggleable high contrast mode in the options panel
- Increase contrast between text and backgrounds to meet WCAG AA (4.5:1 for normal text, 3:1 for large text)
- Make interactive elements (buttons, links, inputs) more visually distinct with stronger borders and outlines
- Persist the setting across sessions via `localStorageSignal`
- Work in combination with all existing DaisyUI themes

## User Stories

### US-001: Add High Contrast Option to GameOptions
**Description:** As a developer, I want to add a `highContrast` boolean to `GameOptions` so that the preference is stored and accessible via the options signal system.

**Acceptance Criteria:**
- [ ] `GameOptions` in `src/app/interfaces/state-options.ts` includes `highContrast: boolean`
- [ ] Default value is `false`
- [ ] The option is persisted via `localStorageSignal`
- [ ] Typecheck/lint passes

### US-002: Apply High Contrast CSS Class to Document Root
**Description:** As a developer, I want `ThemeService` to reactively apply a `high-contrast` CSS class on the document root when the option is enabled so that global CSS overrides can target it.

**Acceptance Criteria:**
- [ ] `ThemeService` reads the `highContrast` option via `getOption`
- [ ] An `effect()` adds or removes a `high-contrast` class on `document.documentElement`
- [ ] Toggling the option at runtime applies/removes the class immediately
- [ ] Typecheck/lint passes

### US-003: Create High Contrast Global Stylesheet
**Description:** As a developer, I want a global CSS file that, when the `high-contrast` class is present, overrides DaisyUI color variables and adds stronger borders/outlines so that contrast is increased.

**Acceptance Criteria:**
- [ ] A stylesheet (e.g., `src/styles/high-contrast.scss`) is created and imported into the global styles
- [ ] Under `.high-contrast`, text colors are forced to maximum contrast against their backgrounds
- [ ] Buttons receive visible borders (at least 2px solid)
- [ ] Input fields receive stronger outlines on focus
- [ ] Card and panel components receive visible borders or stronger shadow differentiation
- [ ] Links/interactive text receive underlines or stronger color differentiation
- [ ] Typecheck/lint passes

### US-004: Add High Contrast Toggle to Options UI
**Description:** As a player, I want a toggle switch in the UI options panel to enable or disable high contrast mode so that I can improve readability when needed.

**Acceptance Criteria:**
- [ ] `PanelOptionsUIComponent` displays a labeled toggle for high contrast mode
- [ ] Toggle reflects the current state of the `highContrast` option
- [ ] Toggling immediately updates the option signal and persists the choice
- [ ] The toggle itself is accessible (keyboard-operable, has aria-label)
- [ ] Typecheck/lint passes
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-005: Verify Contrast Ratios on Key Screens
**Description:** As a player with low vision, I want all critical text to meet WCAG AA contrast ratios when high contrast mode is enabled so that I can read all game information.

**Acceptance Criteria:**
- [ ] Navbar text and icons meet 4.5:1 contrast ratio against the navbar background
- [ ] Modal text meets 4.5:1 contrast ratio against modal backgrounds
- [ ] Button text meets 4.5:1 contrast ratio against button backgrounds
- [ ] Notification/toast text meets 4.5:1 contrast ratio
- [ ] Options panel text and controls meet 4.5:1 contrast ratio
- [ ] Verified with browser accessibility audit tools (Lighthouse, axe DevTools)
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-006: Ensure High Contrast Combines with Colorblind Modes
**Description:** As a player who needs both high contrast and colorblind modes, I want both features to work simultaneously without conflict.

**Acceptance Criteria:**
- [ ] High contrast mode and any colorblind filter can be active at the same time
- [ ] The CSS class approach (high contrast) and CSS filter approach (colorblind) do not interfere
- [ ] Text remains readable under combined high contrast + colorblind mode
- [ ] **[UI story]** Verify in browser using dev-browser skill

### US-007: Add Unit Tests for High Contrast Option
**Description:** As a developer, I want tests confirming the high contrast option is correctly stored and defaulted.

**Acceptance Criteria:**
- [ ] Test in `src/app/helpers/` verifies default value is `false`
- [ ] Test verifies toggling the value persists correctly
- [ ] Tests pass via `npm run test`
- [ ] Typecheck/lint passes

## Functional Requirements
- FR-1: The system must provide a `highContrast` boolean option, defaulting to `false`.
- FR-2: When enabled, a `high-contrast` CSS class must be added to the document root element.
- FR-3: The high contrast stylesheet must override DaisyUI theme variables to increase foreground/background contrast.
- FR-4: All interactive elements must have visible borders or outlines in high contrast mode.
- FR-5: The setting must persist across sessions via localStorage.
- FR-6: High contrast mode must be composable with colorblind modes and text scaling.

## Non-Goals (Out of Scope)
- Custom contrast level slider (only on/off toggle)
- Per-component contrast overrides
- Windows High Contrast Mode integration (OS-level; this is an in-app feature)
- Full WCAG AAA compliance (targeting AA as the baseline)

## Technical Considerations
- DaisyUI themes use CSS custom properties (e.g., `--b1`, `--bc`, `--p`, `--pc`). The high contrast stylesheet can override these variables under the `.high-contrast` selector.
- The approach of adding a CSS class to the document root is consistent with how `data-theme` is already applied in `ThemeService`.
- The high contrast styles should be scoped to `.high-contrast` to ensure zero impact when disabled.
- Care must be taken that the high contrast overrides work across all dark themes (the app currently filters out light themes).
- The `effect()` in `ThemeService` that manages `data-theme` can be extended or a parallel effect added for the contrast class.

## Success Metrics
- All text elements achieve at least 4.5:1 contrast ratio (WCAG AA) when high contrast is enabled, as verified by accessibility audit tools
- Toggle persists correctly across page reloads
- No visual regression when high contrast is disabled
- Feature works simultaneously with colorblind modes and text scaling

## Open Questions
- Should we provide multiple contrast levels (e.g., "medium" and "high") instead of a simple toggle?
- Are there specific DaisyUI themes that already meet AA contrast and could be recommended as alternatives?
- Should focus indicators (keyboard navigation outlines) also be enhanced as part of this feature?
