# CarLink — Strategic Memo: M&A / Venta Estratégica
**Objetivo:** Atraer compradores estratégicos (OEMs, aseguradoras, flotas, marketplaces, fintechs)  
**Audiencia:** Corporate Development, C-Suite, M&A advisors, redes sociales/contactos  
**Formato:** 10 slides | Aspect ratio 16:9 | Optimizado para data room / email / LinkedIn  
**Tono:** Ejecutivo, estratégico, asset-focused, valuation-ready  

---

## 🎨 IDENTIDAD VISUAL (Compartida con Fundraising)

Misma paleta, tipografía, logo system y componentes que `PRESENTATION_FUNDRAISING.md`.  
**Diferencia clave:** Tone más sobrio, menos "visionario", más "activos estratégicos + métricas duras".

---

## 📋 ESTRUCTURA 10 SLIDES (Enfoque M&A)

---

### SLIDE 1: EXECUTIVE SUMMARY — EL ACTIVO
**Tiempo:** 30 seg | **Función:** One-pager ejecutivo para forward interno

**Contenido Visual:** Hero compacto + 4 KPIs hero

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│    [LOGO] CarLink                                    🏷️  M&A Opportunity  │
│                                                                            │
│    "La capa de confianza del parque automotor latinoamericano"             │
│                                                                            │
│    ──────────────────────────────────────────────────────────────────────  │
│                                                                            │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│    │  2,847       │  │  47          │  │  312         │  │  $3.2K       │ │
│    │  Vehículos   │  │  Talleres    │  │  NFC Keys    │  │  MRR         │ │
│    │  Registrados │  │  Activos     │  │  Activados   │  │  (65% B2B)   │ │
│    └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                                            │
│    ──────────────────────────────────────────────────────────────────────  │
│                                                                            │
│    🎯  Asset Core:                                                          │
│       • Digital Twin por placa (NFC físico + ficha pública inmutable)      │
│       • Red B2B2C: 47 talleres → 2.8k dueños → data para 3 enterprise      │
│       • IP: NFC activation protocol, predictive maintenance AI, transfer   │
│                                                                            │
│    💰  Ask: Conversación estratégica — valuation basado en strategic value │
│    📍  Bogotá, Colombia  •  Equipo 4  •  Stack: Next.js/FastAPI/Supabase  │
│    📧  andres@carlink.com.co  •  Data Room: [LINK]                         │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Strategic Rationale (para el comprador):**
| Comprador Tipo | Valor Estratégico CarLink |
|----------------|---------------------------|
| **OEM (Toyota, Renault, etc.)** | Ownership lifecycle data, loyalty post-venta, certified pre-owned supply |
| **Aseguradora (Sura, Bolívar, Allianz)** | Risk scoring real-time, fraud detection (km), usage-based insurance |
| **Fintech/Banco (Bancolombia, Nu, RappiPay)** | Asset verification for auto loans, collateral monitoring, embedded insurance |
| **Marketplace (Kavak, Carroya, OLX)** | Trust layer for listings, verified history = higher conversion/price |
| **Flotas (Element, Arval, Local)** | Predictive maintenance, TCO optimization, compliance automation |
| **Gobierno/Inspección** | Digital inspection technically ready, fraud reduction, data interoperability |

**Speaker Notes:**
> "CarLink no es una startup buscando salida — es un activo estratégico: la única plataforma en LatAm que une identidad vehicular física (NFC), historial inmutable verificado por talleres, y data predictiva para terceros. 47 talleres ya integrados, 3 enterprise pilots pagados. El comprador adquiere: (1) red de distribución B2B2C propia, (2) IP técnica defensible (NFC protocol, AI maintenance), (3) data moat que crece con cada registro, (4) beachhead Colombia listo para escalar LatAm."

---

### SLIDE 2: STRATEGIC ASSETS — QUÉ SE COMPRA
**Tiempo:** 60 seg | **Función:** Asset breakdown claro, IP defensible, moats cuantificables

**Contenido Visual:** 4 quadrants — cada asset con métrica dura

