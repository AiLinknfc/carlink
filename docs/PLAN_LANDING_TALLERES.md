# Plan — Landing `/taller` para captar talleres y proveedores (2026-09-20)

_Estado: PLAN, sin implementar. Decisiones abiertas al final. Pendientes derivados: `docs/PENDIENTES.md`._

## Objetivo
Convertir la landing secundaria actual (`/shop`, hoy enfocada en el llavero para conductores) en
`/taller`: una página para compartir directamente con talleres, proveedores de repuestos y otros
negocios del sector, cuyo fin es **postularse a la red** (formulario con datos básicos, NIT y logo,
queda "en espera de aprobación"). La landing principal `/` sigue siendo la del conductor y
referente del modelo de negocio del llavero; esta es complementaria.

Hechos verificados que condicionan el plan:
- `/taller/[code]` ya existe (ficha pública de un taller). `/taller` (índice) convive sin conflicto.
- El registro real de un taller ya existe (`POST /workshops`, requiere cuenta, valida NIT con
  dígito verificador, `/register?mode=empresa`). La postulación NO lo reemplaza: es el embudo
  previo, sin cuenta.
- `POST /upload` exige sesión, así que la postulación necesita su propio upload público y acotado.
- `waitlist_leads` solo guarda un contacto; no sirve para un formulario con logo y NIT.
- Enlaces a `/shop`: pie de `LandingSections.tsx` (6), `sitemap.ts`, `public/llms.txt`,
  `shop/layout.tsx` (metadata/OG) y JSON-LD de la página. `OrdersClient`/`CartDrawer` apuntan a
  `/shop` y `/shop/checkout` (esta última ruta no existe hoy: deuda previa).

## Estructura de la nueva página (de arriba a abajo)
| # | Sección | Acción |
|---|---------|--------|
| 1 | Nav | Adaptar: enlaces a anclas de la página; CTA "Postular mi taller" |
| 2 | Hero | **Conservar la animación** (teléfono + dash-cards + NFC flotante); nuevo copy y contenido de las tarjetas (clientes, órdenes, próximo servicio) |
| 3 | El problema | Reescribir con problemas de taller: clientes que no vuelven, garantías discutidas, papelería, sin prueba del trabajo |
| 4 | Beneficios | Reescribir: fidelización, garantía respaldada por el registro, certificados y facturación, visibilidad en la red, reseñas |
| 5 | Cómo funciona | Nuevo: 1 postulas, 2 validamos NIT, 3 activas tu panel (prueba de 7 días), 4 registras servicios escaneando |
| 6 | Qué incluye el panel | Reusar el bloque "Qué incluye": clientes, órdenes, inventario, citas, rentabilidad, documentos, diagnóstico IA, perfil público |
| 7 | **Ubicación y cobertura** | **Igual** |
| 8 | Planes | Adaptar: tarjeta "Taller aliado" al frente (más el gratis del conductor como complemento) |
| 9 | **Respaldo** (marcas + KPIs) | **Igual** |
| 10 | **Vehículos certificados** (+ vista previa) | **Igual** |
| 11 | Prueba social | Quitar los testimonios de conductores; volver cuando haya testimonios reales de talleres |
| 12 | **Postulación** (`#registro`) | **Nueva, es la conversión.** Reemplaza "CTA final" y "Captura de leads" |
| 13 | FAQ | Reescribir para talleres (costo, cuánto tarda la aprobación, qué datos piden, quién ve los datos de mis clientes, logo, cancelar) |
| 14 | Pie | Mantener; agregar "¿Eres conductor? Compra tu llavero" hacia `/` |

**Se eliminan**: Guía PDF (ya está en la otra landing), "Compra tu llavero", precio/caja del llavero,
"Confianza" (revisar contenido antes; si es de conductor, fuera), "Regalo gratis en PDF", CTA final
y captura del "próximo lote" (los reemplaza la postulación).

## Formulario de postulación
Campos (\* obligatorios):
- Tipo de negocio\*: mecánica general, latonería y pintura, llantas y alineación, eléctrico,
  lubricentro, tecnicentro multimarca, proveedor de repuestos, otro
- Nombre comercial\*, razón social, **NIT\*** (validar dígito verificador con la misma regla que
  `colombian_nit.py`)
- Ciudad\*, dirección\*
- Nombre y cargo del contacto\*, WhatsApp/teléfono\*, correo\*
- Sitio web / Instagram, especialidades, tamaño (rango de servicios al mes)
- **Logo\*** (PNG/JPG/WebP, máx. 2 MB), foto de fachada (opcional), Cámara de Comercio o RUT en PDF
  (opcional, acelera la validación)
- Consentimientos separados: tratamiento de datos (obligatorio, con versión del texto legal) y
  **autorización de uso del logo** en la red y la web (necesaria para aparecer en "Respaldo")
