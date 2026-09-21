/* Contenido legal de CarLink — ÚNICA fuente para el modal (PolicyModal.tsx) y el PDF
   (legalPdf.ts). Antes el texto estaba duplicado en los dos y se desincronizó; si se
   cambia una cláusula, se cambia solo acá y se sube LEGAL_VERSION.

   Regla de este archivo: solo se afirma lo que el sistema hace de verdad (verificado contra
   el código el 2026-09-20). Si una función deja de existir o cambia (p. ej. el tope de
   archivos, un proveedor, el borrado de cuenta), este texto debe cambiar en el mismo commit.
   Sin emojis (regla de la interfaz, docs/DESIGN_GUIDELINES.md). */

import { SUPPORT_PHONE_DISPLAY, SUPPORT_WHATSAPP_DISPLAY } from './checkout'

export const LEGAL_VERSION = '2.1'
export const LEGAL_UPDATED = '21 de septiembre de 2026'
export const LEGAL_EMAIL = 'business@carlink.com.co'
export const LEGAL_ADDRESS = 'Cl. 87 #20-42, Bogotá D.C., Colombia'

/** Tope por archivo que aplica el backend (`MAX_FILE_SIZE` en backend/app/utils.py). */
export const MAX_FILE_MB = 10

export type LegalTabId = 'privacy' | 'warranty' | 'terms'

export interface LegalSection {
  title: string
  paras?: string[]
  items?: string[]
  /** Aviso destacado al final de la sección. */
  note?: string
}

export interface LegalDoc {
  id: LegalTabId
  tabLabel: string
  title: string
  law: string
  intro: { title: string; text: string }
  sections: LegalSection[]
}

const CONTACT = `${LEGAL_EMAIL}, WhatsApp ${SUPPORT_WHATSAPP_DISPLAY} o teléfono ${SUPPORT_PHONE_DISPLAY}`

/* ─────────────────────────── PRIVACIDAD ─────────────────────────── */

