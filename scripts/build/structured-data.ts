/**
 * Datos estructurados (JSON-LD) para las páginas prerenderizadas.
 *
 * Es lo mismo que ya dice la ficha, pero en el vocabulario de schema.org, para que un buscador no
 * tenga que deducirlo del texto. Lo que compra, en concreto: que el resultado de Google muestre el
 * teléfono y la dirección debajo del título en vez de solo título y descripción, y que la ficha
 * pueda entrar en los listados de sitios locales.
 *
 * Reglas, en orden de importancia:
 *
 * 1. **Nada que no esté en el dataset.** Sin `aggregateRating` (la guía no publica medias), sin
 *    `priceRange` (nadie lo ha verificado) y sin `review`. Inventar aquí es peor que callar: lo que
 *    se escribe en este bloque es lo que el buscador publica como hecho.
 * 2. **Sin `openingHours`, a propósito.** El horario es el único dato de la ficha que se pudre solo
 *    (festivos, temporada, un cambio cualquiera), y si Google anuncia "Abierto ahora" sobre un dato
 *    viejo, alguien hace el viaje para encontrar la puerta cerrada. Hoy los 101 locales llevan el
 *    mismo `lastVerifiedAt`, así que no hay forma de distinguir un horario fresco de uno rancio.
 *    Cuando exista una segunda ronda de verificación, ese campo ya da el criterio y emitirlo pasa a
 *    ser cuestión de un filtro.
 * 3. **Un campo que falta se omite, no se rellena.** Un local sin teléfono sale sin `telephone`.
 */
import type { Category, Place, Plaza } from '../../src/types/domain.ts'

type Locale = 'es' | 'en'

/**
 * El tipo de schema.org por categoría. No todo es un `Restaurant`: una panadería es `Bakery` y un
 * bar es `BarOrPub`, y acertar es lo que permite al buscador encajar la ficha donde toca.
 *
 * Cuando la categoría no identifica una forma concreta de negocio se usa el padre común
 * (`FoodEstablishment`), y "Otros" se queda en `LocalBusiness` porque la guía va más allá de la
 * comida y ahí puede haber cualquier cosa. Mentir hacia abajo (decir `Restaurant` de lo que no lo
 * es) cuesta más que quedarse en el tipo general.
 */
const SCHEMA_TYPE: Record<string, string> = {
  'desayunos-y-cafe': 'CafeOrCoffeeShop',
  'tacos-y-antojitos': 'Restaurant',
  mexicana: 'Restaurant',
  'carnes-y-parrilla': 'Restaurant',
  mariscos: 'Restaurant',
  hamburguesas: 'FastFoodRestaurant',
  italiana: 'Restaurant',
  asiatica: 'Restaurant',
  'entre-panes': 'Restaurant',
  saludable: 'Restaurant',
  'panaderia-y-reposteria': 'Bakery',
  botanas: 'Restaurant',
  'postres-y-dulces': 'FoodEstablishment',
  bebidas: 'FoodEstablishment',
  internacional: 'Restaurant',
  casera: 'Restaurant',
  bar: 'BarOrPub',
  otros: 'LocalBusiness',
}

/** `servesCuisine` solo existe bajo `FoodEstablishment`: ponerlo en otro tipo es marcado inválido. */
const SIRVE_COMIDA = new Set([
  'FoodEstablishment',
  'Restaurant',
  'Bakery',
  'BarOrPub',
  'CafeOrCoffeeShop',
  'FastFoodRestaurant',
])

/**
 * Localidad, estado y país salen de `data/geographic/config.json` ("Zibatá, El Marqués, Querétaro,
 * México"), que es el dato del propio proyecto, no una suposición. La calle la pone la zona: un
 * local no tiene dirección propia porque está dentro de una plaza, y la de la plaza es la suya.
 */
const LOCALIDAD = {
  addressLocality: 'El Marqués',
  addressRegion: 'Querétaro',
  addressCountry: 'MX',
}

