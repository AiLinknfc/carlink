# Modelo operativo de CarLink: reglas de negocio y datos

Este documento reúne **las reglas de negocio y la arquitectura de datos** que se decidieron al construir
el historial de mantenimiento, el odómetro, las partes/servicios, los tipos de vehículo y la tarjeta de
propiedad (sesiones del 2026-10-05). Es la referencia para no perder de vista **qué se decidió, por qué y
dónde vive en el código**. No reemplaza a los demás docs:

- Modelo de datos de servicio/kilometraje/partes → `docs/ARCHITECTURE.md` (detalle técnico por sección).
- Pendientes → `docs/PENDIENTES.md` (**única** lista; lo que aquí figura como abierto está también allá).
- Pruebas manuales → `docs/PRUEBAS_FUNCIONALES.md` (Suite 14 cubre todo lo de este documento).
- Estilo visual → `docs/DESIGN_GUIDELINES.md`.
- Despliegue y migraciones → `docs/DEPLOY.md`.

> **Principio rector.** El valor de la plataforma es la **confianza en el historial** de cada vehículo. Por eso:
> (1) toda regla que protege el historial vive **en el servidor**, nunca solo en el navegador; (2) lo que un
> usuario declara se distingue de lo que respalda un taller o un documento; (3) las fechas y el origen de un
> dato los pone el servidor, no el cliente.

---

## 1. Mapa de datos

| Entidad | Para qué sirve | Campos/reglas que importan | Migración |
|---|---|---|---|
| `vehicles` | El vehículo | `fuel_type` (gasolina, diesel, gas, hibrido, electrico; vacío = sin definir), `card_data` (JSONB, ver §7), `card_confirmed_at/_digest` (§7), `body_type` (clase), `type` (categoría de placa) | 068, 071, 072 |
| `maintenance_records` | Un servicio registrado | `origin` (user, workshop, prior), `support_url`, `lubricant_use` (motor, caja, transmision), `next_service_mileage`, `date` | 070, 073 |
| `odometer_readings` | Lecturas de odómetro, **solo se agregan** | `source` (initial, service, periodic), `recorded_at` lo pone el servidor, `maintenance_record_id` | 069 |
| `parts` | Piezas físicas **y fluidos** con vida útil | `mileage_installed`, `lifespan_mileage`, `brand`, `part_number`, `notes` (lleva "Vida útil: N meses · Tipo: ...") | ya existía |

Convenciones transversales:
- **Local, staging y producción comparten la misma base de Supabase.** Toda migración nueva se aplica a mano
  y **antes** de desplegar el código que la usa (lista y estado en `docs/DEPLOY.md`).
- **Ids de tipo de servicio con tilde** (`Batería`, `Suspensión`, `Transmisión`). Inicio manda la grafía sin
  tilde; `lib/serviceIds.ts` (`canonicalServiceId`) las unifica. Hubo un bug real por no hacerlo (la card de
  Batería abría un formulario sin campos). El servicio "Filtros" se guarda como `service_type = 'Aire'` (id
  histórico) y el detalle va en la descripción.

---

## 2. Integridad del historial (reglas del servidor)

`backend/app/services/maintenance_rules.py` (funciones puras, con pruebas) + `routers/maintenance.py`.

| Regla | Detalle | Por qué |
|---|---|---|
| Fecha del servicio | Sin fecha = hoy. No futura (1 día de margen por zona horaria). **No anterior a 30 días.** | Evitar historial inventado o "rellenado" |
| Kilometraje | Nunca menor al de un registro/lectura anterior ni mayor al de uno posterior; no salta más de 100.000 km sobre el máximo | Fraude de odómetro |
| Próximo servicio | Debe ser **mayor** al kilometraje actual y no más de 150.000 km adelante | Un registro con 2000 y 2000 rompió la vida útil del aceite |
| Costo | Entre 0 y 1.000.000.000 | Datos absurdos |
| `workshop_id` | El servidor lo **ignora** si lo manda un usuario; solo lo ponen las órdenes de trabajo del taller | Antes cualquiera mostraba la etiqueta "Del taller" |
| Registros de taller | `origin = workshop` (o con `source_work_order_id`): el dueño **no** los edita ni borra (403) | Confianza |
| Cambiar de vehículo | Un registro no puede cambiar de `vehicle_id` (400) | Se podía mover a un vehículo ajeno |
| Aceite usado | Un servicio "Aceite" exige marca y viscosidad/tipo | De eso depende la predicción |

**Fecha editable pero acotada (decisión).** Se evaluó quitarla del todo; se dejó editable dentro de 30 días
porque el dueño legítimo a veces registra hoy lo de la semana pasada. Lo que protege el historial es que el
servidor pone `created_at` y valida; la ventana de edición de 48 horas está **pendiente** (ver §12).

---

## 3. Odómetro

