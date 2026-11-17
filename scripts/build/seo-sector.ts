/*
 * El texto de las páginas de sector. Vive aquí y no en el catálogo de `src/i18n` porque solo lo usa el
 * build (el HTML servido y los metadatos): en el catálogo viajaría en el paquete inicial de cada visita,
 * que tiene un presupuesto (`npm run perf:budget`) y ya iba justo.
 *
 * Salen solo cuando hay dos o más sectores con locales.
 */
export const SEO_SECTOR = {
  es: {
    sectores: 'Sectores',
    nombre: '{label} en Zibatá',
    // El título es el nombre y dónde, como el de las categorías: corto y el mismo en cada sector.
    titulo: '{label} en Zibatá · Visit Zibatá',
    // Con más de tres categorías se nombran tres y "y más": la lista entera se comía la descripción.
    ymas: 'y más',
    descripcion: {
      one: '{label} en Zibatá. {categorias}, con horario, contacto y cómo llegar.',
      other: '{label} en Zibatá. {categorias}, con horarios, contacto y cómo llegar.',
    },
  },
  en: {
    sectores: 'Sectors',
    nombre: '{label} in Zibatá',
    titulo: '{label} in Zibatá · Visit Zibatá',
    ymas: 'and more',
    descripcion: {
      one: '{label} in Zibatá. {categorias}, with hours, contact and directions.',
      other: '{label} in Zibatá. {categorias}, with hours, contact and directions.',
    },
  },
} as const
