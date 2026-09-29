---
name: Uniswap Swap Morph
description: A Paper-accurate interactive asset-swap motion study.
colors:
  canvas: "oklch(1 0 0)"
  surface: "oklch(0.982 0 0)"
  ink: "oklch(0.252 0 0)"
  muted: "oklch(0.59 0 0)"
  placeholder: "#6e6e6e"
  accent: "oklch(0.58 0.272 344.873)"
  accent-soft: "oklch(0.956 0.027 337.057)"
  ethereum: "oklch(0.625 0.165 270.131)"
typography:
  title:
    fontFamily: Open Runde
    fontSize: 20px
    fontWeight: 600
    lineHeight: 24px
    letterSpacing: -0.01em
  body:
    fontFamily: Open Runde
    fontSize: 15px
    fontWeight: 400
    lineHeight: 20px
  label:
    fontFamily: Open Runde
    fontSize: 16px
    fontWeight: 600
    lineHeight: 24px
    letterSpacing: -0.01em
rounded:
  trigger: 12px
  control: 14px
  panel: 20px
  pill: 999px
spacing:
  panel-gap: 4px
  compact: 8px
  group: 16px
  panel-inline: 20px
---

# Design System: Uniswap Swap Morph

## 1. Overview

**Creative North Star: “The Continuous Action”**

The interface is a restrained white product canvas where the initial magenta action becomes the spatial origin of the swap preview. The form relies on familiar hierarchy and tonal surfaces; animation exists only to connect its progressive states and clarify live value updates.

It explicitly rejects generic Web3 gradients, neon-on-dark styling, glassmorphism, decorative crypto imagery, bounce, extra application chrome, and invented workflow states.

**Key Characteristics:**

- Paper geometry across the trigger and expanded amount states, with contrast-adjusted color values
- One rounded sans family across interface roles
- Neutral tonal layering with a single magenta accent
- A zero-bounce measured morph with an immediate reduced-motion path

## 2. Colors

Pure white and neutral gray surfaces keep the editorial magenta action rare and unmistakable.

### Primary

- **Action Magenta** (`oklch(0.58 0.272 344.873)`): Initial and primary swap actions.
- **Action Wash** (`oklch(0.956 0.027 337.057)`): Disabled primary action surface.

### Secondary

- **Ethereum Blue** (`oklch(0.625 0.165 270.131)`): Ethereum identity marks only.

### Neutral

- **Canvas White** (`oklch(1 0 0)`): Page and raised chip surfaces.
- **Panel Gray** (`oklch(0.982 0 0)`): Network chip and swap panels.
- **Ink** (`oklch(0.252 0 0)`): Primary headings and values.
- **Muted Ink** (`oklch(0.59 0 0)`): Labels, estimates, and helper copy.
- **Placeholder Gray** (`#6e6e6e`): Empty amount values.

### Named Rules

**The One Action Rule.** Magenta communicates the primary action; it is never decorative.

## 3. Typography

**Display Font:** Open Runde (system-ui fallback)
**Body Font:** Open Runde (system-ui fallback)

**Character:** Softened geometry makes compact financial UI approachable without losing clarity.

### Hierarchy

- **Amount** (400, 40px, 48px, -0.02em): Empty asset amounts.
- **Title** (600, 20px, 24px, -0.01em): Form title and primary action label.
- **Action** (600, 17px, 24px): Asset chips.
- **Body** (400/500, 15px, 20px): Labels and estimates.
- **Footnote** (400, 14px, 20px): Wallet helper copy.

### Named Rules

**The Fixed Scale Rule.** Product type sizes stay fixed; only the form width adapts.

**The Crisp Text Rule.** Apply antialiased font smoothing once at the root so Open Runde renders consistently across the interface, especially on macOS.

## 4. Elevation

The system is flat by default. Small structural shadows distinguish the white token chip and central direction control from the gray panels.

### Shadow Vocabulary

- **Chip lift** (`0 1px 2px oklch(0 0 0 / 0.059)`): White token chip only.
- **Control lift** (`0 1px 3px oklch(0 0 0 / 0.078)`): Central direction control only.

## 5. Components

### Buttons

- **Shape:** 12px trigger radius.
- **Primary:** `oklch(0.58 0.272 344.873)`, white 16px semibold label, 8px × 12px padding.
- **Hover / Focus:** Slight brightness change, three-pixel visible focus ring, and `scale(0.97)` press feedback.

### Chips

- **Style:** Full-pill network, token, and asset selectors with exact Paper padding and icon sizing.
- **State:** The amount field is editable immediately with USDC and ETH selected by default. Network and token chips remain presentational, while the primary action uses a native button.

### Cards / Containers

- **Corner Style:** 20px swap panels.
- **Background:** `oklch(0.982 0 0)` without borders.
- **Internal Padding:** 20px inline, 20px top, 24px bottom.

### Signature Component

The morph shell measures its live inner content, animates directly from 120×40 to 480×524, and crossfades keyed contents with an origin-aware scale transition. The measuring layer remains centered inside the animated shell, so the form scales from the trigger’s center. Content stays unclipped during the handoff: the complete form remains spatially legible instead of being exposed as disconnected fragments from a corner.

### Amount Input

- **Input:** A labelled, decimal-keyboard text input starts with a `0.00` placeholder, formats typed amounts with grouping, and accepts up to two decimal places.
- **Calculation:** The prototype uses the displayed `1 ETH = 3,844.90 USDC` rate. ETH is shown to four decimal places; fiat estimates are shown to two.
- **Figures:** Editable and calculated values use tabular numerals so digit changes do not create horizontal jitter while typing.
- **Feedback:** Calculated values crossfade over 120ms, become immediate under reduced motion, and the primary action disables when the amount is empty or zero.

## 6. Do's and Don'ts

### Do:

- **Do** preserve the Paper geometry and SVG paths; use contrast-adjusted colors and keep interface copy in the voice of a real swap flow.
- **Do** use a 300ms zero-bounce spring for the state transition.
- **Do** switch immediately when reduced motion is requested.

### Don't:

- **Don't** add generic Web3 gradients, neon-on-dark styling, or glassmorphism.
- **Don't** add decorative crypto imagery, bounce, or extra application chrome.
- **Don't** invent controls or workflow states beyond the supplied Paper frames.
