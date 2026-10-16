/* Prueba VISUAL de "Aliados de negocio" (Fases 0 a 3) en un navegador real (docs/PRUEBAS_FUNCIONALES.md, suites 18 a 22).

   Recorre cada escenario en escritorio y en celular, guarda una captura por escenario y comprueba con aserciones lo que se debe
   ver (y lo que NO debe verse). Requisitos:
     1. Backend en :8000 y frontend en :3000 (`npm run dev`) con las migraciones 077 a 080 aplicadas.
     2. Fixtures: `.venv/bin/python scripts/qa_aliados_e2e.py --fixtures f.json` (crea cuentas desechables y deja sus sesiones en f.json).
     3. `playwright-core` instalado (p. ej. `npm i playwright-core` en una carpeta temporal) y un Chromium: CHROME=/ruta/al/chrome.
   Uso:  FIXTURES=f.json OUT=/ruta/capturas CHROME=... node scripts/qa_aliados_visual.mjs
   Al terminar: borrar f.json (contiene sesiones) y correr `qa_aliados_e2e.py --cleanup`.

   La pantalla de admin se prueba con la sesion de una cuenta de pruebas "disfrazada" de admin SOLO en el navegador (el id que la
   interfaz compara) y las respuestas de /api/admin/workshop-applications se simulan con las filas reales de las cuentas de prueba:
   el backend nunca recibe una sesion de admin. */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const FIX = JSON.parse(fs.readFileSync(process.env.FIXTURES, 'utf8'))
const OUT = process.env.OUT || './capturas'
const BASE = process.env.BASE || 'http://localhost:3000'
const ADMIN_ID = process.env.ADMIN_ID || ''
fs.mkdirSync(OUT, { recursive: true })

const results = []
const record = (id, ok, detail = '') => { results.push({ id, ok, detail }); console.log((ok ? '  OK    ' : '  FALLA ') + id + (ok || !detail ? '' : `  [${detail}]`)) }
import zlib from 'node:zlib'
/* PNG de color liso/degradado hecho a mano (sin dependencias): fotos de prueba que NO se suben a ningun almacenamiento. */
function makePng(w, h, rgb) {
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
  const crc = buf => { let c = 0xffffffff; for (const b of buf) c = crcT[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
  const chunk = (type, data) => { const t = Buffer.from(type), len = Buffer.alloc(4); len.writeUInt32BE(data.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, c]) }
  const raw = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3, g = x / w; raw[o] = Math.min(255, rgb[0] * (0.6 + 0.4 * g)); raw[o + 1] = Math.min(255, rgb[1] * (0.6 + 0.4 * g)); raw[o + 2] = rgb[2] } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}
const PHOTOS = [makePng(640, 400, [200, 60, 60]), makePng(640, 400, [60, 120, 200]), makePng(640, 400, [60, 170, 90])]
const VIEWS = { desk: { width: 1280, height: 900 }, mob: { width: 390, height: 844 } }

const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] })
const storageKey = `sb-${new URL(FIX.supabase_url).hostname.split('.')[0]}-auth-token`

async function ctxFor(view, alias, { asAdmin = false, theme = 'dark' } = {}) {
  const ctx = await browser.newContext({ viewport: VIEWS[view], deviceScaleFactor: 1 })
  const init = [['carlink_theme', theme]]
  if (alias) {
    const session = JSON.parse(JSON.stringify(FIX.users[alias].session))
    if (asAdmin) session.user.id = ADMIN_ID
    init.push([storageKey, JSON.stringify(session)])
  }
  await ctx.addInitScript(items => { for (const [k, v] of items) { try { localStorage.setItem(k, v) } catch {} } }, init)
  return ctx
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.jpg`)
  await page.screenshot({ path: file, type: 'jpeg', quality: 72, fullPage: false })
  return file
}
async function settle(page, ms = 1800) { await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(ms) }
const text = async page => (await page.locator('body').innerText()).replace(/\s+/g, ' ')
const html = async page => page.content()
async function hOverflow(page) { return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1) }

const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY) : null  // ONLY='V18|V21' repite solo esos escenarios
const KIND_LABELS = { taller: 'Taller o servicio automotriz', cda: 'Centro de diagnóstico automotor (CDA)', concesionario: 'Concesionario', compraventa: 'Compraventa de vehículos', repuestos: 'Proveedor de repuestos' }
async function pickKind(page, kind) {
  await page.locator('#ap-business_kind').click()
  await page.getByRole('option', { name: KIND_LABELS[kind], exact: true }).click()
}
async function run(id, fn) { if (ONLY && !ONLY.test(id)) return; try { await fn() } catch (e) { record(id, false, String(e).split('\n')[0].slice(0, 160)) } }

/* ------------------------------------------------------------ Suite 18: formulario por tipo (publico) */
for (const view of ['desk', 'mob']) {
  await run(`V18.1-${view}`, async () => {
    const ctx = await ctxFor(view, null)
    const page = await ctx.newPage()
    await page.route('**/api/workshop-applications/public-map', r => r.fulfill({ json: { items: [] } }))
    await page.goto(`${BASE}/taller#registro`, { waitUntil: 'domcontentloaded' })
    await settle(page)
    const sel = page.locator('#ap-business_kind')
    await sel.scrollIntoViewIfNeeded()
    record(`V18.1 (${view}) El formulario no usa <select> ni <datalist> nativos (el desplegable es el amarillo de CarLink)`, (await page.locator('form select, form datalist').count()) === 0)
    const form = page.locator('form').first()
    const probe = async kind => { await pickKind(page, kind); await page.waitForTimeout(250); return { sub: await page.locator('#ap-business_type').count(), spec: await page.locator('#ap-specialties').count(), specLabel: (await page.locator('label[for="ap-specialties"]').allInnerTexts()).join('') } }
    const t = await probe('taller'); await form.screenshot({ path: path.join(OUT, `18-1-form-taller-${view}.jpg`), type: 'jpeg', quality: 72 })
    const c = await probe('concesionario'); await form.screenshot({ path: path.join(OUT, `18-1-form-concesionario-${view}.jpg`), type: 'jpeg', quality: 72 })
    const v = await probe('compraventa')
    const d = await probe('cda')
    const r = await probe('repuestos')
    if (view === 'desk') {
      await sel.click()
      const opts = await page.getByRole('option').allInnerTexts()
      const hl = await page.getByRole('option').first().evaluate(el => getComputedStyle(el).color)
      await shot(page, '18-1-selector-amarillo-desk')
      await page.keyboard.press('Escape')
      record('V18.1 El selector ofrece 4 tipos + CDA y ninguna aseguradora', opts.some(o => /CDA/.test(o)) && !opts.some(o => /asegur/i.test(o)) && opts.length === 5, opts.join('|'))
    }
    record(`V18.1 (${view}) Taller muestra tipo de taller y especialidades; concesionario muestra marcas; compraventa, CDA y repuestos ninguno`,
      t.sub === 1 && t.spec === 1 && /Especialidades/.test(t.specLabel) && c.sub === 0 && c.spec === 1 && /Marcas/.test(c.specLabel) && v.sub === 0 && v.spec === 0 && d.sub === 0 && d.spec === 0 && r.sub === 0 && r.spec === 0, JSON.stringify({ t, c, v, d, r }))
    record(`V18.1 (${view}) Sin scroll horizontal`, !(await hOverflow(page)))
    await ctx.close()
  })
}

