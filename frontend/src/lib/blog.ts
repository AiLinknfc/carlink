/* Blog y noticias de CarLink — contenido estático versionado en el repo (sin CMS ni base de datos).
   Para publicar una entrada: agregar un objeto a POSTS con `published: true`. Las entradas
   con `published: false` no aparecen en el listado, el sitemap ni tienen página.
   Sin emojis (docs/DESIGN_GUIDELINES.md). Bloques: h2 = subtítulo, p = párrafo, ul = lista. */

export type BlogBlock =
  | { type: 'h2'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }

export type BlogCategory = 'Noticias' | 'Producto' | 'Talleres' | 'Guías'

export interface BlogPost {
  slug: string
  title: string
  excerpt: string
  category: BlogCategory
  /** ISO yyyy-mm-dd */
  date: string
  readMinutes: number
  published: boolean
  blocks: BlogBlock[]
}

export const POSTS: BlogPost[] = [
  {
    slug: 'abrimos-la-red-de-talleres-carlink',
    title: 'Abrimos la postulación a la red de talleres CarLink',
    excerpt: 'Talleres, proveedores de repuestos y negocios del sector ya pueden postularse a la red con su NIT y su logo.',
    category: 'Noticias',
    date: '2026-09-21',
    readMinutes: 2,
    published: true,
    blocks: [
      { type: 'p', text: 'Desde hoy cualquier taller, proveedor de repuestos o negocio del sector automotriz puede postularse a la red CarLink desde una página propia, sin necesidad de crear una cuenta primero.' },
      { type: 'h2', text: 'Cómo funciona' },
      { type: 'ul', items: [
        'Llenas el formulario con el NIT, los datos de contacto y el logo de tu negocio.',
        'Validamos el NIT y la información y te respondemos por correo.',
        'Si tu postulación se aprueba, creas tu cuenta de taller con el mismo NIT y empiezas con 7 días de prueba.',
      ] },
      { type: 'h2', text: 'Qué gana un taller aliado' },
      { type: 'p', text: 'Un panel para gestionar clientes, órdenes de trabajo, inventario y citas; certificados y facturas numeradas; y un perfil público con reseñas y ubicación en el mapa de talleres.' },
      { type: 'p', text: 'Tu logo solo se muestra en el sitio como aliado si lo autorizas de forma expresa en el formulario, y puedes retirar esa autorización cuando quieras escribiendo a business@carlink.com.co.' },
    ],
  },
  {
    slug: 'como-funciona-el-llavero-nfc-carlink',
    title: 'Cómo funciona el llavero NFC de CarLink',
    excerpt: 'Un toque con el celular abre la ficha de tu vehículo. Qué ve quien lo escanea y qué decides tú.',
    category: 'Producto',
    date: '2026-09-21',
    readMinutes: 3,
    published: true,
    blocks: [
      { type: 'p', text: 'El llavero NFC de CarLink guarda una dirección web con un código aleatorio. No guarda datos personales: al acercarlo al teléfono, se abre la ficha pública del vehículo en el navegador, sin instalar ninguna aplicación.' },
      { type: 'h2', text: 'Qué muestra la ficha pública' },
      { type: 'p', text: 'Placa, ciudad, marca, modelo, año, color, kilometraje, un resumen del último servicio y el nombre del taller. Nunca muestra el nombre, el correo ni el documento de identidad del propietario.' },
      { type: 'h2', text: 'Lo que decides tú' },
      { type: 'ul', items: [
        'Contacto por WhatsApp, información de venta, aviso de llavero perdido y ubicación de talleres están desactivados por defecto.',
        'Puedes activar o apagar cada opción cuando quieras desde tu cuenta.',
        'El historial lo ingresas y administras tú; CarLink no lo certifica ni reemplaza documentos oficiales como el RUNT, el SOAT o la revisión técnico-mecánica.',
      ] },
      { type: 'p', text: 'Crear tu ficha es gratis. El llavero libera todos los servicios y la publicación de tu ficha. Consulta los términos completos en Uso, Planes y Espacio.' },
    ],
  },
  {
    slug: 'documentos-que-debes-tener-al-dia-en-tu-vehiculo',
    title: 'Los documentos que conviene tener al día en tu vehículo',
    excerpt: 'SOAT, revisión técnico-mecánica, tarjeta de propiedad y facturas: por qué ordenarlos evita problemas al vender o al reclamar una garantía.',
    category: 'Guías',
    date: '2026-09-21',
    readMinutes: 3,
    published: true,
    blocks: [
      { type: 'p', text: 'Tener a mano los documentos de tu vehículo ahorra tiempo en un control de tránsito, en un siniestro y, sobre todo, al momento de venderlo. Esta es una guía general; para requisitos específicos de tu caso consulta siempre los canales oficiales, como el RUNT.' },
      { type: 'h2', text: 'Los básicos' },
      { type: 'ul', items: [
        'SOAT: seguro obligatorio, con su fecha de vencimiento a la vista.',
        'Revisión técnico-mecánica y de gases: se exige según el tipo y la antigüedad del vehículo.',
        'Tarjeta de propiedad: acredita quién es el propietario registrado.',
        'Seguro adicional o póliza todo riesgo, si la tienes.',
      ] },
      { type: 'h2', text: 'Los que suelen olvidarse' },
      { type: 'ul', items: [
        'Facturas de cada mantenimiento: son la evidencia del trabajo hecho y de su garantía.',
        'Fotos del estado del vehículo y del odómetro en cada servicio.',
        'Certificados de garantía de repuestos y de mano de obra, con sus plazos.',
      ] },
      { type: 'p', text: 'En CarLink puedes guardar todo esto en la sección de Documentos de tu ficha, con recordatorios antes de cada vencimiento. Guarda además una copia de los originales: el almacenamiento en la nube es una comodidad, no una copia de respaldo garantizada.' },
    ],
  },
]

export const publishedPosts = (): BlogPost[] =>
  POSTS.filter(p => p.published).sort((a, b) => b.date.localeCompare(a.date))

export const getPost = (slug: string): BlogPost | undefined =>
  publishedPosts().find(p => p.slug === slug)

export const formatPostDate = (iso: string): string =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
