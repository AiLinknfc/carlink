# CarLink — Modelo de participación de terceros (aliados e inversionistas)

**Versión 0.1 — borrador de trabajo, 2026-09-25.**
**Documento hermano:** `LEGAL_02_CONTRATO_ALIANZA_PARTNER.md` (contrato de alianza / mini-franquicia) y
`LEGAL_03_CONTRATO_CUENTAS_EN_PARTICIPACION.md` (contrato para quien aporte dinero sin tener control).

> **Advertencia importante.** Esto es una asesoría de estructuración y borradores de contrato preparados
> con base en el funcionamiento real de CarLink (`docs/PLAN_PARTNER_MODEL.md`, `docs/MODELO_NEGOCIO.md`) y en
> el marco legal colombiano general. **No es un concepto jurídico firmado ni reemplaza a un abogado.** Antes de
> firmar cualquier cosa con un tercero, hazlo revisar por un abogado mercantil colombiano (la sección 11 le
> lleva las preguntas exactas para que la revisión sea corta y barata). Las normas citadas están para que el
> abogado las ubique rápido; **verifica su vigencia y redacción actual**. Las cifras marcadas como
> "propuesta" son supuestos para que decidas, no datos del mercado.

---

## 1. Resumen ejecutivo (lo que te recomiendo)

1. **No recibas dinero de terceros ni firmes alianzas como persona natural.** Hoy tu patrimonio personal
   responde ilimitadamente por todo lo que haga CarLink (reclamos de clientes, deudas, un partner que actúe
   mal). Constituye la **SAS primero** (es rápido y barato) y traspasa a ella la marca, el software, el
   dominio y las cuentas de infraestructura. Es lo que más te protege y lo que más te da control.
2. **Separa "aliados" de "inversionistas".** Son dos programas distintos, con contratos distintos:
   - **Aliados / partners** (los que quieren vender, distribuir o "maquilar" con tu marca): **sin capital
     social, sin voto, sin acceso a datos.** Compran producto con descuento, usan tu marca bajo licencia
     limitada y cobran una comisión por lo que activan. Aquí está tu expansión rápida.
   - **Inversionistas** (los que ponen plata): solo **después** de la SAS, con instrumentos que no te quitan
     el control (deuda convertible, o acciones minoritarias sin voto / con pacto de accionistas). Antes de la
     SAS, únicamente cuentas en participación sobre una operación concreta y acotada.
3. **El control no se "promete", se diseña en cuatro capas:** (a) jurídica (contratos sin derechos de gestión),
   (b) societaria (quién tiene las acciones con voto), (c) técnica (la plataforma es tuya y el partner solo
   tiene una llave revocable con cupo) y (d) de propiedad intelectual (marca, código, base de datos, dominio
   siempre a tu nombre o al de tu SAS). El sistema de partners que ya construiste (cupo + API key revocable)
   es una ventaja real: el partner nunca tiene lo que le permitiría "irse con el negocio".
4. **Evita por diseño las dos trampas legales de este tipo de alianza:** que el contrato se pueda leer como
   **agencia comercial** (te obliga a indemnizar al terminar) o como **relación laboral**, y que la captación
   de dinero parezca **captación masiva no autorizada** (puede ser delito). Los contratos adjuntos están
   redactados para evitar ambas.
5. **Orden sugerido:** Fase 0 (SAS + marca + cuentas, 3-6 semanas) → Fase 1 (aliados comerciales, sin capital)
   → Fase 2 (aliados operadores / maquila) → Fase 3 (capital, solo si lo necesitas y ya con SAS).

---

## 2. Punto de partida y por qué importa ser persona natural