/* ------------------------------------------------------------ Suite 18: admin Postulaciones (respuestas simuladas con filas reales) */
await run('V18.3', async () => {
  if (!ADMIN_ID) { record('V18.3 Admin > Postulaciones', false, 'falta ADMIN_ID'); return }
  const rows = FIX.admin_payload.applications.map(a => ({ ...a, checks: typeof a.checks === 'string' ? JSON.parse(a.checks) : a.checks, verification: typeof a.verification === 'string' ? JSON.parse(a.verification) : a.verification, can_certify_odometer: a.business_kind === 'concesionario' || a.business_kind === 'compraventa' ? !!FIX.cert?.[a.nit] : false }))
  for (const view of ['desk', 'mob']) {
    const ctx = await ctxFor(view, 'conc', { asAdmin: true })
    const page = await ctx.newPage()
    await page.route('**/api/admin/workshop-applications**', r => r.request().method() === 'GET' ? r.fulfill({ json: rows }) : r.fulfill({ json: rows[0] }))
    await page.goto(`${BASE}/admin?tab=postulaciones`, { waitUntil: 'domcontentloaded' })
    await settle(page, 2500)
    const body = await text(page)
    await shot(page, `18-3-admin-postulaciones-${view}`)
    if (view === 'desk') {
      const h = await html(page)
      const parts = { rues: /verificación en el rues/i.test(body) && /consultar rues/i.test(body) && /ECOPETROL S A/.test(body) && /Cámara de Comercio de BOGOTA/i.test(body) && /es una ayuda/i.test(body), tipo: /Concesionario|Compraventa/.test(body), chequeo: /validación manual/i.test(body), ruesLink: /Consultar el RUES/.test(body), acceso: /Acceso al crear la cuenta/.test(body), opcion: h.includes('12 meses gratis') }
      record('V18.3 Admin muestra tipo y subtipo, lista de chequeo, RUES y selector de acceso (en la postulación con invitación sin usar)', Object.values(parts).every(Boolean), JSON.stringify(parts))
      record('V18.3b Admin muestra el estado de la invitación y "Reenviar"', /Invitaci[oó]n (enviada|usada)/.test(body) && /Reenviar invitaci[oó]n|Invitación usada/.test(body))
      record('V18.3c Admin ofrece habilitar certificación solo en concesionario/compraventa con cuenta', /Certificar kilometraje de entrega/.test(body))
    }
    record(`V18.3 (${view}) Sin scroll horizontal`, !(await hOverflow(page)))
    await ctx.close()
  }
})

/* ------------------------------------------------------------ Suite 18: registro con invitacion */
if (FIX.invite_token) await run('V18.4', async () => {
  for (const view of ['desk', 'mob']) {
    const ctx = await ctxFor(view, 'invitee')
    const page = await ctx.newPage()
    await page.goto(`${BASE}/register?mode=empresa&invite=${FIX.invite_token}`, { waitUntil: 'domcontentloaded' })
    await settle(page, 2500)
    const body = await text(page)
    await shot(page, `18-4-registro-invitacion-${view}`)
    if (view === 'desk') {
      const nit = page.locator('input[placeholder="Ej. 12345678-9"]')
      record('V18.4 El registro con invitacion: aviso de aprobada, datos precargados y NIT bloqueado', /Tu postulación fue aprobada/.test(body) && (await nit.inputValue()) === FIX.invite_nit && (await nit.getAttribute('readonly')) !== null && /Registra tu concesionario/i.test(body), body.slice(0, 160))
    }
    record(`V18.4 (${view}) Sin scroll horizontal`, !(await hOverflow(page)))
    await ctx.close()
  }
  const ctx = await ctxFor('desk', 'invitee')
  const page = await ctx.newPage()
  await page.goto(`${BASE}/register?mode=empresa&invite=token-inventado-${'x'.repeat(30)}`, { waitUntil: 'domcontentloaded' })
  await settle(page, 2000)
  const body = await text(page)
  await shot(page, '18-4-registro-invitacion-invalida-desk')
  record('V18.4b Con una invitacion inventada se avisa claramente', /no es válido|no es valido/i.test(body), body.slice(0, 160))
  await ctx.close()
})

/* ------------------------------------------------------------ Suite 19: panel por tipo de negocio */
const PANEL = {
  taller:  { menu: ['Mi taller', 'Clientes & Vehículos', 'Órdenes de trabajo', 'Inventario', 'Citas', 'Notificaciones', 'Rentabilidad', 'Código de alianza'], no: ['Vehículos en venta'], banner: /aliado fundador|Acceso gratuito/ },
  conc:    { menu: ['Mi negocio', 'Clientes & Vehículos', 'Notificaciones', 'Vehículos en venta', 'Llaveros en consignación', 'Código de alianza'], card: 'Llaveros en consignación', no: ['Órdenes de trabajo', 'Inventario', 'Citas', 'Rentabilidad', 'Mi taller', 'Diagnóstico IA', 'Ingresar vehículo'] },
  comp:    { menu: ['Mi negocio', 'Clientes & Vehículos', 'Notificaciones', 'Vehículos en venta', 'Código de alianza'], no: ['Órdenes de trabajo', 'Inventario', 'Citas', 'Rentabilidad'] },
  cda:     { menu: ['Mi negocio', 'Clientes & Vehículos', 'Citas', 'Revisiones RTM', 'Notificaciones', 'Código de alianza'], card: 'Revisiones por vencer', no: ['Órdenes de trabajo', 'Inventario', 'Rentabilidad', 'Vehículos en venta', 'Llaveros en consignación'] },
  rep:     { menu: ['Mi negocio', 'Inventario', 'Notificaciones', 'Código de alianza'], no: ['Clientes & Vehículos', 'Órdenes de trabajo', 'Citas', 'Rentabilidad', 'Vehículos en venta'], restricted: true },
  conv:    { menu: ['Mi taller', 'Órdenes de trabajo', 'Código de alianza'], no: ['Vehículos en venta'], noBanner: true },
  expired: { menu: ['Mi taller', 'Órdenes de trabajo'], no: [], restricted: true },
}
for (const [alias, spec] of Object.entries(PANEL)) {
  await run(`V19-${alias}`, async () => {
    for (const view of ['desk', 'mob']) {
      const ctx = await ctxFor(view, alias)
      const page = await ctx.newPage()
      await page.goto(`${BASE}/app/negocio`, { waitUntil: 'domcontentloaded' })
      await settle(page, 2600)
      const all = (await html(page)).replace(/&amp;/g, '&')
      const vis = await text(page)
      await shot(page, `19-panel-${alias}-${view}`)
      if (view === 'desk') {
        const missing = spec.menu.filter(l => !all.includes(l))
        const extra = spec.no.filter(l => all.includes(l))
        record(`V19 ${alias}: el menu tiene lo que corresponde a su tipo y nada mas`, !missing.length && !extra.length, `faltan=${missing} sobran=${extra}`)
        if (spec.card) record(`V19 ${alias}: el inicio muestra la tarjeta propia de su tipo (${spec.card})`, vis.toLowerCase().includes(spec.card.toLowerCase()), vis.slice(0, 160))
        if (spec.restricted) record(`V19 ${alias}: acceso vencido muestra "modo solo lectura" y "Renovar mi plan"`, /modo solo lectura/.test(vis) && /Renovar mi plan/.test(vis), vis.slice(0, 180))
        else record(`V19 ${alias}: con acceso vigente NO aparece el aviso de solo lectura`, !/modo solo lectura/.test(vis))
        if (spec.banner) record(`V19 ${alias}: el menu lateral dice "Acceso gratuito de aliado fundador"`, spec.banner.test(all))
        if (spec.noBanner) record(`V19 ${alias}: un convenio no muestra aviso de prueba ni de vencimiento`, !/Acceso gratuito de aliado|Prueba gratuita|Acceso terminado/.test(all))
      }
      record(`V19 ${alias} (${view}): sin scroll horizontal`, !(await hOverflow(page)))
      await ctx.close()
    }
  })
}

