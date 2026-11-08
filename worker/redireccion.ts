/**
 * Las direcciones antiguas.
 *
 * Las redirecciones, todas con un 301 en el servidor: así un buscador ve el traslado y no tiene que
 * adivinarlo ejecutando JavaScript.
 *
 *  - **El español ahora lleva `/es`.** Hasta el 28 de octubre de 2026 era el idioma sin prefijo
 *    (`/lugar/tomassa`, `/`); ahora es `/es/lugar/tomassa` y `/es`. Todo lo que ya circula (el índice
 *    del buscador, los enlaces compartidos) sigue llevando a donde prometía, en un solo salto y con
 *    la consulta intacta.
 *  - **Los enlaces de categoría de la portada.** Hasta que cada categoría tuvo página, filtrar la
 *    portada escribía `/?categoria=italiana`. Una categoría sola tiene su dirección
 *    (`/es/categoria/italiana`, `/en/category/italian`), y la forma con parámetro queda solo como filtro
 *    dentro de una zona. Solo la portada, y solo si el parámetro es el único y nombra una categoría que
 *    existe: la zona con su filtro no se toca, y un parámetro inventado no produce una redirección a una
 *    página que no existe.
 *  - **Una plaza borrada desde el panel** (solo vacía) va a la portada del mismo idioma: ya no hay
 *    página de zona a la que mandar a nadie.
 *  - **Un local borrado desde el panel.** Su ficha deja de existir, pero su dirección sigue circulando
 *    (buscadores, mensajes, el índice del buscador). Pasa a la página de la plaza donde estaba, en el
 *    mismo idioma, y las direcciones sin prefijo llegan en un solo salto. Las anota
 *    `data/commercial/redirects.json` y `data:validate` impide que un slug vivo esté ahí.
 *  - **Una ficha o una zona con otra dirección.** Cambiar el slug desde el panel deja una fila con el
 *    slug antiguo y el id; el destino es el slug de HOY de esa entidad, resuelto al cargar. Una cadena
 *    (A a B a C) lleva de A y de B directo a C. Si la entidad se oculta o se borra después, baja un
 *    escalón (ficha, zona, portada) en vez de acabar en un 404.
 *
 * Nunca según el idioma del navegador: un rastreador pide inglés y sería reenviado a un árbol que no es
 * el que se quiere indexar (ver `resolveLocale` en src/i18n/index.ts).
 */
import categorias from '../data/commercial/categories.json' with { type: 'json' }
import lugaresJson from '../data/commercial/places.json' with { type: 'json' }
import plazasJson from '../data/commercial/plazas.json' with { type: 'json' }
import borradosJson from '../data/commercial/redirects.json' with { type: 'json' }
import type { Redirect } from '../src/data/schemas.ts'
import { PREFIX, SEGMENTS } from '../src/lib/url-state.ts'

// El archivo puede estar vacío y entonces el JSON infiere `never[]`: se tipa con el esquema.
const borrados = borradosJson as { redirects: Redirect[] }

/** El slug de cada categoría, por idioma. */
const SLUGS = {
  es: new Set(categorias.categories.map((categoria) => categoria.slug.es)),
  en: new Set(categorias.categories.map((categoria) => categoria.slug.en)),
}

/** A dónde lleva una dirección antigua: una ficha, una zona, una categoría, o `null` para la portada. */
export type Destino = { tipo: 'lugar' | 'zona' | 'categoria'; slug: string } | null

type Idioma = 'es' | 'en'

export interface Direcciones {
  /** `/lugar/<slug>` antiguos. */
  lugares: ReadonlyMap<string, Destino>
  /** `/zona/<slug>` antiguos. */
  zonas: ReadonlyMap<string, Destino>
  /** `/categoria/<slug>` antiguos, uno por idioma: el slug de una categoría es uno por idioma. */
  categorias: Record<Idioma, ReadonlyMap<string, Destino>>
}

/**
 * Resuelve cada dirección antigua a su destino de hoy. Se decide al desplegar y siempre por id, así que
 * una cadena (A a B a C), una entidad que se oculta o se borra después, o una plaza que se desactiva
 * quedan cubiertas sin tocar las filas viejas.
 *
 * Solo las fichas y zonas ACTIVAS tienen página: si el destino no la tiene, la dirección antigua baja un
 * escalón (de la ficha a su zona, de la zona a la portada) en vez de acabar en un 404. Una categoría solo
 * tiene página si algún local visible la usa.
 */