| Tema | Hoy (persona natural) | Con SAS |
|---|---|---|
| Responsabilidad | Ilimitada: responde tu patrimonio personal (casa, ahorros, carro) | Limitada a los aportes (Ley 1258 de 2008) |
| Recibir dinero de terceros | Riesgoso: cualquier reclamo del inversionista te llega a ti | El inversionista es socio o acreedor de la sociedad, no tuyo |
| Contratos con aliados | Los firmas tú; luego hay que ceder cada uno (requiere permiso de la contraparte) | Se firman con la SAS desde el día uno |
| Marca / software / dominio | Están a tu nombre (bien: son tuyos), pero sin un traspaso ordenado | Se aportan o ceden a la SAS con contrato; la SAS es dueña |
| Imagen ante un aliado o inversionista | "Proyecto de una persona" | Empresa con NIT, cámara de comercio, estados financieros |
| Impuestos | Renta de persona natural; puede haber IVA/ICA según actividad | Régimen societario; planeable con contador |

**Lo que sí puedes hacer ya como persona natural**, con cuidado: vender producto, y firmar alianzas
**si incluyes la cláusula de cesión a la SAS** (los contratos 02 y 03 ya la traen: el aliado acepta desde hoy
que la SAS te reemplace, sin volver a negociar).

**Acción inmediata recomendada (Fase 0):**
1. Constituir **CarLink S.A.S.** (documento privado inscrito en la Cámara de Comercio; un solo accionista
   puede constituirla). Pon en los estatutos un **objeto social amplio** y **acciones con voto múltiple** o
   una estructura que te deje el control (ver sección 8.3) **desde la constitución**, porque después es más
   difícil de cambiar.
2. **Registrar la marca "CarLink"** (y el logo) ante la SIC, en las clases que apliquen (software/dispositivos,
   servicios de venta, servicios tecnológicos — el abogado o el agente de propiedad industrial confirma las
   clases). Sin registro, la licencia de marca que le das a un aliado vale poco frente a terceros. Verifica
   primero que nadie tenga ya una marca idéntica o muy parecida (búsqueda de antecedentes fonéticos).
3. **Ceder a la SAS** por escrito: marca (o solicitud en trámite), software, dominio, y la titularidad de las
   cuentas de Vercel / Railway / Supabase / GitHub / Meta / pasarela de pagos. Deja constancia con un contrato
   de cesión (o aporte en especie en la constitución).
4. **Cuentas y facturación:** RUT actualizado, cuenta bancaria de la SAS, facturación electrónica.
   Consulta con un contador el efecto tributario de trasladar activos a la SAS.
5. Como **persona natural que ya vende**, verifica que tengas **matrícula mercantil** (un comerciante habitual
   debe tenerla) y estés al día con RUT/DIAN. Si no, hazlo antes de firmar cualquier contrato mercantil.

---

## 3. Los esquemas posibles, comparados

| Esquema | ¿Quién pone qué? | Control que conservas | Riesgo para ti | Costo/complejidad | Cuándo usarlo |
|---|---|---|---|---|---|
| **A. Aliado comercial / distribuidor con licencia de marca** ("mini-franquicia") | Aliado: compra inventario, vende en su territorio, paga cuota de ingreso. Tú: producto, marca, plataforma, capacitación | **Total** (no hay capital ni voto) | Bajo si evitas agencia comercial y cuidas la marca | Bajo | **Ahora**. Es tu vehículo de expansión rápida |
| **B. Aliado operador / maquila** (arma, personaliza y despacha localmente) | Aliado: mano de obra, local, logística. Tú: material, estándares, cupo de activación | **Total** (activación y llaves siguen en tu servidor) | Bajo-medio: calidad y trazabilidad | Medio | Cuando tengas volumen en una ciudad |
| **C. Cuentas en participación** (Cód. Comercio arts. 507 ss.) | Inversionista: dinero para **una operación concreta** (ej. un lote de llaveros). Tú (gestor): ejecutas y respondes ante terceros | **Total** (el partícipe no gestiona ni figura ante terceros) | Medio: eres gestor y respondes frente a terceros; hay que rendir cuentas | Bajo | **Antes de la SAS**, para financiar algo puntual |
| **D. Mutuo (préstamo) con opción de conversión** | Inversionista: dinero como deuda que después puede convertirse en acciones minoritarias | **Alto**: no hay socio hasta que conviertas; condiciones de conversión negociadas de antemano | Medio: hay que devolver si no convierte | Medio | **Con SAS**, cuando quieras capital sin ceder control hoy |
| **E. Acciones minoritarias con pacto de accionistas** | Inversionista entra como socio de la SAS (clase de acciones sin voto o con voto limitado) | **Alto** si lo estructuras bien (ver 8.3) | Alto si se hace mal: un socio con veto o con más del 33-50% te bloquea | Alto (valoración, estatutos, pacto, registro) | Solo si necesitas montos grandes; con abogado |
| **F. Franquicia formal (con manual, regalías, exclusividad)** | Franquiciado: capital, local, operación bajo tu sistema | Alto | Alto: exige sistema probado, soporte fuerte y transparencia precontractual | Alto | **Todavía no**: tu app no lleva el tiempo de operación que un franquiciado serio pide ver |