/* ------------------------------------------------------------ Suite 20: codigo de alianza (panel y checkout) */
await run('V20.1', async () => {
  for (const view of ['desk', 'mob']) {
    const ctx = await ctxFor(view, 'taller')
    const page = await ctx.newPage()
    await page.goto(`${BASE}/app/negocio`, { waitUntil: 'domcontentloaded' })
    await settle(page, 2200)
    await page.getByText('Código de alianza', { exact: true }).first().evaluate(el => el.click())
    await settle(page, 1500)
    const body = await text(page)
    await shot(page, `20-1-alianza-panel-${view}`)
    if (view === 'desk') record('V20.1 Panel Codigo de alianza: codigo, enlace, descuento y cifras agregadas', body.includes(FIX.alliance_code) && /\/\?ref=TLR-/.test(await page.locator('input[aria-label="Enlace para compartir"]').inputValue()) && /\$7\.000/.test(body) && /llaveros este mes/i.test(body) && /copiar enlace/i.test(body) && /whatsapp/i.test(body) && !/Cliente QA|carlink\.internal/.test(body), body.slice(0, 200))
    record(`V20.1 (${view}) Sin scroll horizontal`, !(await hOverflow(page)))
    await ctx.close()
  }
})
await run('V20.2', async () => {
  for (const view of ['desk', 'mob']) {
    const ctx = await ctxFor(view, null)
    const page = await ctx.newPage()
    await page.goto(`${BASE}/?ref=${FIX.alliance_code}`, { waitUntil: 'domcontentloaded' })
    await settle(page, 2500)
    const stored = await page.evaluate(() => localStorage.getItem('carlink_alliance_ref'))
    record(`V20.2 (${view}) El enlace ?ref= se guarda en el navegador`, !!stored && stored.includes(FIX.alliance_code), String(stored))
    // abrir el checkout (boton de compra) y llegar al paso de pago
    const buy = page.getByRole('button', { name: /comprar|llavero|pedir/i }).first()
    await buy.click({ timeout: 8000 }).catch(() => {})
    await page.waitForTimeout(1200)
    const fill = async (ph, v) => { const el = page.getByPlaceholder(ph); if (await el.count()) await el.first().fill(v) }
    await fill('Juan Pérez', 'Cliente de Prueba'); await fill('correo@ejemplo.com', 'qa-aliados-visual@carlink.internal'); await fill('3001234567', '3001234567')
    await fill('Cra 7 #45-12, Apto 301', 'Calle 15 # 10-20'); await fill('Escribe tu ciudad o pueblo...', 'Duitama')
    const opt = page.getByRole('button', { name: 'Duitama' }); if (await opt.count()) await opt.first().click()
    const go = page.getByRole('button', { name: 'Ir al pago' }); if (await go.count()) await go.click().catch(() => {})
    await page.waitForTimeout(1800)
    const body = await text(page)
    await shot(page, `20-2-checkout-con-descuento-${view}`)
    if (view === 'desk') record('V20.2 Checkout: codigo prellenado y aplicado, descuento y total $32.900', /Descuento por alianza/.test(body) && /\$32\.900/.test(body) && (await page.getByLabel('Código de alianza').inputValue()) === FIX.alliance_code, body.slice(0, 220))
    record(`V20.2 (${view}) Sin scroll horizontal`, !(await hOverflow(page)))
    await ctx.close()
  }
})

/* ------------------------------------------------------------ Suite 21: vehiculos del aliado */
for (const alias of ['conc', 'comp']) {
  await run(`V21-${alias}`, async () => {
    for (const view of ['desk', 'mob']) {
      const ctx = await ctxFor(view, alias)
      const page = await ctx.newPage()
      await page.goto(`${BASE}/app/negocio`, { waitUntil: 'domcontentloaded' })
      await settle(page, 2200)
      await page.getByText('Vehículos en venta', { exact: true }).first().evaluate(el => el.click())
      await page.getByText(/QAL-?\d{3}/).first().waitFor({ timeout: 30000 }).catch(() => {})
      await settle(page, 1200)
      const body = await text(page)
      await shot(page, `21-1-inventario-${alias}-${view}`)
      if (view === 'desk' && alias === 'conc') {
        record('V21.1 Inventario del concesionario: tarjetas con placa, km, etiqueta y acciones', /QAL811/.test(body) && /Certificado por concesionario/i.test(body) && /\bpublicado\b/i.test(body) && /no publicado/i.test(body) && /entregado/i.test(body) && /entrega pendiente/i.test(body) && /entregar al comprador/i.test(body), body.slice(0, 260))
        // formulario de agregar
        await page.getByRole('button', { name: 'Agregar vehículo' }).click()
        await page.waitForTimeout(700)
        await shot(page, `21-2-agregar-vehiculo-${view}`)
        record('V21.2 El formulario de agregar muestra los campos y el aviso de la placa', /placa \*/i.test(await text(page)) && /no muestra la placa completa/i.test(await text(page)))
        await page.getByRole('button', { name: 'Cancelar' }).click()
        // certificar
        await page.getByRole('button', { name: /Certificar km/ }).first().click()
        await page.waitForTimeout(600)
        await shot(page, `21-3-certificar-${view}`)
        record('V21.3 El modal de certificar explica el peso, la comparacion y los 3 intentos', /certificado por concesionario/i.test(await text(page)) && /3 intentos/i.test(await text(page)))
        await page.getByRole('button', { name: 'Cancelar' }).click()
        // ficha y QR
        await page.getByRole('button', { name: 'Ficha y QR' }).first().click()
        await page.waitForTimeout(1500)
        await shot(page, `21-4-ficha-qr-${view}`)
        const link = await page.locator('input[aria-label="Enlace"]').inputValue()
        record('V21.4 La ficha publicada ofrece enlace y QR', /\/v\/[A-Z0-9]{8}$/.test(link) && (await page.locator('canvas, svg').count()) > 0, link)
        await page.getByRole('button', { name: 'Cerrar', exact: true }).last().click()
      }
      if (view === 'desk' && alias === 'comp') {
        record('V21.1b Compraventa: el boton dice "Declarar km" (no "Certificar")', /declarar km/i.test(body) && !/certificar km/i.test(body), body.slice(0, 200))
      }
      record(`V21 ${alias} (${view}) inventario: sin scroll horizontal`, !(await hOverflow(page)))
      await ctx.close()
    }
  })
}

