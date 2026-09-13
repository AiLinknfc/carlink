# CarLink — instrucciones para Claude Code

Antes de trabajar en algo no trivial, leé lo que aplique:

- `docs/CONTEXTO.md` — arquitectura actual, qué está en producción, stack.
- `docs/PENDIENTES.md` — **única** lista de pendientes del proyecto (no crear otra en ningún doc
  nuevo ni viejo — si algo queda pendiente, agregalo ahí y enlazá desde donde corresponda).
- `docs/ARCHITECTURE.md` — modelo de datos de servicio/kilometraje/partes.
- `docs/DESIGN_GUIDELINES.md` — sistema visual (tipografía, colores, espaciado) **y la regla de
  sin emojis en la interfaz**, ver abajo.
- `docs/DEPLOY.md` — cómo se despliega, gotchas conocidos, cómo confirmar que un deploy aterrizó.
- `docs/SECURITY.md` — qué no hardcodear, incidente de credenciales de 2026-07-27.
- `docs/INCIDENT_RESPONSE.md` — protocolo para bugs críticos de producción (datos reales de por
  medio, objetos físicos irreversibles como llaveros NFC/QR). Leer **antes** de tocar cualquier
  dato de producción, no después.
- Los `docs/PLAN_*.md` — historial detallado de features grandes ya construidas (fase por fase, con
  qué se verificó) — leer solo si necesitás el detalle de cómo se construyó algo específico.

## Reglas duras (no pedir confirmación, ya están decididas)

1. **Nunca hacer `git push` sin autorización explícita y fresca del usuario en la sesión actual.**
   Autorización de una sesión anterior no cuenta. Commits locales sí están bien.
2. **Nunca usar emojis en la interfaz de la app** (componentes de `frontend/src`, texto generado
   que se muestre al usuario). Sí está bien usarlos en `docs/*.md` como notación de estado
   (✅/❌/🔴 en tablas/checklists). Detalle completo en `docs/DESIGN_GUIDELINES.md`.
3. **Verificar contra sistemas reales, no solo revisión de código** — `curl`/logs/consultas
   directas a la DB antes de dar algo por arreglado o desplegado. Este proyecto ya tuvo pendientes
   fantasma (cosas dadas por "sin hacer" que en realidad ya estaban en producción, y viceversa)
   por confiar en lo que decía la documentación en vez del estado real.
4. `local`, `staging` y `producción` comparten la misma base de Supabase — no asumas que un cambio
   de esquema es "solo local".
5. **Bug crítico de producción → seguir `docs/INCIDENT_RESPONSE.md` de punta a punta**, no
   improvisar el protocolo cada vez. En particular: verificar el fix contra el proceso local ya
   reiniciado (o el dominio real con `curl`) antes de pedir/dar el push — que compile y pase
   tsc/vitest no es lo mismo que haber probado el fix en sí.
6. **Nunca publicar un Artifact (preview visual, landing, mockup, etc.) sin que el usuario lo haya
   pedido explícitamente.** Si armar uno ayudaría (ej. mostrar un cambio visual antes de
   desplegarlo), preguntar primero qué se va a mostrar y esperar el OK — no publicar y avisar
   después (2026-09-11: se publicó una preview sin pedirla; el usuario aclaró que decide él si
   quiere ese tipo de página, no algo que se ofrece solo). Nota aparte: el Artifact tool no tiene
   acción para borrar/despublicar algo ya publicado — si hay que revertir uno, hay que decírselo al
   usuario en vez de asumir que se puede deshacer.

Usá la skill `capture-thinking` cuando el usuario revele un patrón de razonamiento reusable (no
solo una instrucción puntual) — ver `.claude/skills/capture-thinking/SKILL.md`.

### Patrones de razonamiento capturados

#### Protocolo de incidentes antes que velocidad (2026-08-12)
**Contexto**: autorizó un push de dos fixes críticos (NFC vehicle_id + QR roto) y, ya dado el visto
bueno, dijo explícitamente que sabía que pushear sin probar en local no era correcto, y que este
tipo de incidente ("bug crítico en producción, con datos/objetos físicos reales de por medio") va a
repetirse seguido — pidió establecer de antemano un plan, no resolverlo ad hoc cada vez.
**Patrón**: cuando el usuario da luz verde bajo presión ("dale, pusheá") pero el tipo de situación
es repetible, no basta con ejecutar la instrucción puntual — hay que proponer (o ya tener) un
protocolo reusable para la próxima vez, y aplicarlo *antes* de ejecutar la instrucción actual si
todavía no se verificó lo suficiente, incluso después de tener el ok.
**Anti-patrón que previene**: tratar cada incidente crítico como un caso aislado que se resuelve
con velocidad y buena voluntad, en vez de con un checklist fijo — lleva a saltarse pasos de
verificación bajo presión de tiempo, justo cuando más importan.

## Patrones de diseño responsive

- Usar `data-r="nombre"` para targeting CSS en componentes con inline styles — ver `docs/DESIGN_GUIDELINES.md` → "Responsive Design Patterns"
- Para overlap entre secciones, usar `@media(max-height)` además de width — el hero landing y
  "Cómo funciona" ya lo aplican
- Agregar `className` hooks en componentes que usen inline styles pero necesiten responsive CSS
  (CartDrawer, CheckoutClient, OrdersClient)
