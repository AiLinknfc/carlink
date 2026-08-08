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

Usá la skill `capture-thinking` cuando el usuario revele un patrón de razonamiento reusable (no
solo una instrucción puntual) — ver `.claude/skills/capture-thinking/SKILL.md`.