**Sobre la "mini-franquicia".** En Colombia **no existe una ley especial de franquicia**: es un contrato
atípico (se rige por lo pactado, el Código de Comercio y la Decisión Andina 486 de 2000 para la licencia de
marca). Eso da libertad, pero también significa que **lo que digas en el contrato es lo que te protege**.
Por eso el contrato 02 se llama "alianza comercial, distribución y licencia limitada de marca" y **no**
"franquicia": conserva lo bueno de la idea (marca, estándares, territorio, cuota de ingreso) sin asumir las
obligaciones de información y soporte de una franquicia formal.

---

## 4. Programa "Aliado CarLink": objetivos, niveles, costos y condiciones

### 4.1 Objetivos del programa
1. **Expansión rápida y barata** en ciudades donde hoy no llegas, sin poner tu capital ni el del aliado en la
   sociedad.
2. **Aumentar activaciones** de llaveros (y con ellas, suscripciones de taller/empresa y conductores).
3. **Mantener la calidad y el control** de la marca y de los datos de los usuarios.
4. Que el aliado gane bien con **volumen y retención**, no con "meter" gente que después no usa la app.

### 4.2 Niveles (propuesta)

| | **Aliado Comercial** (Nivel 1) | **Aliado Operador** (Nivel 2) |
|---|---|---|
| Qué hace | Vende llaveros y kits a conductores y talleres en su territorio; los entrega y acompaña la activación | Todo lo anterior + arma/personaliza/despacha localmente bajo tus estándares y gestiona el punto de atención de su ciudad |
| Relación con la plataforma | Cupo de llaveros con código de activación ya generado por ti (no ve datos de clientes) | Panel/API de partner con cupo para aprovisionar lotes (lo que ya existe: `/partner`) |
| Cuota de ingreso | Pago único no reembolsable — propuesta: **entre $300.000 y $800.000 COP** (cubre kit de arranque, capacitación y alta) | Propuesta: **entre $1.500.000 y $3.000.000 COP** |
| Descuento mayorista | Propuesta: **30 % sobre el precio de lista** (ver 4.3) | Propuesta: **35 %** + tarifa por unidad procesada |
| Pedido mínimo inicial | Propuesta: 10 unidades | Propuesta: 50 unidades por lote |
| Comisión recurrente | Propuesta: **10 %** de la suscripción mensual (taller/empresa) de cada cuenta activada con su llavero, durante **12 meses** | Igual, más **12 meses adicionales** si mantiene ≥ [70 %] de sus cuentas activas |
| Territorio | **No exclusivo** (recomendado). Exclusivo solo con metas mínimas escritas | Exclusivo por ciudad **condicionado a metas** trimestrales |
| Duración | 12 meses, renovable | 12 meses, renovable |

