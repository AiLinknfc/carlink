# WhatsApp de soporte — mensajes de referencia

_Creado: 2026-09-11, antes de la primera campaña de publicidad._ Copy lista para pegar en
**WhatsApp Business App** (la app gratis, no la API — ver `docs/PENDIENTES.md` para por qué no se
recomienda saltar directo a un flujo automatizado todavía). Ruta en la app: **Configuración de la
empresa → Herramientas de empresa**.

No usar emoji en ningún mensaje que le llega al cliente — mismo criterio que el resto de la
interfaz (`docs/DESIGN_GUIDELINES.md`).

---

## Antes de pegar esto: un dato a decidir

`src/app/(public)/shop/page.tsx` (banner de WhatsApp) ya promete **"responde por WhatsApp en menos
de 2 minutos"** — si el mensaje de bienvenida de abajo promete horas, quedan dos promesas
contradictorias en la misma app. Elegí una de las dos antes de publicar:
- Si de verdad vas a estar respondiendo casi al instante durante la campaña → dejá el banner como
  está y ajustá el mensaje de bienvenida de abajo a ese mismo tiempo real.
- Si no podés garantizar 2 minutos con volumen de campaña activo → hay que bajarle la expectativa
  al banner del `/shop` también (no solo acá), para no prometer algo que no se sostiene el primer
  día de tráfico pago.

---

## 1. Mensaje de bienvenida

Se dispara automático la primera vez que alguien escribe, o después de 14 días sin contacto.

```
¡Hola! Gracias por escribirle a CarLink. Te respondemos en menos de [X] en horario laboral
(lunes a viernes, 8am–6pm). Contanos en qué te podemos ayudar y te contactamos apenas podamos.
```

Reemplazá `[X]` por el tiempo real que puedas sostener (ver nota de arriba).

## 2. Mensaje de ausencia

Se dispara fuera del horario que configures en la app.

```
Gracias por tu mensaje. En este momento estamos fuera de horario de atención
(lunes a viernes, 8am–6pm). Te respondemos apenas volvamos — si es sobre un pedido ya
pagado, dejanos el número de referencia para ubicarlo más rápido apenas te contestemos.
```

## 3. Respuestas rápidas (una por cada intent que ya trackeamos)

El texto precargado de cada botón de la app (ver `docs/PENDIENTES.md` → tracking de WhatsApp) ya
te dice de entrada con cuál de estos seis motivos estás hablando — no hace falta preguntarlo, solo
elegir la plantilla y completar el dato puntual.

**`cart_pay_whatsapp`** — coordina el pago por WhatsApp en vez de tarjeta/Nequi/PSE:
```
¡Gracias! Ya tengo tu pedido [referencia]. Para confirmar el pago, ¿me compartís el
comprobante de la transferencia? Apenas lo reciba, tu llavero pasa a preparación.
```

**`cart_plate_duplicate`** — el sistema le avisó que esa placa ya está registrada:
```
Hola, vi tu mensaje sobre la placa ya registrada. Para verificarlo necesito que me
confirmes: 1) la placa completa, 2) si ya tenés cuenta CarLink con esa placa o es la
primera vez que la registrás. Con eso te ayudo a resolverlo.
```

**`guide_phone_lead`** — dejó su celular pidiendo la Guía de Mantenimiento:
```
¡Hola! Acá tenés tu Guía de Mantenimiento Preventivo CarLink: [link al PDF]. Cualquier
pregunta sobre tu vehículo, quedo atento.
```

**`kit_order`** — pidió el Kit CarLink (hoy pausado — ver `docs/PENDIENTES.md`):
```
¡Hola! Gracias por tu interés en el Kit CarLink. Por ahora está en pausa mientras
ajustamos producción — el llavero individual sí está disponible ($29.900) si querés
avanzar con ese mientras tanto. Te aviso apenas el Kit esté de vuelta.
```

**`general_question`** — pregunta general sobre el producto:
```
¡Hola! Gracias por escribirnos. Contame tu pregunta sobre el llavero NFC CarLink y te
ayudo con gusto.
```

**`keychain_replacement`** — pide llavero de repuesto/duplicado (usuario ya logueado, adentro de la app):
```
¡Hola! Para el repuesto o duplicado necesito: 1) la placa del vehículo, 2) si el llavero
original se perdió o se dañó. Te cuento el proceso y el costo apenas me confirmes.
```

---

## Ver el volumen real durante la campaña

`GET /api/analytics/whatsapp-clicks/summary` (con sesión de admin) da el conteo total y por
`intent`/`source` — es el dato para decidir, con dos o tres semanas de campaña corriendo, si algún
motivo concentra tanto volumen que valga la pena automatizarlo con la API de WhatsApp Business en
vez de responder cada uno a mano. Detalle completo en `docs/PENDIENTES.md`.