- **El kilometraje actual es el mayor valor visto** (no el último en llegar): un 0 de un taller no debe mostrarse.
- Fuentes: `initial` (al registrar el vehículo, **obligatorio** en el wizard y en "Agregar vehículo", con aviso
  de precaución), `service` (la agrega el servidor con cada servicio, incluidas las órdenes de taller) y
  `periodic` (opcional).
- **Corrección del inicial:** se puede reemplazar durante **48 h** mientras sea la única lectura (un error de
  tipeo en el primer valor bloquearía todo servicio posterior).
- **Lectura periódica no invasiva:** `OdometerPrompt` (Inicio) aparece solo si el vehículo no tiene lectura
  o pasaron **90 días** sin lectura ni servicio; es descartable y se valida en el servidor.
- Borrar un servicio **no** borra su lectura (para que no sirva de truco).
- Control de partes y Ficha leen el kilometraje actual del odómetro (`useCurrentMileage`).

---

## 4. Historial anterior (antes de unirse a CarLink)

`POST /api/maintenance/prior` + `PriorHistoryModal`. Es **otro nivel de confianza**:

| Nivel | `origin` | Qué lo respalda | Cuenta para sellos/partes |
|---|---|---|---|
| Verificado por taller | `workshop` | Orden de trabajo del taller | Sí |
| Registrado en CarLink | `user` | Fecha del servidor, dentro de 30 días | Sí |
| Anterior declarado | `prior` | **Soporte obligatorio** (foto/PDF del propio usuario) | **No** |

Reglas del anterior: fecha **obligatoria y anterior al alta** del vehículo (≥ año modelo − 1, ≤ 30 años); el
kilometraje no supera la lectura inicial; el soporte debe ser un archivo subido por el mismo usuario; **no**
genera lectura de odómetro, ni toca partes, ni fija próximo servicio; no se edita y solo se elimina en las
primeras 48 h (botón de eliminar en pantalla: pendiente).

---

## 5. Servicios: wizard, partes y fluidos

**Wizard por servicio** (`ServiceFormModal.tsx`, pasos por rol, `stepRolesFor`):

| Servicio | Pasos |
|---|---|
| Aceite | Lubricante → Producto → Datos generales → Confirmar (4) |
| Filtros | Filtro → Datos generales → Confirmar (3) |
| Batería | Tipo → Medición → Datos generales → Confirmar (4) |
| Resto | Formulario plano (sin wizard) |

**Partes vs fluidos** (`lib/fluids.ts`, por nombre, sin migración):
- **Partes** = piezas físicas que se reemplazan: pastillas, discos, llantas, batería, amortiguadores y **todos los
  filtros** (son piezas físicas).
- **Fluidos** = se renuevan por km o tiempo: aceite de motor, **aceite de caja**, aceite de transmisión,
  refrigerante, líquido de frenos.
- Control de partes tiene tres vistas: **Todo** (por defecto, con la categoría "Todas"), **Partes** y
  **Servicios**; la **categoría manda** sobre la vista (Motor = solo aceite → abre Servicios; una categoría con
  piezas abre Partes). Los fluidos no cuentan como "partes reemplazadas".

### Aceite: motor, caja o transmisión (`lubricant_use`)

| Caso | Datos | Vida útil | Pieza |
|---|---|---|---|
| Motor | marcas/productos (catálogo con logos) + viscosidad | por viscosidad (`lubricantRules.ts`) | Aceite de motor |
| Caja | marca, viscosidad (75W-90...), norma API opcional | 50.000 km / 48 meses | Aceite de caja |
| Transmisión | marca, tipo de fluido (ATF, CVT, DCT...) | 60.000 km / 48 meses (CVT 40.000 / 36) | Aceite de transmisión |

> **Regla de no mezcla (acordada).** Solo el aceite de **motor** alimenta el testigo, la cuenta regresiva del
> próximo cambio, los avisos y la marca/viscosidad de la Ficha técnica y de la **ficha pública**. Un aceite de
> caja o transmisión aporta **únicamente su kilometraje** (sube el odómetro) y su fila en **Control de
> servicios**. La ficha pública lee "el último aceite de motor", no "el último servicio de cualquier tipo".

### Filtros (exclusivos por registro)

Una card por filtro y **un filtro por registro**: cada uno tiene su ciclo y el próximo servicio nunca se mezcla.
Marca y referencia opcionales en el mismo paso (quedan en la pieza). Detalle por tipo de vehículo en §6.

### Batería

Tipo según el vehículo; la batería envejece por **tiempo** (meses del tipo → próximo servicio a 1.500 km/mes y
desgaste del testigo, guardado en `parts.notes`). "Solo la revisé" **no** renueva la pieza (vuelve en 6 meses).
Voltaje en reposo interpretado (≥ 12,6 V completa; < 12,0 V descargada; > 18 V se lee como 24 V).

