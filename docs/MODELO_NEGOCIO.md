# Modelo de Negocio — [Nombre de la App]

> Documento rector. La aplicación y todas las decisiones de producto,
> precios y acceso deben regirse por estas condiciones.
> Cualquier cambio requiere versión nueva de este documento.

---

## 1. Principios rectores

1. **Sostenibilidad primero.** La app tiene costes recurrentes (servidores,
   soporte, APIs, almacenamiento). Ningún modelo de acceso puede comprometer
   la viabilidad a largo plazo.
2. **Crecimiento con filtro.** Buscamos adopción rápida, pero no a costa de
   llenar la plataforma de empresas no constituidas o malintencionadas.
3. **Fricción escalonada.** La fricción se aplica solo cuando el usuario
   recibe valor real (trial premium, modo empresa, suscripción).
4. **Premiar a los primeros.** Los early adopters reciben beneficios
   especiales, pero definidos, limitados y por escrito.
5. **Transparencia.** El usuario siempre sabe qué incluye su plan, cuánto
   dura y qué pasa al terminar.

---

## 2. Tipos de usuario y modos

| Tipo | Modo | Acceso |
|------|------|--------|
| Persona natural | Persona | Básico / Premium |
| Empresa validada | Empresa | Trial / Suscripción |

- Un usuario puede empezar en modo Persona y solicitar cambio a modo Empresa.
- El modo Empresa **siempre** requiere validación previa y suscripción activa
  para mantener acceso premium.
- El modo Persona **nunca** da acceso a módulos de Empresa.

---

## 3. Producto físico

- Es el origen del proyecto y la fuente de financiación inicial.
- **No otorga acceso vitalicio ilimitado** a toda la app.
- Incluye beneficios definidos según el canal de compra (ver secciones 4 y 5).
- Los nuevos productos físicos que se lancen en el futuro seguirán las
  mismas reglas, salvo que este documento se actualice.

---

## 4. Modo Persona

### 4.1 Adquisición vía dispositivo físico

- **1 año de acceso Premium completo** desde la activación del dispositivo.
- Al terminar el año:
  - Si el usuario paga suscripción → mantiene Premium.
  - Si no paga → pasa automáticamente a **plan Básico permanente**.
- No hay reverse trial de 14 días en este caso: el año premium lo sustituye.
- El año premium es personal, no transferible y no revendible.

### 4.2 Adquisición vía web (sin dispositivo físico)

- **Reverse trial de 14 días** con acceso Premium completo.
- Al terminar los 14 días:
  - Si paga suscripción → mantiene Premium.
  - Si no paga → pasa a **plan Básico permanente**.
- Puede suscribirse en cualquier momento posterior para recuperar Premium.

### 4.3 Founder's Edition (primeros compradores)

- Aplica solo a una generación limitada y numerada de dispositivos físicos.
- Incluye **acceso perpetuo al plan Básico** del modo Persona.
- **No** incluye Premium perpetuo, **no** incluye modo Empresa y **no**
  incluye módulos futuros de pago.
- Sujeto a uso justo, no transferible, no revendible.
- Se documenta por escrito en el momento de la compra.

### 4.4 Regla general del reverse trial en modo Persona

- **Web:** 14 días Premium → Básico.
- **Dispositivo físico:** 1 año Premium → Básico o suscripción.
- **Founder's Edition:** Básico perpetuo + 1 año Premium incluido.

---

## 5. Modo Empresa

### 5.1 Validación previa (obligatoria antes del trial)

- Se solicita **NIT** y razón social en el registro.
- Se consulta automáticamente el **RUES** (vía Apify, Verifik o KYC).
- Condiciones de aceptación:
  - La empresa existe.
  - El estado de matrícula es **ACTIVA**.
  - El NIT coincide con la razón social.
- Si no pasa: no se otorga trial Empresa. Puede quedarse en modo Persona
  o en lista de espera.
- **Sin proceso administrativo manual.** Todo por API.

### 5.2 Validación de reputación (antes de la suscripción)

- Se ejecuta al finalizar el reverse trial, cuando el usuario quiere pagar.
- Fuentes: Interzoid (score de credibilidad), Trustpilot, Google Reviews,
  listas restrictivas.
- Umbral mínimo definido internamente (ej. score ≥ 60/99).
- Si no pasa: se rechaza la suscripción o se envía a revisión manual
  (solo excepciones).
- Revalidación periódica cada 6–12 meses.

### 5.3 Reverse trial Empresa

- Duración: **14 días** desde la validación exitosa.
- Incluye acceso completo a todos los módulos de Empresa.
- Al terminar:
  - Si paga suscripción mensual → mantiene acceso completo.
  - Si no paga → pasa a **estado restringido** (solo lectura o módulos
    mínimos). No se le expulsa, pero no puede operar con normalidad.