> **Por qué los descuentos y comisiones son "propuesta".** Dependen de **tu costo unitario real** del llavero
> (chip + acabado + empaque + envío + soporte). Fórmula para fijarlos:
> `precio mayorista ≥ costo unitario × 1,5` y, además, `precio mayorista = precio de lista × (1 − descuento)`.
> Con el precio de lista actual del llavero ($39.900 COP), un 30 % de descuento da **$27.930** y un 35 % da
> **$25.935**. Si tu costo unitario puesto en tu bodega supera ~$17.000-$18.000, esos descuentos te dejan
> poco margen: ajusta el descuento o el precio de lista antes de ofrecerlos.
> Para el kit ($59.900) el cálculo es igual.
>
> **Ejemplo de comisión recurrente.** Un taller activado por un aliado paga el plan "Taller aliado"
> ($79.900/mes): 10 % = **$7.990/mes** para el aliado durante 12 meses (= $95.880), siempre que la cuenta
> siga activa y pagando. Si el taller cancela, la comisión se corta.

### 4.3 Condiciones esenciales (resumen; el detalle está en el contrato 02)
- **Compra en firme, por cuenta y riesgo del aliado.** El aliado **compra** el inventario y lo revende en su
  propio nombre (no actúa "por cuenta" de CarLink). Esto es lo que evita la calificación de **agencia
  comercial**.
- **Precio de venta al público:** CarLink **sugiere** un precio; el aliado decide el suyo (imponerlo puede
  ser una práctica restrictiva de la competencia).
- **Licencia de marca limitada, revocable y no exclusiva**, solo para vender productos CarLink, siguiendo un
  manual de uso de marca. No puede registrar nombres, dominios ni redes con "CarLink".
- **Cero acceso a datos personales de usuarios finales.** La activación la hace el cliente directamente en la
  app; el aliado solo ve estados agregados (ej. "activado / no activado"), como ya hace el panel de partner.
- **Metas mínimas** trimestrales y **causales de terminación** claras (mala conducta con la marca,
  incumplimiento de datos, no pago, no cumplir metas dos trimestres seguidos).
- **Sin exclusividad de tu lado y sin obligación de suministro ilimitado:** si no hay stock, no hay
  incumplimiento.
- **Terminación por cualquiera de las partes con 30 días de preaviso** (más rápida por causa grave). Al
  terminar: cese de uso de marca, devolución de material de marca, y **recompra opcional** (a tu elección)
  del inventario sin abrir a un valor definido.
- **Garantía y posventa:** CarLink responde frente al cliente final por la garantía del dispositivo
  (Estatuto del Consumidor, Ley 1480 de 2011); el aliado responde por lo que prometa por su cuenta
  (ej. garantías adicionales que él invente) y por el trato al cliente.

### 4.4 Costos que tú asumes (para que los presupuestes)
| Concepto | Quién paga | Nota |
|---|---|---|
| Constitución de la SAS (Cámara de Comercio, derechos de matrícula, RUT) | Tú | Costo variable según activos; presupuesto orientativo 1-3 millones COP con o sin abogado — **verifica tarifas vigentes** |
| Registro de marca (SIC) por clase | Tú | Tarifa oficial por clase + honorarios si usas agente; consulta la tarifa vigente |
| Revisión y ajuste de los contratos por abogado | Tú | Una sola vez; después los reutilizas |
| Kit de arranque de cada aliado (muestras, material de marca, capacitación) | Aliado (dentro de la cuota de ingreso) | Ajusta la cuota para cubrirlo |
| Soporte al aliado (WhatsApp/correo, capacitación) | Tú | Es tiempo tuyo: define un horario y un canal |
| Seguros / responsabilidad civil de producto | Tú (opcional) | Consulta con un corredor si el volumen crece |

---

## 5. Cómo blindar tu control (las cuatro capas)

### 5.1 Capa jurídica (en los contratos)
- **Ningún aliado ni inversionista recibe derechos de gestión, voto, veto, firma ni representación.**
- **Cláusula de no representación:** solo tú (o la SAS) obligas a CarLink frente a terceros.
- **Cláusula de cesión a favor tuyo** (puedes cambiar de "tú" a "SAS" sin permiso) y **prohibición de cesión**
  para la contraparte.
- **Propiedad intelectual reservada** (marca, software, base de datos, dominio, manuales); todo lo que el
  aliado cree con la marca (piezas, contenido, cuentas en redes) es tuyo o queda a tu disposición al terminar.