---

## 6. Tipo de vehículo (se detecta solo) y qué cambia

`vehicleKindOf(body_type, plate_type)` en `lib/filterCatalog.ts`. **El usuario nunca elige el tipo.**

| Tipo | Se detecta cuando | Filtros | Batería | Aceite |
|---|---|---|---|---|
| **moto** | clase `Moto` **o** categoría de placa `moto` | aceite (5.000 km), aire (10.000), combustible (20.000, "inyección") | MF/AGM (36 meses), convencional (24), litio (60) | motor, caja, transmisión (scooter) |
| **pesado** | categoría de placa `carga`, o clase con texto camión/bus/volqueta/tracto/furgón/tráiler (una **Furgoneta** o una Camioneta son carro) | **las de carro** | MF 12 V / 24 V (36 meses) | motor, caja, transmisión |
| **carro** | todo lo demás | aceite (10.000), aire del motor (15.000), habitáculo/A/C (15.000), combustible (20.000), transmisión (60.000, "si aplica"), partículas/DPF (100.000, solo diésel o sin combustible definido) | MF (36), convencional (24), AGM/EFB Start-Stop (48), híbrido/eléctrico (48) | motor, caja, transmisión |

### Buses y cargas pesadas: lo que hay que tener presente

Esto se construyó **sin saber si la aplicación se usa con buses o camiones**; queda documentado para decidirlo:

1. **La detección de "pesado" es débil en la práctica.** Las clases que ofrece la app (`VEHICLE_TYPES`) son
   Auto, SUV, Camioneta, Moto, Deportivo, Hatchback, Pickup y Furgoneta: **no existen "Camión" ni "Bus"**. Un
   camión leído de la tarjeta cae en "Pickup" (`normalizeBodyType`). Por eso hoy un vehículo solo se detecta
   como pesado por su **placa de carga**. Un **bus** tiene placa de servicio **público** (ABC-123) y se trata
   como **carro**.
2. **Lo que sí soporta el sistema de placas:** acepta carga (`T-1234`) y remolque/semirremolque (`R-12345`).
   Así que un vehículo pesado puede registrarse, pero la app no lo trata distinto salvo lo de la tabla.
3. **Lo que tiene de especial un pesado hoy:** solo la batería (12 V / 24 V MF). Filtros y aceites usan las
   opciones de carro.
4. **Lo que NO está modelado** para pesados: capacidad de carga, ejes, llantas múltiples (rotación y cantidad),
   filtro separador de agua, filtro de urea/AdBlue, ni intervalos de servicio por horas o km propios de
   vehículos de trabajo (los intervalos reales son mucho más cortos y distintos a los de un carro).
5. **Decisión abierta:** si la app atenderá flotas de carga o transporte público, hay que (a) añadir
   "Camión", "Bus" y similares a las clases, (b) definir sus filtros y ciclos propios, (c) decidir si el
   transporte público de pasajeros (placa pública) cuenta como pesado. Está registrada en
   `docs/PENDIENTES.md`.

---

## 7. Tarjeta de propiedad (licencia de tránsito) y venta

- **Campos con columna propia:** placa, ciudad, marca, línea, año, color, clase (`body_type`), combustible,
  propietario. **En `card_data`:** número de licencia, documento del propietario, VIN, motor, chasis,
  cilindraje, servicio, capacidad, puertas (no aplica a motos), fecha de matrícula y la clase tal cual la leyó
  el OCR (`vehicle_class`, sin validar).
- **Registro (wizard):** lee y **guarda todo lo capturado** aunque sea inválido; pide combustible y kilometraje;
  **ya no se envía solo a revisión**. La verificación completa queda para una etapa posterior (al transferir o
  vender), desde "Detalles del vehículo" en el perfil.
- **Enviar a revisión** exige todos los campos completos y coherentes (`services/vehicle_card.py`: VIN de 17
  caracteres sin I/O/Q en carros, fecha de matrícula no futura ni anterior al año modelo, etc.).
- **Documento del propietario cifrado** (AES-256-GCM, prefijo `enc1:`). **Falla cerrado**: sin `ENCRYPTION_KEY` no
  se guarda. Sale enmascarado (`•••••456`). **Todos los entornos deben usar la misma `ENCRYPTION_KEY`.**
- **Confirmación a mano para vender:** el dueño marca cada dato contra su tarjeta física; el servidor guarda una
  huella HMAC; **cualquier cambio posterior invalida la confirmación**. Publicar en venta exige vehículo
  **verificado** + confirmación vigente (403/409 en el servidor).
- **Combustible:** se lee de la tarjeta; sin opción "sin definir"; desplegable de una fila (`ThemedSelect`).

---

## 8. Salud del vehículo y cuenta regresiva