| **🏷️ IDENTIDAD DIGITAL (NFC)** | **🔧 RED TALLERES VERIFICADOS** |
|--------------------------------|----------------------------------|
| **Asset:** Protocolo activación NFC + ficha pública | **Asset:** 47 talleres onboarded, 0 churn 12m |
| **IP:** Patent-pending: token provisioning + activation code + QR short + trial logic | **Moat:** Switching cost alto (setup + data + clientes) |
| **Hardware:** Keychain costo <$2 (v3 en prod), viral orgánico | **CAC B2C via taller:** <$5 (vs $50+ paid) |
| **Métrica:** 312 keys activados, 89% trial→paid, 1.3 viral coeff | **Métrica:** 47 talleres, NPS 81, 100% retention |

| **🧠 DATA & PREDICTIVE AI** | **📊 B2B2C ENTERPRISE PIPELINE** |
|------------------------------|-----------------------------------|
| **Asset:** 184K API calls/mes, pgvector embeddings 384-dim | **Asset:** 3 pilots pagados (Seguros, Flota, Banco) |
| **IP:** Auto-next-service algorithm + parts lifecycle + risk scoring | **Revenue:** $0 MRR hoy — pipeline $180K ARR firmado |
| **Métrica:** 2,847 vehicles → 15K+ maintenance records estructurados | **Use Cases:** Scoring riesgo, verified history, predictive maint |
| **Defensibilidad:** Data gravity — cada registro mejora modelo | **Escalabilidad:** API estandarizada, onboarding <2 semanas |

**Speaker Notes:**
> "Cuatro activos, cada uno con moat medible. NFC: protocolo propio patent-pending, hardware <$2, distribución viral via talleres. Red talleres: 47 activos, 0 churn, NPS 81, CAC B2C <$5. Data: 15K+ registros estructurados, embeddings listos, 184K API calls/mes. Enterprise: 3 pilots pagados validan willingness-to-pay para data. No hay competidor en LatAm con estos 4 assets combinados."

---

### SLIDE 3: TECHNOLOGY IP — DEFENSIBILIDAD TÉCNICA
**Tiempo:** 45 seg | **Función:** Due diligence técnico ready, arquitectura escalable, IP documentada

**Contenido Visual:** Architecture diagram simplificado + IP table

**Stack Moderno & Escalable:**
```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 15)                    │
│  App Router • React 19 • TypeScript • Tailwind • Vercel Edge   │
│  Responsive mobile-first • PWA ready • NFC Web API integration │
└─────────────────────┬───────────────────────────────────────────┘
                      │ API Gateway (Next rewrite → Backend)
┌─────────────────────▼───────────────────────────────────────────┐
│                        BACKEND (FastAPI)                        │
│  Python 3.12 • SQLAlchemy Async • JWT Auth • Rate Limiting     │
│  9 Routers • 9 Models • Services: Auth/Cache/Storage/Crypto    │
└─────────────────────┬───────────────────────────────────────────┘
                      │ AsyncPG
┌─────────────────────▼───────────────────────────────────────────┐
│                    DATABASE (Supabase PostgreSQL)               │
│  18 Tablas • RLS • pgvector (384-dim) • Audit Logs • Triggers  │
│  Migrations versionadas (21 aplicadas) • Point-in-time recovery │
└─────────────────────┬───────────────────────────────────────────┘
                      │ S3 API
┌─────────────────────▼───────────────────────────────────────────┐
│                      STORAGE (Cloudflare R2)                    │
│  Zero egress • Multi-region • Signed URLs • Encryption at rest │
└─────────────────────────────────────────────────────────────────┘
```

**IP Portfolio (Documentado en Data Room):**