const PRIVACY: LegalDoc = {
  id: 'privacy',
  tabLabel: 'Privacidad de Datos',
  title: 'Política de Privacidad y Tratamiento de Datos Personales',
  law: 'Constitución art. 15 · Ley Estatutaria 1581 de 2012 · Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) · Ley 2300 de 2023',
  intro: {
    title: 'Tus datos son tuyos',
    text: 'CarLink guarda el historial de tu vehículo para que tú lo controles: tú decides qué cargas, qué se muestra al público y cuándo lo borras. Esta política explica qué datos tratamos, con quién los compartimos, cuánto los conservamos y cómo ejercer tus derechos.',
  },
  sections: [
    {
      title: '1. Responsable del tratamiento',
      paras: [
        `CarLink S.A.S., con domicilio en ${LEGAL_ADDRESS}, es responsable del tratamiento de tus datos personales. Contacto para cualquier tema de datos: ${CONTACT}.`,
        'Para los datos que un taller o empresa registra sobre sus propios clientes dentro de su panel de negocio, ese taller es responsable de esos datos frente a sus clientes y CarLink actúa como su encargado (proveedor de la herramienta).',
      ],
    },
    {
      title: '2. Datos que tratamos',
      items: [
        'Cuenta: correo de tu cuenta de Google, nombre, teléfono o WhatsApp y número de documento de identidad (cuando lo ingresas para verificar tu perfil).',
        'Vehículo: placa, ciudad, marca, modelo, año, color, kilometraje y, si la cargas, la tarjeta de propiedad (que incluye el nombre del propietario que figura en ella).',
        'Mantenimiento: servicios, piezas, gastos, fotos de evidencia, recibos y documentos que subas (SOAT, revisión técnico-mecánica, pólizas, facturas).',
        'Llavero NFC y QR: un código aleatorio y el registro de activación y escaneos. En el chip no se graba ningún dato personal, solo una dirección web con ese código.',
        'Compras: nombre, teléfono, dirección de envío, correo y referencia del pedido. Los datos de tu tarjeta o cuenta bancaria los procesa la pasarela de pagos; CarLink no los almacena.',
        'Talleres y empresas: NIT, razón social, ubicación del taller y los datos de clientes, órdenes e inventario que el propio taller registra.',
        'Postulaciones de talleres y negocios (landing /taller): nombre comercial, razón social, NIT, ciudad, dirección, datos de contacto (nombre, cargo, teléfono, correo), sitio web e Instagram, especialidades, volumen de atención, logo, foto de fachada y, si lo adjuntas, Cámara de Comercio o RUT. Guardamos la versión de este texto que aceptaste.',
        'Contacto por llavero encontrado: el mensaje y los datos de contacto que deja quien encuentra un llavero, que enviamos al dueño por correo.',
        'Analítica propia: un identificador aleatorio de navegador y de sesión, páginas visitadas, tipo de dispositivo y origen de la visita (UTM). No guardamos tu IP en la analítica. Si tienes la sesión iniciada, el evento puede asociarse a tu cuenta.',
        'Almacenamiento local del navegador: preferencias (tema claro/oscuro), carrito y avisos que descartaste. No usamos cookies de publicidad de terceros.',
      ],
      note: 'No solicitamos datos sensibles (salud, origen étnico, biometría, orientación política o sexual). Evita subir documentos que los contengan. Si subes fotos o documentos de otra persona, es tu responsabilidad contar con su autorización. El servicio es para mayores de 18 años.',
    },
    {
      title: '3. Para qué usamos tus datos (finalidades)',
      items: [
        'Crear y administrar tu cuenta, tu ficha técnica digital y tu llavero.',
        'Permitir que quien escanee tu llavero vea únicamente la información pública que tú habilitaste.',
        'Registrar y consultar servicios, kilometraje, documentos, gastos y recordatorios de mantenimiento.',
        'Procesar compras, envíos, activación del llavero y atención posventa.',
        'Evaluar postulaciones de talleres y negocios, validar su NIT y contactar a quien postula. El logo y el nombre del negocio solo se muestran públicamente como aliado si lo autorizas de forma expresa y puedes revocarlo cuando quieras.',
        'Enviarte avisos operativos (pedido, código de activación, llavero encontrado, vencimientos) por correo o WhatsApp.',
        'Mejorar el producto con analítica agregada y prevenir fraude, abuso y suplantación.',
        'Cumplir obligaciones legales, contables y atender requerimientos de autoridades competentes.',
      ],
      note: 'Los mensajes comerciales o promocionales solo se envían con tu consentimiento y dentro de los horarios y límites de la Ley 2300 de 2023. CarLink no vende tus datos personales.',
    },
    {
      title: '4. Autorización',
      paras: [
        'Al crear tu cuenta y aceptar esta política das tu autorización previa, expresa e informada para el tratamiento descrito. Puedes revocarla y pedir la supresión de tus datos cuando quieras, salvo que exista un deber legal o contractual de conservarlos (sección 10). Si revocas, algunas funciones que dependen de esos datos dejarán de estar disponibles.',
        'El aviso por WhatsApp de tu pedido requiere una casilla de consentimiento aparte, que viene desmarcada.',
      ],
    },
    {
      title: '5. Qué ve el público al escanear tu llavero',
      paras: [
        'La ficha pública que abre el llavero NFC o el QR muestra: placa, ciudad, marca, modelo, año, color, kilometraje, resumen del último servicio y nombre del taller. Nunca muestra tu nombre, correo ni documento de identidad.',
        'Estas opciones están desactivadas por defecto y solo se muestran si tú las activas: contacto por WhatsApp, información de venta (precio, ciudad, teléfono, descripción), aviso de llavero perdido y ubicación de los talleres (georreferenciación). Puedes apagarlas cuando quieras desde tu cuenta.',
        'Lo que publiques deliberadamente (por ejemplo tu teléfono en una venta) queda visible para quien escanee el llavero mientras esa opción esté activa. Quien lo vea puede copiarlo; retirarlo después no borra copias que otra persona ya hizo.',
      ],
    },
    {
      title: '6. Con quién compartimos datos y transferencia internacional',
      paras: [
        'Para operar el servicio contamos con terceros que actúan como encargados del tratamiento. Reciben solo lo necesario para su función y están obligados por sus propios estándares de seguridad y privacidad. No los nombramos uno a uno por razones de seguridad, pero los agrupamos por tipo de servicio:',
      ],
      items: [
        'Infraestructura tecnológica: alojamiento de la aplicación y del servidor, base de datos, autenticación y almacenamiento de fotos y documentos.',
        'Acceso con cuenta de terceros: el inicio de sesión con tu cuenta de Google.',
        'Pagos: entidades y pasarelas de pago autorizadas, que procesan los datos de tu medio de pago.',
        'Mensajería y correo: canales de mensajería (por ejemplo WhatsApp) y correo electrónico para enviarte avisos de pedido, el código de activación y notificaciones del servicio, usando el teléfono o correo que nos diste.',
        'Inteligencia artificial: un proveedor externo estructura el texto extraído de recibos, de la tarjeta de propiedad y de las consultas del Diagnóstico IA de los talleres. La imagen se lee en nuestro servidor; al proveedor de IA se envía solo el texto extraído, que puede incluir datos personales del documento.',
        'Analítica y seguridad: herramientas propias de medición y control de abuso.',
      ],
      note: 'Estos proveedores pueden operar servidores fuera de Colombia, por lo que tus datos pueden ser transferidos o transmitidos al exterior (art. 26 de la Ley 1581). Con tu autorización, aceptas esa transferencia para las finalidades de esta política. El escaneo con IA lo inicias tú, documento por documento: si no quieres que el texto de un documento llegue a ese proveedor, no lo escanees. Puedes pedirnos por correo la lista actualizada de categorías y países de destino. También podemos entregar información a autoridades cuando la ley lo exija. CarLink no vende tus datos.',
    },
    {
      title: '7. Seguridad',
      items: [
        'Toda la comunicación viaja cifrada por HTTPS/TLS.',
        'La base de datos y el almacenamiento de archivos cifran los datos en reposo (AES-256, provisto por nuestros proveedores de infraestructura).',
        'Los códigos de los llaveros se guardan solo como huella criptográfica (hash) y las direcciones asociadas se guardan cifradas con AES-256-GCM. Las llaves de cifrado no están en el código.',
        'Cada cuenta solo accede a sus propios registros mediante reglas de acceso por usuario; el panel de administración está restringido.',
        'Limitamos la frecuencia de intentos en activación, contacto público y analítica para frenar el abuso.',
      ],
      note: 'Ningún sistema es 100% seguro. Aplicamos medidas razonables, pero no podemos garantizar ausencia total de incidentes. Si ocurre uno que afecte tus datos, te lo notificaremos y lo reportaremos a la autoridad cuando corresponda.',
    },
    {
      title: '8. Tú controlas tus datos y eres responsable de ellos',
      paras: [
        'CarLink es una herramienta: los datos de tu ficha los ingresas y administras tú. Por eso:',
      ],
      items: [
        'Tú decides qué vehículos, servicios, fotos y documentos cargas. No estamos obligados a revisar ni validar lo que subes.',
        'Tú decides qué opciones públicas activas (WhatsApp, venta, llavero perdido, georreferencia) y puedes desactivarlas en cualquier momento.',
        'Tú puedes editar tus registros y eliminar vehículos, servicios y archivos desde la aplicación. Lo que elimines deja de estar disponible para ti y para quien lo veía; te recomendamos descargar antes lo que quieras conservar.',
        'Los archivos se sirven mediante un enlace con identificador aleatorio difícil de adivinar, pero sin contraseña: cualquier persona que tenga el enlace exacto podría abrirlo. No compartas ni publiques enlaces directos de tus documentos.',
        'Tú custodias tu cuenta, tu llavero, tu código de activación y tus dispositivos. Avísanos de inmediato si pierdes el llavero o crees que alguien accedió a tu cuenta; no somos responsables por accesos derivados de compartir tus credenciales o tu llavero.',
        'Si vinculas tu vehículo con un taller, autorizas que ese taller registre en tu ficha los servicios que te preste. Si no quieres ese registro, no lo vincules o escríbenos.',
        'Al transferir un vehículo, el historial pasa al nuevo propietario. Revisa antes qué documentos personales tienes cargados.',
        'Eres responsable de que la información que ingresas sea veraz, en especial placa, kilometraje y datos de propiedad.',
      ],
    },
    {
      title: '9. Tus derechos (Habeas Data)',
      items: [
        'Conocer, actualizar y rectificar tus datos.',
        'Solicitar prueba de la autorización que nos diste.',
        'Ser informado del uso que damos a tus datos.',
        'Presentar quejas ante la Superintendencia de Industria y Comercio (sic.gov.co), una vez agotado el trámite ante CarLink.',
        'Revocar la autorización y solicitar la supresión de tus datos cuando no se respeten los principios, derechos y garantías legales.',
        'Acceder de forma gratuita a tus datos, al menos una vez por mes calendario.',
      ],
      paras: [
        `Cómo ejercerlos: escribe a ${LEGAL_EMAIL} con el asunto "HABEAS DATA", indicando tu nombre, documento, correo de la cuenta y qué pides. Responderemos las consultas en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles (prorrogables según los artículos 14 y 15 de la Ley 1581, avisándote los motivos). Podemos pedirte que acredites tu identidad para proteger tus datos.`,
      ],
    },
    {
      title: '10. Cuánto tiempo conservamos los datos',
      items: [
        'Mientras tu cuenta esté activa y sea necesario para las finalidades de esta política.',
        'Si pides eliminar tu cuenta, suprimimos o anonimizamos tus datos dentro de los plazos de ley, salvo lo que debamos conservar por obligación legal: por ejemplo, soportes de pedidos y facturación, que la ley comercial exige guardar hasta 10 años.',
        'Las postulaciones rechazadas o sin respuesta se eliminan a más tardar a los 12 meses; las aprobadas pasan a la cuenta del taller y se rigen por la regla general.',
        'La analítica se conserva de forma anonimizada o agregada.',
        'Copias de respaldo de los proveedores pueden conservar datos por un tiempo limitado antes de eliminarse por completo.',
      ],
      note: 'Hoy la eliminación completa de la cuenta se gestiona por solicitud al correo de contacto; los vehículos, servicios y archivos sí puedes eliminarlos tú desde la aplicación.',
    },
    {
      title: '11. Cambios a esta política',
      paras: [
        `Si cambiamos esta política de forma sustancial, te avisaremos por la aplicación o por correo antes de que aplique y actualizaremos la versión y la fecha. Versión ${LEGAL_VERSION}, actualizada el ${LEGAL_UPDATED}.`,
      ],
    },
  ],
}