export function resolverDirecciones(
  filas: readonly Redirect[],
  plazas: readonly { id: string; slug: string; active: boolean }[],
  lugares: readonly {
    id: string
    slug: string
    active: boolean
    plazaId: string
    giros?: readonly string[]
  }[],
  categorias: readonly {
    id: string
    slug: Record<Idioma, string>
    giros: readonly { id: string }[]
  }[] = [],
): Direcciones {
  const plazaViva = new Map(plazas.map((plaza) => [plaza.id, plaza]))
  const categoriaViva = new Map(categorias.map((categoria) => [categoria.id, categoria]))
  const paginaDeCategoria = (id: string, idioma: Idioma): Destino => {
    const categoria = categoriaViva.get(id)
    if (!categoria) return null
    const giros = new Set(categoria.giros.map((giro) => giro.id))
    const conPagina = lugares.some(
      (lugar) =>
        lugar.active &&
        plazaViva.get(lugar.plazaId)?.active &&
        lugar.giros?.some((giro) => giros.has(giro)),
    )
    return conPagina ? { tipo: 'categoria', slug: categoria.slug[idioma] } : null
  }
  const lugarVivo = new Map(lugares.map((lugar) => [lugar.id, lugar]))
  const zonaDe = (plazaId: string): Destino => {
    const plaza = plazaViva.get(plazaId)
    // Una plaza borrada después ya no está en `plazas`: tampoco tiene página y va a la portada.
    return plaza?.active ? { tipo: 'zona', slug: plaza.slug } : null
  }
  const fichaDe = (id: string): Destino | undefined => {
    const lugar = lugarVivo.get(id)
    if (!lugar) return undefined
    return lugar.active && plazaViva.get(lugar.plazaId)?.active
      ? { tipo: 'lugar', slug: lugar.slug }
      : zonaDe(lugar.plazaId)
  }
  // Un local borrado va a la zona donde estaba; con eso se resuelven también sus nombres anteriores.
  const lugarBorrado = new Map<string, Destino>(
    filas.flatMap((fila) =>
      fila.kind === 'place' ? [[fila.id, zonaDe(fila.plazaId)] as const] : [],
    ),
  )

  const lugaresAntiguos = new Map<string, Destino>()
  const zonasAntiguas = new Map<string, Destino>()
  const categoriasAntiguas: Record<Idioma, Map<string, Destino>> = { es: new Map(), en: new Map() }
  for (const fila of filas) {
    if (fila.kind === 'category-slug') {
      categoriasAntiguas[fila.lang].set(fila.slug, paginaDeCategoria(fila.id, fila.lang))
      continue
    }
    if (fila.kind === 'place') lugaresAntiguos.set(fila.slug, lugarBorrado.get(fila.id) ?? null)
    else if (fila.kind === 'place-slug') {
      lugaresAntiguos.set(fila.slug, fichaDe(fila.id) ?? lugarBorrado.get(fila.id) ?? null)
    } else if (fila.kind === 'plaza') zonasAntiguas.set(fila.slug, null)
    else if (fila.kind === 'plaza-slug') {
      // Una plaza borrada ya no está en `plazas`, así que `zonaDe` da la portada.
      zonasAntiguas.set(fila.slug, zonaDe(fila.id))
    }
  }
  return { lugares: lugaresAntiguos, zonas: zonasAntiguas, categorias: categoriasAntiguas }
}

const DIRECCIONES = resolverDirecciones(
  borrados.redirects,
  plazasJson.plazas,
  lugaresJson.places,
  categorias.categories,
)

const SEGMENTO_DE_DESTINO = { lugar: 'place', zona: 'plaza', categoria: 'category' } as const

const rutaDe = (destino: Destino, idioma: Idioma): string =>
  destino
    ? `/${PREFIX[idioma]}/${SEGMENTS[idioma][SEGMENTO_DE_DESTINO[destino.tipo]]}/${destino.slug}`
    : `/${PREFIX[idioma]}`

/**
 * El destino de una ruta `/<segmento>/<slug>` con o sin prefijo de idioma, si ese slug figura en `mapa`.
 * `segmento` es el de la familia que se busca (ficha o zona).
 *
 * La consulta (`?categoria=bebidas`) viaja solo si el destino es la misma clase de página que el origen
 * (ficha a ficha, zona a zona): el filtro de una zona o de una ficha compartida sigue significando algo
 * allí. Si la dirección baja a una zona o a la portada, la consulta ya no describe esa página y se suelta.
 */
