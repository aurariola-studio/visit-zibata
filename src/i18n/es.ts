/**
 * Textos de la interfaz en español (idioma inicial). Para añadir otro idioma crea `en.ts` con
 * `satisfies Messages` y regístralo en `src/i18n/index.ts`: TypeScript exigirá todas las claves.
 * Valores con `{variable}` se interpolan; los objetos { one, other } son plurales (Intl.PluralRules).
 *
 * Este es el catálogo que viaja en el paquete inicial: solo lleva lo que la interfaz necesita al
 * arrancar. Los textos largos de las ventanas informativas y del tutorial viven en `grupos/`, y se
 * piden junto con el componente que los muestra (ver `cargarGrupo` en `index.ts`). Un texto nuevo va
 * aquí solo si lo lee algo que no es de carga diferida; si no, al grupo de quien lo lee. Ver
 * docs/PLAN-PARTIR-CATALOGO.md.
 */
import type { aboutEs } from './grupos/about.es.ts'
import type { onboardingEs } from './grupos/onboarding.es.ts'
import type { seoBuildEs } from './grupos/seo-build.es.ts'

export const es = {
  'app.name': 'Visit Zibatá',
  'app.tagline': 'La guía local',
  'app.mapLabel': 'Mapa 3D interactivo de Zibatá',

  'search.label': 'Buscar lugares',
  'search.placeholder': 'Busca café, tacos o una zona…',
  'search.placeholderShort': 'Busca en Zibatá…',
  'search.clear': 'Borrar búsqueda',

  'filters.categories': 'Categorías',
  'filters.sectors': 'Sectores',
  'filters.sectorBack': 'Ver todos los sectores',
  'filters.sectorAll': 'Todas las categorías del sector',
  'filters.allCategories': 'Todo',
  'filters.plaza': 'Filtrar por zona',
  'filters.allPlazas': 'Todas las zonas',
  'filters.clear': 'Limpiar filtros',
  'filters.results': { one: '{count} resultado', other: '{count} resultados' },

  'plazas.count': { one: '{count} zona', other: '{count} zonas' },
  'places.count': { one: '{count} lugar', other: '{count} lugares' },

  'explore.title': 'Explora Zibatá',
  'explore.summary': '{plazas} con {places} en el mapa',
  'explore.hint': 'Toca una zona en el mapa o elige una de la lista.',
  /*
   * Cuenta categorías, no lugares: "25 tipos y 24 más" se leería como 24 sitios. Y al añadir tipos de
   * negocio nuevos (servicios, tiendas) la frase sigue valiendo sin tocarla.
   */
  'explore.andMore': '{list} y {count} categorías más',
  'explore.list': 'Zonas',
  'explore.openList': 'Explora Zibatá',
  'explore.expand': 'Ver las zonas',

  'results.title': 'Resultados',
  'results.empty.title': 'Sin resultados',
  'results.empty.body':
    'No encontramos lugares con esos criterios. Prueba otra palabra o limpia los filtros.',
  'results.empty.zone': 'Sin resultados en {plaza}',
  'results.empty.zoneBody':
    'No hay coincidencias en esta zona. Busca en toda la guía o limpia los filtros.',
  'results.empty.wholeGuide': 'Buscar en toda la guía',

  'plaza.label': 'Zona',
  'plaza.places': 'Lugares en esta zona',
  'plaza.empty': 'Aún no hay lugares activos registrados en esta zona.',
  'plaza.filteredEmpty': 'Ningún lugar de esta zona coincide con los filtros.',
  'plaza.showAll': 'Ver todos los lugares de la zona',
  'plaza.select': '{name}, {places}',
  'plaza.directions': 'Cómo llegar a la zona',
  'plaza.comingSoon': 'Próximamente',
  'plaza.comingSoonList': 'En construcción',

  'place.backToPlaza': 'Volver a {plaza}',
  'place.backToResults': 'Volver a Resultados',
  'place.directionsToPlaza': 'Cómo llegar a {plaza}',
  'place.directionsToPlace': 'Cómo llegar a {name}',
  'place.directions': 'Cómo llegar',
  'place.unit.building': 'Edificio',
  'place.unit.floor.sotano': 'Sótano',
  'place.unit.floor.baja': 'Planta Baja',
  'place.unit.floor.alta': 'Planta Alta',
  'place.unit.local': 'Local',
  'place.unit.locales': 'Locales',
  'place.unit.island': 'Isla',
  'place.onlyYou': 'Solo para ti',
  'place.directionsHint': 'Abre Google Maps en una pestaña nueva',
  'place.machineTranslation': 'Traducción automática',
  'place.showOriginal': 'Ver original en español',
  'place.showTranslation': 'Ver traducción',
  'place.hours': 'Horario',
  'place.contact': 'Contacto y redes',
  'place.call': 'Llamar',
  'place.whatsapp': 'WhatsApp',
  'place.website': 'Sitio web',
  'place.instagram': 'Instagram',
  'place.facebook': 'Facebook',
  'place.tiktok': 'TikTok',
  'place.rappi': 'Rappi',
  'place.uberEats': 'Uber Eats',
  'place.didiFood': 'DiDi Food',
  'place.noPhoto': 'Ilustración de la categoría {category}',
  'place.openDetail': 'Ver detalles de {name}',
  'place.savedCount': {
    one: 'Ya es favorito de {count} persona',
    other: 'Ya es favorito de {count} personas',
  },
  'place.missingInfo': 'Aún no tenemos más información de este lugar.',
  'place.detailsLoading': 'Cargando los datos del lugar…',
  'place.detailsError': 'No pudimos cargar la descripción ni los enlaces de este lugar.',

  'hours.open': 'Abierto',
  'hours.openNow': 'Abierto ahora',
  'hours.closed': 'Cerrado',
  'hours.closedNow': 'Cerrado ahora',
  'hours.closedAllDay': 'Cerrado',
  'hours.today': 'Hoy',
  'hours.none': 'Sin horario publicado.',
  'hours.byClasses': 'El horario depende de las clases. Consulta su disponibilidad antes de ir.',
  'hours.byAppointment': 'Se recomienda reservar tu cita. Consulta su disponibilidad antes de ir.',
  'hours.paidAccess': 'El acceso tiene costo. Consulta su disponibilidad antes de ir.',
  'hours.reviewed': 'Horario revisado el {date}.',

  'day.mon': 'Lunes',
  'day.tue': 'Martes',
  'day.wed': 'Miércoles',
  'day.thu': 'Jueves',
  'day.fri': 'Viernes',
  'day.sat': 'Sábado',
  'day.sun': 'Domingo',
  'dayShort.mon': 'Lun',
  'dayShort.tue': 'Mar',
  'dayShort.wed': 'Mié',
  'dayShort.thu': 'Jue',
  'dayShort.fri': 'Vie',
  'dayShort.sat': 'Sáb',
  'dayShort.sun': 'Dom',

  'rating.legend': 'Tu calificación',
  'rating.set': {
    one: 'Calificar {name} con {value} estrella',
    other: 'Calificar {name} con {value} estrellas',
  },
  'rating.hint': 'Califica este lugar',
  'rating.yours': {
    one: 'Calificado con {value} estrella',
    other: 'Calificado con {value} estrellas',
  },
  'rating.preview': {
    one: 'Calificar con {value} estrella',
    other: 'Calificar con {value} estrellas',
  },

  'visit.action': 'Registrar visita',
  'visit.mark': 'Registrar visita a {name}',
  'visit.been': { one: 'Has venido una vez', other: 'Has venido {count} veces' },
  'visit.lastOne': ', la última el {date}.',
  'visit.seeAll': 'Ver todas',
  'visit.hideAll': 'Ocultar',
  'visit.remove': 'Quitar la visita del {date}',
  'visit.prevMonth': 'Mes anterior',
  'visit.nextMonth': 'Mes siguiente',
  'visit.closeCalendar': 'Cerrar el calendario',
  'visit.first': 'Registra tu primera visita',
  'favorites.add': 'Guardar en favoritos',
  'favorites.remove': 'Quitar de favoritos',
  'favorites.filter': 'Favoritos',
  'filters.openNow': 'Abierto ahora',
  // Para el punto de la tarjeta, que no lleva texto a la vista. Lo lee un lector de pantalla.
  'filters.openNowLabel': 'Abierto ahora, {name}',
  'filters.closedNowLabel': 'Cerrado ahora, {name}',
  'filters.unknownHoursLabel': 'Sin horario publicado, {name}',
  'filters.temporarilyClosedLabel': 'Cerrado temporalmente, {name}',

  /*
   * El aviso de cierre temporal. Va en la ficha, antes del horario, porque es lo único que hay que
   * leer antes de salir de casa. El motivo sale de una lista cerrada (ver `cierre` en
   * src/data/schemas.ts): texto libre no se podría decir en inglés.
   */
  'closure.title': 'Cerrado temporalmente',
  'closure.remodelacion': 'Por remodelación.',
  'closure.vacaciones': 'Por vacaciones.',
  'closure.traspaso': 'Por cambio de dueño.',
  'closure.since': 'Así desde el {date}.',
  // Mientras el negocio no dé fecha, la guía no la inventa, y lo dice en vez de callarlo.
  'closure.noReturn': 'Todavía no hay fecha de reapertura.',

  'brand.by': 'Un proyecto de',

  /*
   * Los textos de los metadatos que también usa la aplicación (la pestaña del navegador y el
   * título de cada página). El resto, los que solo escribe el build en el HTML, están en
   * `grupos/seo-build.es.ts`.
   */
  'seo.home.title': 'Visit Zibatá · Tu guía local',
  'seo.title': '{name} · Visit Zibatá',
  // El título de una zona dice a qué se viene a su página: qué hay y cómo llegar.
  'seo.title.plaza': '{name}, qué hay y cómo llegar · Visit Zibatá',
  'seo.category.name': '{label} en Zibatá',
  /*
   * El filtro usa la etiqueta corta a propósito ("Italiana", "Saludable"); el título y la
   * descripción la dicen completa. Solo hace falta en las que son un adjetivo suelto.
   */
  'seo.category.nombre.mexicana': 'Comida Mexicana',
  'seo.category.nombre.italiana': 'Comida Italiana',
  'seo.category.nombre.asiatica': 'Comida Asiática',
  'seo.category.nombre.saludable': 'Comida Saludable',
  'seo.category.nombre.casera': 'Comida Casera',
  'seo.category.nombre.internacional': 'Comida Internacional',

  'share.action': 'Compartir',
  'share.place': 'Compartir {name}',
  /* Etiqueta, no frase: lleva el nombre, los giros y la zona, que es lo que la guía ya publica. */
  'share.text': '{name} · {giros} · {plaza}. Conoce más en',
  'share.copied': 'Copiado',
  'share.failed': 'No se pudo copiar el enlace',

  'panel.close': 'Cerrar panel',
  'a11y.skipToSearch': 'Ir al buscador',
  'link.missing': 'Ese enlace apunta a un lugar que ya no está en la guía.',
  'link.dismiss': 'Cerrar aviso',
  'network.offline': 'Sin conexión a internet. Partes del mapa pueden no cargar hasta que vuelva.',
  'panel.expand': 'Ampliar panel',
  'panel.collapse': 'Reducir panel',
  'panel.label': 'Información de lugares',

  'map.zoomIn': 'Acercar',
  'map.zoomOut': 'Alejar',
  'map.rotate': 'Girar el mapa. Arrastra, o pulsa para girar un octavo de vuelta',
  'map.reset': 'Volver a la vista de Zibatá',
  'map.locate': 'Mostrar mi ubicación',
  'map.locateError': 'No pudimos obtener tu ubicación.',
  'map.loading': 'Cargando Zibatá…',
  'map.loading.preparing': 'Preparando Zibatá',
  'map.loading.areas': 'Trazando las plazas',
  'map.loading.streets': 'Dibujando las calles',
  'map.controls': 'Controles del mapa',
  'map.locateOutside': 'Parece que no estás en Zibatá, así que el mapa sigue mostrando sus zonas.',
  'map.locateUnsupported': 'Este navegador no permite obtener tu ubicación.',
  'map.userLocation': 'Tu ubicación',
  'map.error.title': 'El mapa 3D no está disponible',
  'map.error.webgl':
    'Tu navegador o dispositivo no permite mostrar el mapa 3D (WebGL2). Puedes seguir explorando las zonas y lugares desde la lista.',
  'map.error.generic': 'No pudimos cargar el mapa. Revisa tu conexión e inténtalo de nuevo.',
  'map.retry': 'Reintentar',

  'data.error.title': 'No pudimos cargar los lugares',
  'data.error.body':
    'Ocurrió un problema al leer la información de Zibatá. Inténtalo de nuevo en unos segundos.',
  'data.retry': 'Reintentar',
  'data.loading': 'Cargando lugares…',
  // Nombre accesible del esqueleto de las ventanas: el texto de ellas todavía no ha llegado.
  'dialog.loading': 'Cargando…',
  // Del tutorial, pero también los lee SuggestForm: por eso están aquí y no en el grupo del tutorial.
  'onboarding.demo.place1': 'Café de la plaza',
  'onboarding.demo.message': 'Quiero corregir un horario',
  'about.openShort': 'Acerca',
  'about.title': 'Acerca de esta guía',
  'about.fix': 'Sugiere o contacta',
  'about.suggestShort': 'Sugiere',
  'about.tutorial': 'Ver el tutorial',
  'about.tutorialShort': 'Tutorial',
  'about.tutorialTitle': 'Cómo usar la guía',
  'about.moreLabel': 'Más sobre la guía',
  'about.independent': 'Guía independiente de establecimientos y servicios de la zona.',

  /*
   * Dos nombres para la misma página, y es a propósito. "Privacidad" es la etiqueta corta de la
   * franja del mapa y del pasaporte, donde el ancho es escaso. El título largo es el que se lee
   * dentro y el que se indexa, porque desde la v4.18 esta página también son los términos de uso:
   * eran dos avisos cortos que se repetían, y leerlos juntos es más claro que buscarlos por
   * separado (ver docs/CUENTAS.md para lo que sí se guarda).
   */
  'about.privacy': 'Privacidad',
  'about.privacyTitle': 'Privacidad y términos',

  'about.contribute': 'Sugiere un cambio o contáctanos',
  'suggest.who': '¿Quién escribe?',
  'suggest.whoNeighbor': 'Vecino',
  'suggest.whoOwner': 'Negocio',
  'suggest.whoOther': 'Otro',
  'suggest.place': 'Lugar, zona o asunto',
  'suggest.placeHint': 'Opcional',
  'suggest.message': 'Tu mensaje',
  'suggest.contact': 'Tu correo',
  'suggest.contactHint': 'Opcional',
  'suggest.send': 'Enviar',
  'suggest.sending': 'Enviando…',
  'suggest.ok': 'Gracias. Lo revisamos y entra en la próxima actualización.',
  'suggest.error': 'No se pudo enviar. Inténtalo de nuevo en un rato.',
  'suggest.required': 'Escribe tu mensaje.',
  'suggest.contactInvalid': 'Ese correo no parece un correo. Revísalo o déjalo en blanco.',
  'suggest.again': 'Enviar otro mensaje',
  /* Etiqueta del campo trampa: solo la oyen los lectores de pantalla, y les dice que lo dejen. */
  'suggest.trap': 'No rellenes este campo',
  'suggest.note':
    'Tu mensaje se guarda en el servidor de la guía para poder atenderlo. Nada más. Ni cuenta ni dirección.',
  'about.close': 'Cerrar',

  'profile.open': 'Tu Zibatá',
  'profile.title': 'Tu Zibatá',
  'profile.subtitle': 'Tus visitas, tus favoritos y tus notas',
  'profile.tabs': 'Hojas de Tu Zibatá',
  'profile.tabZones': 'Zonas',
  'profile.tabPodium': 'Podio',
  'profile.tabTastes': 'Gustos',
  'profile.journey': 'Tu paso por Zibatá',
  'profile.zonesDone': '{done} de {total}',
  'profile.zonePlaces': { one: '{count} lugar', other: '{count} lugares' },
  'profile.noVisits': 'Todo Zibatá por estrenar. {total} zonas y {places} lugares.',
  'profile.zonesLabel': 'Zonas de Zibatá',
  'profile.zoneDone': 'visitada',
  'profile.zoneSoon': 'Próximamente',
  'profile.zoneSoonShort': 'Pronto',
  'profile.saved': 'guardado',
  'profile.podium': 'Tus tres de siempre',
  'profile.podiumCount': { one: '{count} lugar', other: '{count} lugares' },
  'profile.position': 'Puesto {position}',
  'profile.visitCount': { one: '{count} visita', other: '{count} visitas' },
  'profile.lastVisit': 'última el {date}',
  'profile.tastes': 'Lo que más se te antoja',
  'profile.tasteTotal': { one: '{count} tipo', other: '{count} tipos' },
  'profile.moreTastes': 'y {count} más',

  'locale.label': 'Idioma',
  'locale.shortEs': 'ES',
  'locale.shortEn': 'EN',

  'debug.title': 'Depuración del mapa',
} as const

/** La forma de un catálogo: cada clave, un texto o un plural. `satisfies` la exige en el otro idioma. */
export type Forma<T> = {
  [K in keyof T]: T[K] extends string ? string : { one: string; other: string }
}

/** Lo que viaja en el paquete inicial. */
export type Messages = Forma<typeof es>

/** Todas las claves, estén en el paquete inicial o en un grupo: `t()` acepta cualquiera. */
type Todas = typeof es & typeof aboutEs & typeof onboardingEs & typeof seoBuildEs
export type MessageKey = keyof Todas
export type TodosLosMensajes = Forma<Todas>