/* ─────────────────────────── GARANTÍA ─────────────────────────── */

const WARRANTY: LegalDoc = {
  id: 'warranty',
  tabLabel: 'Términos de Garantía',
  title: 'Términos de Garantía y Responsabilidad',
  law: 'Ley 1480 de 2011 (Estatuto del Consumidor) · Ley 527 de 1999 (mensajes de datos)',
  intro: {
    title: 'Quién responde por qué',
    text: 'CarLink vende el llavero y opera la plataforma. Los talleres son negocios independientes que responden por su propio trabajo. Estos términos dejan claro el alcance de cada uno, sin limitar tus derechos legales como consumidor.',
  },
  sections: [
    {
      title: '1. Roles',
      items: [
        'CarLink: vende el llavero NFC/QR y opera la plataforma tecnológica donde se registra y consulta el historial del vehículo. Responde por el producto que vende y por el funcionamiento de la plataforma en los términos de la ley.',
        'Talleres y empresas: prestadores independientes, no empleados ni agentes de CarLink. Responden ante el cliente por la calidad de sus servicios, repuestos y garantías.',
        'Propietario o conductor: responde por la veracidad de lo que registra y por el uso que hace de la plataforma.',
      ],
    },
    {
      title: '2. Garantía legal y tus derechos como consumidor',
      paras: [
        'Ninguna cláusula de estos documentos limita ni renuncia la garantía legal, el derecho de retracto ni los demás derechos irrenunciables que te da la Ley 1480 de 2011. Si alguna cláusula contradijera la ley, prevalece la ley.',
      ],
    },
    {
      title: '3. Garantía del llavero NFC',
      paras: [
        'El llavero tiene garantía de reposición sin costo por defectos de fabricación o fallas de lectura del chip que no se deban a uso indebido, durante su vida útil con uso normal. Es una garantía comercial que se suma a la garantía legal.',
        'El cuerpo del llavero es de PLA (plástico) sellado con resina. Evita dejarlo expuesto por tiempo prolongado a calor intenso, por ejemplo dentro de un vehículo cerrado al sol; el deterioro por calor extremo no se considera defecto de fabricación.',
      ],
      items: [
        'Cómo pedirla: escribe a ' + CONTACT + ' con tu número de pedido o el código del llavero y una foto del daño.',
        'Coordinamos la reposición con soporte para mantener el vínculo con tu vehículo y desactivar el llavero anterior por seguridad.',
      ],
    },
    {
      title: '4. Servicios de mantenimiento y reparación',
      paras: [
        'CarLink no presta servicios de mecánica ni garantiza el trabajo de los talleres. La cobertura de un servicio (plazo en meses o kilómetros, mano de obra y repuestos) la define y la responde cada taller, y debe quedar registrada en el documento de garantía que el taller entregue.',
        'Si el taller no indicó un plazo, aplica el mínimo que fije la ley para ese tipo de servicio. Los talleres de la red se comprometen a respaldar lo que registren en la plataforma, pero la obligación es del taller, no de CarLink.',
        'La fecha y el kilometraje registrados en la ficha sirven como evidencia de referencia para un reclamo, junto con la factura y demás soportes del servicio.',
      ],
    },
    {
      title: '5. Naturaleza de la información registrada',
      items: [
        'Los servicios, el kilometraje, las fotos y los documentos los ingresan usuarios y talleres. CarLink no los certifica ni verifica de forma independiente su exactitud, y pueden corregirse o eliminarse.',
        'La ficha de CarLink no reemplaza el RUNT, el SOAT, la revisión técnico-mecánica, un peritaje ni ningún documento oficial. Antes de comprar o vender un vehículo, verifica su estado y su documentación por los canales oficiales.',
        'El historial reduce el riesgo de fraude de kilometraje, pero no lo elimina ni lo garantiza.',
        'Los registros electrónicos tienen el valor probatorio que la ley reconozca a los mensajes de datos (Ley 527 de 1999); no son una certificación de CarLink.',
      ],
    },
    {
      title: '6. Exclusiones de la garantía del llavero',
      items: [
        'Daño por accidente, colisión, fuego, agua a presión extrema o calor extremo que destruya el chip, la antena o el cuerpo.',
        'Perforación, corte, apertura o manipulación intencional del dispositivo.',
        'Desgaste estético normal por uso.',
        'Pérdida o robo del llavero (para reponerlo aplica el proceso de llavero perdido, que puede tener costo).',
        'Fallas de lectura por el teléfono, su funda, un bloqueador o una función NFC desactivada.',
      ],
    },
    {
      title: '7. Lo que CarLink no garantiza ni asume',
      paras: [
        'En la medida permitida por la ley, CarLink no responde por:',
      ],
      items: [
        'El trabajo, los precios, los repuestos o los incumplimientos de los talleres, ni por decisiones que tomes basándote en información registrada por terceros.',
        'Que la información de un vehículo sea completa, actual o exacta, ni por negocios de compraventa hechos a partir de ella.',
        'Daños por el uso indebido de la cuenta, del llavero o de enlaces compartidos por el propio usuario.',
        'Información que el usuario decide publicar (venta, contacto) o que otros copien de la ficha pública.',
        'Interrupciones o pérdidas de datos causadas por fallas de proveedores externos, de internet, casos fortuitos o fuerza mayor, aunque mantenemos medidas razonables de continuidad.',
        'Pérdida de datos por eliminaciones hechas por el propio usuario.',
        'Daños indirectos como lucro cesante o pérdida de oportunidades.',
      ],
      note: 'Salvo dolo, culpa grave u obligaciones que la ley no permita limitar, la responsabilidad total de CarLink por un reclamo se limita al valor pagado por el producto o servicio que lo originó.',
    },
    {
      title: '8. Compras a distancia, retracto y devoluciones',
      paras: [
        'Si compras por internet, tienes derecho de retracto dentro de los 5 días hábiles siguientes a la entrega (art. 47 de la Ley 1480), devolviendo el producto en las condiciones en que lo recibiste. Los costos de devolución corren por tu cuenta y te reembolsamos dentro de los 30 días calendario siguientes. El retracto no aplica en los casos que la ley exceptúa, como bienes confeccionados o personalizados según tus especificaciones. Un llavero ya activado se considera usado.',
        'El pedido con pago contraentrega se confirma al recibirlo y pagarlo.',
      ],
    },
    {
      title: '9. Cómo presentar un reclamo',
      items: [
        `Escribe a ${CONTACT} con tu nombre, contacto, descripción y soportes. Respondemos en el menor tiempo posible y a más tardar en 15 días hábiles.`,
        'Para un servicio de taller, acude primero al taller que lo prestó; si no responde, cuéntanos y te orientamos.',
        'También puedes acudir a la Superintendencia de Industria y Comercio (sic.gov.co), autoridad de protección al consumidor.',
      ],
    },
    {
      title: '10. Ley aplicable',
      paras: [
        'Estos términos se rigen por las leyes de Colombia. Conservas siempre tu derecho de acudir a la Superintendencia de Industria y Comercio o a los jueces competentes.',
      ],
    },
  ],
}