- **Terminación clara y barata,** cláusula penal por uso indebido de marca y por manejo indebido de datos.
- **Pacto de reserva de información:** los datos de clientes son tuyos; el aliado no puede usarlos para
  promover otros productos ni llevarse a sus clientes a un competidor.

### 5.2 Capa societaria (para inversionistas, cuando exista la SAS)
Ver sección 8: mayoría de votos, clases de acciones, pacto de accionistas, sin veto operativo.

### 5.3 Capa técnica (ya la tienes construida)
- El **aprovisionamiento de llaveros** solo ocurre dentro del **cupo** que tú asignas; la clave del partner se
  puede **suspender al instante** y un partner suspendido no puede aprovisionar más
  (`docs/PLAN_PARTNER_MODEL.md`).
- **Un partner nunca ve la identidad de los clientes finales** (no expone `claimed_by`).
- Las llaves criptográficas y `ADMIN_USER_ID` **nunca** se comparten. No des accesos de administrador a nadie
  externo, aunque sea "de confianza": se hace con el rol partner.
- **Accesos de infraestructura** (Supabase, Railway, Vercel, GitHub, DNS, correo, WhatsApp/Meta, pasarela
  de pago): a nombre de la SAS, con 2FA y con **dos personas de recuperación de tu confianza** (evita que
  un solo evento te deje sin acceso; nunca se los des a un inversionista).
- Recomendado: **no entregar código fuente** a aliados ni inversionistas (solo demostraciones y métricas).
  Si un inversionista serio exige revisar el código, hazlo bajo **acuerdo de confidencialidad (NDA)** y en
  una sala de datos controlada, no dándole el repositorio.

### 5.4 Capa económica
- **Que el aliado dependa de que el negocio funcione, no de tenerte a ti:** comisiones recurrentes por
  cuentas activas alinean incentivos sin darle participación en la empresa.
- **Sin garantías de rendimiento a nadie.** Prometer un retorno fijo o garantizado a quien pone dinero te
  acerca al terreno de la **captación ilegal** (sección 9). Todo aporte de capital es de riesgo.

---

## 6. Sobre "maquilar"

Entiendo "maquilar" como que el aliado **arme, personalice, empaque o despache** llaveros en su ciudad
(o fabrique material de marca). Puntos a definir antes de abrir ese nivel:

1. **Qué se le entrega y qué no.** Recomendado: tú entregas el **chip/tag ya grabado** o el **cupo de
   códigos** de activación; el aliado hace el empaque, la personalización visible (placa, logo) y el despacho.
   **Nunca** entregas el proceso que genera tokens ni las llaves: el partner solo ejerce el rol acotado
   (`/partners/me/provision`).
2. **Estándares de calidad** (materiales, acabado, empaque, prueba de lectura NFC/QR de cada unidad) y
   **derecho a auditoría** (visitas y muestreo).
3. **Trazabilidad:** número de lote, código de operador, registro de unidades rechazadas.
4. **Tarifa por unidad procesada** (no participación en utilidades), pagada contra entrega aprobada.
5. **Responsabilidad por producto defectuoso** compartida según causa (si el defecto es de armado, responde
   el operador; si es del chip o del diseño, tú).
6. **Propiedad de moldes, artes y archivos:** siempre tuya. El operador no puede fabricar para terceros con tu
   marca ni "sobreproducir" (cláusula de tolerancia cero: unidades sobrantes se destruyen o se devuelven).

El contrato 02 trae un **Anexo para Aliado Operador** con estas condiciones.

---

## 7. Inversionistas: reglas de oro

1. **No hagas oferta pública de inversión.** No anuncies "invierte en CarLink" en redes, landing, WhatsApp
   masivo ni eventos abiertos. Las conversaciones son **privadas, una a una**, con personas que ya conoces o
   que llegan por referencia.