- Durante el trial se monitorea uso anómalo (exportaciones masivas,
  multicuentas, scraping).

### 5.4 Suscripción Empresa

- **Siempre mensual.** Sin excepciones.
- Requiere validación de reputación aprobada.
- El producto físico de Persona **no** da acceso al modo Empresa.
- Precio definido en la sección 7.

---

## 6. Reverse Trial: reglas generales

| Modo | Canal | Duración | Al terminar sin pago |
|------|-------|----------|----------------------|
| Persona | Web | 14 días | Básico permanente |
| Persona | Dispositivo físico | 1 año | Básico o suscripción |
| Persona | Founder's Edition | 1 año + Básico perpetuo | Básico perpetuo |
| Empresa | Validación + trial | 14 días | Estado restringido |

- El reverse trial **no** se reinicia con nuevas cuentas del mismo usuario
  o empresa.
- El reverse trial **no** es acumulable con otras promociones.
- El reverse trial **no** incluye módulos futuros que se lancen después
  de su inicio.

---

## 7. Planes y precios

| Plan | Público | Precio | Incluye |
|------|---------|--------|---------|
| Básico | Persona | Gratis | Módulos base, uso limitado |
| Premium Persona | Persona | Suscripción mensual | Todos los módulos Persona |
| Premium Empresa | Empresa validada | Suscripción mensual | Todos los módulos Empresa |
| Founder's Edition | Primeros compradores | Pago único dispositivo | Básico perpetuo + 1 año Premium |

- Los precios concretos se definen en documento anexo de pricing.
- Los precios pueden cambiar; los usuarios existentes mantienen su precio
  durante el ciclo de facturación vigente.

---

## 8. Restricciones y uso justo

- Prohibido revender, transferir o compartir cuentas.
- Prohibido scraping, extracción masiva de datos o uso automatizado no
  autorizado.
- Prohibido crear múltiples cuentas para reiniciar trials.
- El acceso perpetuo (Founder's Edition) está sujeto a uso justo y puede
  suspenderse por abuso.
- La app puede suspender cuentas que incumplan estos términos.

---

## 9. Validación de empresas (implementación técnica)

1. Registro → usuario elige modo Empresa → ingresa NIT.
2. Llamada a API RUES → verifica existencia y estado ACTIVA.
3. Si pasa → se otorga reverse trial de 14 días.
4. Durante el trial → monitoreo de uso.
5. Fin del trial → usuario decide pagar.
6. Antes de pagar → validación de reputación (Interzoid + reseñas).
7. Si pasa → suscripción mensual activa.
8. Revalidación periódica cada 6–12 meses.

**APIs recomendadas:**
- RUES: Apify NIT Colombia RUES API, Verifik, Know Your Customer.
- Reputación: Interzoid Verify Company, Apify Trustpilot Reviews,
  Apify Universal Google Review Auditor.

---

## 10. Métricas clave

- Tasa de conversión de reverse trial a pago (Persona web).
- Tasa de conversión de año premium a suscripción (Persona físico).
- Tasa de conversión de reverse trial a suscripción (Empresa).
- Porcentaje de empresas rechazadas en validación RUES.
- Porcentaje de empresas rechazadas en validación de reputación.
- Churn mensual de suscripciones.
- Coste de APIs por empresa validada.
- Uso anómalo detectado durante trials.

---

## 11. Roadmap de implementación

1. **Fase 1:** Reverse trial 14 días en modo Persona web + plan Básico.
2. **Fase 2:** Validación RUES para modo Empresa + reverse trial 14 días.
3. **Fase 3:** Suscripción mensual Empresa + validación de reputación.
4. **Fase 4:** Producto físico con 1 año Premium + plan Básico posterior.
5. **Fase 5:** Founder's Edition con Básico perpetuo (solo primeros).
6. **Fase 6:** Revalidación periódica y monitoreo continuo.

---

## 12. Términos y condiciones clave (resumen)

- "Premium" se refiere a acceso completo a los módulos del modo
  correspondiente durante el periodo indicado.
- "Básico" se refiere a acceso limitado y permanente a módulos base.
- "Reverse trial" es un periodo de acceso Premium que se degrada
  automáticamente a Básico o estado restringido si no se paga.
- "Perpetuo" se refiere a la versión actual del plan Básico, no a
  funcionalidades futuras.
- El acceso puede suspenderse por incumplimiento de uso justo.
- La validación de empresas es obligatoria y automática.
- El modo Empresa requiere suscripción mensual activa.

---

*Última actualización: [fecha]*
*Versión: 1.0*
*Este documento es la fuente de verdad del modelo de negocio.*