/* ─────────────────────── USO, PLANES Y ESPACIO ─────────────────────── */

const TERMS: LegalDoc = {
  id: 'terms',
  tabLabel: 'Uso, Planes y Espacio',
  title: 'Términos de Uso, Planes y Espacio en la Nube',
  law: 'Ley 1480 de 2011 · Ley 527 de 1999 · Ley 1581 de 2012',
  intro: {
    title: 'Qué incluye tu plan y qué esperamos de ti',
    text: 'Explica qué puedes hacer gratis, qué se libera con el llavero, cuánto puedes guardar en la nube y qué responsabilidades tienes sobre tu cuenta y tus datos.',
  },
  sections: [
    {
      title: '1. Plan gratuito (persona)',
      items: [
        'Puedes registrar un vehículo y usar el servicio de aceite.',
        'Los demás servicios permanecen bloqueados hasta activar un llavero.',
        'No puedes publicar información al exterior: ficha pública por NFC o QR y publicación de venta.',
      ],
    },
    {
      title: '2. Con llavero activado',
      items: [
        'Al activar con el código del empaque, se liberan los demás servicios y la publicación para ese vehículo.',
        'Cada vehículo adicional necesita su propio llavero.',
        'El acceso asociado a un llavero activado se mantiene mientras el llavero siga activo y cumplas estos términos y el uso justo. No incluye módulos o funciones futuras que se ofrezcan como servicios de pago.',
        'El llavero y el código son personales; no se pueden revender ni compartir para eludir estos límites.',
      ],
      note: 'Una placa queda reservada solo por un vehículo verificado o con llavero activo. Si otra persona ya la reservó, puedes reclamarla verificando tu tarjeta de propiedad.',
    },
    {
      title: '3. Talleres y empresas',
      items: [
        'Son cuentas separadas de las de persona y no necesitan llavero.',
        'Incluyen un período de prueba de 7 días. Terminado, el acceso a los módulos del panel puede quedar restringido hasta contratar el plan que corresponda, que te informaremos antes con su precio y alcance.',
        'El taller es responsable de la veracidad de la información que registra, de la relación con sus clientes y del tratamiento de los datos de estos (ver Política de Privacidad, sección 1).',
        'Se requiere un NIT válido y una razón social real; el uso con datos falsos puede suspender la cuenta.',
      ],
    },
    {
      title: '4. Espacio en la nube',
      paras: [
        `Tus fotos, recibos y documentos (SOAT, revisión técnico-mecánica, tarjeta de propiedad, pólizas, facturas) se guardan en almacenamiento en la nube. Cada archivo puede ser una imagen o un PDF de hasta ${MAX_FILE_MB} MB.`,
        'El espacio total por cuenta de persona depende de tu plan:',
      ],
      items: [
        'Registro gratuito por la web: 100 MB.',
        'Con un llavero individual activado: 200 MB.',
        'Con el Kit de 3 llaveros (3 o más llaveros activos en tu cuenta): 500 MB.',
        'Talleres y empresas: sin tope definido por ahora; rige el uso razonable.',
        'Lo que elimines libera espacio de inmediato. Si llegas al límite no podrás subir archivos nuevos, pero no borramos ni bloqueamos lo que ya tienes guardado.',
        'No se permite usar CarLink como almacenamiento general, para distribuir contenido ajeno al servicio ni para cargas automatizadas masivas.',
        'Si más adelante cambiamos los cupos, te avisaremos con al menos 30 días de anticipación y respetaremos lo que ya tienes guardado durante ese plazo.',
      ],
      note: 'El espacio en la nube es un servicio de conveniencia, no una copia de respaldo garantizada. Conserva copias de los documentos importantes (originales, factura de compra, tarjeta de propiedad).',
    },
    {
      title: '5. Uso permitido',
      items: [
        'Usa CarLink solo para vehículos y datos sobre los que tengas derecho.',
        'No subas contenido ilegal, que infrinja derechos de terceros, que contenga malware o datos sensibles de otras personas sin su autorización.',
        'No hagas extracción masiva de datos (scraping), ingeniería inversa, suplantación ni intentos de eludir la seguridad, los límites del plan o el registro de placas.',
        'No crees varias cuentas para eludir límites o períodos de prueba.',
        'Puedes escribirnos para reportar abusos o contenido que vulnere tus derechos.',
      ],
    },
    {
      title: '6. Tu responsabilidad sobre tu cuenta y tus datos',
      items: [
        'Tú controlas qué información cargas, qué opciones públicas activas y qué eliminas. CarLink no revisa previamente lo que subes.',
        'Custodia tu sesión, tu llavero y tu código de activación; avísanos de inmediato si se pierden o comprometen.',
        'Eres responsable de la veracidad de los datos y de contar con autorización sobre los datos de terceros que subas.',
        'Antes de vender, transferir o eliminar tu vehículo, revisa y descarga lo que quieras conservar.',
      ],
    },
    {
      title: '7. Suspensión y terminación',
      paras: [
        'Podemos suspender o cerrar cuentas que incumplan estos términos, avisando el motivo cuando sea posible, y podemos retener lo que la ley nos obligue a conservar. Puedes dejar de usar el servicio y pedir la eliminación de tu cuenta cuando quieras (ver Política de Privacidad, sección 10).',
      ],
    },
    {
      title: '8. Disponibilidad del servicio y cambios',
      paras: [
        'Trabajamos para mantener la plataforma disponible, pero pueden ocurrir interrupciones por mantenimiento o fallas de terceros. Podemos mejorar, cambiar o retirar funciones; los cambios de precios o de las condiciones de un plan se avisan con anticipación y no afectan lo que ya pagaste durante el período vigente.',
        `Versión ${LEGAL_VERSION}, actualizada el ${LEGAL_UPDATED}. Para cualquier duda: ${CONTACT}.`,
      ],
    },
  ],
}

export const LEGAL_DOCS: Record<LegalTabId, LegalDoc> = {
  privacy: PRIVACY,
  warranty: WARRANTY,
  terms: TERMS,
}

/** Orden en el PDF completo. */
export const LEGAL_ORDER: LegalTabId[] = ['privacy', 'warranty', 'terms']
