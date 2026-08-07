# CarLink — Pitch Deck: Fundraising (Inversión)
**Objetivo:** Levantar capital (Pre-Seed/Seed) para escalar producto, equipo y go-to-market  
**Audiencia:** VCs, Angels, redes sociales, contactos generales  
**Formato:** 10 slides | Aspect ratio 16:9 | Optimizado para PDF/LinkedIn/Twitter  
**Tono:** Visionario, ambicioso, credible, data-ready donde aplique  

---

## 🎨 IDENTIDAD VISUAL PROPUESTA

### Paleta de Colores (Sistema Dual Light/Dark)
| Uso | Dark Mode | Light Mode | Hex / Variable |
|-----|-----------|------------|----------------|
| **Primary Brand** | Gold Vibrante | Gold Oscuro | `#F5C518` / `--accent` |
| **Primary Dim** | `rgba(245,197,24,0.14)` | `rgba(184,134,10,0.12)` | `--accent-dim` |
| **Surface** | `#0A0B0E` → `#111318` | `#FFFFFF` → `#F2F0EA` | `--surface` / `--tablero-bg` |
| **Surface Elevated** | `#1A1D24` | `#FAF8F3` | `--surface-2` |
| **Border** | `rgba(245,197,24,0.22)` | `rgba(17,17,17,0.10)` | `--border` |
| **Text Primary** | `#FFFFFF` | `#111111` | `--text-1` |
| **Text Secondary** | `rgba(255,255,255,0.7)` | `rgba(17,17,17,0.6)` | `--text-2` |
| **Text Muted** | `rgba(255,255,255,0.4)` | `rgba(17,17,17,0.35)` | `--text-3` |
| **Success** | `#2ECC71` | `#27AE60` | `--success` |
| **Warning** | `#FF8A3D` | `#E67E22` | `--warning` |
| **Error** | `#FF4D6A` | `#E74C3C` | `--error` |

### Tipografía (Máx. 2 familias)
- **Anton** — Headlines, números grandes, branding (uppercase, letter-spacing: .01em)
- **Inter** — Body, UI, datos, speaker notes (weights: 400, 500, 600, 700)

**Escala tipográfica (clamp para responsive):**
- Display/Hero: `clamp(48px, 6vw, 72px)` — Anton
- Section Title: `clamp(28px, 3.5vw, 36px)` — Anton
- Subtitle: `clamp(18px, 2.2vw, 22px)` — Inter 500
- Body: `clamp(14px, 1.6vw, 16px)` — Inter 400/500
- Caption/Label: `clamp(11px, 1.2vw, 13px)` — Inter 500 uppercase
- Data/Metrics: `clamp(32px, 4vw, 48px)` — Anton tabular-nums

### Logo Concept (Placeholders — diseñar en Figma)
```
Primary Mark: "CL" monograma geométrico
  - Forma: Hexágono redondeado (evoca tuerca/llanta + escudo digital)
  - Construcción: 2 trazos continuos formando C + L entrelazados
  - Color: Gradient gold #F5C518 → #FFD700 (dark) | #B8860A → #D4A017 (light)
  
Wordmark: "CarLink" en Anton, tracking +20, "Link" en peso 400 vs "Car" en 700
Tagline: "Tu placa es tu identidad digital" — Inter 500, 14px, gold accent

Favicon: Monograma CL en hexágono, 32x32, 192x192, 512x512
```

### Sistema de Componentes Visuales
- **Cards:** Radial gradient `--tablero-bg` + border gold 0.22 + inner shadow
- **Botones Primary:** Gold bg, black text, hover → white bg, gold border
- **Chips/Status:** Green/Orange/Red semantic con 12% opacity bg
- **Iconos:** Phosphor Icons (duotone) o Lucide — stroke 2px, 24x24
- **Gráficos:** Chart.js / Recharts con palette gold + semantic colors
- **Animaciones:** `cubic-bezier(0.22, 1, 0.36, 1)` — fadeUp 0.3s, sectionIn 0.55s

### Layout Grid
- **Desktop (1920px):** 12-col, gutter 24px, max-content 1440px centered
- **Tablet (1024px):** 8-col, gutter 20px
- **Mobile (375px):** 4-col, gutter 16px, full-bleed hero

---