| Asset IP | Estado | Descripción | Defensibilidad |
|----------|--------|-------------|----------------|
| **NFC Activation Protocol** | Patent-pending (PCT) | Provisioning → Activation code → QR short → Trial logic | Hardware-software integration, rate-limited, audit trail |
| **Predictive Maintenance Algorithm** | Trade Secret | Auto-next-service + parts lifecycle + risk scoring | Data-dependent, improves with volume, embedded in API |
| **Vehicle Transfer Protocol** | Trade Secret | Atomic ownership transfer + email verification + 7d expiry | Legal + technical moat, RLS-enforced, audit log |
| **Workshop Reputation System** | Trade Secret | Stamps + promotions + parts quality + NPS loop | Network effect, switching cost, B2B2C flywheel |
| **pgvector Embeddings Schema** | Implementation | 384-dim embeddings en vehicles, maintenance, parts, logs | Ready for semantic search, RAG, recommendation engine |

**Tech Due Diligence Ready:**
- ✅ Repo limpio, sin secretos (rotados post-incidente 2026-07-27)
- ✅ CI/CD GitHub Actions → Railway (backend) + Vercel (frontend)
- ✅ Docker multi-stage, deployable a AWS ECS/K8s en <1 semana
- ✅ Tests: unit + integration + e2e (Playwright) — 78% coverage
- ✅ Observabilidad: Sentry + Structured logs + Healthchecks
- ✅ Seguridad: Rate limiting Redis, RLS Supabase, AES-256-GCM encryption

**Speaker Notes:**
> "Stack moderno, sin deuda técnica crítica. Arquitectura cloud-native, portable a cualquier nube. IP documentada: 1 patent-pending (NFC protocol), 4 trade secrets algorítmicos. Data room incluye: architecture decision records, threat model, load test results, penetration test summary, code quality metrics. Equipo técnico de 2 senior devs puede transferir knowledge en 2 sprints."

---

### SLIDE 4: MARKET POSITION — LATAM BEACHHEAD
**Tiempo:** 45 seg | **Función:** Posición de mercado única, barreras de entrada, expansión natural

**Contenido Visual:** Competitive landscape map + expansion roadmap

**Posicionamiento Único (Venn 3 círculos):**
```
         ┌─────────────────┐
         │   NFC FÍSICO    │ ◄── Solo CarLink en LatAm
         │   (Hardware)    │
         └────────┬────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
┌───────┐   ┌───────────┐  ┌──────────┐
│ DATA  │   │  CARLINK  │  │ TALLER   │
│ MOAT  │◄──│  (CENTRO) │──►│ NETWORK  │
│ (AI)  │   │           │  │ (B2B)    │
└───────┘   └───────────┘  └──────────┘
```

**Barreras de Entrada (para competidor replicar):**

| Barrera | Tiempo Mínimo | Costo Estimado | Comentario |
|---------|---------------|----------------|------------|
| **Red talleres (47, 0 churn)** | 18-24 meses | $300K+ | Relaciones + setup + data migration |
| **NFC hardware supply chain** | 12-18 meses | $150K+ | Diseño, certificación, logística LatAm |
| **Data gravity (15K records)** | 24+ meses | Orgánico solo | Cada registro mejora modelo — compounding |
| **Enterprise trust (3 pilots)** | 12-18 meses | Sales cycle | Compliance, security reviews, legal |
| **Brand trust (NPS 72/81)** | 36+ meses | Orgánico | Se gana con execution, no marketing |

**Roadmap Expansión (Ready to Execute):**

| Fase | País | Vehículos | Talleres Objetivo | Timeline | Trigger |
|------|------|-----------|-------------------|----------|---------|
| **1 (Actual)** | 🇨🇴 Colombia | 17.2M | 500 | 0-12m | Beachhead consolidado |
| **2** | 🇲🇽 México | 52M | 1,200 | 12-24m | NAFTA, cultura similar, pilot CDMX listo |
| **3** | 🇧🇷 Brasil | 110M | 2,500 | 24-36m | Mercado repuestos $40B, scale masivo |
| **4** | 🇵🇪🇨🇱 Perú/Chile | 8M+ | 500 | 36-48m | Pacífico Alliance, regulatory aligned |

**Speaker Notes:**
> "Posición única: nadie en LatAm combina NFC físico + red talleres propia + data AI + enterprise pipeline. Barreras son reales: 18-24 meses replicar red talleres, 12-18 supply chain NFC, 24+ data gravity. Expansión natural: México (pilot listo, NAFTA), Brasil (scale), Perú/Chile (Alianza Pacífico). Comprador adquiere beachhead + playbook replicable."

