# Scrozam Brand System (v2)

## 1) Brand Core

### Brand name
**Scrozam!**

### Positioning
Scrozam turns ambient music into a living listening log: detect what is playing, then scrobble it to Last.fm with almost no friction.

### Brand personality
- **Electric**: energetic, reactive, alive.
- **Noir**: dark, focused, premium.
- **Precision**: trustworthy detection workflow, clear states.
- **Human**: friendly and simple, not overly technical.

### Tagline options
- **“Hear it. Catch it. Scrobble it.”**
- **“Your music, logged in motion.”**
- **“Ambient sound to Last.fm, instantly.”**

## 2) Visual Direction: Pulse Noir

Scrozam’s visual language is **Pulse Noir**:
- dark canvas,
- red signal accent,
- subtle glow,
- soft depth,
- music-energy cues (pulse, ring, wave).

This should feel like a modern audio instrument panel, not a generic dashboard.

## 3) Logo System (Dual)

### Primary mark: simplified record glyph
- Keep the vinyl concept for recognition.
- Simplify grooves and highlights for small-size legibility.
- Preserve the red center as the “signal core.”

### Secondary mark: Orbit Dot glyph
- Create a compact orbit-dot icon for tiny contexts (favicon, compact header, loading dots).
- Should work in 1 color and at 16–24 px.

### Usage rules
- Use **primary record mark** on login hero and major empty states.
- Use **secondary glyph** in top nav, favicon, and compact badges.
- Never rotate the logo continuously unless explicitly tied to “listening” state.

## 4) Color System

### Core brand colors (fixed)
- **Signal Red (Primary Accent)**: `#E80922`
- **Signal Red Hover**: `#FF3B52`
- **Noir 900 (Deep Background)**: `#0B0C14`
- **Noir 800 (Surface Background)**: `#141827`
- **Noir 700 (Elevated Card)**: `#1C2133`
- **Text High**: `#F3F5FF`
- **Text Mid**: `#B4B9CF`
- **Text Low**: `#8087A3`

### Semantic colors
- **Success**: `#34D399`
- **Warning**: `#FBBF24`
- **Error**: `#F87171`
- **Info**: `#60A5FA`

### Theme consistency rule
Custom themes can change background/accent hue, but must preserve:
- high contrast text,
- dark-first luminance profile,
- one high-energy accent,
- same semantic color meanings.

## 5) Typography System

### Brand type direction
**Neo-grotesk + mono**.

### Default UI font (recommended)
- `Inter` (or `SF Pro Text` fallback via system stack)

### Accent/technical font
- `Roboto Mono` for status chips, listening states, and small utility labels.

### Existing personalization strategy
Keep user-selectable fonts, but classify them by role:
- **Core UI default**: Inter/Sans
- **Optional stylistic themes**: Mono / Serif

### Type scale (desktop baseline)
- Hero H1: 56 / 64
- Section H2: 32 / 38
- Card H3: 22 / 28
- Body: 18 / 28
- UI small: 14 / 20
- Micro/meta: 12 / 16

## 6) UI Components & Interaction Language

### Surfaces
- Use glass/dim cards on dark backgrounds.
- Radius language: 12–24 px, soft and rounded.
- Borders: subtle 1 px translucent outlines.

### Buttons
- Primary action = red gradient + soft glow.
- Secondary action = low-contrast dark fill + border.
- Disabled state = low saturation, no glow.

### Status indicators
- Listening states should use a pulse dot + concise text.
- Continuous mode should feel like a “mode switch,” not a plain checkbox over time.

### Motion
- Keep motion subtle and purposeful.
- Animate only: state transitions, listening pulse, track reveal.
- Avoid constant decorative animations.

## 7) Background & Theme Personalization Strategy

Keep customization, but enforce a global brand framework.

### Global constants (must not change per theme)
- Layout spacing system
- Component corner radii
- Border/transparency recipe
- Typography scale
- Interaction timing
- Semantic state colors

### Per-theme variables (can change)
- `--bg-start`
- `--bg-end`
- `--accent`
- `--accent-light`
- `--accent-rgb`
- `--font-family`

### Guardrails for new themes
- Background must remain dark enough for white text readability.
- Accent must pass contrast checks for buttons/chips.
- Theme must include both idle and active (accent) visual hierarchy.

## 8) Accessibility & UX Baselines

- Minimum text contrast target: WCAG AA.
- Keyboard-visible focus states on all controls.
- Don’t rely on color alone for state (pair with icon/text).
- Keep key actions (Start/Stop/Connect) obvious and singular.

## 9) Content Tone & Voice

