# Plan: patentabilidad NFC — investigación, giro de estrategia y pasos a futuro

_Creado: 2026-09-14, a partir de una consulta del usuario sobre si el mecanismo de activación
NFC de CarLink es patentable. Documenta la investigación de prior art hecha en esta conversación,
por qué el ángulo original (hash de activación) es débil, el giro de estrategia hacia un
mecanismo más defendible, y los pasos concretos a seguir. Ver `docs/CONTEXTO.md` → "Arquitectura
del llavero NFC" para cómo funciona el sistema hoy en producción; este documento no repite esa
descripción, la asume conocida._

## 0. Alerta que originó este giro: inconsistencia en los decks

`docs/PRESENTATION_FUNDRAISING.md` y `docs/PRESENTATION_M_AND_A.md` ya afirman **"Patent-pending:
token provisioning + activation code + QR short + trial logic"** y traen un ítem de checklist
**"Patente NFC protocol: PCT filed, priority date secured"**.

**Esto no es cierto todavía** — no se presentó ninguna solicitud, y la investigación de esta
sesión encontró prior art denso sobre casi toda esa arquitectura (sección 2). Un inversor o un
comprador de M&A corre su propia búsqueda de prior art antes de cerrar; mostrar "patent-pending"
sin nada presentado es una representación que no se sostiene en due diligence.

**Acción pendiente, no ejecutada todavía**: corregir esas dos frases en los decks antes de
mostrarlos a cualquier tercero real (inversor, comprador, banco). Reemplazar por algo verificable
("arquitectura propia, evaluación de patentabilidad en curso") hasta que haya una solicitud real
presentada. Registrado también en `docs/PENDIENTES.md` (Prioridad media, ítem 12e) para que no se
pierda.

## 1. Por qué el ángulo original (hash de activación) es débil

El mecanismo actual — token crudo en el chip + código de activación separado impreso + solo se
guarda el hash de cada uno + reclamo atómico rate-limited — es una arquitectura de seguridad
sólida y correcta para lo que resuelve, pero **no es novedosa** a nivel de patente. La industria
de gift cards / tarjetas prepago resolvió exactamente este patrón hace más de una década.

## 2. Prior art encontrado (investigación no profesional, ver limitaciones en §6)

