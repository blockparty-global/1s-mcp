# OneSource Design System
**Source of truth:** `site-next-frontend`  
**Last updated:** April 17, 2026  
**Stack:** Chakra UI v2 + Emotion · Tokens from `public/design-tokens.json`

---

## Who this doc is for

Engineers and designers working on any OneSource product surface. Use it to pick tokens, text styles, button variants, and layer styles without reading source files. The goal is a single reference that prevents divergence across repos.

**Scope:** `site-next-frontend` only (the agency-designed gold standard). Analytics and fulfillment repos carry notes in the [Cross-repo notes](#cross-repo-notes) section below.

---

## Philosophy

OneSource is a dark-first product. The default global background is `darkGreen` (`#071F21`) and text is white. `dataGreen` is the brand's most distinctive color — a bright teal that reads as "live data" and "signal." It should be used **sparingly**: as accents, borders, CTAs, and highlights — not as a background fill or dominant surface color.

The agency-designed `site-next-frontend` is the canonical reference. Other repos in the codebase (`1s-analytics`, `1s-fulfillment-ui`) sometimes over-use `dataGreen` as a fill or primary surface. This is the wrong direction. Green should always feel like a signal against dark, not a default.

**Light mode** exists for blog and content pages. The `lightMode` prop on block components switches the palette to `desertSand` backgrounds with `darkGreen` text. This is a content context, not a product context.

---

## Colors

### Dark backgrounds (use as surfaces, containers, page bg)

Use at most 2–3 stacked levels per screen. Selection guide: `darkGreen` → page; `deepGreen`/`midnightGreen` → first-level card; `nightGreen` → interactive or elevated surface.

| Token | Hex | Use |
|---|---|---|
| `darkGreen` | `#071F21` | Default page background, modal bg |
| `deepGreen` | `#00272C` | Slightly lighter surface |
| `midnightGreen` | `#003235` | Card backgrounds, muted fills |
| `nightGreen` | `#034C51` | Elevated surfaces |

### Brand accent — dataGreen (use sparingly)

| Token | Value | Use |
|---|---|---|
| `dataGreen` | `#19DFAE` | CTAs, borders, data highlights, icons |
| `dataGreenBright` | `#5FF6CC` | Hover states for dataGreen elements |
| `midDataGreen` | `#2AD19F` | Mid-point between base and bright |
| `dataGreenLight` | `#E8FAF5` | Very light tint, almost white-green |
| `dataGreen25OnDarkGreen` | `#0b4f45` | Muted border/fill on dark bg — most common border color |

**Opacity variants (for borders and overlays):**

| Token | Value |
|---|---|
| `dataGreen.10` | `rgba(25,223,174,0.1)` |
| `dataGreen.15` | `rgba(25,223,174,0.15)` |
| `dataGreen.25` | `rgba(25,223,174,0.25)` |
| `dataGreen.30` | `rgba(25,223,174,0.3)` |

### Light / neutral (use in light mode or as contrast)

| Token | Hex | Use |
|---|---|---|
| `desertSand` | `#F9F5F1` | Light mode bg, warm off-white |
| `almondCream` / `cloudSync` | `#F2EAE2` | Slightly warmer light surface |
| `ivoryDust` | `#ECE0D4` | Warm neutral |
| `toastedOat` | `#E5D3C3` | Warm border on light bg |
| `white` | `#FFFFFF` | Text on dark bg |
| `coolGray` | `#808A89` | Muted text, placeholder |

> **Note:** `coolGray` is hardcoded in `src/design/theme.ts` (marked `!TODO: add to design tokens`) — it is **not** in `public/design-tokens.json`. If the theme is ever fully rebuilt from tokens, `coolGray` will disappear without warning.

### Accent palette

| Token | Hex | Use |
|---|---|---|
| `beaconSignal` / `goldenSunset` | `#EF992F` | Warm orange — highlight, badge |
| `purple` | `#B84DFF` | Purple accent |
| `blue` | `#19BADF` | Blue accent |
| `lime` | `#9DDF19` | Lime green accent |
| `lemonYellow` | `#F6E36D` | Yellow accent |
| `nodePulse` / `lightOrchid` | `#D1A8D5` | Soft lavender |
| `roseBrown` / `orange` | `#E59B7B` | Warm rose/orange |

### Semantic

| Token | Hex | Use |
|---|---|---|
| `persimmon` | `#C63131` | Error, destructive |
| `amber` | `#F5A623` | Warning (analytics) |

### Dark backgrounds — opacity variants

| Token | Value |
|---|---|
| `darkGreen.25` | `rgba(7,31,33,0.25)` |
| `darkGreen.30` | `rgba(7,31,33,0.3)` |
| `darkGreen.50` | `rgba(7,31,33,0.5)` |
| `darkGreen.60` | `rgba(7,31,33,0.6)` |
| `darkGreen.80` | `rgba(7,31,33,0.8)` |
| `darkGreen.90` | `rgba(7,31,33,0.9)` |
| `desertSand.25` | `rgba(249,245,241,0.25)` |
| `desertSand.30` | `rgba(249,245,241,0.30)` |
| `desertSand.50` | `rgba(249,245,241,0.5)` |
| `desertSand.80` | `rgba(249,245,241,0.8)` |

---

## Typography

### Fonts

| Role | Family | Weights | CSS variable |
|---|---|---|---|
| Heading | Mabry Medium Pro | 500 | `var(--font-mabry)` |
| Body | Figtree | 300, 500, 600 | `var(--font-figtree)` |
| Mono | Monaspace Neon | 500, 600 | `var(--font-monaspace)` |

**Mono note:** Monaspace renders uppercase by default via `textTransform: "uppercase"`. Use it for labels, tags, eyebrow text, and code.

### Font size scale

| Token | Size |
|---|---|
| `2xs` | 10px |
| `xs` | 12px |
| `sm` | 14px |
| `md` | 16px |
| `lg` | 20px |
| `xl` | 37px |
| `2xl` | 48px |
| `3xl` | 56px |
| `4xl` | 60px |
| `5xl` | 76px |
| `6xl` | 81px |
| `7xl` | 120px |
| `8xl` | 144px |
| `9xl` | 176px |

### Text styles (`textStyle` prop in Chakra)

#### Display — large hero text

| Style | Mobile | Desktop | Notes |
|---|---|---|---|
| `titleBig` | 60px / -1.8px / 100% lh | 120px / -3.6px / 95% lh | Biggest statement text |
| `titleXl` | 81px / -3.24px / 95% lh | — | Single breakpoint |
| `titleLg` | 48px / -1.44px / 100% lh | 96px / -2.28px | |
| `title1` | 48px / -1.44px / 100% lh | 76px / -2.28px | Primary page titles |
| `title2` | 42px / -1.26px / 105% lh | 76px / -2.28px | |
| `title3` | 36px / -1.08px / 100% lh | 64px / -1.92px | Section titles |
| `title4` | 30px / -0.9px / 100% lh | 48px / -1.44px | Sub-section titles |

#### Section headings

| Style | Mobile | Desktop |
|---|---|---|
| `headline1` | 26px / 100% lh | 36px / 100% lh |
| `headline2` | 24px / 110% lh | 30px / 110% lh |
| `headline3` | 20px / 110% lh | 24px / 110% lh |
| `headline4` | 20px / 130% lh | — |

#### Body

| Style | Size | Weight | Line height |
|---|---|---|---|
| `body1Medium` | 19–20px | 500 | 140% |
| `body1Semibold` | 19–20px | 600 | 140% |
| `body2Medium` | 17px | 500 | 130% |
| `body2Semibold` | 17px | 600 | 130% |
| `body3Medium` | 15px | 500 | 120% / +0.15px |
| `body3Semibold` | 15px | 600 | 150% |
| `body3Thin` | 15–17px | 300 | 150% |
| `bodyXs` | 12–14px | 500 | 150–120% |

Default body is `body1Medium`. The global `body` style sets this on `<body>`.

### Typography usage hierarchy

| Context | Heading style | Body style | Label/eyebrow |
|---|---|---|---|
| Hero / full-width banner | `titleBig` or `title1` | `body1Medium` | `mono1Medium` in `dataGreen` |
| Section title | `title3` or `title4` | `body1Medium` | `mono2Medium` |
| Card heading | `headline1` or `headline2` | `body2Medium` | `mono1Medium` |
| Small card / list item | `headline3` | `body3Medium` | `mono1Medium` |
| Caption / footnote | — | `bodyXs` | `mono1Medium` |

**Pairing rules:**
- Mabry (heading) + Figtree (body) is the default pair — don't mix two heading-weight styles in the same block.
- Monaspace is for labels, tags, eyebrow text, code snippets, and data values only. Never use it for running body copy.
- Display styles (`titleBig`, `title1`) need negative letter spacing baked in — do not override `letterSpacing` on these.

#### Mono (uppercase, Monaspace)

| Style | Size | Weight | Letter spacing |
|---|---|---|---|
| `mono1Medium` | 12px | 500 | 0.24–0.36px |
| `mono1Semibold` | 12px | 600 | 0.4px |
| `mono2Medium` | 14px | 500 | 0.28px |
| `mono2Semibold` | 14px | 500 | 0.28px |
| `mono3Medium` | 16px | 500 | 0.32px |
| `mono3Semibold` | 16px | 600 | 0.32px |

---

## Buttons

Defined in `src/design/atoms/buttons.ts`.

| Variant | Background | Text color | Radius | Hover |
|---|---|---|---|---|
| `primary` | `dataGreen` | `darkGreen` | 99px (pill) | `dataGreenBright` bg |
| `primarySq` | `dataGreen` | `darkGreen` | 6px | `dataGreenBright` bg |
| `secondarySq` | `white` | `darkGreen` | 6px | `dataGreenLight` bg |
| `icon` | transparent | `dataGreen` | `md` | border brightens to `dataGreen` |
| `formSubmit` | `dataGreen` | `darkGreen` | 10.67px | `dataGreenBright` bg |

**Default padding:** `px: 18px, py: 13px` · **Text style:** `body2Medium`

> **Notes:**
> - `baseStyle` sets `color: midnightGreen` as the base text color. Variants that need `darkGreen` text override this explicitly. Custom variants that don't specify color will inherit `midnightGreen`, not `darkGreen`.
> - `formSubmit` is an icon-sized button — it overrides padding entirely with `p: 0, h: 8, w: 8` (32×32px). The standard px/py padding does **not** apply to this variant.
> - Minimum touch target: 44×44px (WCAG 2.5.5). For `icon` and `formSubmit` variants, ensure the hit area is padded to meet this on mobile.

### Interactive states

| Variant | Focus | Active | Disabled |
|---|---|---|---|
| `primary` / `primarySq` | No explicit style (browser default outline) | No explicit style | Chakra default: opacity 0.4, cursor not-allowed |
| `secondarySq` | `dataGreenLight` bg (same as hover) | No explicit style | Chakra default: opacity 0.4 |
| `icon` | `dataGreen` border (same as hover) | No explicit style | Chakra default: opacity 0.4 |
| `formSubmit` | No explicit style | No explicit style | Chakra default: opacity 0.4 |

No `loading` spinner state is defined — use Chakra's `isLoading` prop, which applies the `disabled` opacity treatment and shows a spinner. None of the variants define a custom loading appearance; the defaults are intentional.

---

## Borders and layer styles

### Layer style system (`layerStyles` prop in Chakra)

| Layer style | Description |
|---|---|
| `mutedLgRadBorder` | 1px border `dataGreen25OnDarkGreen`, radius 6 — default card border |
| `mutedXlRadBorder` | Same border, radius 8 |
| `mutedFillLgRadBorder` | Same border + `midnightGreen` bg fill, radius 6 |
| `mutedFillXlRadBorder` | Same border + `midnightGreen` bg fill, radius 8 |
| `brightXlRadBorder` | 1px border `dataGreen` (bright), radius 8 |
| `brightMdRadNoBorder` | `dataGreen` fill, radius 5 — **small fills only** (badges, tags, indicators) |
| `brightLgRadNoBorder` | `dataGreen` fill, radius 6 — **small fills only** (badges, tags, indicators) |
| `mutedXlRadNoBorder` | `midnightGreen` fill, no border, radius 8 |
| `mutedCircleBorder` | Circle: `midnightGreen` fill + muted border |
| `mutedCircleBorderNoBg` | Circle: `dataGreen25OnDarkGreen` border, transparent fill |
| `subtleFloat` | Hover lifts element with micro-rotation (interactive cards) |
| `subtleFloatBackground` | Hover reveals `desertSand` bg + lift (light mode cards) |

### Glow style (analytics / dark cards)
```
background: linear-gradient(135deg, rgba(25,223,174,0.05) 0%, #003235 100%)
boxShadow: rgba(25,223,174,0.1) 0px 0px 60px
```

### Page gradient (analytics dark bg)
```
background: linear-gradient(150deg, #001A1C, #071F21)
backgroundAttachment: fixed
```

---

## Spacing

Tokens come from `public/design-tokens.json` → `space`. The same values are also used as `radii` (see `src/design/theme.ts`).

**Named aliases** (preferred in component props):

| Token | Value |
|---|---|
| `sm` | 8px |
| `md` | 16px |
| `lg` | 32px |
| `xl` | 48px |
| `2xl` | 64px |
| `3xl` | 80px |
| `4xl` | 96px |

**Numeric scale** (used in Chakra shorthand like `px={8}`, `gap={6}`):

| Token | Value |
|---|---|
| `1` | 4px |
| `2` | 8px |
| `3` | 12px |
| `4` | 16px |
| `5` | 20px |
| `6` | 24px |
| `8` | 32px |
| `10` | 40px |
| `12` | 48px |
| `13` | 56px |
| `16` | 64px |
| `20` | 80px |
| `24` | 96px |

**Container max-widths:**

| Token | Value |
|---|---|
| `container.md` | 660px |
| `container.lg` | 1002px |
| `container.xl` | 1200px |
| `container.2xl` | 1344px |
| `container.3xl` | 1440px |

---

## Breakpoints

| Token | Value | Approx |
|---|---|---|
| `xs` | 25em | 400px |
| `sm` | 30em | 480px |
| `sm2` | 40em | 640px |
| `md` | 48em | 768px |
| `md2` | 853px | 853px |
| `lg` | 62em | 992px |
| `xl` | 80em | 1280px |
| `2xl` | 96em | 1536px |

**Mobile-first.** All responsive arrays start at mobile. Use Chakra's responsive array syntax: `fontSize={["sm", "md", "lg"]}` → applies at base, `sm`, `lg` breakpoints respectively.

The custom `md2` (853px) covers tablet landscape — used in several block components that need a mid-point between `md` and `lg`.

---

## Icons

### Five systems — when to use each

| System | When to use |
|---|---|
| **Lottie JSON** | Animated feature icons — nav submenu items, card stack headers, blog hero. Always pair with a static PNG fallback. |
| **CMS images (WordPress)** | Any icon managed by content team — nav items, hero badge, card icons, ConnectBox corners. Uploaded to WordPress media library, referenced via ACF field. |
| **Inline SVG in JSX** | Custom shapes that need precise brand control or dynamic props (carousel arrows, footer graphic, quote marks). |
| **`react-icons`** | Utility/social icons with no brand requirement — social links (FaDiscord, FaXTwitter, FaLinkedinIn, RiTelegram2Fill), copy button (FaCopy/FaRegCopy), submit arrows (RiArrowRightLine). |
| **`@chakra-ui/icons`** | Simple structural UI icons — accordion expand/collapse (AddIcon/MinusIcon), pagination arrow (ArrowLeftIcon). |

Static SVG files in `/public/images/` are reserved for nav chrome (burger open/close, mobile chevron) — do not add new static SVGs there for product icons.

---

### Lottie animations

**Library:** `lottie-react` v2.4.1 (React wrapper, not the `<lottie-player>` web component)  
**Asset format:** `.json` (standard Lottie, not the newer `.lottie` container)  
**Asset host:** `https://bpcontent.looksee.xyz/wp-content/uploads/` (WordPress media library)  
**Loading:** Next.js proxy route `/api/get-lottie-data` (avoids CORS)

**Wrapper component:** `src/components/LottieAnimation/index.tsx`  
Props: `lottieUrl`, `fallbackImage`, `loop`, `autoplay`, `scale`

Every Lottie icon must have a PNG fallback image — the component handles graceful degradation.

**Nav submenu pattern:** static PNG at `opacity: 1`; on hover, Lottie fades in behind it and plays; on mouse-leave, static icon returns. Scale: `2.4`.

**CardStack pattern:** `loop={true}`, `autoplay={true}`, scale `2.8` mobile / `1.2` desktop, container `96×96px` mobile / `214×214px` desktop.

**To add a new animated icon:** Upload the `.json` and fallback `.png` to WordPress media, then reference via ACF field (`dark_icon_animation`, `dark_icon`, etc.). No code change needed.

---

### Sizes

No formal size token for icons — sizes are set contextually. Common values:

| Size | px | Used for |
|---|---|---|
| `3` (Chakra) | 12px | CopyButton (small, inline) |
| `4` | 16px | Pagination arrow, DataTable scroll indicator |
| 20px | 20px | Autofill wand (VscWand), carousel SVG viewBox |
| 24px | 24px | Submit arrows (RiArrowRightLine), modal close |
| `43×43px` | 43px | Nav submenu item icons, ConnectBox corner icons |
| `52×52px` | 52px | Hero4 card icons |
| `96–214px` | — | CardStack container (Lottie, responsive) |

Carousel arrows live inside a `48×48px` circular button — the SVG itself is `20×21px`.

---

### Icon colors

| Token | Use |
|---|---|
| `dataGreen` | Primary interactive icons — arrows, copy, accordion toggle, social hover |
| `white` | Social icons at rest (on dark `midnightGreen` tile) |
| `desertSand` | Burger icon strokes on dark nav |
| `darkGreen` | Burger icon strokes on light nav |
| `darkBrown.80` | Muted/secondary icons (DataTable scroll, custom copy button) |
| `darkGreen.60` | Inactive-state icons (blog load-more arrow) |

---

### Spec for generating new static SVG icons

All production SVG icons follow a tight set of rules. Stay within these constraints and a new icon will look native.

**Stroke:**
- Weight: **1.5px** (standard UI icons) · **2px** (structural/interactive, e.g. carousel arrows)
- Linejoin: `round`
- Linecap: `round` on decorative SVGs · default (`butt`) on simple UI icons
- Never mix stroke and fill in the same path — either pure stroke or pure fill per element

**Fill style:**
- Prefer **stroke-only** (arrows, burgers, lines)
- **Solid fill** only for simple geometric shapes (triangle, solid badges)
- **Duotone** (filled circle + cutout path) only for contained icon+background combos like the pricing checkmark (circle `rx=7`, fill `#19DFAE`; path fill `#003235`)

**Paths:** 1–2 paths maximum. Single-path preferred. Never build complex multi-path compositions.

**Corner radius:** None on pure line icons. If a rounded rect is used as background: `rx=7` for small (14px) containers, `12–24px` for larger panel elements.

**Colors — dark theme:**
- Stroke/icon: `#F9F5F1` (desertSand — reads as white on dark bg)
- Accent/interactive: `#19DFAE` (dataGreen)

**Colors — light theme:**
- Stroke/icon: `#071F21` (darkGreen)
- Accent stays `#19DFAE` or uses `currentColor` for theme flexibility

**ViewBox conventions:** Square canvas preferred. Common sizes: `14×14`, `20×21`, `32×32`. Always match the viewBox to the intended render size — no oversized canvas.

---

### Spec for generating new Lottie animations

These specs are extracted from the four existing Lottie files (Blog-Dark/Light, Docs-Dark/Light).

**Canvas and frame rate:**
- Canvas: **1080×1080 px**
- Frame rate: **30 fps**
- Duration: **2.667s** (80 frames) for simpler icons · **3.0s** (90 frames) for complex multi-step icons
- All icons loop — the composition `op` is the loop boundary

**Motion timing recipe:**
```
Frame 0      →  icon at rest (base state)
t=0.25–0.5s →  primary motion triggers
t=0.5–2.0s  →  hold at peak state (1.5–1.8s hold)
t=2.0–2.6s  →  return to base
t=2.6–2.7s  →  0.1s buffer before loop
```

**Easing curves:**
| Motion type | Curve | CSS equivalent |
|---|---|---|
| Position / morph / size (dominant) | `o={x:0.9,y:0}` / `i={x:0.1,y:1}` | `cubic-bezier(0.9, 0, 0.1, 1)` — snappy, physical, no bounce |
| Draw-on (trim path) | `o={x:0.333,y:0}` / `i={x:0.667,y:1}` | `cubic-bezier(0.333, 0, 0.667, 1)` — smooth cubic |
| Continuous / orbital spin | `o={x:0.167,y:0.167}` / `i={x:0.833,y:0.833}` | `cubic-bezier(0.167, 0.167, 0.833, 0.833)` — symmetric ease-in-out |

**Motion types used (use these, not others):**
- Trim path draw-on (strokes appearing)
- Horizontal / vertical translation
- Rectangle size animation
- Trim offset (continuous spinning arc)
- Path morphing (shape-shifting outlines)
- Layer visibility swap via `st` / `op` (instant shape swap)

**Never use:** opacity fades, layer rotation, layer scale, bounce keyframes, hold keyframes, pre-comps, animated stroke widths.

**Stroke:**
- Weight: **5px**, non-animated
- Linecap: `round`
- Corner radius on panel/card rects: **15px**

**Colors — dark theme:**
- Stroke: `#f9f5f1` (warm white)
- Primary fill: `#07615d` (deep teal) / `#034b50` (slightly darker teal)
- Accent: `#1be1a6` / `#18deae` (bright mint — close to dataGreen)

**Colors — light theme:**
- Stroke: `#311c18` (dark warm brown — not black)
- Primary fill: `#f5e6d5` / `#f7f0e7` (warm sand tones)
- Accent: **`#584844`** (muted warm brown — NOT vivid green. This is the critical difference from dark mode.)

**Dark/light build rule:** Dark and light versions are **pure color swaps** — identical keyframes, timing, and layer structure. Build dark first, duplicate, swap all color values. Zero structural or timing differences between variants.

---

## Common patterns

### Default dark page
```tsx
<Box bg="darkGreen" color="white">
```

### Card with muted border
```tsx
<Box layerStyle="mutedFillLgRadBorder">
```

### dataGreen CTA button (pill)
```tsx
<Button variant="primary">Start building free</Button>
```

### Eyebrow / label text
```tsx
<Text textStyle="mono1Medium" color="dataGreen">The Agent Web Fork is here.</Text>
```

### Section heading
```tsx
<Heading textStyle="title3">...</Heading>
```

---

## Design tokens — where they live

| File | Purpose |
|---|---|
| `public/design-tokens.json` | Source of truth — fetched from external API at build time |
| `src/design/theme.ts` | Chakra theme — loads tokens, wires fonts and component styles |
| `src/design/atoms/textAtoms.ts` | All text style definitions |
| `src/design/atoms/buttons.ts` | Button variant styles |
| `src/design/atoms/layerStyles.ts` | Surface/container styles |
| `src/design/atoms/links.ts` | Link styles |
| `src/design/atoms/inputs.ts` | Input styles |

To update design tokens, run:
```bash
npm run generate-design-tokens
```
This re-fetches from the external API and overwrites `public/design-tokens.json`.

---

## What makes this repo the gold standard

This repo was designed by an agency with care for restraint. Key principles to preserve:

1. **Green is a signal, not a surface.** `dataGreen` appears on borders, CTAs, data values, and icon accents. It does not fill large areas.
2. **Dark backgrounds use the green family, not pure black.** `#071F21` reads as intentional — a deep teal-black, not void black. The subtle warmth matters.
3. **`desertSand` (`#F9F5F1`) is the warm neutral.** It's the light mode background and the "rest" color when you're not on the dark theme. It's warm, not cold.
4. **Typography is tight.** Display text uses negative letter spacing (`-1.44px` to `-3.6px`) and line heights at or below 100%. This is intentional — the headlines are dense and structural, not airy.
5. **Borders are almost invisible.** `dataGreen25OnDarkGreen` (`#0b4f45`) is a barely-there border that reads as structure without competing with content.
6. **Hover states are subtle.** `dataGreenBright` on hover, micro-lifts on cards (`subtleFloat`). Nothing dramatic.

---

## Cross-repo notes

| Repo | Design status |
|---|---|
| `site-next-frontend` | ✅ Gold standard — agency-designed, token-driven |
| `1s-fulfillment-ui` | Mirrors token structure, similar component library — broadly consistent |
| `1s-analytics` | Uses same fonts and color names but hardcodes values — drifted from main tokens; over-uses `dataGreen` as surface |
| `site-wp-blocks` | CSS variable export of the Chakra theme for WordPress context; uses Gilroy instead of Mabry for some elements |
| `1s-developer-docs` | Docusaurus — custom styling minimal; not part of the product design system |
| `1s-mcp`, `sre-services`, `roadmap-bot` | No UI design system |