/* ficha publica /v/<slug> */
await run('V21.5', async () => {
  for (const view of ['desk', 'mob']) {
    const ctx = await ctxFor(view, null)
    const page = await ctx.newPage()
    await page.goto(`${BASE}/v/${FIX.dealer.listed_slug}`, { waitUntil: 'domcontentloaded' })
    await settle(page, 1800)
    const body = await text(page)
    await shot(page, `21-5-ficha-publica-${view}`)
    if (view === 'desk') record('V21.5 Ficha publica: km certificado con su etiqueta, precio, vendedor y placa SIN revelar', /certificado por concesionario/i.test(body) && /28\.450 km/.test(body) && /QAL•••/.test(body) && !/QAL-?811/.test(body) && /vehículo en venta/i.test(body) && !/carlink\.internal/.test(body), body.slice(0, 260))
    record(`V21.5 (${view}) Sin scroll horizontal`, !(await hOverflow(page)))
    await ctx.close()
  }
  const ctx = await ctxFor('desk', null)
  const page = await ctx.newPage()
  await page.goto(`${BASE}/v/ZZZZZZZZ`, { waitUntil: 'domcontentloaded' })
  await settle(page, 1500)
  await shot(page, '21-5-ficha-publica-inexistente-desk')
  record('V21.5b Una ficha inexistente muestra un mensaje amable', /no está disponible/.test(await text(page)))
  await ctx.close()
})

/* entrega /entrega/<codigo>: sin sesion, con sesion, aceptar */
await run('V21.6', async () => {
  const tok = FIX.dealer.pending_delivery_token
  for (const view of ['desk', 'mob']) {
    const ctx = await ctxFor(view, null)
    const page = await ctx.newPage()
    await page.goto(`${BASE}/entrega/${tok}`, { waitUntil: 'domcontentloaded' })
    await settle(page, 1800)
    const body = await text(page)
    await shot(page, `21-6-entrega-sin-sesion-${view}`)
    if (view === 'desk') record('V21.6 Entrega sin sesion: vehiculo, km certificado y boton para iniciar sesion', /onix turbo/i.test(body) && new RegExp(FIX.dealer.pending_plate || 'QAL-813').test(body) && /9\.120 km/.test(body) && /certificado por concesionario/i.test(body) && /iniciar sesión o crear cuenta/i.test(body), body.slice(0, 240))
    record(`V21.6 (${view}) sin sesion: sin scroll horizontal`, !(await hOverflow(page)))
    await ctx.close()
  }
  const ctx = await ctxFor('mob', 'buyer4')
  const page = await ctx.newPage()
  await page.goto(`${BASE}/entrega/${tok}`, { waitUntil: 'domcontentloaded' })
  await settle(page, 2200)
  await shot(page, '21-6-entrega-con-sesion-mob')
  const b1 = await text(page)
  record('V21.6b Con sesion aparece la casilla de compartir contacto (opcional) y el boton de recibir', /guarde mi nombre y WhatsApp/.test(b1) && /Recibir este vehículo en mi cuenta/.test(b1), b1.slice(0, 200))
  await page.getByRole('button', { name: /Recibir este vehículo/ }).click()
  await page.getByText(/el vehículo ya es tuyo/).waitFor({ timeout: 25000 }).catch(() => {})
  await page.waitForTimeout(500)
  await shot(page, '21-6-entrega-recibida-mob')
  record('V21.6c Al recibir: mensaje de exito y acceso a la ficha', /el vehículo ya es tuyo/.test(await text(page)))
  await page.goto(`${BASE}/entrega/${tok}`, { waitUntil: 'domcontentloaded' })
  await settle(page, 1500)
  await shot(page, '21-6-entrega-ya-usada-mob')
  record('V21.6d Reabrir un enlace usado muestra que ya no esta disponible', /no está disponible|ya se usó|no es válido/i.test(await text(page)))
  await ctx.close()
})

/* el comprador ve la etiqueta en su ficha */
await run('V21.7', async () => {
  for (const view of ['desk', 'mob']) {
    const ctx = await ctxFor(view, 'buyer2')
    // Una cuenta nueva ve el asistente de bienvenida: se marca como hecho para ver la ficha (no es lo que se prueba aqui).
    await ctx.addInitScript(id => { try { localStorage.setItem(`carlink_onboarding_done_${id}`, '1') } catch {} }, FIX.users.buyer2.id)
    const page = await ctx.newPage()
    await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' })
    await settle(page, 3000)
    await page.getByText('Ficha tecnica', { exact: true }).first().evaluate(el => el.click()).catch(() => {})
    await page.getByRole('button', { name: 'Empezar' }).click({ timeout: 4000 }).catch(() => {})  // tour de bienvenida de una cuenta nueva
    await page.locator('[data-testid="odometer-certification"]').waitFor({ timeout: 25000 }).catch(() => {})
    await settle(page, 1000)
    await shot(page, `21-7-ficha-comprador-${view}`)
    if (view === 'desk') { const b = await text(page); record('V21.7 La ficha del comprador muestra "Certificado por concesionario" junto al kilometraje', /Certificado por (CDA|concesionario) · QA (cda|conc)/.test(b), b.slice(0, 260)) }
    await ctx.close()
  }
})