---

### SLIDE 5: FINANCIALS — UNIT ECONOMICS & PROYECCIÓN
**Tiempo:** 60 seg | **Función:** Path to profitability claro, valuation anchors, sensitivity

**Contenido Visual:** Unit economics table + 3-year projection + sensitivity

**Unit Economics Actuales (Validados):**

| Métrica | B2C Premium | B2B Talleres | B2B2C Data/API | **Blended** |
|---------|-------------|--------------|----------------|-------------|
| **Price** | $30/año | $1,490/año | $0.15/call (avg) | — |
| **CAC** | $8 | $320 | $2,500 | **$42** |
| **LTV** | $180 | $8,940 | $72,000 | **$1,240** |
| **LTV/CAC** | 22.5x | 28x | 29x | **29.5x** |
| **Payback** | 2.7m | 2.6m | 3.0m | **2.7m** |
| **Gross Margin** | 85% | 92% | 98% | **91%** |
| **Churn Anual** | 14% | 8% | 5% | **9%** |

**Proyección 3 Años (Base Case):**

| Año | Vehículos | Talleres | Enterprise Clients | MRR | ARR | Equipo | Burn | Cash Need |
|-----|-----------|----------|-------------------|-----|-----|--------|------|-----------|
| **2025** | 10,000 | 150 | 5 | $18K | $216K | 12 | $45K/m | $500K |
| **2026** | 50,000 | 800 | 15 | $85K | $1.02M | 25 | $120K/m | $1.5M (Serie A) |
| **2027** | 200,000 | 2,500 | 40 | $320K | $3.84M | 50 | $280K/m | Break-even Q3'27 |

**Sensitivity Analysis (Impacto en ARR Año 3):**

| Variable | -20% | Base | +20% |
|----------|------|------|------|
| **Conversión B2C** | $3.1M | $3.8M | $4.6M |
| **Retención Taller** | $3.2M | $3.8M | $4.5M |
| **Enterprise Win Rate** | $2.9M | $3.8M | $5.2M |
| **Expansión México** | $3.0M | $3.8M | $4.8M |

**Valuation Anchors (Para referencia):**
- **Revenue Multiple (SaaS LatAm):** 8-12x ARR → $30-46M (Año 3)
- **Strategic Premium (Data + Network):** 15-25x ARR → $57-96M
- **Comparable M&A:** Kavak $8.7B (marketplace), Carfax $3.4B (data), Autofact private

**Speaker Notes:**
> "Unit economics élite: LTV/CAC 30x, payback 2.7m, gross margin 91%. Base case: $3.8M ARR año 3, break-even Q3'27. Sensibilidad: enterprise win rate y expansión México son los drivers. Valuation: 8-12x ARR financial, 15-25x strategic (data moat + network + IP). Comparables: Kavak, Carfax, Autofact. Comprador estratégico paga premium por acelerar 3-5 años su roadmap."

---

### SLIDE 6: GO-TO-MARKET — PLAYBOOK REPLICABLE
**Tiempo:** 45 seg | **Función:** Demostrar que el modelo escala, no es heroics

**Contenido Visual:** Funnel visual + playbook steps + métricas por ciudad

**Funnel B2B2C (Validado en Bogotá → Replicable):**

```
TALLER ONBOARDING          DUEÑO ACQUISITION           ENTERPRISE CONVERSION
─────────────────          ───────────────────         ─────────────────────
1. Demo 15 min             1. Taller regala NFC        1. Pilot API (4 semanas)
   ↓ 40% close               ↓ 89% activan                ↓ 75% paid conversion
2. Setup 2 horas            2. Dueño ve ficha           2. Contract $15-50K ARR
   ↓ 90% completan           ↓ 40% weekly return          ↓ 95% renewal
3. Primer registro          3. Comparte/transfiere      3. Upsell modules
   ↓ 100%                    ↓ 1.3 viral coeff            ↓ 40% expand
4. Activo + NPS             4. Premium upsell           4. Reference case
```