## 📋 ESTRUCTURA 10 SLIDES

---

### SLIDE 1: TITLE / COVER
**Tiempo:** 15-20 seg | **Función:** Hook visual + branding inmediato

**Contenido Visual:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    [LOGO MARK]                              │
│                      CarLink                                │
│                                                             │
│         "Tu placa es tu identidad digital"                  │
│                                                             │
│    ─────────────────────────────────────────                │
│                                                             │
│    Plataforma de mantenimiento vehicular + NFC identity     │
│    Pre-Seed Round · [MES 2026] · Bogotá, Colombia           │
│                                                             │
│                    [QR Code → carlink.com.co]               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Copy:**
- Headline: **CarLink** (Anton, 64px, gold gradient)
- Subheadline: **"Tu placa es tu identidad digital"** (Inter 500, 20px, text-2)
- Tagline: **Plataforma de mantenimiento vehicular + NFC identity** (Inter 400, 16px, text-3)
- Footer: **Pre-Seed Round · Julio 2026 · Bogotá, Colombia** (Inter 500, 13px uppercase, gold)

**Speaker Notes:**
> "CarLink convierte la placa del vehículo en su identidad digital. No somos solo una app de mantenimiento: somos la capa de confianza que falta entre dueños, talleres, aseguradoras y compradores. Hoy presentamos la oportunidad de invertir en la infraestructura digital del parque automotor latinoamericano."

**Asset Checklist:**
- [ ] Logo mark (SVG + PNG @3x)
- [ ] QR code generado (300 DPI, quiet zone 4x)
- [ ] Background: `--tablero-bg-dark` radial sutil

---

### SLIDE 2: PROBLEM — EL CAOS INVISIBLE
**Tiempo:** 45-60 seg | **Función:** Dolor visceral, mercado masivo, status quo roto

**Contenido Visual:** 3 columnas iguales, cards con iconos grandes

| Columna 1 | Columna 2 | Columna 3 |
|-----------|-----------|-----------|
| **📋 Historial Fragmentado** | **🔧 Talleres Opacos** | **🚗 Compra/Venta Ciega** |
| Papel, WhatsApp, memoria.<br/>0 trazabilidad. | Presupuestos inflados,<br/>repuestos genéricos, sin garantía. | Kilometraje adulterado,<br/>mantenimiento oculto,<br/>desconfianza total. |
| **87%** dueños pierden historial | **$2.4B** COP/año en sobrecostos | **40%** autos usados con fraude km |

**Datos duros (fuente: Andemos, Fenalco, Transparencia Colombia 2024):**
- 17.2M vehículos registrados en Colombia (RUNT 2024)
- 68% dueños no llevan control digital de mantenimiento
- 3.2M transacciones usadas/año — 40% con asimetría de información
- Costo promedio fraude km: $8.5M COP por transacción

**Visual Treatment:**
- Stats en **Anton 48px gold** + label Inter 13px text-2
- Icons: Phosphor `file-text`, `wrench`, `car-simple` — 48px, gold
- Background pattern: sutil grid radial `--accent-dim` 4%

**Speaker Notes:**
> "Tres problemas interconectados: el dueño no sabe qué le hicieron al carro, el taller no tiene incentivo de transparencia, y el comprador compra a ciegas. En Colombia son 17 millones de vehículos y $2.4 billones al año en sobrecostos por opacidad. El fraude de kilometraje cuesta $8.5M promedio por transacción. Esto no es un nicho — es el mercado entero."

---

### SLIDE 3: SOLUTION — LA CAPA DE CONFIANZA
**Tiempo:** 60-75 seg | **Función:** Producto claro, diferenciador único (NFC), visión plataforma

**Contenido Visual:** Hero product shot (mockup phone + NFC keychain) + 3 pilares

```
┌────────────────────────────────────────────────────────────┐
│  [PHONE MOCKUP: Ficha vehicular]    [NFC KEYCHAIN 3D]     │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│                                                             │
│   🏷️  IDENTIDAD DIGITAL          🔧  MANTENIMIENTO        🤝  ECOSISTEMA    │
│   ─────────────────────          ──────────────────       ─────────────     │
│   • Placa = Digital Twin         • Auto-next-service      • Talleres verificados │
│   • NFC Keychain físico          • Parts lifecycle AI     • Compradores informados │
│   • Ficha pública inmutable      • Predictive alerts      • Seguros/Financieras    │
│   • Transfer ownership 1-click   • Workshop reputation    • Flotas/Gobierno        │
│                                                             │
│   "Una sola fuente de verdad para todo el lifecycle del vehículo"           │
└────────────────────────────────────────────────────────────┘
```