### Voice style
- Short, clear, music-centric.
- Confident but not robotic.
- Friendly and direct.

### UI copy principles
- Use active verbs: “Start Listening,” “Connect Last.fm,” “Scrobbling…”
- Prefer plain language over technical jargon.
- Limit punctuation noise/emojis in critical controls.

## 10) Immediate Design Priorities

1. Create simplified logo pair (record primary + orbit-dot secondary).
2. Normalize all screens to the new core color tokens.
3. Promote mono font to a **utility accent**, not full-body default.
4. Refine continuous listening control into a clearer mode switch style.
5. Harmonize login + main app spacing/radius/elevation so both feel like one product.

---

## Appendix A: Token Targets for current frontend

Recommended baseline defaults for `themes.js` / CSS vars:

- `--bg-start`: `#0B0C14`
- `--bg-end`: `#141827`
- `--accent`: `#E80922`
- `--accent-light`: `#FF3B52`
- `--accent-rgb`: `232, 9, 34`
- `--font-family`: `'Inter', system-ui, -apple-system, sans-serif`

This preserves your current personalization architecture while locking in a stronger, distinct Scrozam identity.

---

## Appendix B: Logo Concept Briefs

### Concept 1 — **Signal Vinyl** (Primary default)

**Intent**
Preserve current recognition while modernizing for clarity and scalability.

**Form language**
- Circular disc silhouette with 5–7 groove bands max (not photorealistic).
- Bold red signal core in the center.
- Single highlight arc at upper-left to imply depth.
- Tiny dark spindle dot for contrast anchor.

**Geometry guidance**
- Build on a square canvas.
- Outer ring diameter: 100%.
- Groove region: 72–96% radius.
- Label/core region: 26–34% radius.
- Spindle dot: 3–5% radius.

**Color behavior**
- Full color: Noir rings + Signal Red core.
- 1-color dark mode: monochrome white mark on dark background.
- 1-color light mode: monochrome black mark on light background.

**Best use cases**
- Login hero logo.
- Empty states.
- App splash and social previews.

**Motion behavior**
- Idle: static.
- Listening state: micro pulse in core glow (scale/opacity), no constant spin.
- Optional transition: 8–12° settle rotation on first detection.

**Do / Don’t**
- Do keep groove count low and clean.
- Do ensure readability at 32 px.
- Don’t use photo textures.
- Don’t animate continuously outside listening context.

---

### Concept 2 — **Orbit Dot** (Secondary system icon — Selected)

**Intent**
Express “ambient audio capture” more abstractly while staying premium.

**Form language**
- Core red dot = detected source.
- Two to three incomplete orbital rings = scanning/listening field.
- Asymmetry suggests movement and directionality.

**Geometry guidance**
- Ring stroke widths should decrease as radius increases.
- Keep orbit gaps aligned to a shared axis to avoid visual noise.

**Color behavior**
- Prefer 2-tone (Noir + Signal Red).
- Optional accent-adaptive ring tint for custom themes.

**Best use cases**
- Favicon and PWA icon.
- Header badge / compact app mark.
- Loading and connection indicators.
- Detection-state iconography.

**Motion behavior**
- Static-first icon system; motion is an enhancement, not a requirement.
- Short orbital sweep only on state changes (detect success, listening start).
- Respect reduced motion settings with instant-state fallback.

**Do / Don’t**
- Do keep orbit count minimal.
- Do optimize for 16, 20, 24, and 32 px.
- Do ensure shape still reads in static PNG.
- Do ship static SVG/PNG for all core states before animation.
- Don’t make it resemble generic “radar” apps.
- Don’t require animation to understand state.

---

## Appendix C: Selection Criteria for Final Logo

Use this checklist before locking final assets:

1. **Legibility:** clear at 16 px, 24 px, 32 px, and 64 px.
2. **Recognition:** identifiable in monochrome without gradients.
3. **Brand fit:** feels electric + noir, not playful/cartoonish.
4. **System fit:** works with both login hero and compact nav usage.
5. **Implementation fit:** exports cleanly to SVG + PNG with simple paths.

## Appendix D: Required Asset Deliverables

- Primary logo (full color, dark background version).
- Primary logo (1-color black/white variants).
- Secondary icon (full color + 1-color variants).
- Favicon set (16, 32, 48).
- PWA icons (192, 512).
- SVG source files with outlined paths.

## Appendix E: Screen-by-Screen Logo Usage Map

### 1) Login page
- Mark: **Signal Vinyl (primary)**
- Placement: centered above title.
- Size: 64 px (mobile), 88 px (desktop).
- Motion: idle static; optional soft pulse when user clicks sign-in.