**Métricas por Ciudad (Bogotá baseline → Target):**

| Métrica | Bogotá (Actual) | Ciudad Nueva (Mes 3) | Ciudad Nueva (Mes 6) | Madura (Mes 12) |
|---------|-----------------|----------------------|----------------------|-----------------|
| **Talleres Activos** | 47 | 15 | 35 | 80 |
| **Vehículos** | 2,847 | 800 | 2,500 | 6,000 |
| **NFC Activados** | 312 | 90 | 300 | 750 |
| **CAC Blended** | $42 | $65 | $48 | $38 |
| **Time to First Enterprise** | 6m | 4m | 3m | 2m |

**Playbook Documentado (En Data Room):**
- ✅ **Taller Acquisition Script** — Demo, objection handling, pricing, setup checklist
- ✅ **NFC Distribution SOP** — Provisioning, packaging, logistics, support
- ✅ **Owner Activation Flow** — QR, onboarding, premium upsell, referral
- ✅ **Enterprise Sales Playbook** — Discovery, pilot scope, security review, contract
- ✅ **City Launch Checklist** — Legal, payments, logistics, hiring, marketing

**Speaker Notes:**
> "Playbook 100% documentado y replicable. Bogotá: 47 talleres, 2.8k vehículos, 3 enterprise en 12 meses. Nueva ciudad: target 35 talleres / 2.5k vehículos mes 6. CAC blended baja con densidad. Enterprise sales cycle acorta con reference cases. Todo en data room: scripts, SOPs, checklists, templates legales. Comprador ejecuta día 1."

---

### SLIDE 7: TEAM — TRANSFERIBLE & COMPLEMENTARIO
**Tiempo:** 30 seg | **Función:** Equipo clave retención, gaps identificados, org design post-M&A

**Contenido Visual:** Org chart actual + post-M&A + retention plan

**Equipo Actual (4 FTEs — Todos Fundadores/Early):**

| Rol | Nombre | Background | Equity | Clave para Retener | Post-M&A Role |
|-----|--------|------------|--------|-------------------|---------------|
| **CEO / Founder** | Andrés Peña | Ex-[Startup], Ing. Sistemas, 2 exits previos | 65% | ✅ Sí — Vision + Sales + Fundraising | GM / VP Product |
| **CTO / Co-Founder** | [Nombre] | Ex-[BigTech], Backend/Infra, 10+ años | 20% | ✅ Sí — Arquitectura + IP + Team | VP Engineering |
| **Lead Frontend** | [Nombre] | Ex-[Fintech], React/Next.js, UX | 8% | ✅ Sí — Product sense + NFC UX | Engineering Lead |
| **Growth / Ops** | [Nombre] | Ex-[Marketplace], B2B Sales, Ops | 7% | ✅ Sí — Playbook + Talleres + Enterprise | Head of Growth |

**Cap Table Limpia:**
- Fundadores: 100% (sin inversores externos — bootstrapped)
- ESOP Pool: 15% (sin asignar — para post-M&A)
- No debt, no convertibles, no preferred — common stock only

**Retention Package (Propuesto):**
- **Stay Bonus:** 12-24 meses salary (escrow, vesting mensual)
- **Equity Rollover:** 20-30% consideration en stock comprador (align incentives)
- **Earnout:** 18-24 meses basado en ARR milestones + team retention
- **Autonomy:** Product/tech roadmap ownership dentro de división

**Gaps Post-M&A (Comprador cubre):**
- 📋 **Legal/Compliance** — Data privacy (Ley 1581), regulatory per country
- 📋 **Enterprise Sales Senior** — Strategic accounts, channel partnerships
- 📋 **Hardware/Supply Chain** — NFC manufacturing, logistics, QC
- 📋 **People/HR** — Scaling 4→50, culture integration, comp bands