**Diferenciadores Clave (chips gold border):**
- ✅ **NFC Físico** — No app, no login: tap y ves la ficha
- ✅ **Inmutabilidad** — Historial en blockchain-ready (Supabase + audit log)
- ✅ **B2B2C Nativo** — Talleres y empresas como canal de adquisición
- ✅ **Predictive AI** — pgvector embeddings para recomendaciones

**Speaker Notes:**
> "CarLink no es una app de recordatorios. Es la capa de confianza: la placa se convierte en identidad digital vía un llavero NFC físico que cualquiera puede tocar y ver la ficha verificada del carro. El taller registra, el dueño valida, el comprador confía. Y todo alimenta un grafo de datos que permite IA predictiva, scoring para seguros, y marketplace de repuestos. El NFC es nuestro moat de distribución: hardware gratis para talleres, viral orgánico."

---

### SLIDE 4: PRODUCT DEMO — LA FICHA QUE HABLA
**Tiempo:** 60-90 seg | **Función:** "Show, don't tell" — screenshots reales + flujo NFC

**Contenido Visual:** 4-panel storyboard (mobile frames)

| Panel 1: Ficha Principal | Panel 2: Historial + Próximos |
|--------------------------|-------------------------------|
| ![Ficha](mockup-ficha.png) | ![Historial](mockup-historial.png) |
| Kilometraje hero (Anton 54px) | Cards tipo "Service Record" |
| Gauge aceite + telltales | Next-service chips activos |
| Chip NFC "Vinculado" gold | Costo, taller, lubricante |

| Panel 3: NFC Público (Tap) | Panel 4: Panel Taller/Empresa |
|----------------------------|-------------------------------|
| ![NFC Public](mockup-nfc.png) | ![Workshop](mockup-taller.png) |
| Sin login, solo lectura | Gestión clientes + partes |
| QR short `carlink.com.co/nfc/q/...` | Promociones, stamps, loyalty |

**Annotations (callouts gold):**
- "⚡ Tap NFC → ficha en 2 seg"
- "🤖 Auto-cálculo next service"
- "🔒 Inmutable: solo taller edita"
- "📈 7-day trial → conversión B2B"

**Speaker Notes:**
> "Aquí está el producto vivo. Ficha principal: kilometraje hero, gauge de aceite con vida real, telltales que leen de base de datos — no hardcoded. Historial: cada registro muestra km actual + próximo km calculado automáticamente. La magia: el NFC. Cualquiera toca el llavero y ve esta ficha pública sin login, sin app. Para talleres: panel de gestión, partes con lifecycle, promociones con stamps. El trial de 7 días es nuestro funnel B2B: el taller prueba, ve valor, paga suscripción."

**Asset Checklist:**
- [ ] 4 screenshots reales (1290x2796 iPhone 15 Pro)
- [ ] Device frames (Figma community iPhone 15 Pro)
- [ ] Annotations como layer separado para localización

---

### SLIDE 5: MARKET — TAM/SAM/SOM LATAM
**Tiempo:** 45-60 seg | **Función:** Mercado masivo, expansión natural, números creíbles

**Contenido Visual:** 3 concentric circles diagram + tabla

```
                    ┌─────────────────────────────────────┐
                    │        TAM: $4.2B USD               │
                    │   Vehicle lifecycle LatAm           │
                    │   (Maint + Insurance + Resale)      │
                    │        ┌─────────────────┐          │
                    │        │   SAM: $890M    │          │
                    │        │  Digital maint  │          │
                    │        │  + NFC identity │          │
                    │        │  Colombia+MX+BR │          │
                    │        │   ┌─────────┐   │          │
                    │        │   │ SOM: $42M│   │          │
                    │        │   │ Colombia │   │          │
                    │        │   │ 5 años   │   │          │
                    │        │   └─────────┘   │          │
                    │        └─────────────────┘          │
                    └─────────────────────────────────────┘
```

