/* Categorías de partes — únicas para el formulario y el filtro del tab, para que
   no puedan desincronizarse. "Otros" es el valor por defecto de la columna, así
   que toda parte cae siempre en alguna categoría visible. */
export const PART_CATEGORIES = [
  'Frenos', 'Motor', 'Suspensión', 'Eléctrico',
  'Filtros', 'Transmisión', 'Enfriamiento', 'Llantas', 'Otros',
] as const
