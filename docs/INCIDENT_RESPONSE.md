# CarLink — Respuesta a incidentes críticos de producción

_Creado 2026-08-12, a partir del incidente real de llaveros NFC asociados al vehículo equivocado
(ver `docs/PENDIENTES.md` → Prioridad alta #4) y del QR de llaveros con URL rota desde que existe
esa feature. Este documento existe para no tener que improvisar el protocolo cada vez — el próximo
incidente va a tener esta misma forma._

## Contexto que hace esto distinto de un bug común

- `local`, `staging` y `producción` comparten la misma Supabase — no hay ambiente separado donde
  "romper cosas gratis". Cualquier verificación con datos reales toca la base real.
- No hay CI que corra tests antes de deployar — el gate es este protocolo, no una pipeline.
- Hay artefactos físicos irreversibles en juego (chips NFC ya grabados, QR ya impresos) — un dato
  mal corregido en la base puede dejar un objeto físico real inservible.
- Sesiones como esta son la única revisión que existe — no hay otro par de ojos antes de producción.

## Qué cuenta como "crítico" acá

Al menos una de estas: afecta a un usuario real ahora mismo, involucra un objeto físico ya
entregado/grabado (llavero NFC, QR impreso), puede perder o corromper datos, o es un hueco de
seguridad (alguien puede escribir/leer algo que no le corresponde).

## Protocolo

1. **No tocar nada hasta reproducir con datos reales.** Ni código ni base de datos. Leer primero:
   código real (no memoria de cómo "debería" funcionar) + consulta de solo lectura contra la DB
   real para confirmar el estado actual, no el que se espera.
2. **Diagnosticar con evidencia, no con la primera hipótesis que calce.** Si el usuario da una
   corrección a mitad de camino ("en realidad no estoy seguro"), es señal de frenar y pedir un dato
   verificable (una foto, un escaneo, un id) en vez de seguir con la hipótesis anterior. Ver
   ejemplo real: la primera hipótesis del vehículo equivocado resultó ser la correcta, pero se
   confirmó con un round adicional de preguntas antes de escribir en la base — no alcanzaba con
   "el usuario ya lo dijo una vez".
3. **Si hace falta corregir datos de producción**:
   - Identificar la fila exacta por su id, nunca por un `WHERE` amplio.
   - Si hay cualquier ambigüedad sobre qué fila/valor es el correcto, confirmar con el usuario antes
     de escribir — aunque parezca obvio. Un `UPDATE` a un dato equivocado en este proyecto puede
     significar un llavero físico inservible para siempre.
   - El `UPDATE` más chico y reversible posible — nunca aprovechar para "de paso" arreglar algo
     más. Anotar el valor viejo en la salida del comando antes de sobreescribirlo.
   - Verificar el resultado con una lectura aparte inmediatamente después, no asumir que el
     `UPDATE` hizo lo esperado.
4. **Corregir la causa raíz en código, no solo el síntoma de este usuario.** El dato de un usuario
   puntual se arregla aparte del bug que lo causó — los dos son necesarios, ninguno reemplaza al
   otro.
5. **Antes de pushear, en este orden**:
   - `tsc --noEmit` / `vitest run` (regresión rápida, no prueba el fix en sí).
   - E2E desechable contra la DB real cuando el fix toca backend: usuario(s) reales de Supabase
     Auth vía Admin API, `get_current_user` mockeado (bypassea JWT), `get_db` real — nunca contra
     una base mockeada. Limpieza completa al final, verificada con una lectura aparte (cero
     residuo).
   - Si el usuario reinició sus servidores locales, probar el fix específico contra ellos ya
     reiniciados — no asumir que siguen corriendo el código viejo, y no asumir tampoco que porque
     funciona en el código fuente ya funciona en el proceso corriendo.
   - Si el fix apunta a un dominio de producción real (ej. una regla de rewrite, una URL pública),
     probarlo contra ese dominio real con `curl` antes de dar el visto bueno — no alcanza con que
     funcione en `localhost`.
6. **Pushear solo con autorización explícita y fresca de esta sesión** (regla dura ya existente,
   `CLAUDE.md`). Después del push, confirmar que el deploy aterrizó de verdad: health check con
   número de versión, o un smoke test puntual del endpoint/página específico que se arregló — no
   dar el incidente por cerrado solo porque el `git push` no dio error.
7. **Documentar en los lugares de siempre** — `docs/PENDIENTES.md` si algo queda pendiente,
   `docs/CONTEXTO.md` si cambia arquitectura o estado de producción. Nunca un doc nuevo por
   incidente (salvo este mismo documento, que es el protocolo en sí, no un log de incidentes).

## Si el fix rompe algo más (rollback)

- Código: `git revert` del commit puntual + push — más rápido y más seguro que tratar de
  "arreglar el arreglo" bajo presión.
- Datos: por eso el paso 3 pide anotar el valor viejo antes de sobreescribir — sin eso, no hay
  vuelta atrás limpia.