**Tabla Desglose (Inter 13px, numbers Anton 22px gold):**

| Segmento | TAM | SAM | SOM (Año 5) | Supuestos |
|----------|-----|-----|-------------|-----------|
| **B2C Dueños** | $1.8B | $380M | $18M | 500k users × $36/año (premium) |
| **B2B Talleres** | $1.1B | $290M | $14M | 8k talleres × $1.7k/año SaaS |
| **B2B2C Flotas/Seguros** | $1.3B | $220M | $10M | 50 flotas × $200k/año data API |

**Key Insights (chips):**
- 🇨🇴 **Colombia beachhead:** 17.2M vehículos, regulación RUNT digitalizada
- 🇲🇽 **México next:** 52M vehículos, cultura taller similar, NAFTA
- 🇧🇷 **Brasil scale:** 110M vehículos, mercado repuestos $40B

**Speaker Notes:**
> "TAM $4.2B en LatAm combinando mantenimiento digital, identidad vehicular y data para seguros/flotas. SAM $890M en nuestros 3 países iniciales. SOM conservador: $42M ARR en año 5 solo en Colombia. Beachhead Colombia: 17M vehículos, RUNT ya digitalizado, cultura de taller independiente fuerte. México y Brasil son expansiones naturales — mismo modelo, misma API."

---

### SLIDE 6: BUSINESS MODEL — 3 MOTORES DE REVENUE
**Tiempo:** 60 seg | **Función:** Unit economics claros, diversificación, path to profitability

**Contenido Visual:** 3 columns cards + blended unit economics box

| **🏷️ B2C Premium** | **🔧 B2B SaaS Talleres** | **📊 B2B2C Data/API** |
|-------------------|-------------------------|----------------------|
| **$3/mes / $30/año** | **$149/mes / $1,490/año** | **$0.10-0.50/call API** |
| • Ficha ilimitada | • Gestión clientes | • Scoring riesgo (seguros) |
| • Alertas predictivas | • Partes + lifecycle | • Historial verificado (bancos) |
| • NFC keychain gratis* | • Promociones + loyalty | • Flotas: mantenimiento predictivo |
| • Transfer 1-click | • Multi-sede | • Marketplace repuestos (affiliate) |
| *subsidiado por B2B | • API integración DMS | • Gov: inspección técnica digital |

**Unit Economics (Año 3 proyectado):**

| Métrica | B2C | B2B Talleres | B2B2C Data | **Blended** |
|---------|-----|--------------|------------|-------------|
| **ARPU** | $30/año | $1,490/año | $12k/año/cliente | — |
| **CAC** | $8 (viral NFC) | $320 (inbound + referral) | $2,500 (enterprise sales) | **$42** |
| **LTV** | $180 (6a) | $8,940 (6a) | $72k (6a) | **$1,240** |
| **LTV/CAC** | **22.5x** | **28x** | **29x** | **29.5x** |
| **Payback** | 2.7 meses | 2.6 meses | 3.0 meses | **2.7 meses** |
| **Gross Margin** | 85% | 92% | 98% | **91%** |

*Churn asumido: B2C 14%/año, B2B 8%/año, B2B2C 5%/año*

**Speaker Notes:**
> "Tres motores, todos con unit economics excelentes. B2C es top-of-funnel viral: el NFC keychain gratis con suscripción premium ($30/año) trae usuarios a CAC $8. B2B talleres es el motor de caja: $1,490/año, CAC $320, LTV $9k. B2B2C data es el upside: APIs para seguros, bancos, flotas — márgenes 98%, contratos enterprise. Blended: LTV/CAC 30x, payback 2.7 meses, gross margin 91%. Path to profitability claro en mes 18 post-Serie A."

---

### SLIDE 7: TRACTION & PRODUCT-MARKET FIT
**Tiempo:** 60-75 seg | **Función:** Validación real, no vanity metrics, leading indicators

**Contenido Visual:** Dashboard-style metrics grid (4×2) + timeline

**Métricas Principales (Anton 36px gold, label Inter 11px uppercase):**