- Anti-spam: campo trampa oculto + límite por IP

## Backend
1. **Migración `062_workshop_applications.sql`** (aditiva; la base es compartida, regla 4):
   `workshop_applications` con los campos de arriba, `status` (`pending|contacted|approved|rejected`),
   `admin_notes`, `reviewed_at`, `consent_version`, `logo_authorized`, `created_at`; índice por
   estado y por NIT normalizado; RLS activado sin políticas (como `analytics_events`).
2. `POST /workshop-applications` público: rate limit por IP (patrón de analytics), NIT válido,
   422 con códigos legibles, 409 amable si el NIT ya es un taller registrado, idempotente si ya hay
   una pendiente con ese NIT. Correo al admin y acuse al postulante (best-effort, como
   `job_applications`).
3. `POST /workshop-applications/upload` público y acotado: solo PNG/JPG/WebP y PDF (**sin SVG**, por
   XSS al servirse desde el mismo dominio), verificar tipo real del contenido, máx. 2 MB imagen /
   5 MB PDF, prefijo `applications/`, límite por IP. Esos archivos no cuentan para ningún cupo de
   usuario.
4. Admin: `GET /admin/workshop-applications`, `PATCH .../{id}` (estado y notas). Sin crear cuentas
   automáticamente.

## Admin
Pestaña "Postulaciones" en `/admin`: lista con filtros por estado y ciudad, vista de logo y
documentos, botones Contactado / Aprobar / Rechazar y notas. **Aprobar** envía un correo con el
enlace a `/register?mode=empresa` (el taller crea su cuenta y ahí se valida de verdad).

## Fase posterior (no incluida)
Alimentar la sección "Respaldo" con los logos de talleres aprobados que autorizaron su uso
(endpoint público de solo lectura + carrusel). Por ahora "Respaldo" queda tal cual.

## Legal
- Subir `legalContent.ts` a v2.1: apartado de **postulantes** (datos, finalidad, plazo de
  conservación — sugerido borrar rechazadas a los 12 meses), y autorización de uso de logo/marca.
- Guardar `consent_version` y fecha en cada postulación (prueba de autorización ante la SIC).
- **Riesgo a revisar con el abogado (sección Respaldo, que se conserva):** muestra logos de Terpel,
  Mobil 1, Shell, Castrol, Michelin y SURA como "marcas y aliados que confían en CarLink", y cifras
  fijas (4.8/5, 23+ talleres, 342 llaveros, 10 ciudades). Si no son aliados reales o las cifras no
  son verificables, es publicidad engañosa (Ley 1480) y uso de marca ajena. Se deja igual por
  pedido, pero conviene confirmarlo antes de compartir el enlace con proveedores.

## Ruta, enlaces y SEO
1. Mover `app/(public)/shop/` a `app/(public)/taller/` (`page.tsx` + `layout.tsx`); `taller/[code]`
   no se toca.
2. `/shop` → redirección permanente (recomendado a `/`, donde vive la compra del llavero) en
   `next.config`; así no se rompen enlaces ya compartidos.
3. Actualizar: pie de `LandingSections.tsx` (Planes, Para talleres, Cómo funciona, FAQ; quitar
   "Tienda NFC"/"Llavero NFC" o apuntarlos a `/`), `sitemap.ts`, `llms.txt`, metadata/OG y JSON-LD
   (título orientado a talleres, FAQ nuevas).
4. Analítica: eventos `taller_form_start` y `taller_form_submit` con la utilidad `track()` y UTM
   para saber qué canal trae postulaciones.

## Orden de ejecución y verificación
1. Decisiones abiertas (abajo).
2. Backend + migración (aplicar a la Supabase real, verificar con consulta directa) + tests.
3. Mover ruta + redirección + enlaces internos.
4. Reescritura de la landing (hero con animación, secciones nuevas, las tres intactas).
5. Formulario + upload + eventos de analítica.
6. Pestaña de admin.
7. Textos legales v2.1.
8. Suite 8 en `docs/PRUEBAS_FUNCIONALES.md` y prueba real: POST desde local con `curl`, ver la fila
   en la base y en admin, borrar el residuo. Sin `npm run build` en el `frontend/` vivo.
9. Push solo con autorización explícita.

## Decisiones abiertas
1. `/shop` tras el cambio: ¿redirigir a `/` (recomendado) o dejar una página mínima?
2. ¿Se muestra el precio **$79.900/mes** del taller? Hoy no hay cobro implementado y el modelo de
   negocio habla de prueba de 7 días y luego plan; hay que confirmar qué se promete.
3. Tipos de negocio que se aceptan (¿proveedores de repuestos entran a la misma red o a una aparte?).
4. ¿Qué pasa al aprobar: solo correo con enlace de registro (propuesto) o algo más?
5. Plazo de respuesta que se promete en la página (p. ej. "en 2 días hábiles").