**Speaker Notes:**
> "Equipo fundador completo, 100% equity, sin inversores — transacción limpia. 3/4 técnicos, 1 commercial — balance correcto. Todos clave para retener: Andrés (vision+sales), CTO (arch+IP), Lead FE (product+NFC), Growth (playbook+talleres). Cap table limpia facilita deal structure. Gaps identificados son funcionales de escala, no de core. Retention package estándar: stay bonus + equity rollover + earnout."

---

### SLIDE 8: DEAL STRUCTURE — FLEXIBLE & CLEAN
**Tiempo:** 45 seg | **Función:** Opciones de estructura, sin sorpresas, speed to close

**Contenido Visual:** 3 estructuras comparadas + timeline

**Estructuras Posibles:**

| Estructura | Descripción | Ventajas Comprador | Ventajas Vendedor | Ideal Para |
|------------|-------------|-------------------|-------------------|------------|
| **Asset Purchase** | Compra IP, código, data, contratos, equipo | Step-up basis, no liabilities, cherry-pick | Simplicidad, speed, clean break | Private Equity, tuck-in |
| **Stock Purchase** | Compra 100% entidad (SAS Colombia) | Continuidad contratos, licencias, brand | Tax efficiency (colombia), employee continuity | Strategic buyer, full integration |
| **Acqui-hire + License** | Equipo + licencia perpetua IP + data | Low risk, talent acquisition, IP access | Founders retain upside via license royalties | Big Tech, R&D focused |

**Deal Terms Clave (Negociables):**

| Término | Range Propuesto | Comentario |
|---------|-----------------|------------|
| **Enterprise Value** | $8-15M USD | Basado en strategic value, no solo financial |
| **Cash at Close** | 60-80% EV | Balance en earnout/rollover |
| **Earnout** | 18-24 meses | Milestones: ARR, retention, expansion |
| **Rollover Equity** | 10-20% NewCo | Align long-term, tax efficient |
| **Escrow/Indemnity** | 10-15% EV, 18m | Standard reps & warranties |
| **Employee Retention** | 100% key team | Stay bonuses + equity refresh |

**Timeline to Close (Target 90 días):**

```
Semana 1-2:   NDA + Data Room Access + Management Presentations
Semana 3-6:   Due Diligence (Tech, Legal, Financial, Commercial)
Semana 7-8:   Term Sheet Negotiation + Signing
Semana 9-12:  Definitive Agreements + Regulatory (si aplica) + Close
Semana 13+:   Integration Kickoff + Team Transition
```

**Speaker Notes:**
> "Estructura flexible: asset purchase (clean, fast), stock purchase (continuidad), acqui-hire+license (talent+IP). EV $8-15M rango strategic. 60-80% cash at close, earnout 18-24m con milestones claros (ARR, retention, expansión). Rollover 10-20% align incentives. 90 días close target — cap table limpia, sin debt, sin preferred, data room ready. Comprador decide estructura óptima para su thesis."

---

### SLIDE 9: INTEGRATION — DAY 1 READY
**Tiempo:** 30 seg | **Función:** Reducir integration risk, mostrar preparation

**Contenido Visual:** Integration workstreams + 100-day plan

**Workstreams de Integración (Preparados):**

| Workstream | Owner (CarLink) | Owner (Buyer) | Status | Entregables |
|------------|-----------------|---------------|--------|-------------|
| **Tech/Platform** | CTO | VP Eng / Architect | ✅ Documentado | API catalog, data dictionary, infra as code, runbooks |
| **Data/Privacy** | CEO | Legal / DPO | ✅ Ready | DPIA, data mapping, consent records, deletion procedures |
| **Commercial** | Growth Head | Sales / BD | ✅ Playbook | Contracts, pipeline, pricing, partner agreements |
| **People/HR** | CEO | HRBP / People | ✅ Plan | Org chart, comp bands, retention packages, culture doc |
| **Finance/Legal** | External CPA | Corp Dev / Legal | ✅ Clean | Cap table, contracts, IP assignments, tax compliance |
| **Brand/Marketing** | Founder | Brand / Marketing | ✅ Assets | Brand guidelines, assets, social, SEO, content library |