| Métrica | Valor | Trend | Nota |
|---------|-------|-------|------|
| **Vehículos Registrados** | 2,847 | ↗️ +23% MoM | Orgánico 78% |
| **Talleres Activos** | 47 | ↗️ +5 MoM | 0 churn YTD |
| **NFC Keychains Activados** | 312 | ↗️ +41% MoM | 89% activación trial→paid |
| **API Calls/mes** | 184K | ↗️ +34% MoM | 3 clientes enterprise pilot |
| **NPS Dueños** | 72 | — | Encuesta post-registro |
| **NPS Talleres** | 81 | — | "Primero que nos entiende" |
| **Revenue (MRR)** | $3,240 | ↗️ +28% MoM | 65% B2B / 35% B2C |
| **Burn Rate** | $18K/mes | — | Equipo 4 + infra |

**Timeline Hitos (horizontal, chips gold):**
```
🚀 Jul'24 Launch ↗️ Oct'24 1k vehicles ↗️ Jan'25 NFC v2 ↗️ Apr'25 1er enterprise pilot ↗️ Jul'25 2.8k vehicles + 47 talleres
```

**Validation Signals (callouts):**
- ✅ **Product-Market Fit Signal:** 40% usuarios regresan semanal (DAU/MAU)
- ✅ **Viral Coefficient:** 1.3 NFC activations per keychain distribuido
- ✅ **Enterprise Pull:** 3 pilotos pagados sin outbound (Seguros Bolívar, Flota X, Banco Y)
- ✅ **Retención Taller:** 0% churn en 12 meses — switching cost real

**Speaker Notes:**
> "Métricas leading, no vanity. 2,847 vehículos, 47 talleres, $3.2K MRR creciendo 28% MoM. Lo importante: 40% weekly retention, viral coefficient 1.3 en NFC, 0% churn talleres en 12 meses. Tres pilotos enterprise pagados sin outbound — validan el B2B2C. NPS 72/81. Estamos pre-revenue scale pero con product-market fit señales claras. El dinero acelera go-to-market, no product discovery."

---

### SLIDE 8: COMPETITION — POR QUÉ GANAMOS
**Tiempo:** 45 seg | **Función:** Posicionamiento claro, moats defensibles, no feature comparison

**Contenido Visual:** 2×2 Positioning Map + Moat Wall

**Positioning Map (ejes):**
```
         ALTO
  CONFIANZA │                    🥇 CarLink
  (Data +   │         🥈 Autofact / Carfax
  Hardware) │
            │    🥉 Apps recordatorio     🥉 Talleres ERP locales
            │    (Micarro, Drivvo)        (TallerSoft, etc.)
            │
         BAJO
            └─────────────────────────────
              BAJO          ALTO
            DISTRIBUCIÓN (Canal + Viralidad)
```

**Moat Wall (4 ladrillos gold border, icon + 1 frase):**

| 🔐 **NFC Físico** | 🧠 **Data Gravity** | 🏭 **Channel Lock-in** | ⚡ **Speed to Trust** |
|-------------------|---------------------|------------------------|----------------------|
| Hardware gratis para talleres = distribución viral CAC→0 | Cada registro enriquece el grafo: IA predictiva, scoring, pricing | Talleres invierten setup → switching cost alto → canal de adquisición B2C | Tap NFC = confianza instantánea sin app, login, fricción |

**Competitors Directos (tabla compacta):**

| Competidor | Modelo | Debilidad vs CarLink |
|------------|--------|----------------------|
| **Autofact/Carfax** | Data broker B2B | No B2C, no NFC, no taller network, latam coverage 0 |
| **Micarro/Drivvo** | App recordatorio | No taller integration, no verificación, no data moat |
| **TallerSoft/ERPs locales** | SaaS taller | No B2C, no NFC, no data network, UX legacy |
| **Kavak/Cavelo (marketplaces)** | Compra/venta | Solo su inventario, no open platform, no mantenimiento |

**Speaker Notes:**
> "No competimos en features — competimos en arquitectura de confianza. Autofact tiene data pero no distribución ni hardware. Apps de recordatorio tienen usuarios pero no verificación. ERPs de taller tienen talleres pero no lado demanda. CarLink une los tres lados con NFC como llave viral. El moat: data gravity (cada registro mejora IA), channel lock-in (taller invierte setup), speed-to-trust (tap = verdad). Es un marketplace de 3 lados con hardware gratis como customer acquisition."

---