/* ------------------------------------------------------------ Suite 23: revisiones RTM del CDA, consignacion y fotos (Fase 3b) */
async function withPhotos(page) {
  await page.route('**/api/upload/files/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: PHOTOS[Math.abs([...r.request().url()].reduce((a, c) => a + c.charCodeAt(0), 0)) % 3] }))
}
await run('V23.1', async () => {
  for (const view of ['desk', 'mob']) {
    const ctx = await ctxFor(view, 'cda')
    const page = await ctx.newPage()
    await page.goto(`${BASE}/app/negocio`, { waitUntil: 'domcontentloaded' })
    await settle(page, 2200)
    await page.getByText('Revisiones RTM', { exact: true }).first().evaluate(el => el.click())
    await settle(page, 1800)
    await shot(page, `23-1-revisiones-registrar-${view}`)
    if (view === 'desk') {
      const b = await text(page)
      record('V23.1 CDA habilitado: formulario con placa, certificado, resultado, fechas y kilometraje (y el aviso de 3 intentos)', /placa \*/i.test(b) && /número de certificado/i.test(b) && /vigente hasta/i.test(b) && /3 intentos/.test(b) && !/requiere una habilitación aparte/.test(b), b.slice(0, 200))
      // registrar una revisión real desde la interfaz
      await page.locator('#rt-plate').fill('QAL841')
      await page.locator('#rt-cert').fill('RTM-VISUAL-0001')
      await page.locator('#rt-km').fill('18000')
      await page.getByRole('button', { name: 'Registrar revisión' }).last().click()
      await page.waitForTimeout(6000)
      const after = await text(page)
      await shot(page, '23-2-revisiones-historial-desk')
      record('V23.2 Registrar desde la interfaz: aviso de exito y la revision aparece en el historial', /revisión de QAL841 registrada/i.test(after) && /QAL841/.test(after) && /RTM-VISUAL-0001/.test(after) && /constancia al propietario/i.test(after), after.slice(0, 240))
      await page.getByRole('button', { name: /Por vencer/ }).click()
      await page.waitForTimeout(800)
      const dueText = await text(page)
      await shot(page, '23-3-revisiones-por-vencer-desk')
      record('V23.3 Por vencer: QAL-801 con su contacto compartido y boton de recordatorio por WhatsApp', /QAL801/.test(dueText) && /vence en \d+ días/.test(dueText) && /recordar por whatsapp/i.test(dueText), dueText.slice(0, 240))
      await page.getByRole('button', { name: /Historial/ }).click()
      await page.getByRole('button', { name: 'Constancia al propietario' }).first().click()
      await page.waitForTimeout(500)
      await page.getByRole('button', { name: 'Generar enlace' }).click()
      await page.waitForTimeout(3500)
      await shot(page, '23-4-constancia-enlace-qr-desk')
      const link = await page.locator('input[readonly]').first().inputValue().catch(() => '')
      record('V23.4 La constancia genera enlace de un solo uso (/constancia/<codigo>) con QR', /\/constancia\/[A-Za-z0-9_-]{20,}$/.test(link), link)
    }
    record(`V23.1 (${view}) Sin scroll horizontal`, !(await hOverflow(page)))
    await ctx.close()
  }
})
await run('V23.5', async () => {
  const tok = FIX.rtm_claim_token
  for (const view of ['desk', 'mob']) {
    const ctx = await ctxFor(view, null)
    const page = await ctx.newPage()
    await page.goto(`${BASE}/constancia/${tok}`, { waitUntil: 'domcontentloaded' })
    await page.getByText(/Revisión técnico-mecánica/i).first().waitFor({ timeout: 20000 }).catch(() => {})
    await settle(page, 800)
    const b = await text(page)
    await shot(page, `23-5-constancia-sin-sesion-${view}`)
    if (view === 'desk') record('V23.5 Constancia sin sesion: CDA, resultado, vigencia, certificado y boton para iniciar sesion', /revisión aprobada/i.test(b) && /QAL-801/.test(b) && /vigente hasta/i.test(b) && /iniciar sesión o crear cuenta para guardarla/i.test(b), b.slice(0, 260))
    record(`V23.5 (${view}) sin sesion: sin scroll horizontal`, !(await hOverflow(page)))
    await ctx.close()
  }
  const ctx = await ctxFor('mob', 'buyer2')
  const page = await ctx.newPage()
  await page.goto(`${BASE}/constancia/${tok}`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Guardar en mi vehículo/ }).waitFor({ timeout: 25000 }).catch(() => {})
  await shot(page, '23-5-constancia-con-sesion-mob')
  const b1 = await text(page)
  record('V23.5b Con sesion: casilla opcional de compartir contacto y boton de guardar', /guarde mi nombre y whatsapp/i.test(b1) && /guardar en mi vehículo/i.test(b1), b1.slice(0, 200))
  await page.getByRole('button', { name: /Guardar en mi vehículo/ }).click()
  await page.getByText(/Revisión guardada en/).waitFor({ timeout: 25000 }).catch(() => {})
  await shot(page, '23-5-constancia-guardada-mob')
  const b2 = await text(page)
  record('V23.5c Al guardar: mensaje de exito con el kilometraje certificado agregado', /revisión guardada en QAL-801/i.test(b2) && /kilometraje certificado por el cda/i.test(b2), b2.slice(0, 200))
  await page.goto(`${BASE}/constancia/${tok}`, { waitUntil: 'domcontentloaded' })
  await page.getByText(/no disponible/i).first().waitFor({ timeout: 15000 }).catch(() => {})
  record('V23.5d Reabrir una constancia ya aceptada: no disponible', /no disponible/i.test(await text(page)))
  await ctx.close()
})
await run('V23.6', async () => {
  for (const view of ['desk', 'mob']) {
    const ctx = await ctxFor(view, 'conc')
    const page = await ctx.newPage()
    await page.goto(`${BASE}/app/negocio`, { waitUntil: 'domcontentloaded' })
    await settle(page, 2200)
    await page.getByText('Llaveros en consignación', { exact: true }).first().evaluate(el => el.click())
    await settle(page, 1800)
    const b = await text(page)
    await shot(page, `23-6-consignacion-${view}`)
    if (view === 'desk') record('V23.6 Consignacion: cupo 5, 2 disponibles, 1 activado, listado por prefijo y nada de codigos ni compradores', /cupo asignado/i.test(b) && /\b5\b/.test(b) && /disponibles/i.test(b) && /activados/i.test(b) && /activado/i.test(b) && !/activation|activación:/i.test(b), b.slice(0, 260))
    record(`V23.6 (${view}) Sin scroll horizontal`, !(await hOverflow(page)))
    await ctx.close()
  }
})
await run('V23.7', async () => {
  for (const view of ['desk', 'mob']) {
    const ctx = await ctxFor(view, null)
    const page = await ctx.newPage()
    await withPhotos(page)
    await page.goto(`${BASE}/v/${FIX.photo_slug}`, { waitUntil: 'domcontentloaded' })
    await page.getByText(/Vehículo en venta/i).first().waitFor({ timeout: 20000 }).catch(() => {})
    await settle(page, 1500)
    const thumbs = await page.getByRole('button', { name: /Ver foto/ }).count()
    const loaded = await page.evaluate(() => [...document.images].filter(i => i.complete && i.naturalWidth > 0).length)
    await shot(page, `23-7-ficha-con-fotos-${view}`)
    if (view === 'desk') {
      record('V23.7 La ficha publica muestra la foto principal y 3 miniaturas que cambian la foto', thumbs === 3 && loaded >= 3, `miniaturas=${thumbs} cargadas=${loaded}`)
      await page.getByRole('button', { name: 'Ver foto 3' }).click()
      await page.waitForTimeout(400)
      await shot(page, '23-7-ficha-con-fotos-foto3-desk')
    }
    record(`V23.7 (${view}) Sin scroll horizontal`, !(await hOverflow(page)))
    await ctx.close()
  }
  // subir fotos desde el formulario del inventario (la subida se simula: no se guarda ningun archivo)
  const ctx = await ctxFor('desk', 'conc')
  const page = await ctx.newPage()
  await withPhotos(page)
  await page.route('**/api/upload', r => r.request().method() === 'POST' ? r.fulfill({ json: { url: `/api/upload/files/${FIX.conc_id}/${crypto.randomUUID()}.png` } }) : r.continue())
  await page.goto(`${BASE}/app/negocio`, { waitUntil: 'domcontentloaded' })
  await settle(page, 2200)
  await page.getByText('Vehículos en venta', { exact: true }).first().evaluate(el => el.click())
  await settle(page, 1500)
  await page.getByRole('button', { name: 'Agregar vehículo' }).click()
  await page.waitForTimeout(600)
  await page.locator('input[type=file][accept="image/*"]').setInputFiles([{ name: 'a.png', mimeType: 'image/png', buffer: PHOTOS[0] }, { name: 'b.png', mimeType: 'image/png', buffer: PHOTOS[1] }])
  await page.waitForTimeout(1500)
  await shot(page, '23-8-formulario-fotos-desk')
  record('V23.8 El formulario sube fotos y las muestra como miniaturas con boton para quitarlas', (await page.getByRole('button', { name: 'Quitar foto' }).count()) === 2 && /fotos \(hasta 6\)/i.test(await text(page)))
  await page.getByRole('button', { name: 'Quitar foto' }).first().click()
  record('V23.8b Quitar una foto la elimina del formulario', (await page.getByRole('button', { name: 'Quitar foto' }).count()) === 1)
  await ctx.close()
})

