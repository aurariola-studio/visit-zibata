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
    titulo: '{label} en Zibatá: {categorias}',
    descripcion: {
      one: '{label} en Zibatá: {categorias}. Un lugar con horario, contacto y cómo llegar.',
      other:
        '{label} en Zibatá: {categorias}. Los {count} lugares de la guía, con horarios, contacto y cómo llegar.',
    },
  },
  en: {
    sectores: 'Sectors',
    nombre: '{label} in Zibatá',
    titulo: '{label} in Zibatá: {categorias}',
    descripcion: {
      one: '{label} in Zibatá: {categorias}. One place, with hours, contact and directions.',
      other:
        '{label} in Zibatá: {categorias}. The {count} places in the guide, with hours, contact and directions.',
    },
  },
} as const