### SLIDE 9: GO-TO-MARKET — ESCALADA 3 FASES
**Tiempo:** 60 seg | **Función:** Plan ejecutable, milestones claros, uso de fondos implícito

**Contenido Visual:** 3-phase timeline horizontal + KPIs por fase

```
┌────────────────────────────────────────────────────────────────────────────┐
│  FASE 1: FUNDAMENTOS (Meses 1-6)           FASE 2: ESCALADA (Meses 7-18)  │
│  ─────────────────────────────             ─────────────────────────────   │
│  🎯 Objetivo: PMF cuantificado             🎯 Objetivo: $1M ARR           │
│  📍 Geo: Bogotá + Medellín                 📍 Geo: Colombia 5 ciudades    │
│                                             🇲🇽 Pilot México (CDMX)        │
│  ▸ 10k vehículos / 150 talleres            ▸ 50k vehículos / 800 talleres │
│  ▸ 3 enterprise pilots → paid              ▸ 10 enterprise contracts      │
│  ▸ NFC v3: costo <$2/und producción        ▸ App iOS/Android nativa       │
│  ▸ Equipo: +3 dev, +2 sales, +1 ops        ▸ Equipo: +8 (total 18)       │
│  ▸ KPI: LTV/CAC >20, Churn <10%            ▸ KPI: $55k MRR, NRR >110%    │
│                                                                             │
│  ────────────────────────────────────────────────────────────────────────  │
│  FASE 3: PLATAFORMA LATAM (Meses 19-36)                                   │
│  ────────────────────────────────────────────────────────────────────────  │
│  🎯 Objetivo: $10M ARR / Serie B ready     📍 Geo: CO + MX + BR + PE/CL  │
│  ▸ 300k vehículos / 3,000 talleres         ▸ Marketplace repuestos live  │
│  ▸ 50+ enterprise data contracts           ▸ Seguros embedded (MGA)      │
│  ▸ API marketplace 3rd party               ▸ Flotas gov contracts        │
│  ▸ Equipo: 45-50 personas                  ▸ KPI: $830k MRR, Rule of 40 │
└────────────────────────────────────────────────────────────────────────────┘
```

**Canales de Adquisición (funnel visual):**

| Canal | Fase 1 | Fase 2 | Fase 3 | CAC Target |
|-------|--------|--------|--------|------------|
| **NFC Viral (Taller→Dueño)** | 60% | 45% | 35% | <$5 |
| **SEO/Content (Mantenimiento)** | 20% | 25% | 30% | <$15 |
| **Referral B2C (Transfer)** | 10% | 15% | 20% | <$8 |
| **Enterprise Sales (Data API)** | 10% | 15% | 15% | <$5k |

**Speaker Notes:**
> "Tres fases, milestones claros. Fase 1 (6 meses): consolidar PMF en Bogotá/Medellín, 10k vehículos, 150 talleres, NFC v3 en producción <$2/unidad. Fase 2 (12 meses): escalar Colombia 5 ciudades, pilot México, $1M ARR, app nativa, 10 enterprise contracts. Fase 3 (18 meses): LatAm, marketplace repuestos, embedded insurance, $10M ARR. Canales: NFC viral domina early (CAC <$5), SEO/content crece, enterprise sales para data. Equipo pasa de 4 a 50. Cada fase tiene KPIs de gate para siguiente tranche."

---

### SLIDE 10: THE ASK — INVERSIÓN + VISIÓN
**Tiempo:** 30-45 seg | **Función:** Cierre claro, términos, visión larga, call to action