/* ------------------------------------------------------------ Suite 25: formulario con ayuda flotante, ficha publica del taller, pie de pagina y estela */
await run('V25.1', async () => {
  for (const view of ['desk', 'mob']) {
    const ctx = await ctxFor(view, null)
    const page = await ctx.newPage()
    await page.route('**/api/workshop-applications/public-map', r => r.fulfill({ json: { items: [] } }))
    await page.goto(`${BASE}/taller#registro`, { waitUntil: 'domcontentloaded' })
    await page.locator('#ap-business_kind').waitFor({ timeout: 30000 })
    await pickKind(page, 'taller')
    await page.waitForTimeout(500)
    const form = page.locator('form').first()
    await form.scrollIntoViewIfNeeded()
    const body = await text(page)
    const helpers = await page.getByRole('button', { name: /^Ayuda:/ }).count()
    record(`V25.1 (${view}) Las ayudas son botones "?" (no hay textos fijos de ayuda bajo los campos)`, helpers >= 8 && !/Preferiblemente tu WhatsApp/.test(body) && !/Está en tu RUT\. Si no sabes/.test(body) && !/El nombre con el que te conocen/.test(body), `botones=${helpers}`)
    record(`V25.1b (${view}) Se retiró el botón de subir Cámara de Comercio/RUT y el escáner acepta cualquiera de los dos`, !/Cámara de Comercio o RUT \(opcional/.test(body) && /escanear cámara de comercio o rut/i.test(body) && /cualquiera de los dos sirve/i.test(body), body.slice(0, 120))
    await page.getByRole('button', { name: 'Ayuda: NIT (con dígito de verificación)' }).click()
    await page.waitForTimeout(300)
    const tip = await page.getByRole('tooltip').innerText().catch(() => '')
    const box = await page.getByRole('tooltip').boundingBox()
    const vw = page.viewportSize().width
    await shot(page, `25-1-formulario-ayuda-${view}`)
    record(`V25.1c (${view}) Al tocar el "?" aparece el mensaje flotante y cabe en la pantalla`, /dígito después del guion/.test(tip) && !!box && box.x >= 0 && box.x + box.width <= vw + 1, `${tip.slice(0, 50)} x=${box?.x} w=${box?.width} vw=${vw}`)
    await page.keyboard.press('Escape')
    record(`V25.1d (${view}) Escape cierra el mensaje`, (await page.getByRole('tooltip').count()) === 0)
    if (view === 'desk') {
      const tops = async ids => Promise.all(ids.map(id => page.locator(id).evaluate(el => Math.round(el.getBoundingClientRect().top))))
      const pairs = [['#ap-name', '#ap-legal_name'], ['#ap-nit', '#ap-city'], ['#ap-contact_name', '#ap-contact_role'], ['#ap-phone', '#ap-email'], ['#ap-website', '#ap-instagram']]
      const res = []
      for (const [a, b] of pairs) { const [ta, tb] = await tops([a, b]); res.push(Math.abs(ta - tb) <= 1) }
      const heights = await Promise.all(['#ap-name', '#ap-address', '#ap-business_kind', '#ap-phone'].map(id => page.locator(id).evaluate(el => Math.round(el.getBoundingClientRect().height))))
      const mapBtn = await page.getByRole('button', { name: /Ver en mapa|Ubicación confirmada/ }).evaluate(el => Math.round(el.getBoundingClientRect().height))
      record('V25.2 Los campos de una misma fila están alineados horizontalmente y todos miden lo mismo (el botón de mapa igual que la dirección)', res.every(Boolean) && new Set(heights).size === 1 && mapBtn === heights[1], `filas=${res} alturas=${heights} mapa=${mapBtn}`)
    }
    record(`V25.1 (${view}) Sin scroll horizontal`, !(await hOverflow(page)))
    await ctx.close()
  }
})
await run('V26.1', async () => {
  for (const view of ['desk', 'mob']) for (const theme of ['dark', 'light']) {
    const ctx = await ctxFor(view, null, { theme })
    await ctx.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const c = document.createElement('canvas'); c.width = 640; c.height = 480
        const g = c.getContext('2d'); g.fillStyle = '#356'; g.fillRect(0, 0, 640, 480)
        return c.captureStream(10)
      }
    })
    const page = await ctx.newPage()
    await page.route('**/api/workshop-applications/public-map', r => r.fulfill({ json: { items: [] } }))
    await page.goto(`${BASE}/taller#registro`, { waitUntil: 'domcontentloaded' })
    await page.locator('#ap-business_kind').waitFor({ timeout: 30000 })
    await page.locator('#ap-business_kind').scrollIntoViewIfNeeded()
    await page.locator('#ap-business_kind').click()
    const opt = page.getByRole('option', { name: KIND_LABELS.cda, exact: true })
    await opt.hover()
    await page.waitForTimeout(200)
    await shot(page, `26-1-selector-${theme}-${view}`)
    await opt.click()
    const shown = (await page.locator('#ap-business_kind').innerText()).trim()
    record(`V26.1 (${theme}/${view}) El selector de tipo de negocio es del tema (amarillo), no el nativo, y muestra lo elegido`, shown === KIND_LABELS.cda && (await page.locator('form select').count()) === 0, shown)
    if (theme === 'dark') {
      const fileChooser = page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null)
      await page.getByRole('button', { name: 'Subir foto o PDF' }).click()
      record(`V26.2 (${view}) "Subir foto o PDF" abre el selector de archivos`, !!(await fileChooser))
      await page.getByRole('button', { name: /Escanear Cámara de Comercio o RUT/ }).click()
      await page.getByRole('dialog', { name: 'Escanear documento' }).waitFor({ timeout: 5000 })
      await page.getByRole('button', { name: 'Tomar foto' }).waitFor({ timeout: 8000 })
      await shot(page, `26-2-escaner-${view}`)
      await page.getByRole('button', { name: 'Tomar foto' }).click()
      await page.getByRole('button', { name: 'Usar esta foto' }).waitFor({ timeout: 5000 }).catch(() => {})
      const usable = await page.getByRole('button', { name: 'Usar esta foto' }).count()
      record(`V26.2b (${view}) El texto de escanear abre el escáner con cámara y permite tomar la foto`, usable === 1)
      await page.keyboard.press('Escape')
      record(`V26.2c (${view}) Escape cierra el escáner`, (await page.getByRole('dialog', { name: 'Escanear documento' }).count()) === 0)
    }
    record(`V26.1 (${theme}/${view}) Sin scroll horizontal`, !(await hOverflow(page)))
    await ctx.close()
  }
})
await run('V26.3', async () => {
  for (const view of ['desk', 'mob']) {
    const ctx = await ctxFor(view, null)
    const page = await ctx.newPage()
    const logo = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="40"><rect width="120" height="40" fill="#c0392b"/></svg>')
    let items = []
    await page.route('**/api/workshop-applications/public-allies', r => r.fulfill({ json: { items } }))
    await page.route('**/api/workshop-applications/public-map', r => r.fulfill({ json: { items: [] } }))
    await page.goto(`${BASE}/taller`, { waitUntil: 'domcontentloaded' })
    await page.locator('#h-sponsors').waitFor({ timeout: 30000 })
    await page.locator('#h-sponsors').scrollIntoViewIfNeeded()
    const base = await page.locator('#h-sponsors img').count()
    record(`V26.3 (${view}) Sin aliados con logo se ven los patrocinadores de siempre`, base > 0 && (await page.locator('#h-sponsors [data-ally="true"]').count()) === 0, `imgs=${base}`)
    items = [{ name: 'Taller Aliado Prueba', logo_url: logo, code: 'TLR-ABCDE' }]
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await page.locator('#h-sponsors [data-ally="true"]').first().waitFor({ timeout: 8000 }).catch(() => {})
    const first = page.locator('#h-sponsors img').first()
    const alt = await first.getAttribute('alt')
    const after = await page.locator('#h-sponsors img').count()
    record(`V26.3b (${view}) El logo del aliado toma la primera posición sin recargar y no crece la franja`, alt === 'Taller Aliado Prueba' && after === base, `alt=${alt} antes=${base} despues=${after}`)
    record(`V26.3c (${view}) El logo del aliado enlaza a su ficha pública`, (await page.locator('#h-sponsors a[href="/taller/TLR-ABCDE"]').count()) > 0)
    await shot(page, `26-3-aliados-${view}`)
    record(`V26.3 (${view}) Sin scroll horizontal`, !(await hOverflow(page)))
    await ctx.close()
  }
})
await run('V27.1', async () => {
  const logoFile = process.env.LOGO_FILE            // PNG real de prueba (p. ej. 600x240 con margen blanco), generado aparte
  if (!logoFile) { record('V27.1 Logo del taller desde el panel lateral', false, 'falta LOGO_FILE'); return }
  for (const view of ['desk', 'mob']) {
    const ctx = await ctxFor(view, 'taller')
    const page = await ctx.newPage()
    await page.goto(`${BASE}/app/negocio`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Empezar' }).click({ timeout: 25000 }).catch(() => {})
    await page.locator('[title="Perfil y configuración del taller"]').first().click({ timeout: 40000 })
    const dlg = page.getByRole('dialog', { name: 'Perfil y configuración del taller' })
    await dlg.waitFor()
    record(`V27.1 (${view}) El panel muestra el campo Logo con su botón para subir o cambiar`, (await dlg.getByText(/^(Subir|Cambiar) logo$/).count()) === 1)
    // Rechazo claro: imagen minúscula
    await dlg.locator('input[type=file][accept="image/png,image/jpeg,image/webp"]').setInputFiles({ name: 'chico.png', mimeType: 'image/png', buffer: makePng(40, 40, [200, 30, 30]) })
    await dlg.getByText(/muy pequeño/).waitFor({ timeout: 15000 }).catch(() => {})
    record(`V27.1 (${view}) Un logo demasiado pequeño se rechaza con un mensaje claro`, (await dlg.getByText(/muy pequeño/).count()) === 1)
    await dlg.locator('input[type=file][accept="image/png,image/jpeg,image/webp"]').setInputFiles(logoFile)
    await dlg.getByText('Logo guardado.').waitFor({ timeout: 30000 }).catch(() => {})
    const saved = await dlg.getByText('Logo guardado.').count()
    await page.waitForTimeout(800)
    const inPanel = await dlg.locator('img[alt^="Logo de"]').count()
    const inTopbar = await page.locator('.topbar-profile img').count()
    await shot(page, `27-1-logo-panel-${view}`)
    record(`V27.1 (${view}) Al subir el logo se guarda y aparece en el panel lateral (campo y cabecera) y en el botón de perfil`, saved === 1 && inPanel >= 2 && inTopbar === 1, `saved=${saved} panel=${inPanel} topbar=${inTopbar}`)
    const pub = await (await fetch(`${BASE}/api/workshops/${FIX.users.taller.code}`)).json()
    record(`V27.1 (${view}) La ficha pública recibe el logo`, /^\/api\/upload\/files\//.test(pub.logo_url || ''), pub.logo_url)
    record(`V27.1 (${view}) Sin scroll horizontal`, !(await hOverflow(page)))
    if (view === 'mob') {
      await dlg.getByRole('button', { name: 'Quitar' }).click()
      await dlg.getByText('Logo quitado.').waitFor({ timeout: 15000 }).catch(() => {})
      const gone = await (await fetch(`${BASE}/api/workshops/${FIX.users.taller.code}`)).json()
      record('V27.1 "Quitar" borra el logo (el perfil público deja de mostrarlo)', !gone.logo_url, gone.logo_url)
    }
    await ctx.close()
  }
})
await run('V25.3', async () => {
  const real = await (await fetch(`${BASE}/api/workshops/${FIX.users.taller.code}`)).json()
  const data = { ...real, name: 'Taller Prueba Visual', slogan: 'Frenos y suspensión', description: 'DESCRIPCION-QUE-NO-SE-VE', address: 'Calle 15 # 10-20', city: 'Duitama', phone: '311 456 7890', email: 'contacto@tallerprueba.co', business_hours: 'Lun-Sáb 8:00-18:00',
    social_whatsapp: '3114567890', social_instagram: '@tallerprueba', social_facebook: 'https://facebook.com/tallerprueba', social_website: 'tallerprueba.co',
    rating: 4.3,
    reviews: [
      { id: 'r1', workshop_id: 'x', client_name: 'Ana Gómez', rating: 5, review_date: '2026-09-02', comment: 'Excelente servicio, me explicaron todo el diagnóstico.', vehicle_model: 'Mazda 3 2021', is_verified_client: true, manager_response: 'Gracias Ana, te esperamos.', created_at: '2026-09-02T10:00:00Z' },
      { id: 'r2', workshop_id: 'x', client_name: 'Luis Pardo', rating: 4, review_date: '2026-08-11', comment: 'Buen trabajo.', vehicle_model: 'Renault Duster', is_verified_client: false, manager_response: '', created_at: '2026-08-11T10:00:00Z' } ] }
  for (const view of ['desk', 'mob']) {
    const ctx = await ctxFor(view, null)
    const page = await ctx.newPage()
    await page.route(`**/api/workshops/${FIX.users.taller.code}`, r => r.fulfill({ json: data }))
    await page.goto(`${BASE}/taller/${FIX.users.taller.code}`, { waitUntil: 'domcontentloaded' })
    await page.getByText('Taller Prueba Visual').first().waitFor({ timeout: 30000 })
    await settle(page, 1200)
    const b = await text(page)
    await shot(page, `25-3-ficha-taller-${view}`)
    record(`V25.3 (${view}) Ficha pública: sin "Nuestro equipo" ni descripción; con Contacto (dirección, teléfono, WhatsApp, correo, horario, web y redes)`,
      !/Nuestro equipo/i.test(b) && !/DESCRIPCION-QUE-NO-SE-VE/.test(b) && /contacto/i.test(b) && /contacto@tallerprueba\.co/.test(b) && /Lun-Sáb/.test(b) && /311 456 7890/.test(b)
        && (await page.locator('a[target=_blank][href^="https://wa.me/57"]').count()) === 1 && (await page.locator('a[target=_blank][href*="instagram.com/tallerprueba"]').count()) === 1
        && (await page.locator('a[target=_blank][href*="facebook.com/tallerprueba"]').count()) === 1 && (await page.locator('a[target=_blank][href="https://tallerprueba.co"]').count()) === 1, b.slice(0, 200))
    await page.getByRole('button', { name: /reseñas/ }).first().click()
    await page.waitForTimeout(500)
    const m = await page.getByRole('dialog').innerText()
    await shot(page, `25-4-ficha-resenas-modal-${view}`)
    record(`V25.4 (${view}) Al tocar las reseñas se abre un modal con promedio, comentarios, cliente verificado y respuesta del taller`, /excelente servicio/i.test(m) && /respuesta del taller/i.test(m) && /cliente verificado/i.test(m) && /4\.3/.test(m) && /Luis Pardo/.test(m), m.slice(0, 160))
    await page.getByRole('button', { name: 'Cerrar reseñas' }).click()
    record(`V25.4b (${view}) El modal se cierra con su botón`, (await page.getByRole('dialog').count()) === 0)
    record(`V25.3 (${view}) Sin scroll horizontal`, !(await hOverflow(page)))
    await ctx.close()
  }
})
await run('V25.5', async () => {
  const ctx = await ctxFor('desk', null)
  const page = await ctx.newPage()
  await page.route('**/api/workshop-applications/public-map', r => r.fulfill({ json: { items: [] } }))
  await page.goto(`${BASE}/taller`, { waitUntil: 'domcontentloaded' })
  const foot = page.locator('footer').first()
  await foot.waitFor({ timeout: 30000 })
  await foot.scrollIntoViewIfNeeded()
  await page.waitForTimeout(800)
  await shot(page, '25-5-pie-redes-desk')
  const ig = foot.locator('a[aria-label="Instagram de CarLink"]'), fb = foot.locator('a[aria-label="Facebook de CarLink"]')
  const colors = await Promise.all([ig, fb].map(l => l.evaluate(el => getComputedStyle(el).color)))
  record('V25.5 Pie de página: solo Instagram y Facebook (sin el ícono de WhatsApp) con los colores de CarLink (dorado)',
    (await ig.count()) === 1 && (await fb.count()) === 1 && (await foot.locator('a[href^="https://wa.me"] svg').count()) === 0 && colors.every(c => c === 'rgb(245, 197, 24)'), colors.join(' | '))
  const landing = await page.locator('canvas').count()
  record('V25.6 La estela/fondo animado sigue en la landing', landing >= 1, `canvas=${landing}`)
  await ctx.close()
  const ctx2 = await ctxFor('desk', 'taller')
  const app = await ctx2.newPage()
  await app.goto(`${BASE}/app/negocio`, { waitUntil: 'domcontentloaded' })
  await app.getByText('Código de alianza', { exact: true }).first().waitFor({ timeout: 30000 })
  await settle(app, 1000)
  const canvasNegocio = await app.locator('canvas').count()
  await app.mouse.move(300, 300); await app.mouse.move(700, 500, { steps: 12 })
  record('V25.6b La estela amarilla ya no está en el panel de negocio (sin canvas de partículas)', canvasNegocio === 0, `canvas=${canvasNegocio}`)
  await ctx2.close()
})

/* texto legal v2.5 */
await run('V22.1', async () => {
  const ctx = await ctxFor('desk', null)
  const page = await ctx.newPage()
  await page.goto(`${BASE}/taller`, { waitUntil: 'domcontentloaded' })
  await settle(page, 1500)
  await page.getByText('Uso, Planes y Espacio').first().click({ timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(1500)
  const body = await text(page)
  await shot(page, '22-1-terminos-desk')
  record('V22.1 Terminos de uso: version 2.6, sección 3 y 3A de alianza, RTM y consignación', /2\.6/.test(body) && /3A\. código de alianza/i.test(body) && /talleres y empresas/i.test(body) && /centros de diagnóstico automotor/i.test(body), body.slice(0, 160))
  await ctx.close()
})

await browser.close()
const bad = results.filter(r => !r.ok)
fs.writeFileSync(path.join(OUT, 'resultados.json'), JSON.stringify(results, null, 1))
console.log(`\n${results.length - bad.length} de ${results.length} comprobaciones visuales OK` + (bad.length ? `; FALLARON: ${bad.map(b => b.id).join(' | ')}` : ''))
process.exit(bad.length ? 1 : 0)
