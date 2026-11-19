import type { Forma } from '../es.ts'

export const seoBuildEs = {
  'seo.imageAlt': 'Mapa de Zibatá con sus plazas y comercios.',
  'seo.home.description':
    'Encuentra tu próximo lugar favorito en Zibatá, con horarios, contacto y ubicación en un solo lugar.',
  // Solo para los locales cuyo nombre se repite (dos sucursales de una misma cadena).
  'seo.title.zone': '{name} en {plaza} · Visit Zibatá',
  // Lo que se añade a una descripción corta: solo los giros y la zona del propio local.
  'seo.place.context': '{giros} en {lugar}.',
  'seo.place.contextLugar': 'En {lugar}.',
  'seo.plaza.fallback': '{name}, Zibatá. Qué hay, horarios y cómo llegar.',
  // Los cuatro siguientes solo salen en el HTML que se sirve antes de que arranque la aplicación
  // (ver scripts/build/contenido.ts). Son texto de interfaz igual: los lee quien no tiene
  // JavaScript, y los lee un buscador.
  'seo.nearby': 'Más en {plaza}',
  'seo.whatsHere': 'Qué hay aquí',
  'seo.zones': 'Las zonas de Zibatá',
  'seo.backHome': 'Ver el mapa de Zibatá',
  // Las páginas de categoría: solo salen en el HTML servido y en los metadatos.
  'seo.categories': 'Categorías',
  /*
   * La descripción dice qué se encuentra y cuántos lugares hay. La cantidad de zonas no entra: la
   * página ya las enseña, y con un solo local la frase se alargaba para decir poco.
   */
  'seo.category.description': {
    one: '{nombre} en Zibatá. Conoce el lugar que la comunidad tiene para ofrecerte, con horario, contacto y cómo llegar.',
    other:
      '{nombre} en Zibatá. Conoce los {count} lugares que la comunidad tiene para ofrecerte, con horarios, contacto y cómo llegar.',
  },
  // Con dos o más giros que la etiqueta no dice, el título los nombra: es lo que la gente busca.
  'seo.category.places': 'Lugares de esta categoría',
  'seo.category.zones': 'Dónde están',
} as const

export type GrupoSeoBuild = Forma<typeof seoBuildEs>