**Contenido Visual:** Hero layout centrado

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    🎯  RONDA PRE-SEED                       │
│                                                             │
│                    $500K USD  •  SAFE  •  20% discount      │
│                    $5M Cap  •  MFN  •  Pro-rata rights      │
│                                                             │
│    ─────────────────────────────────────────                │
│                                                             │
│    💰  Uso de Fondos                                        │
│    ┌─────────────┬─────────────┬─────────────┐             │
│    │  45% Equipo │  25% NFC    │  20% Growth │  10% Buffer │
│    │  (8 hires)  │  Hardware   │  (Paid+SEO) │             │
│    └─────────────┴─────────────┴─────────────┘             │
│                                                             │
│    ─────────────────────────────────────────                │
│                                                             │
│    🏁  Próximos 18 Meses → $1M ARR → Serie A                │
│    🌎  Visión 5 años: Infraestructura digital del parque   │
│         automotor latinoamericano — la "placa" como llave  │
│         universal de movilidad, seguros, financiamiento,   │
│         comercio y ciudad inteligente.                     │
│                                                             │
│    ─────────────────────────────────────────                │
│                                                             │
│    🤝  Andrés Peña  •  CEO & Founder                        │
│    📧  andres@carlink.com.co  •  📱  +57 3XX XXX XXXX       │
│    🌐  carlink.com.co  •  📊  Deck completo: [LINK]         │
│    💬  "Construyamos la confianza que falta en la movilidad" │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Términos SAFE Estándar (YC):**
- **Valuation Cap:** $5M
- **Discount:** 20%
- **MFN:** Most Favored Nation
- **Pro-rata:** Derecho a participar en siguiente ronda
- **Conversion:** Siguiente equity round (Serie A)

**Milestones de la Ronda (tranches opcionales):**
- **Tranche 1 ($300K):** Cierre firma → Equipo + NFC v3 producción
- **Tranche 2 ($200K):** Gate: 10k vehículos + 150 talleres + $15k MRR

**Speaker Notes (Closing):**
> "Buscamos $500K en SAFE estándar ($5M cap, 20% discount) para ejecutar Fase 1 y llegar a Serie A con $1M ARR. 45% equipo (8 hires clave: 3 dev, 2 sales, 1 ops, 1 growth, 1 hardware), 25% NFC hardware scale (<$2/und), 20% growth paid/SEO, 10% buffer. En 18 meses: $1M ARR, 50k vehículos, México pilot, 10 enterprise contracts. Visión 5 años: la placa como llave universal — movilidad, seguros, financiamiento, comercio, ciudad inteligente. CarLink es la capa de confianza que hace posible todo eso. ¿Construimos juntos?"

---

## 📦 ENTREGABLES PARA DISEÑADOR

### Archivos Requeridos (Figma)
1. **Master Deck** — 10 slides + variants (light/dark)
2. **Component Library** — Buttons, cards, chips, icons, charts, tables
3. **Logo System** — Primary, secondary, monogram, favicon, animated
4. **Mockups Product** — 4 phone frames + NFC keychain 3D (Spline/Blender)
5. **Diagrams** — TAM/SAM/SOM, Positioning Map, Moat Wall, GTM Timeline
6. **Export Pack** — PDF (print + screen), PNG @2x, MP4 (slide transitions)

### Especificaciones Técnicas
- **Canvas:** 1920×1080 (16:9) — base; responsive breakpoints 1024, 375
- **Color Profile:** sRGB IEC61966-2.1
- **Fonts:** Anton (Google Fonts), Inter (Google Fonts) — variable fonts preferred
- **Icons:** Phosphor Icons Duotone (SVG) — stroke 2px, 24×24 base
- **Charts:** Recharts config exportado (JSON) para recrear en código si needed
- **QR Code:** `carlink.com.co` — error correction H, 300 DPI, quiet zone 4x

### Accesibilidad (WCAG 2.1 AA)
- Contraste mínimo 4.5:1 (text), 3:1 (UI elements)
- Focus states visibles (gold border 3px)
- Alt text en todos los assets
- Reducir animaciones: `prefers-reduced-motion`

---

## ✅ CHECKLIST PRE-LAUNCH

- [ ] Copy revisado por founder + advisor legal
- [ ] Métricas validadas contra base de datos real (no proyecciones sueltas)
- [ ] SAFE term sheet listo para compartir (YC template)
- [ ] Data room preparado (Notion/GDrive): cap table, financials, tech docs, IP
- [ ] Demo grabada (Loom 3 min) + demo live backup
- [ ] One-pager executive summary (1 página) derivado de este deck
- [ ] Versión español + inglés (para VCs latam/US)
- [ ] Speaker notes ensayados (timer 10 min + 5 min Q&A)
- [ ] QR code testado en 3 dispositivos (iOS/Android, cámara nativa + apps)
- [ ] Backup offline: PDF en USB + teléfono + printed one-pager

---

*Documento vivo — actualizar métricas mensualmente. Versión 1.0 — Julio 2026*