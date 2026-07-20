# CarLink Design Guidelines

## Typography

**Maximum 2 font families:**
- **Anton** — Display/headlines (uppercase, letter-spacing: .01em)
- **Inter** — UI/body text (weights: 400, 500, 600, 700, 800)

**Font Scale (CSS variables):**
```
--fs-xs: 9px    — Labels, captions
--fs-sm: 10px   — Small labels, timestamps
--fs-base: 11px — Section labels (uppercase)
--fs-md: 12px   — Body small, buttons
--fs-lg: 13px   — Body text, descriptions
--fs-xl: 14px   — Primary body, buttons
--fs-2xl: 15px  — Card titles
--fs-3xl: 16px  — Larger card titles
--fs-4xl: 18px  — Subtitles
--fs-5xl: 20px  — Section subtitles
--fs-6xl: 22px  — Large numbers
--fs-7xl: 24px  — Medium headlines
--fs-8xl: 27px  — Sidebar logo
--fs-9xl: 30px  — Page titles (clamp)
--fs-10xl: 34px — Gauge percentages
--fs-11xl: 38px — Odometer values
--fs-12xl: 42px — Large headlines
--fs-13xl: 46px — Page titles max
--fs-14xl: 54px — Ficha mileage
```

## Color Palette (Minimal)

**Primary Accent:**
- `#F5C518` — Gold/Yellow (main brand color)

**Semantic Colors:**
- `#2ecc71` — Success/Green
- `#ff8a3d` — Warning/Orange
- `#ff4d6a` — Error/Red

**Theme-Aware CSS Variables (use these, not hardcoded):**
```css
--surface        — Card backgrounds
--surface-2      — Subtle surfaces
--surface-3      — Hover surfaces
--border         — Borders
--border-2       — Stronger borders
--text-1         — Primary text
--text-2         — Secondary text
--text-3         — Muted text
--text-4         — Very muted text
--accent         — #F5C518
--accent-dim     — rgba(245,197,24,0.14)
--accent-border  — rgba(245,197,24,0.35)
```

**NEVER use hardcoded colors.** Always use CSS variables.

## Card Backgrounds

**Single internal card background:** `tableroBg` (theme-aware radial gradient)

```css
--tablero-bg-dark  = radial-gradient(130% 120% at 50% -10%, #20232b 0%, #111318 45%, #0a0b0e 100%)
--tablero-bg-light = radial-gradient(130% 120% at 50% -10%, #ffffff 0%, #f2f0ea 55%, #e7e4da 100%)
```

**All internal cards (NFC, Wallet, Parts, Certificates, Documents, Gallery, Diagnostics, Workshop) MUST use:**
- Background: `var(--tablero-bg)` or inline `tableroBg` value
- Border: `rgba(245,197,24,0.22)` (dark) / `rgba(17,17,17,0.10)` (light)
- Inner shadow: `inset 0 1px 0 rgba(255,255,255,0.06)` (dark) / `inset 0 1px 0 rgba(255,255,255,0.6)` (light)

## Topbar Icon Colors

**All topbar action buttons:**
- Icon color: `#F5C518` (gold) in dark mode
- Icon color: `#b8860a` (dark gold) in light mode
- Background: `rgba(20,20,20,0.8)` (dark) / `rgba(255,255,255,0.85)` (light)
- Border: `rgba(245,197,24,0.35)` (dark) / `rgba(184,134,10,0.4)` (light)

**Active state:** Border `#F5C518`, background `rgba(245,197,24,0.2)`
**Hover:** Background `#F5C518`, color `#111`

## Light/Dark Mode

**CSS-driven via `[data-theme="light"]` on `:root`:**
- All surfaces, borders, text colors swap automatically
- No component-level theme logic needed
- Wallet background syncs via `getWalletBackground(vehicle, theme)`

## Spacing & Radius

- Radius: 8px (small), 10-12px (medium), 14-18px (cards), 22-26px (large cards)
- Gap: 8px (tight), 12px (normal), 16px (comfortable), 22px (section)
- Padding: 12px (compact), 16px (normal), 20-24px (cards)

## Shadows

- Card: `0 20px 50px rgba(0,0,0,0.5)` (dark) / `0 20px 50px rgba(0,0,0,0.12)` (light)
- Button accent: `0 0 20px rgba(245,197,24,0.35)`
- Gauge accent: `drop-shadow(0 0 14px rgba(245,197,24,0.25))`

## Animations

- `sectionIn` — Section entrance (22px Y, 0.55s)
- `textIn` — Text entrance (36px X, 0.5s)
- `fadeUp` — Fade + slide up (18px Y, 0.3s)
- `toastIn` — Toast (22px Y, 0.4s)
- `spin` — Loading spinner

All cubic-bezier(0.22, 1, 0.36, 1) easing.