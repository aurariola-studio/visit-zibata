/**
 * Los títulos de las páginas fijas de información.
 *
 * Una ficha y una categoría comparten con ellas el patrón `{nombre} · Visit Zibatá`. Un local o una
 * categoría con uno de estos nombres dejaría dos páginas con el mismo título. La lista se compara
 * con las copias de la guía en una prueba; el Worker la usa para rechazarlo antes de la PR.
 */
export const TITULOS_RESERVADOS = [
  'Acerca de esta guía',
  'Privacidad y términos',
  'Contacto',
  'Cómo usar la guía',
  'About this guide',
  'Privacy and terms',
  'Contact',
  'How to use the guide',
] as const