### 2) Main app header (left brand area)
- Mark: **Orbit Dot (secondary)**
- Placement: compact icon near app name.
- Size: 16 px (icon-only), 20 px (with wordmark).
- Motion: static in idle; 1 short pulse on detection success.

### 3) Listening status chip
- Mark: **Orbit Dot state variant**
- Placement: before status text.
- Size: 12–14 px.
- Motion: only while actively listening, low amplitude pulse.

### 4) Empty track state
- Mark: **Signal Vinyl (primary)**
- Placement: hero center in content column.
- Size: 72 px (desktop), 56 px (mobile).
- Motion: static.

### 5) Detection success toast or inline confirmation
- Mark: **Orbit Dot (secondary)**
- Placement: left of success text.
- Size: 14–16 px.
- Motion: one-time orbit sweep (<= 450 ms).

### 6) Browser tab / favicon
- Mark: **Orbit Dot (secondary static)**
- Size: 16, 32, 48.
- Motion: none (static file).

### 7) PWA home screen icon
- Mark: **Orbit Dot secondary** (with optional Signal Vinyl alternative pack)
- Size: 192, 512.
- Motion: none in icon asset; app-level animation handled in UI only.

## Appendix F: Orbit Dot State System (Static + Motion)

Orbit Dot should be delivered as both static assets and optional animated behavior.

### State 0 — Idle
- Static: red core + faint orbit ring(s), low contrast.
- Motion: none.
- Usage: default header icon, favicon, passive UI.

### State 1 — Armed / Ready
- Static: slightly brighter core, clearer orbit gaps.
- Motion: none or single 150 ms brighten on entry.
- Usage: ready-to-listen status.

### State 2 — Listening Active
- Static: brighter core + visible outer orbit.
- Motion: subtle breathing pulse at low frequency.
- Usage: while microphone capture is active.

### State 3 — Detection Success
- Static: peak contrast core + crisp orbit edges.
- Motion: one-shot orbital sweep (300–450 ms), then settle to State 1.
- Usage: successful song detection/scrobble acknowledgement.

### State 4 — Error / No Result
- Static: desaturated core (or semantic error tint when needed).
- Motion: none.
- Usage: failed detection/no result state.

### Implementation rule
- Build static SVG/PNG first for all 5 states.
- Add animation only in UI runtime (CSS/SVG/Lottie), not in favicon/PWA files.
- If `prefers-reduced-motion` is enabled, always show static states only.

### Suggested file naming
- `orbit-dot-idle.svg`
- `orbit-dot-ready.svg`
- `orbit-dot-listening.svg`
- `orbit-dot-success.svg`
- `orbit-dot-error.svg`

## Appendix G: Frontend Implementation Checklist (Orbit Dot)

### 1) Asset setup
- Add Orbit Dot state assets to frontend static assets folder.
- Keep one static SVG per state (idle/ready/listening/success/error).
- Keep favicon and PWA icon assets static only.

### 2) Component mapping (current codebase)
- `frontend/src/components/LoginPage.js`: keep **Signal Vinyl** for hero logo.
- `frontend/src/App.js` header area: use **Orbit Dot** next to app identity.
- `frontend/src/App.js` status indicator (`Ready to listen` / `Listening...`): bind to Orbit Dot state icon.
- Detection success moment in polling/detection flow: trigger one-shot success animation, then return to ready.

### 3) State mapping rules
- Not listening + no error → `orbit-dot-ready.svg`
- Listening active (`isListening === true`) → `orbit-dot-listening.svg`
- New track detected/scrobbled successfully → `orbit-dot-success.svg` for 300–450 ms, then `ready`
- Detect error/no result path → `orbit-dot-error.svg`
- Passive brand-only contexts (favicon/header idle) → `orbit-dot-idle.svg`

### 4) Motion and accessibility
- Add motion only for in-app `listening` pulse + `success` one-shot.
- Respect `prefers-reduced-motion`: disable pulse/sweep; keep static state swap.
- Never use looping animation in passive contexts (header idle, favicon, PWA).

### 5) Styling consistency
- Orbit Dot icon color should derive from brand tokens (`--accent`, dark neutrals).
- Do not introduce per-component custom reds; use tokenized values only.
- Keep icon sizes constrained to 12/14/16/20/24 px scale.

### 6) QA pass (quick)
- Verify readability at 16 px in browser tab and compact header.
- Verify state transitions under rapid detect/no-result cycles.
- Verify reduced-motion behavior on macOS accessibility settings.
- Verify contrast on all supported themes.