| Patente | Relevancia | Qué cubre | Estado legal | Verificado a fondo |
|---|---|---|---|---|
| [US20160132871A1](https://patents.google.com/patent/US20160132871A1/en) | **Muy alta** | Código dividido en look-up identifier + secure code; solo se guarda hash HMAC del secure code en índice separado — casi idéntico al `activation_code_hash`/`token_hash` de CarLink | Abandonada 2017 (igual cuenta como prior art publicado) | Sí, texto completo |
| [EP1103140A1](https://patents.google.com/patent/EP1103140A1) | **Alta** | "Range Batch Activation" — revendedor activa lotes de tarjetas prepago con cupo — análogo directo al modelo de partners de CarLink | Sin verificar | No, solo snippet |
| [US12,014,237](https://patents.google.com/patent/US12014237) | Alta | Dos identificadores (NFC + QR de empaque) que se cruzan para reclamar un producto a una cuenta | Otorgada 2024 | Sí (parcial) |
| [US12,001,906B2](https://patents.google.com/patent/US12001906) | Media-alta | Tag NFC en vehículo → recupera historial de propiedad de un ledger distribuido. Territorio activo "NFC + vehículo + historial escaneable" | **Activa, vence 2038** | Sí, texto completo |
| [US20200125908](https://patents.google.com/patent/US20200125908) | Media-alta | Status code irreversible en tag NFC (no reclamado → reclamado) | Solicitud publicada | Sí (parcial) |
| [US20210166247A1](https://patents.google.com/patent/US20210166247A1/) (HP) | Media | Transferencia de propiedad de activos codificando un "fingerprint" con hash; aplica a vehículos como ejemplo, sin NFC/QR | Abandonada 2021 | Sí, texto completo |
| [US10807766](https://patents.google.com/patent/US10807766) | Media | Empaque con chip RF asociado a cuenta de usuario | Sin verificar | No |
| US8275712B2 / US8275713B2, US11,205,175 / US10,223,694, US9,426,659 | Media | Activación de tarjeta prepago / pagos móviles con secreto compartido | Sin verificar | No |
| CN106355418A / CN106408314A | Media | Anti-falsificación NFC (tag destructible / código de verificación dinámico) | Sin verificar | No, solo abstract traducido |
| MyLime "Automotive Blockchain®" | Desconocida | Se anuncian como "patentados" en su propio marketing | **No se pudo confirmar número de patente** | No |

**Veredicto**: entre US20160132871A1 (hash-split) y EP1103140A1 (batch activation por
revendedor) queda cubierta casi toda la arquitectura de seguridad de CarLink. Lo único no
encontrado ya resuelto tal cual es la combinación específica aplicada al dominio vehículo +
ficha pública que oculta al dueño + binding a un recurso que el usuario ya posee — pero es un
claim angosto, con riesgo real de objeción por "obvious to try" (trasladar un mecanismo conocido
a un dominio nuevo sin dificultad técnica nueva).

## 3. El giro de estrategia: mover la patente de la plomería criptográfica a la capa de datos

Lo que no tiene antecedente encontrado en ningún lado del prior art de arriba es **calcular una
señal de fraude/confianza a partir de datos que CarLink ya verifica**, no la forma de activar un
llavero. Tres piezas ya construidas, nunca combinadas así:

- `backend/app/services/colombian_nit.py` — valida el NIT real (dígito de verificación DIAN) de
  un taller al registrarse. Cada evento de mantenimiento queda atribuido a una **entidad legal
  verificada**, no a un usuario cualquiera que dice "soy taller".
- `maintenance_records.mileage` — cada servicio registra kilometraje secuencial por vehículo
  (`docs/ARCHITECTURE.md`).
- El llavero NFC ata cada acceso/reclamo a `claimed_by`/`claimed_vehicle_id` con timestamp y
  hash verificable.

### Mecanismo propuesto (candidato a claim de patente)

> Método para calcular un score de confianza de un vehículo detectando inconsistencias de
> kilometraje (retroceso de odómetro, saltos imposibles dado el tiempo transcurrido entre
> eventos) cruzando eventos de mantenimiento atribuidos criptográficamente a proveedores con
> identidad legal verificada (NIT/DIAN u homólogo), ponderando cada evento según si la fuente es
> un taller verificado, un partner, o un dato autoreportado por el dueño.

Por qué es más defendible que el hash de activación:
1. Ningún prior art encontrado combina verificación de identidad legal del reportante +
   continuidad monotónica de kilometraje como señal de fraude computada automáticamente.
2. Es un método con efecto técnico concreto (un score calculado), no una regla de negocio o una
   forma de guardar un secreto — más cerca de lo que un examinador reconoce como materia
   patentable.
3. Es exactamente lo que `docs/PRESENTATION_FUNDRAISING.md` ya promete ("scoring para seguros",
   "IA predictiva") — formalizar el mecanismo real detrás de esa frase la vuelve verificable
   ante un inversor, no solo una promesa de slide.

### Complemento: log de auditoría encadenado por hash (hash-chain), no blockchain completo

Cada registro de mantenimiento/evento NFC incluye el hash del registro anterior de ese vehículo:

```
record_hash = SHA256(prev_hash + datos_del_evento)
```

Prueba matemáticamente que el historial no fue editado después de los hechos — **ni siquiera por
CarLink mismo** — sin nodos, sin gas fees, sin la complejidad de un blockchain real: una columna
más en Postgres. Se puede mostrar como sello público en la ficha ("historial verificado e
inmutable"), vendible directo a compradores de auto usado y aseguradoras.

## 4. Blockchain/keypair vs. hash simple vs. hash-chain — comparación

| | Blockchain/keypair (tipo US12,001,906) | Hash simple (lo que ya existe) | Hash-chain (propuesto) |
|---|---|---|---|
| Patentabilidad | Territorio activo y ocupado (jugador vigente hasta 2038) | Prior art casi calcado (gift cards) — muy débil | La combinación más abierta de las tres |
| Costo/complejidad | Alto — nodos o dependencia de chain de terceros, mantenimiento, posible gas fee | Bajo — ya está construido | Bajo — una columna más, sin infra nueva |
| Historia vendible a inversor/comprador | Sin verdad técnica real detrás, suena a buzzword | Invisible, no cuenta ninguna historia | "Nadie puede alterar el historial retroactivamente, ni nosotros" — demostrable en una demo |
| Sirve al negocio real (seguros, M&A) | Solo si un comprador institucional exige blockchain literal (raro) | No aporta nada por sí sola | Es la base técnica real del "scoring para seguros" y el "data moat" que el deck ya promete |

**Recomendación**: no ir a blockchain/keypair — es la opción que más "suena" a innovación pero
la que menos control patentable da (terreno ya ocupado por un jugador activo) y la que más
cuesta de mantener para un beneficio que no le importa al usuario real (dueño de auto o taller en
Colombia). El hash simple actual es correcto para lo que resuelve (activación) pero no es la
historia de defensibilidad. La palanca real es la capa de scoring/fraude + hash-chain descrita
en §3.

## 5. Pasos a futuro

1. **Corregir los decks** (`PRESENTATION_FUNDRAISING.md`, `PRESENTATION_M_AND_A.md`) — sacar
   "patent-pending"/"PCT filed" hasta que exista una solicitud real. Ver `docs/PENDIENTES.md`
   ítem 12e.
2. **Prototipo técnico del mecanismo de §3** — antes de gastar en abogado, construir una versión
   mínima: (a) columna `record_hash`/`prev_hash` en `maintenance_records`, (b) función de score
   que cruce `mileage` secuencial + `workshops.nit_verified` (o equivalente) + fuente del evento.
   Un mecanismo que ya corre en producción es mucho más fuerte para un claim de patente que uno
   solo descrito en un documento.
3. **Búsqueda de prior art profesional** sobre el mecanismo de §3 específicamente (no repetir la
   búsqueda de §2, que ya cubrió la parte de activación). Ver `docs/PATENTABILIDAD_NFC_PRIOR_ART.md`
   — pendiente de crear si se decide seguir esta vía — o directamente encargarla al abogado.
4. **Llevar el resumen técnico actualizado al abogado** (el de la activación NFC ya se armó en
   esta conversación — actualizarlo para incluir el mecanismo de §3 antes de la reunión, no
   llevar solo la parte de activación que ya sabemos que es débil).
5. **Decisión de fondo, con el abogado**: ¿patentar el mecanismo de §3, proteger todo como
   secreto comercial, o ambos (patentar la parte de scoring, secreto comercial para el resto)?
   No ejecutar nada de esto sin esa conversación.

## 6. Limitaciones de esta investigación (quién debería profundizar y en qué)

- No se leyeron a texto completo los PDF de USPTO en `image-ppubs.uspto.gov` (son escaneos que
  las herramientas de esta sesión no procesan) — pendientes de lectura completa: EP1103140A1,
  US10807766, US8275712B2/8275713B2, US11,205,175/US10,223,694, US9,426,659. Se leen gratis en
  [Google Patents](https://patents.google.com) o [patents.justia.com](https://patents.justia.com).
- No se usó USPTO Patent Public Search (ppubs.uspto.gov) con clasificación CPC — buscar por
  `G06K19/07` combinado con `B60R25` o `G06Q30` puede encontrar más.
- No se confirmó si MyLime tiene una patente real y qué cubre exactamente.
- No se hizo búsqueda de uso público anterior no patentado (ferias, pitch decks de competidores,
  productos ya en mercado) más allá de lo que indexa Google.
- No se hizo ninguna búsqueda de prior art sobre el mecanismo nuevo de §3 (scoring de fraude por
  proveniencia verificada) — es el paso 3 de la sección anterior, todavía no ejecutado.
- Ninguna de estas conclusiones reemplaza una búsqueda profesional paga (PatSnap, Innography,
  Derwent) ni la opinión de un abogado de patentes real.
