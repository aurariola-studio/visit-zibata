/**
 * Textos de la interfaz en español (idioma inicial). Para añadir otro idioma crea `en.ts` con
 * `satisfies Messages` y regístralo en `src/i18n/index.ts`: TypeScript exigirá todas las claves.
 * Valores con `{variable}` se interpolan; los objetos { one, other } son plurales (Intl.PluralRules).
 */
export const es = {
  'app.name': 'Zibatá',
  'app.tagline': 'Comer y beber',
  'app.mapLabel': 'Mapa 3D interactivo de Zibatá',

  'search.label': 'Buscar lugares',
  'search.placeholder': 'Busca café, tacos, una plaza…',
  'search.clear': 'Borrar búsqueda',

  'filters.categories': 'Categorías',
  'filters.allCategories': 'Todo',
  'filters.plaza': 'Plaza',
  'filters.allPlazas': 'Todas las plazas',
  'filters.clear': 'Limpiar filtros',
  'filters.results': { one: '{count} resultado', other: '{count} resultados' },

  'plazas.count': { one: '{count} plaza', other: '{count} plazas' },
  'places.count': { one: '{count} lugar', other: '{count} lugares' },
  'places.matching': { one: '{count} coincide', other: '{count} coinciden' },

  'explore.title': 'Explora Zibatá',
  'explore.summary': '{plazas} con {places} para comer y beber',
  'explore.hint': 'Toca una plaza en el mapa o elige una de la lista.',
  'explore.list': 'Plazas',
  'explore.openList': 'Ver plazas',

  'results.title': 'Resultados',
  'results.empty.title': 'Sin resultados',
  'results.empty.body':
    'No encontramos lugares con esos criterios. Prueba otra palabra o limpia los filtros.',

  'plaza.label': 'Plaza',
  'plaza.places': 'Lugares en esta plaza',
  'plaza.empty': 'Aún no hay lugares activos registrados en esta plaza.',
  'plaza.filteredEmpty': 'Ningún lugar de esta plaza coincide con los filtros.',
  'plaza.showAll': 'Ver todos los lugares de la plaza',
  'plaza.select': 'Ver {name}: {places}',
  'plaza.nearby': {
    one: 'Acercar el mapa para ver 1 plaza más: {names}',
    other: 'Acercar el mapa para ver {count} plazas más: {names}',
  },
  'plaza.directions': 'Cómo llegar a la plaza',

  'place.backToPlaza': 'Volver a {plaza}',
  'place.backToResults': 'Volver a resultados',
  'place.localNumber': 'Local {number}',
  'place.directions': 'Cómo llegar',
  'place.directionsToPlaza': 'Cómo llegar a {plaza}',
  'place.directionsHint': 'Abre Google Maps en una pestaña nueva',
  'place.hours': 'Horario',
  'place.contact': 'Contacto y redes',
  'place.call': 'Llamar',
  'place.whatsapp': 'WhatsApp',
  'place.website': 'Sitio web',
  'place.instagram': 'Instagram',
  'place.facebook': 'Facebook',
  'place.tiktok': 'TikTok',
  'place.gallery': 'Fotografías',
  'place.photo': 'Foto {index} de {total}',
  'place.zoomPhoto': 'Ver foto ampliada: {alt}',
  'place.noPhoto': 'Ilustración de la categoría {category}',
  'place.illustrationNote': 'Aún sin fotografías de este lugar',
  'place.openDetail': 'Ver detalles de {name}',
  'place.missingInfo': 'Aún no tenemos más información de este lugar.',

  'hours.open': 'Abierto',
  'hours.closed': 'Cerrado',
  'hours.closesAt': 'Cierra a las {time}',
  'hours.opensAt': 'Abre a las {time}',
  'hours.opensOn': 'Abre el {day} a las {time}',
  'hours.closedAllDay': 'Cerrado',
  'hours.today': 'Hoy',
  'hours.timezoneNote': 'Horario de Querétaro',

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

  'favorites.add': 'Guardar en favoritos',
  'favorites.remove': 'Quitar de favoritos',
  'favorites.filter': 'Favoritos',

  'panel.close': 'Cerrar panel',
  'a11y.skipToSearch': 'Ir al buscador',
  'link.missing': 'Ese enlace apunta a un lugar que ya no está en la guía.',
  'link.dismiss': 'Cerrar aviso',
  'network.offline': 'Sin conexión a internet: partes del mapa pueden no cargar hasta que vuelva.',
  'panel.expand': 'Ampliar panel',
  'panel.collapse': 'Reducir panel',
  'panel.label': 'Información de lugares',

  'map.zoomIn': 'Acercar',
  'map.zoomOut': 'Alejar',
  'map.resetNorth': 'Orientar al norte',
  'map.reset': 'Volver a la vista de Zibatá',
  'map.toggle3d': 'Cambiar entre vista 3D y vista cenital',
  'map.locate': 'Mostrar mi ubicación',
  'map.locateError': 'No pudimos obtener tu ubicación.',
  'map.loading': 'Cargando Zibatá…',
  'map.controls': 'Controles del mapa',
  'map.locateOutside': 'Parece que no estás en Zibatá; el mapa sigue mostrando sus plazas.',
  'map.locateUnsupported': 'Este navegador no permite obtener tu ubicación.',
  'map.userLocation': 'Tu ubicación',
  'map.error.title': 'El mapa 3D no está disponible',
  'map.error.webgl':
    'Tu navegador o dispositivo no permite mostrar el mapa 3D (WebGL2). Puedes seguir explorando las plazas y lugares desde la lista.',
  'map.error.generic': 'No pudimos cargar el mapa. Revisa tu conexión e inténtalo de nuevo.',
  'map.retry': 'Reintentar',

  'data.error.title': 'No pudimos cargar los lugares',
  'data.error.body':
    'Ocurrió un problema al leer la información de Zibatá. Inténtalo de nuevo en unos segundos.',
  'data.retry': 'Reintentar',
  'data.loading': 'Cargando lugares…',

  'onboarding.step1.title': 'Explora Zibatá',
  'onboarding.step1.body':
    'Arrastra para moverte, pellizca o usa la rueda para acercarte y gira con dos dedos o clic derecho.',
  'onboarding.step2.title': 'Selecciona una plaza',
  'onboarding.step2.body':
    'Las plazas con lugares para comer y beber están resaltadas en verde. Tócalas para ver qué hay.',
  'onboarding.step3.title': 'Descubre dónde comer y beber',
  'onboarding.step3.body':
    'Filtra por categoría, busca un antojo y abre la ficha de cada lugar para saber cómo llegar.',
  'onboarding.next': 'Siguiente',
  'onboarding.back': 'Anterior',
  'onboarding.skip': 'Saltar',
  'onboarding.start': 'Empezar a explorar',
  'onboarding.close': 'Cerrar',
  'onboarding.progress': 'Paso {current} de {total}',

  'debug.title': 'Depuración del mapa',
} as const

export type MessageKey = keyof typeof es
export type Messages = {
  [K in MessageKey]: (typeof es)[K] extends string ? string : { one: string; other: string }
}