function redireccionDeFamilia(
  ruta: string,
  familia: 'place' | 'plaza' | 'category',
  mapas: ReadonlyMap<string, Destino> | Record<Idioma, ReadonlyMap<string, Destino>>,
  consulta = '',
): string | null {
  const partes = ruta.split('/').filter(Boolean)
  const idioma = partes[0] === 'en' ? 'en' : partes[0] === 'es' ? 'es' : null
  // Las fichas y las zonas tienen un mapa; las categorías, uno por idioma (cada idioma, su slug).
  const mapa =
    mapas instanceof Map
      ? mapas
      : (mapas as Record<Idioma, ReadonlyMap<string, Destino>>)[idioma ?? 'es']
  if (!mapa || mapa.size === 0) return null
  const [segmento, slug] = idioma ? partes.slice(1) : partes
  if (!slug || segmento !== SEGMENTS[idioma ?? 'es'][familia]) return null
  if (partes.length !== (idioma ? 3 : 2)) return null
  if (!mapa.has(slug)) return null
  const destino = mapa.get(slug) ?? null
  const mismaClase =
    destino?.tipo === { place: 'lugar', plaza: 'zona', category: 'categoria' }[familia]
  return rutaDe(destino, idioma ?? 'es') + (mismaClase ? consulta : '')
}

/** La ficha o la zona a la que pasa una ficha borrada o con otro nombre (con o sin prefijo de idioma). */
export const redireccionDeLugar = (
  ruta: string,
  mapa: ReadonlyMap<string, Destino> = DIRECCIONES.lugares,
  consulta = '',
): string | null => redireccionDeFamilia(ruta, 'place', mapa, consulta)

/** La zona o la portada a la que pasa una zona borrada o con otro nombre. */
export const redireccionDeZona = (
  ruta: string,
  mapa: ReadonlyMap<string, Destino> = DIRECCIONES.zonas,
  consulta = '',
): string | null => redireccionDeFamilia(ruta, 'plaza', mapa, consulta)

/** La categoría con otro slug a la que pasa una dirección antigua (por idioma, con o sin prefijo). */
export const redireccionDeCategoriaAntigua = (
  ruta: string,
  mapas: Record<Idioma, ReadonlyMap<string, Destino>> = DIRECCIONES.categorias,
  consulta = '',
): string | null => redireccionDeFamilia(ruta, 'category', mapas, consulta)

/** Los segmentos con los que empezaban las rutas del español sin prefijo. */
const SEGMENTOS_ANTIGUOS: ReadonlySet<string> = new Set(Object.values(SEGMENTS.es))

/** La dirección de la categoría que pide una portada con `?categoria=`, o `null`. */
function redireccionDeCategoria(
  url: URL,
  idioma: Idioma,
  antiguas: Direcciones['categorias'],
): string | null {
  const parametro = SEGMENTS[idioma].category
  const claves = [...url.searchParams.keys()]
  if (claves.length !== 1 || claves[0] !== parametro) return null

  const pedido = url.searchParams.get(parametro) ?? ''
  // Un slug vivo vale tal cual; uno antiguo, solo si su categoría sigue teniendo página.
  const antigua = antiguas[idioma].get(pedido)
  const slug = SLUGS[idioma].has(pedido)
    ? pedido
    : antigua?.tipo === 'categoria'
      ? antigua.slug
      : null
  if (!slug) return null
  return `/${PREFIX[idioma]}/${SEGMENTS[idioma].category}/${slug}`
}

/** La dirección a la que mandar esta petición, o `null` si no hay que redirigirla. */
export function redireccionDe(url: URL, direcciones: Direcciones = DIRECCIONES): string | null {
  // Varias barras al principio (`//otro.example/x`) colapsan en una: un `Location` que empieza por `//`
  // es una dirección relativa al protocolo, es decir, otro sitio. Nunca sale de aquí uno así.
  const sinInicio = url.pathname.replace(/^\/{2,}/, '/')
  const ruta = sinInicio.replace(/\/+$/, '') || '/'
  // La barra final no añade nada: cada ruta es un archivo, no una carpeta.
  const sinBarra = ruta !== url.pathname ? `${ruta}${url.search}` : null

  const antigua =
    redireccionDeLugar(ruta, direcciones.lugares, url.search) ??
    redireccionDeZona(ruta, direcciones.zonas, url.search) ??
    redireccionDeCategoriaAntigua(ruta, direcciones.categorias, url.search)
  if (antigua) return antigua

  if (ruta === '/en') return redireccionDeCategoria(url, 'en', direcciones.categorias) ?? sinBarra
  if (ruta === '/es') return redireccionDeCategoria(url, 'es', direcciones.categorias) ?? sinBarra

  const [primero = ''] = ruta.split('/').filter(Boolean)
  if (ruta === '/' || SEGMENTOS_ANTIGUOS.has(primero)) {
    // La portada con una categoría va directa a la página de la categoría, sin pasar por `/es`.
    if (ruta === '/') {
      const categoria = redireccionDeCategoria(url, 'es', direcciones.categorias)
      if (categoria) return categoria
    }
    return `/es${ruta === '/' ? '' : ruta}${url.search}`
  }
  return sinBarra
}