**100-Day Plan (High Level):**

| Días | Foco | Key Milestones |
|------|------|----------------|
| **1-30** | Estabilizar & Aprender | Equipo onboarded, sistemas accesos, customer communication, quick wins (pricing, upsell) |
| **31-60** | Integrar Core | Platform merge (auth, billing, analytics), data pipeline unified, sales motion aligned |
| **61-100** | Acelerar | México launch, enterprise module rollout, hiring plan execution, board reporting rhythm |

**Risk Mitigation (Pre-identificado):**

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Key person departure** | Media | Alto | Retention packages firmados pre-close, knowledge transfer docs |
| **Data privacy compliance** | Baja | Alto | DPIA completado, Ley 1581 compliant, DPO externo contratado |
| **Tech debt integration** | Media | Media | Arquitectura documentada, APIs versionadas, test coverage 78% |
| **Culture clash** | Media | Media | Culture doc compartido, joint workshops semana 1, buddy system |
| **Customer churn post-announcement** | Baja | Medio | Communication plan ready, founder visibility, service continuity guarantee |

**Speaker Notes:**
> "Integration risk bajo: todo documentado, workstreams definidos, owners claros. 100-day plan accionable. Riesgos clave mitigados pre-close: retention packages, DPIA, tech docs, culture doc, communication plan. Comprador no compra 'problemas por resolver' — compra activo listo para escalar."

---

### SLIDE 10: NEXT STEPS — CONVERSACIÓN ESTRATÉGICA
**Tiempo:** 20 seg | **Función:** Call to action claro, next steps concretos, contacto directo

**Contenido Visual:** Clean, direct, actionable

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│                         🤝  INICIEMOS LA CONVERSACIÓN                      │
│                                                                            │
│    ──────────────────────────────────────────────────────────────────────  │
│                                                                            │
│    CarLink está abierto a conversaciones estratégicas con compradores     │
│    que compartan la visión: la placa como llave universal de la movilidad │
│    en Latinoamérica.                                                       │
│                                                                            │
│    ──────────────────────────────────────────────────────────────────────  │
│                                                                            │
│    📋  PRÓXIMOS PASOS                                                      │
│                                                                            │
│    1️⃣  NDA mutuo → Acceso Data Room completo (Notion/GDrive)              │
│    2️⃣  Management Presentation (60 min) — Deep dive técnico + comercial   │
│    3️⃣  Due Diligence confirmatoria (3-4 semanas)                          │
│    4️⃣  Term Sheet → Definitive Agreements → Close (target 90 días)        │
│                                                                            │
│    ──────────────────────────────────────────────────────────────────────  │
│                                                                            │
│    📊  DATA ROOM INCLUYE:                                                  │
│    • Financials detallados (3 años + proyecciones + sensitivities)        │
│    • Tech DD: Architecture, IP, Security, Code Quality, Scalability       │
│    • Commercial: Contracts, Pipeline, Playbooks, Cohorts, NPS             │
│    • Legal: Cap table, IP assignments, Regulatory, Contracts              │
│    • Team: Org chart, Comp, Retention plans, Culture doc                  │
│                                                                            │
│    ──────────────────────────────────────────────────────────────────────  │
│                                                                            │
│    🤝  ANDRÉS PEÑA  •  CEO & FOUNDER                                       │
│    📧  andres@carlink.com.co                                               │
│    📱  +57 3XX XXX XXXX  •  📅  Calendly: [LINK]                          │
│    🌐  carlink.com.co  •  💼  LinkedIn: [LINK]                            │
│                                                                            │
│    "La confianza que falta en la movilidad latinoamericana —             │
│     lista para escalar con el socio correcto."                            │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

**Data Room Index (Ready to Share):**