2. **Pocos inversionistas.** Captar dinero de muchas personas de forma habitual o masiva puede constituir
   **captación masiva y habitual no autorizada** (actividad reservada a entidades vigiladas; puede ser
   delito). Como criterio práctico mantén **pocos inversionistas (idealmente menos de 20) y montos
   individuales relevantes**, y pide al abogado que confirme el umbral aplicable hoy.
3. **Todo por escrito**, con el contrato adecuado (03 o los instrumentos de la sección 8) y **transferencias
   bancarias** a la cuenta de la SAS (o a tu cuenta si aún no existe, con el contrato firmado **antes** de
   recibir el dinero). Nada en efectivo.
4. **Sin rendimientos garantizados** ni promesas de "retorno mensual". Puedes ofrecer **participación en
   utilidades** (variable) con reglas de cálculo claras.
5. **Sin puestos ni firma:** nadie entra a tu junta, ni firma por CarLink, ni te da instrucciones operativas.
   Derechos de **información periódica** (un informe trimestral), no de gestión.
6. **Conoce a tu inversionista** (identidad, origen de fondos). Es una obligación de buena práctica y te
   protege de lavado de activos; el abogado te dirá qué soportes guardar.
7. **No aceptes capital sin definir para qué se usa** (uso de fondos) y sin **fecha y forma de rendir
   cuentas**.

---

## 8. Instrumentos para inversionistas (según el momento)

### 8.1 Antes de la SAS — cuentas en participación (contrato 03)
Encaja para **financiar una operación concreta y acotada** (ej. el próximo lote de 500 llaveros, o el
lanzamiento en una ciudad), no la empresa completa.
- El **gestor (tú)** es el único que actúa frente a terceros y administra; el **partícipe** aporta dinero y
  recibe una **parte de las utilidades de esa operación**, sin nombre frente a terceros (art. 507 y ss.,
  Código de Comercio).
- **No genera personería jurídica ni socios de una empresa.** No hay acciones ni voto.
- **Ojo:** el partícipe que se **inmiscuye** en la gestión puede quedar expuesto y, sobre todo, te complica la
  relación. El contrato lo prohíbe expresamente.
- Ambas partes deben ser **comerciantes** (o comprometerse a serlo); revisa este requisito con el abogado.
- **Limitación:** sigues respondiendo personalmente frente a terceros. Por eso esta figura es un "puente"
  corto y debe ser de monto y plazo pequeños.

### 8.2 Con SAS — deuda convertible ("mutuo con opción de conversión")
- El inversionista **presta** un monto; si en un plazo (ej. 18-24 meses) se cumple un evento (ronda o hito
  de ingresos), el préstamo puede **convertirse en acciones** con un **descuento** sobre el precio de esa
  ronda o con un **tope de valoración** (ambas fijadas hoy).
- **Ventaja para ti:** hoy no hay socio nuevo ni valoración que discutir; **conservas el 100 % del control**
  hasta que decidas convertir.
- **Riesgo:** si no hay conversión, debes pagar capital e intereses pactados. No prometas más de lo que
  puedas devolver.
- En el contrato 03, Anexo B, hay una **hoja de términos** para este instrumento.

### 8.3 Con SAS — acciones minoritarias y pacto de accionistas (solo si lo necesitas)
Si algún día entra un socio de capital, las reglas para no perder control:

1. **No cedas un porcentaje que le dé poder de bloqueo.** Si los estatutos o el pacto exigen mayorías
   calificadas para ciertas decisiones, un socio con un porcentaje relevante (en la práctica, un tercio o
   más) puede frenarlas; **piensa en ≤ 20-25 % en total para todos los inversionistas de una primera
   ronda** y deja las mayorías calificadas fuera o en pocas materias.
2. **Clases de acciones** (Ley 1258 de 2008, arts. 10 y 11): puedes emitir acciones **con voto múltiple para ti**
   y acciones **sin voto o con dividendo preferencial** para el inversionista. Esto debe quedar en los
   **estatutos**; el voto múltiple se define al constituir la sociedad; si se quiere después, la ley exige una
   aprobación muy alta (en general, unanimidad de las acciones suscritas — confírmalo con el abogado).
   **Por eso conviene definirlo desde la constitución.**