const texto = (valor: unknown, locale: Locale): string | undefined => {
  if (typeof valor === 'string') return valor || undefined
  const localizado = valor as { es: string; en?: string } | null
  if (!localizado) return undefined
  return ((locale === 'en' ? localizado.en : undefined) ?? localizado.es) || undefined
}

/** Quita las claves vacías: en JSON-LD un campo a medias es ruido, y uno vacío es un error. */
function limpio<T extends Record<string, unknown>>(objeto: T): T {
  for (const [clave, valor] of Object.entries(objeto)) {
    const vacio =
      valor === undefined || valor === null || (Array.isArray(valor) && valor.length === 0)
    if (vacio) delete objeto[clave as keyof T]
  }
  return objeto
}

export interface DatosDelLugar {
  place: Place
  plaza: Plaza | undefined
  /** La categoría del primer giro: la que define al local. */
  category: Category | undefined
  /** Los giros ya traducidos y en orden, tal como los lee la ficha. */
  giros: string[]
  /** URL canónica absoluta de la ficha en este idioma. */
  url: string
  /** URL canónica absoluta de su zona, en el mismo idioma. */
  plazaUrl: string | undefined
  /** Imagen de vista previa absoluta. */
  image: string | undefined
  locale: Locale
}

/** El negocio de una ficha. */
export function negocio(datos: DatosDelLugar): Record<string, unknown> {
  const { place, plaza, category, giros, url, image, locale } = datos
  const tipo = (category && SCHEMA_TYPE[category.id]) ?? 'LocalBusiness'
  const direccion = plaza?.address

  // `sameAs` son los perfiles oficiales del propio negocio, que es justo lo que el campo espera.
  // Los enlaces de reparto no van: son de la plataforma, no del local.
  const perfiles = [place.links.website, place.links.instagram, place.links.facebook].filter(
    (enlace): enlace is string => typeof enlace === 'string' && enlace.length > 0,
  )

  return limpio({
    '@context': 'https://schema.org',
    '@type': tipo,
    name: place.name,
    url,
    description: texto(place.description, locale),
    image,
    telephone: place.phone ?? undefined,
    servesCuisine: SIRVE_COMIDA.has(tipo) && giros.length > 0 ? giros : undefined,
    address: direccion
      ? { '@type': 'PostalAddress', streetAddress: direccion, ...LOCALIDAD }
      : undefined,
    geo: place.location
      ? { '@type': 'GeoCoordinates', latitude: place.location.lat, longitude: place.location.lng }
      : undefined,
    // El enlace de Maps es el mapa de ESTE local, que es lo que `hasMap` significa.
    hasMap: place.googleMapsUri ?? undefined,
    sameAs: perfiles,
    // La zona que lo contiene, para que se entienda que el local está dentro de una plaza y no suelto.
    containedInPlace:
      plaza && datos.plazaUrl
        ? limpio({ '@type': 'Place', name: texto(plaza.name, locale), url: datos.plazaUrl })
        : undefined,
  })
}

/**
 * Una lista de enlaces, para la portada (sus zonas) y para cada zona (sus locales).
 *
 * Es `ItemList` con `url` y sin repetir los datos de cada elemento: el buscador los lee de la página
 * de destino, que ya los lleva. Duplicarlos aquí solo abre la puerta a que las dos copias discrepen.
 */
export function listado(
  nombre: string,
  elementos: { name: string; url: string }[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: nombre,
    numberOfItems: elementos.length,
    itemListElement: elementos.map((elemento, indice) => ({
      '@type': 'ListItem',
      position: indice + 1,
      name: elemento.name,
      url: elemento.url,
    })),
  }
}

/**
 * El bloque listo para el HTML.
 *
 * `<` se escapa a `<` porque una descripción que contuviera `</script>` cerraría la etiqueta y
 * el resto del JSON quedaría suelto en la página. Es JSON válido igual y no hay que confiar en que
 * ningún dato traiga nunca esa secuencia.
 */
export function bloque(datos: Record<string, unknown>): string {
  const json = JSON.stringify(datos).replace(/</g, '\\u003c')
  return `<script type="application/ld+json">${json}</script>`
}
