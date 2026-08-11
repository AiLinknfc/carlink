# Ailink — Design System

> **Ailink** is a Colombian company that sells **circular NFC keychains with an external metallic ring**, layered with **AI-powered marketing and customer-loyalty services**. Each keychain is 3D-printed in stages — print the name/QR layer → base → embed the NFC chip → finish with the customer's design — so the product is both a physical artifact and a programmable touchpoint that triggers promotions, lead capture, CRM flows, and contextual content when a customer taps a phone to it.

This design system captures Ailink's brand foundations (color, type, motif), production patterns (the layered keychain, the metallic aro, the futuristic gradients), and three signature UI surfaces:

1. **Interactive keychain customizer** — drag a logo or name onto a spinning, shiny circular keychain to see it personalized in real-time.
2. **3D fabrication explainer** — scroll-driven exploded view of the print layers.
3. **AI agent recommender** — chat with an AI that recommends a project package (Emergencias, Fidelización, Restaurantes, Mantenimiento Mecánico, Servicios, Turismo, Agro) based on what you describe.

All three surfaces sit on a **mouse-reactive shader wallpaper** that gives the product a living, futuristic OS feel.

---

## Sources used

- **Marketing site** — [ailink.com.co](https://ailink.com.co) — primary copy, tone, color tokens, component inventory pulled directly from the live site.
- **GitHub** — [AiLinknfc/ailink-desing](https://github.com/AiLinknfc/ailink-desing) — official design source. *(Not directly browsed in this pass — see Caveats. Reconnect GitHub and re-run for a second pass that imports logos/components verbatim.)*
- **Reference for shader interaction** — [fidelia.business](https://fidelia.business) — used as a north star for "mouse-following shader wallpaper" but not copied.

Inventory extracted from ailink.com.co:

| Token            | Value            | Notes                  |
|------------------|------------------|------------------------|
| `color.bg.1`     | `#ffffff`        |                        |
| `color.bg.2`     | `#f8f9fa`        |                        |
| `color.text.1`   | `#1a1a1a`        |                        |
| `color.text.2`   | `#6c757d`        |                        |
| `color.text.3`   | `#000000`        |                        |
| `color.primary.1`| `#b14fff`        | **primary neon purple**|
| `color.primary.2`| `#0000ee`        | electric blue          |
| `color.palette.1`| `#542aad`        | deep brand purple      |
| Type             | `Inter` 600/24px | + `Arial`, `Times`     |
| Components       | navbar · button · link-button · card · footer |  |

Three inconsistencies were noted in the live site — five font sizes within 2px of each other, two near-identical near-white backgrounds (ΔE 2.2), and 5 visual button variants. **This system resolves them** with a single canonical type scale and two button variants (`primary`, `ghost`).

---

## Project index

```
.
├── README.md                ← you are here
├── SKILL.md                 ← Agent SKills entry point — read first if you load this as a skill
├── colors_and_type.css      ← single source of truth for tokens (light + dark)
├── assets/                  ← logos, icons, generic imagery
│   ├── logo-ailink.svg
│   ├── logo-mark.svg
│   ├── keychain-base.svg
│   └── ...
├── fonts/                   ← (Inter & JetBrains Mono loaded from Google Fonts; add TTFs here for offline)
├── preview/                 ← cards rendered in the Design System tab
│   ├── colors-primary.html
│   ├── colors-neutrals-dark.html
│   ├── type-display.html
│   ├── buttons.html
│   └── ... (see register_assets calls)
└── ui_kits/
    ├── marketing-site/      ← the public site recreated with shader bg + customizer
    ├── fabrication/         ← 3D layered keychain explainer
    └── ai-agent/            ← chat surface that recommends a project package
```

---

## CONTENT FUNDAMENTALS

**Voice.** Spanish-first (Colombian), confident, and outcome-oriented. Sentences are short and assertive — the site favors statements like *"Conecta tu negocio al mundo digital sin complicaciones."* over hedged or marketing-fluff phrasing.

**Person.** Speaks to a *tu* (informal "you"), addressed as the business owner — never *usted*, never plural *vosotros*. The brand speaks in first-person plural (*"En AiLink impulsamos…"*) when describing itself.

**Casing.** Sentence case everywhere. Title Case is reserved for product/feature names (e.g. *Publicidad Contextual*). Eyebrow labels are ALL CAPS with wide tracking, but only as a typographic device — never in body copy.

**Verbs.** Action-oriented: *Conecta · Transforma · Orquesta · Impulsa · Simplifica · Acelera · Mide*. The brand verbs imply orchestration: *"Orquestamos ecosistemas inteligentes…"*

**Numbers and stats.** Used sparingly and only when meaningful — never decorative stat blocks. If a number doesn't tell the story, cut it.

**Tone examples** (sourced from ailink.com.co):

| Where      | Copy                                                                                                                  |
|------------|-----------------------------------------------------------------------------------------------------------------------|
| Hero       | "Plataforma NFC para automatización de procesos, redes sociales y fidelización de clientes."                          |
| Subhead    | "Conecta tu negocio al mundo digital sin complicaciones."                                                             |
| Feature    | "Transformamos cada interacción en una oportunidad de fidelización y captación de leads…"                             |
| About      | "En AiLink impulsamos la transformación digital de las empresas mediante tecnología NFC y soluciones inteligentes."   |
| Manifesto  | "Orquestamos ecosistemas inteligentes donde el marketing personalizado… conecta con cada interacción física o digital." |

**Emoji.** Not used. Never in headings or body. If a visual marker is needed, prefer a small NFC waveform glyph or a colored dot.

**Jargon.** Light, business-facing: *PyMEs · CRM · NFC · leads · automatización · fidelización*. Avoid deep-tech (no *ISO/IEC 14443*, no *NDEF*) on marketing surfaces; reserve for docs.

**Punctuation.** Em dashes — used liberally — between clauses. No Oxford comma in Spanish (per RAE). End sentences with periods, never with ellipses on marketing copy.

---

## VISUAL FOUNDATIONS

### Color
- **Primary brand:** `#b14fff` (neon violet). This is the signal color — used for CTAs, brand glow, and shader highlights. Use **sparingly**: one accent moment per viewport.
- **Deep brand:** `#542aad`. Used for hover states, deeper gradient stops, and large background washes.
- **Electric:** `#0000ee` paired with violet creates the signature aurora gradient `var(--ai-grad-aurora)`. Reserve the true `#0000ee` for backgrounds/gradients; use `#2e2eff` for inline UI to keep AA contrast.
- **Cyan accent:** `#4cf5ff` — used **only on dark surfaces** as a secondary highlight (e.g. shader peaks, hover sparkles). Never on light.
- **Light mode:** white `#ffffff` paper, `#1a1a1a` ink, `#6c757d` secondary ink. This mode is reserved for documentation and the product detail page where photography of the keychain reads best on white.
- **Dark mode:** `#0c0c16` night. The hero, fabrication, and AI agent surfaces all live here — the neon palette is built to glow against this depth.

### Type
- **One family:** Inter, across the entire system. Weights used: 400 body, 500 UI, 600 headings, 700 display, 800 hero.
- **One scale.** Display 64–96px · H1 40–64px · H2 28–40px · H3 24px (locked to inventory) · Body 16 · Caption 12. Forbidden: any size between 13 and 15 — this resolves the "5 sizes within 2px" inconsistency flagged on the live site.
- **JetBrains Mono** is the secondary face, used only for NFC tag IDs, fabrication coordinates, and chat-agent debug strings.
- **Tracking:** headings are tightened (`-0.015em` to `-0.03em`); ALL-CAPS eyebrows get `0.14em`. Body is unchanged.

### Backgrounds
- **Default for product surfaces:** the shader wallpaper — a WebGL-style mouse-reactive gradient field of violet/electric/cyan blobs that drifts toward the cursor. Behind every "wow" moment, this lives.
- **Default for content surfaces:** plain `#0c0c16` with a subtle 1% noise texture (radial-gradient grain) so the dark doesn't feel digital-flat.
- **Image treatment:** product photography is high-contrast, cool-temperature (slight blue cast), often shot on a dark gradient ground. The metallic aro catches a violet rim-light. **Never** warm-toned, never grain-heavy.
- **Full-bleed photography** is rare — used only on the keychain hero. Most product moments are isolated objects on dark.

### Motion
- **Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` (out-expo) for entries; `cubic-bezier(0.34, 1.56, 0.64, 1)` (overshoot) for the keychain spinner snap.
- **Duration:** 220ms is the workhorse. Hovers are 120ms. Big reveals are 800ms.
- **No bounces** on body UI. Overshoot is reserved for product interaction (the keychain "lands" with a tiny pop).
- **The keychain rotates slowly and continuously** when idle (12s per turn). On hover, rotation pauses and the aro picks up a violet rim glow. On customize-drop, it snaps to face-on with the overshoot ease.
- **Shader background drifts** at ~0.6× the cursor velocity for a heavy-fluid feel.

### Hover & press
- **Buttons:** primary darkens to `#542aad` on hover with a `box-shadow: 0 0 24px rgba(177,79,255,0.5)` glow. Press: `scale(0.97)`.
- **Ghost / link:** hover changes the underline from invisible to violet, and the text shifts to `#c878ff`. No background fill on ghost buttons until they're held.
- **Cards:** hover lifts `translateY(-4px)` and intensifies the violet edge gradient. No darken/lighten of the card itself.

### Borders & shadows
- Borders on dark are `rgba(255,255,255,0.08)` hairlines — borders strong is `0.16`. Avoid solid `#333`-style borders; the system relies on subtle luminance.
- The "violet ring" focus shadow (`--ring`) is `0 0 0 1px rgba(177,79,255,0.6), 0 0 24px rgba(177,79,255,0.35)` — used on inputs, drop-targets, and the keychain itself when actively customized.
- Shadows on dark are inky and very soft (`rgba(0,0,0,0.45)` at 16px blur). Glows replace shadows as the visual lift mechanism most of the time.

### Transparency & blur
- `backdrop-filter: blur(20px)` is used on the floating nav, the AI agent chat panel, and the drop-target overlay on the customizer. The frosted layer reads `rgba(20,20,31,0.6)` on dark.
- Avoid blur on hero content — keep it crisp.

### Corner radii
- **Components:** 14px (`--r-md`) is the default card radius. Buttons are pill (`999px`). Inputs are 10px.
- **Tiles** (the larger feature cards): 20–28px.
- **The keychain itself** is a perfect circle, of course — the only object in the system that's not at a token radius.

### Card anatomy
- Cards on dark are `#14141f` with a 1px `rgba(255,255,255,0.08)` top edge (the `--sh-inset` rule) to fake a "lit from above" feel. No drop shadow at rest. Hover adds a soft violet glow.
- Cards never have a colored left border. Never. The visual language uses edge gradients (`--ai-grad-edge`) and top-inset highlights instead.

### Layout
- 1280px max content width. Gutters fluid from 20→64px.
- 12-column grid on the marketing site; 8-column on dense screens.
- The nav and the AI-agent panel are the only fixed elements. The keychain customizer canvas is **sticky** but not fixed — it pins as you scroll through the customization steps.

### Iconography
See the [ICONOGRAPHY](#iconography) section below.

---

## ICONOGRAPHY

The live site uses generic web icons (likely a Font Awesome or Lucide subset, inferred from inventory). For this system we standardize on **Lucide** — CDN, 1.5px stroke, rounded line caps. This matches the slim, modern feel of the Inter type and the violet neon. Lucide is loaded from CDN (`unpkg.com/lucide@latest`).

**Rules:**
- **Stroke weight:** always 1.5 (Lucide default). Never mix stroke weights.
- **Color:** icons inherit `currentColor`. Default `var(--fg-muted)` on dark; `var(--ai-ink-soft)` on light. Active/selected icons go `var(--ai-violet)`.
- **Size:** 16 (inline), 20 (nav), 24 (feature), 32 (large CTA tile). Never 18, never 22.
- **Pairing with text:** icon and label use the same vertical center; gap is 8px (`--sp-2`) for inline, 12px for nav.
- **The NFC waveform** is a brand glyph — a custom SVG (`assets/icon-nfc-wave.svg`) used wherever NFC transmission is depicted. Don't replace with a generic wifi icon.
- **Sector icons** (Emergencias / Fidelización / Restaurantes / Mantenimiento / Servicios / Turismo / Agro) are Lucide picks documented in `ui_kits/ai-agent/sectors.md`. We tag them, not redraw them.
- **Emoji:** never used in this system. If you need a visual marker in a label, use a small `<span class="dot dot--violet">` colored dot.

**Caveat:** the live Ailink site likely has its own icon style. Because the GitHub repo wasn't browsed in this pass, we substituted Lucide as the closest neutral match. Confirm with the team before locking.

---

## UI Kits

Each kit lives in `ui_kits/<name>/` and contains a working `index.html`, factored JSX components, and a short README. These are recreations, not new designs.

- **`ui_kits/marketing-site/`** — the public ailink.com.co recreated with the new system. Includes the mouse-reactive shader hero, the interactive keychain customizer (drag a name/image onto the spinning keychain), and the AI agent recommender section.
- **`ui_kits/fabrication/`** — the 3D printing explainer. Scroll-driven exploded view: name/QR layer → base → NFC plate → design layer. Each step has a layer thumbnail and a coordinate readout in JetBrains Mono.
- **`ui_kits/ai-agent/`** — the AI agent chat surface. Users describe a need; the agent recommends one of seven sector packages with a rationale card.

---

## Caveats / known gaps

- **GitHub repo `AiLinknfc/ailink-desing` was not browsed** — connection wasn't established at build time. Reconnect via the Import menu and re-run for a second pass that imports the actual logo SVG, any existing brand illustrations, and verifies the icon family used in production.
- **Logo placeholder** — `assets/logo-ailink.svg` is a wordmark drawn from the brand color and Inter 800. **Replace with the official logo** once it's accessible.
- **Sector iconography** — Lucide stand-ins used. May want to commission custom 1.5px stroke icons that match the NFC waveform's visual weight.
- **Photography** — no real product photos available. The customizer uses an SVG/CSS rendering of the keychain that's intentionally illustrative; for production, swap in real photography.
- **Light-mode coverage** is intentionally thin — the futuristic dark surfaces are where Ailink wants to live. Light mode is documented but not heavily prototyped.