3. **Pacto de accionistas** (art. 70, Ley 1258): compromiso de **permanencia del fundador** (con *vesting* sobre
   tus propias acciones si el inversionista lo pide, dentro de límites razonables), **arrastre**
   (*drag-along*: si tú vendes, ellos venden), **derecho de primera oferta**, **no competencia** del inversionista
   y **confidencialidad**.
4. **Sin veto operativo.** Los únicos temas que puedes aceptar como "reservados" (y con pocas materias):
   venta de casi todos los activos, cambio del objeto social, y nuevos socios que entren por debajo de un
   precio pactado. **Nunca:** presupuesto, contratación, precios, producto, ni tu remuneración razonable.
5. **Derechos de información** (informe trimestral y estados financieros anuales), no derecho a auditar tu
   operación diaria.
6. **Junta directiva:** en una SAS es opcional; no la crees. Si hay una, tú con la mayoría de miembros.

> Este es el instrumento más complejo. No lo hagas sin abogado y sin una **valoración** razonable que
> respalde el precio de las acciones.

---

## 9. Riesgos legales que este modelo debe evitar (y cómo)

| Riesgo | Por qué importa | Cómo lo evitan los contratos |
|---|---|---|
| **Agencia comercial** (Cód. Comercio arts. 1317 y ss.) | Si el aliado actúa "por cuenta" de CarLink de forma estable y independiente, al terminar puedes deber una **prestación / cesantía comercial** (un mes de comisión promedio por cada año, entre otros) | El aliado **compra y revende por su cuenta y riesgo**, fija su precio, asume su inventario y no representa a CarLink |
| **Relación laboral encubierta** ("contrato realidad") | Horarios, órdenes y exclusividad generan prestaciones y sanciones | Sin horarios, sin subordinación, sin exclusividad, con medios propios del aliado |
| **Captación masiva / actividad financiera no autorizada** | Puede ser delito y responsabilidad personal | Pocos inversionistas, trato privado, sin oferta pública, sin rendimientos garantizados |
| **Datos personales** (Ley 1581 de 2012 y decretos reglamentarios) | El aliado podría tratar datos de usuarios sin autorización | El aliado **no accede a datos**; si recoge algún dato de contacto, actúa como **encargado** bajo instrucciones (Anexo C) |
| **Estatuto del Consumidor** (Ley 1480 de 2011) | Publicidad engañosa, garantías, retracto en ventas a distancia | Manual de marca con textos permitidos, garantía asumida por CarLink como productor, canal único de PQRS |
| **Competencia** (imposición de precios de reventa, exclusividades abusivas) | Sanciones de la SIC | Precio **sugerido**, no impuesto; exclusividad solo territorial y con metas |
| **Marca no registrada** | La licencia no es oponible a terceros; te la pueden copiar | Registrar en la SIC y **registrar la licencia** cuando aplique (Decisión Andina 486 de 2000) |
| **Tributario** | IVA, retenciones, ICA, facturación electrónica | El aliado factura sus ventas; tú facturas tus ventas al aliado; consultar contador |
| **Cesión de contratos firmados como persona natural** | Requiere aceptación del otro contratante | **Cláusula de cesión previa** a la SAS en los contratos 02 y 03 |

---

## 10. Checklist antes de firmar con cualquier tercero

- [ ] SAS constituida **o** cláusula de cesión incluida en el contrato.
- [ ] Marca registrada o solicitud radicada, y búsqueda de antecedentes hecha.
- [ ] Costo unitario real del llavero y del kit calculado (para fijar mayorista y comisión).
- [ ] Precios de lista y descuentos del programa decididos (Anexo A del contrato 02).
- [ ] Manual de uso de marca (1-2 páginas) listo (Anexo B).
- [ ] Política de tratamiento de datos vigente y aviso de privacidad (ya existen en el sitio; revisa que
      mencionen a aliados como terceros que **no** reciben datos).