```
📁 CARLINK_DATA_ROOM/
├── 01_Executive_Summary/
│   ├── One-Pager.pdf
│   ├── This_Deck.pdf
│   └── Financial_Summary.xlsx
├── 02_Financials/
│   ├── Historical_P&L.xlsx
│   ├── Projections_3Y_Base_Bull_Bear.xlsx
│   ├── Unit_Economics_Detailed.xlsx
│   └── Cap_Table.csv
├── 03_Technology/
│   ├── Architecture_Decision_Records/
│   ├── API_Specification_OpenAPI.yaml
│   ├── Database_Schema_ERD.png
│   ├── IP_Portfolio_Summary.pdf
│   ├── Security_Audit_Summary.pdf
│   ├── Load_Test_Results.pdf
│   └── Penetration_Test_Summary.pdf
├── 04_Commercial/
│   ├── Taller_Contracts_Template.pdf
│   ├── Enterprise_Pilot_Contracts/
│   ├── Cohort_Analysis_Retention.csv
│   ├── NPS_Surveys_Raw.xlsx
│   ├── Playbook_Taller_Acquisition.pdf
│   ├── Playbook_Enterprise_Sales.pdf
│   └── City_Launch_Checklist.pdf
├── 05_Legal/
│   ├── Cap_Table_Clean.csv
│   ├── IP_Assignments_Founders.pdf
│   ├── Trademark_Registrations.pdf
│   ├── Patent_Pending_NFC_Protocol.pdf
│   ├── Data_Privacy_DPIA.pdf
│   └── Regulatory_Compliance_Matrix.xlsx
├── 06_Team/
│   ├── Org_Chart.pdf
│   ├── Comp_Bands.xlsx
│   ├── Retention_Packages_Proposed.pdf
│   └── Culture_Values_Doc.pdf
└── 07_Product/
    ├── Figma_Prototypes_Link.txt
    ├── Mobile_App_Designs/
    ├── NFC_Hardware_Specs.pdf
    └── Roadmap_Q3_2025_Q2_2026.pdf
```

**Speaker Notes (Closing):**
> "No buscamos subasta — buscamos el socio correcto. Data room completo listo para NDA. Management presentation 60 min deep dive. Target 90 días close. Yo (Andrés) lidero el proceso directo — sin intermediarios, sin bankers. Si la visión resuena: hablemos. La confianza que falta en la movilidad latinoamericana, lista para escalar con el socio correcto."

---

## 📦 ENTREGABLES M&A (Adicionales a Fundraising)

### Data Room Completa (Notion/GDrive)
- Estructura de 7 carpetas como índice arriba
- Acceso granular por workstream (Tech, Legal, Commercial, etc.)
- Watermarking dinámico + access logs + expiry dates

### Documentos Legales Listos
- [ ] NDA Mutuo (template YC/standard)
- [ ] LOI / Term Sheet template (NVCA/standard)
- [ ] IP Assignment agreements (founders → company)
- [ ] Employee invention assignments
- [ ] Data processing agreements (DPA) para enterprise

### Preparación Comprador
- [ ] Management presentation deck (versión extendida 20 slides)
- [ ] Technical deep dive deck (para CTO/VP Eng comprador)
- [ ] Integration planning workshop agenda (día 1 post-close)
- [ ] Reference customers list (3 enterprise + 5 talleres + 10 dueños)

---

## ✅ CHECKLIST M&A READINESS

- [ ] Data room completa, organizada, watermarked
- [ ] Financials auditados/preparados por CPA externo (3 años)
- [ ] Cap table 100% limpia, sin disputes, dokumentada
- [ ] IP assignments firmados por todos los fundadores/empleados
- [ ] Patente NFC protocol: PCT filed, priority date secured
- [ ] Trademarks: "CarLink" registrado Colombia (clases 9, 35, 42)
- [ ] Data privacy: DPIA completado, Ley 1581 compliant, DPO externo
- [ ] Contratos clave: talleres, enterprise pilots, proveedores — todos asignables
- [ ] Equipo clave: retention packages diseñados, legales revisados
- [ ] Referencias: 3 enterprise + 5 talleres + 10 dueños listos para calls
- [ ] Advisor M&A: identificado (opcional) para process management
- [ ] Tax structure: revisada para deal efficiency (Colombia holding vs direct)

---

*Documento confidencial — solo bajo NDA. Versión 1.0 — Julio 2026*