- **Salud** (`lib/vehicleHealth.ts`): el porcentaje es el promedio de los testigos **encendidos** (los "sin
  datos" no cuentan). **El nivel nunca es mejor que el peor testigo en rojo:** cualquier rojo fuerza "Atención";
  un rojo de **aceite, frenos, refrigeración o llantas** fuerza "Crítico" (un promedio diluye un riesgo grave).
- **Cuenta regresiva del cambio de aceite:** fecha = la que llegue **primero** entre kilómetros (1.500 km/mes) y
  tiempo (meses de la viscosidad). Con 0 km restantes: "cambio vencido", sin plazo inventado. Un registro con
  próximo servicio ≤ kilometraje es un dato inválido ("Revisa este registro").
- **Control de partes:** la barra avanza con (km actual − km de instalación) / vida útil; naranja desde media
  vida, rojo con ≤ 15 %.

---

## 9. Analítica: qué NO cuenta

`services/analytics_scope.py`: el **admin** y las cuentas **`@carlink.internal`** (cuentas de prueba) quedan fuera
del resumen, de los clics de WhatsApp y de los pedidos pagados del embudo. Sus eventos se guardan (sirven para
reconocer su navegador) pero se excluyen también las visitas anónimas de cualquier navegador donde iniciaron
sesión. Límite: una visita del admin desde un navegador donde nunca inició sesión no se puede reconocer.

---

## 10. Convenciones de interfaz que ya no se negocian

(Detalle en `docs/DESIGN_GUIDELINES.md`.)

- **Nunca** `<select>` ni `<input type="date">` nativos: su menú/calendario sale azul y con esquinas rectas.
  Usar `ThemedSelect`, pastillas/tiles y `ThemedDateInput`. **Buscar si el componente ya existe antes de crear
  uno** (un día se sobrescribió `ThemedSelect` por no revisarlo).
- Color por defecto de cualquier control: **amarillo `#F5C518`**. El verde es solo para estados de resultado
  (verificado, confirmado, cargado).
- Sin emojis en la interfaz.

---

## 11. Cuentas de prueba y cómo verificar

- Cuenta: `pruebas.features@carlink.internal` (`backend/scripts/qa_test_account.py`); llavero `TEST-002`. La
  contraseña no se guarda en archivos. Excluida de la analítica por su dominio.
- Casos manuales: **Suite 14** de `docs/PRUEBAS_FUNCIONALES.md`.
- Verificar siempre contra el sistema real (regla dura de `CLAUDE.md`): las pruebas con mocks no detectaron, por
  ejemplo, el id sin tilde de Batería; lo detectó el usuario.

---

## 12. Decisiones abiertas y fases pendientes

(Registradas con más detalle en `docs/PENDIENTES.md`.)

- **Pesados y buses** (§6): ¿se usa la app con ellos? Define clases, filtros y ciclos propios.
- **Plan de integridad, fases pendientes:** sello de origen visible al comprador y auditoría de ediciones
  (tabla de auditoría de cada edición/borrado), ventana de 48 h para borrar/editar registros propios, botón
  de eliminar el historial anterior en pantalla.
- **Tarjeta:** tarjetas antiguas sin VIN u otro campo; cruce con RUNT; qué hacer si luego cambian datos de una
  venta ya publicada.
- **Infra:** `DEEPSEEK_API_KEY` en Railway; `ENCRYPTION_KEY` igual en todos los entornos.
- **Datos de prueba a corregir a mano:** un registro de aceite con 2000 km y próximo servicio 2000; la clase
  de ZYM-35C guardada como "Auto" (es moto).

---

## 13. Registro de decisiones (2026-10-05)

| Decisión | Por qué |
|---|---|
| Validaciones en el servidor, no solo en el navegador | Un POST directo se saltaba las reglas del navegador |
| Fecha editable pero acotada a 30 días | Equilibrio entre honestidad del historial y registrar con poco retraso |
| Odómetro de solo agregar + kilometraje inicial obligatorio | Detectar kilometrajes que bajan; punto de partida del historial |
| Historial anterior como nivel aparte, con soporte obligatorio | Aceptar historia previa sin diluir lo verificado |
| Filtros exclusivos por registro | Cada filtro tiene un ciclo distinto |
| Tipo de vehículo detectado, no elegido | Menos pasos y menos errores del usuario |
| Fluidos separados de las partes | El aceite no es una pieza |
| El aceite de caja/transmisión solo aporta km y fila en servicios | No contaminar el conteo del aceite de motor |
| Salud con piso por testigos críticos | El promedio escondía un aceite vencido |
| Tarjeta: todo obligatorio para revisar; confirmación a mano para vender; documento cifrado | Una tarjeta real trae todos los datos; datos personales protegidos |
| Wizard sin envío automático a revisión | La verificación completa se hace en una etapa posterior |
| Admin y cuentas `@carlink.internal` fuera de métricas | No contaminar los resultados |