- [ ] Cuenta bancaria (de la SAS) y método de cobro definido.
- [ ] Revisión por abogado de los contratos 02 y 03 con las preguntas de la sección 11.
- [ ] Rol partner probado con un aliado piloto **sin dinero de por medio** durante 2 semanas.
- [ ] Un solo canal de soporte para aliados y respuesta en tiempos definidos.
- [ ] Copia firmada y fechada archivada; registro de cada aliado (datos, territorio, cupo, versión del
      contrato).

---

## 11. Preguntas exactas para tu abogado (llévalas impresas)

1. ¿La estructura del contrato 02 evita razonablemente la calificación de **agencia comercial** y de
   **relación laboral**? ¿Qué cláusula agregaría o cambiaría?
2. ¿Conviene **constituir la SAS antes** de abrir el programa? ¿Con qué estatutos (objeto, clases de acciones,
   voto múltiple, restricciones a la transferencia de acciones)?
3. ¿Cómo **cedo** de forma ordenada a la SAS la marca, el software, el dominio y los contratos, y qué efecto
   tributario tiene el aporte en especie?
4. ¿Debo **registrar la licencia de marca** para que sea oponible a terceros, y cómo?
5. Para el contrato 03: ¿se cumple el requisito de que ambas partes sean **comerciantes**? ¿Qué debe hacer
   el partícipe? ¿Es adecuada la cláusula de **no injerencia**?
6. ¿Cuál es el **umbral actual** a partir del cual la captación de dinero de terceros se vuelve masiva y
   riesgosa, y qué soportes debo guardar de cada inversionista?
7. Sobre el **mutuo convertible**: ¿qué interés máximo puedo pactar (usura) y cómo lo redacto para que la
   conversión sea clara y ejecutable?
8. ¿Qué **cláusula penal** es razonable y exigible por uso indebido de marca y por manejo indebido de datos
   personales?
9. ¿Qué cláusula de **solución de controversias** recomienda (conciliación + arbitraje en la Cámara de
   Comercio de mi ciudad o justicia ordinaria)?
10. ¿Debo tratar a los aliados como **encargados** o como **responsables** del tratamiento de datos, dado
    que no reciben datos personales por diseño?

---

## 12. Decisiones que necesito de ti para cerrar los contratos

1. **Tu costo unitario** del llavero y del kit, para fijar descuentos y comisión (sección 4.2).
2. **¿Empiezas con Nivel 1 (comercial) o también Nivel 2 (operador)?** Recomiendo Nivel 1 primero.
3. **Territorio:** ¿no exclusivo (recomendado) o exclusivo por ciudad con metas?
4. **Cuota de ingreso** y **pedido mínimo** que quieres exigir.
5. **Comisión recurrente:** porcentaje y duración (10 % por 12 meses es solo un punto de partida).
6. **¿Aceptarías inversionistas?** Si sí: ¿para una operación concreta (contrato 03) o esperas la SAS
   (mutuo convertible)? ¿Cuánto dinero total buscas y para qué?
7. **Tu nombre completo, cédula, domicilio y datos de contacto** (para completar los contratos), y el nombre
   que tendrá la SAS cuando esté constituida.
8. **Ley aplicable y ciudad de arbitraje** (por defecto: Colombia; Cámara de Comercio de tu ciudad).

---

## 13. Próximos pasos sugeridos (30 días)

| Semana | Acción |
|---|---|
| 1 | Decidir los puntos de la sección 12; calcular costo unitario; búsqueda de antecedentes de la marca |
| 1-2 | Constituir la SAS (con abogado o por la Cámara de Comercio); radicar la marca |
| 2-3 | Ceder marca/software/dominio/cuentas a la SAS; abrir cuenta bancaria; RUT y facturación |
| 3 | Abogado revisa contratos 02 y 03 (usa la sección 11) |
| 3-4 | Piloto con **un** aliado sin dinero (dos semanas) usando el panel de partner |
| 4 | Ajustes finales y apertura controlada del programa |
