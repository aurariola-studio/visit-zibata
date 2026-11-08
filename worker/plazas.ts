/**
 * Editar una plaza desde el panel.
 *
 * Se edita lo que se puede cambiar sin tocar el mapa: nombre, descripciones, dirección, el punto del
 * marcador, el enlace de Google Maps y si está activa o es un "próximamente". Quedan fuera, a propósito:
 *
 *  - **`id` y `slug`.** Son la dirección de la zona y de las fichas; cambiarlos pide una redirección.
 *  - **`geometry`.** El contorno alimenta el mapa y los edificios; se edita con su propio editor.
 *  - **`placeIds` y `categories`.** Se derivan de los locales y no se escriben a mano.
 *
 * Activar o desactivar una plaza cambia lo que ve la gente (sus locales, su página, las categorías que
 * dependen de ellos), así que ese cambio no se guarda a la primera: el Worker responde con el impacto y
 * espera una confirmación. Cualquier otro cambio se guarda directo, como en un negocio.
 */
import { z } from 'zod'
import {
  type CommercialDataset,
  isWithinBounds,
  validateRelations,
  validateTranslations,
} from '../src/data/relations.ts'
import { PlazaSchema } from '../src/data/schemas.ts'
import { TITULOS_RESERVADOS } from '../src/data/titulos-reservados.ts'
import { fechaLocal } from './analitica.ts'
import { type Cargado, cargar, LIMITES } from './contenido.ts'
import { type EntornoGitHub, type Publicacion, publicar } from './github.ts'
import { SUFIJO_TITULO, TOPE_TITULO } from './titulos.ts'

export const EntradaPlazaSchema = z.strictObject({
  id: z.string().trim().min(1, 'Falta la plaza'),
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre no puede ir vacío')
    .max(120)
    .transform((valor) => valor.replace(/\s+/g, ' ')),
  /** Las dos o ninguna: una plaza sin descripción usa el texto de reserva del prerender. */
  descripcionEs: z.string().trim().max(600).optional().default(''),
  descripcionEn: z.string().trim().max(600).optional().default(''),
  direccion: z.string().trim().max(200).optional().default(''),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  googleMapsUri: z.string().trim().max(500).optional().default(''),
  activa: z.boolean(),
  proximamente: z.boolean().optional().default(false),
  /** Sin esto, un cambio que afecta a lo que se ve solo calcula el impacto. */
  confirmar: z.boolean().optional().default(false),
})

export interface ImpactoPlaza {
  plaza: { id: string; nombre: string }
  /** Cambia si la plaza se ve en la guía. */
  cambiaActiva: boolean
  activaAntes: boolean
  activaDespues: boolean
  /** Locales que se ven en la guía por estar en esta plaza, antes y después. */
  localesAntes: number
  localesDespues: number
  /** Categorías que se quedan sin ningún local visible (pierden su página)... */
  categoriasSinPagina: string[]
  /** ...y las que empiezan a tener alguno (ganan página). */
  categoriasNuevas: string[]
  avisos: string[]
}

export type PreparadaPlaza =
  | {
      ok: true
      impacto: ImpactoPlaza
      requiereConfirmacion: boolean
      plazas: Record<string, unknown>
    }
  | { ok: false; problemas: string[] }

const normalizar = (valor: string): string =>
  valor.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase()
// El prerender recorta la descripción a 160: dos textos que coinciden hasta ahí dejan el mismo metadato.
const recorte = (valor: string): string => normalizar(valor).slice(0, 160)

const mensajes = (error: z.ZodError): string[] =>
  error.issues.map((problema) => `${problema.path.join('.') || 'datos'}: ${problema.message}`)

/** La parte pura: valida, calcula el impacto y deja `plazas.json` listo. */
export function prepararPlaza(
  dataset: CommercialDataset,
  crudo: Cargado['crudo'],
  cuerpo: unknown,
  hoy: string,
): PreparadaPlaza {
  const entrada = EntradaPlazaSchema.safeParse(cuerpo)
  if (!entrada.success) return { ok: false, problemas: mensajes(entrada.error) }
  const datos = entrada.data

  const antes = dataset.plazas.find((fila) => fila.id === datos.id)
  const filas = (crudo.plazas.plazas as Record<string, unknown>[] | undefined) ?? []
  const fila = filas.find((otra) => String(otra.id) === datos.id)
  if (!antes || !fila) return { ok: false, problemas: ['Esa plaza ya no existe'] }

  if (datos.proximamente && datos.activa) {
    return { ok: false, problemas: ['Una plaza "próximamente" no puede estar activa'] }
  }
  if (Boolean(datos.descripcionEs) !== Boolean(datos.descripcionEn)) {
    return { ok: false, problemas: ['Escribe la descripción en español y en inglés, o ninguna'] }
  }

  /*
   * Se parte de la fila cruda y se cambian solo los campos del formulario: serializar el objeto de Zod
   * reordenaría las claves de las quince plazas y el diff de la PR sería ilegible.
   */
  const {
    googleMapsUri: _mapa,
    comingSoon: _pronto,
    ...resto
  } = fila as Record<string, unknown> & { googleMapsUri?: unknown; comingSoon?: unknown }
  const nueva: Record<string, unknown> = {
    ...resto,
    name: datos.nombre,
    description: datos.descripcionEs ? { es: datos.descripcionEs, en: datos.descripcionEn } : null,
    address: datos.direccion || null,
    coordinates: { lat: datos.lat, lng: datos.lng },
    active: datos.activa,
    ...(datos.proximamente ? { comingSoon: true } : {}),
    ...(datos.googleMapsUri ? { googleMapsUri: datos.googleMapsUri } : {}),
  }
  const previa = antes.verification
  if (previa) {
    nueva.verification = {
      ...previa,
      lastVerifiedAt: hoy,
      sources: [...new Set([...previa.sources, `campo:${hoy}`])].slice(-8),
    }
  }

  const revisada = PlazaSchema.safeParse(nueva)
  if (!revisada.success) return { ok: false, problemas: mensajes(revisada.error) }
  const plaza = revisada.data

  const plazas = dataset.plazas.map((otra) => (otra.id === plaza.id ? plaza : otra))
  const despues: CommercialDataset = { ...dataset, plazas }
  const problemas = [...validateRelations(despues, LIMITES), ...validateTranslations(despues)]
    .filter((asunto) => asunto.level === 'error')
    .map((asunto) => asunto.message)
  if (!isWithinBounds(plaza.coordinates, LIMITES)) {
    problemas.push('coordenadas: El marcador queda fuera de Zibatá')
  }

  const visible = (conjunto: CommercialDataset) => {
    const activas = new Set(conjunto.plazas.filter((fila) => fila.active).map((fila) => fila.id))
    return conjunto.places.filter((place) => place.active && activas.has(place.plazaId))
  }
  const visiblesAntes = visible(dataset)
  const visiblesDespues = visible(despues)

  /*
   * El prerender exige títulos y descripciones distintos entre páginas. Una plaza activa no puede
   * llamarse como otra plaza, como una página de información o como un local que se ve, ni compartir
   * su descripción recortada.
   */
  if (plaza.active) {
    const nombre = normalizar(plaza.name)
    const otras = dataset.plazas.filter((otra) => otra.id !== plaza.id)
    const igual = otras.find((otra) => normalizar(otra.name) === nombre)
    if (igual)
      problemas.push(`Ya hay una plaza llamada "${igual.name}"; los títulos se repetirían.`)
    const local = visiblesDespues.find((place) => normalizar(place.name) === nombre)
    if (local) {
      problemas.push(
        `El nombre coincide con el del local "${local.name}"; los títulos se repetirían.`,
      )
    }
    const reservado = TITULOS_RESERVADOS.find((titulo) => normalizar(titulo) === nombre)
    if (reservado) {
      problemas.push(`El nombre coincide con el de la página de información "${reservado}".`)
    }
    const titulo = `${plaza.name}${SUFIJO_TITULO}`
    if (titulo.length > TOPE_TITULO) {
      problemas.push(
        `El nombre no cabe en el título de la página: ${titulo.length} de ${TOPE_TITULO} caracteres.`,
      )
    }
    const es = recorte(plaza.description?.es ?? '')
    const en = recorte(plaza.description?.en ?? '')
    if (plaza.description) {
      const repetida = [
        ...otras
          .filter((otra) => otra.active)
          .map((otra) => ({ nombre: otra.name, d: otra.description })),
        ...visiblesDespues.map((place) => ({ nombre: place.name, d: place.description })),
      ].find((otra) => recorte(otra.d?.es ?? '') === es || recorte(otra.d?.en ?? '') === en)
      if (repetida) {
        problemas.push(
          `La descripción coincide con la de "${repetida.nombre}"; los metadatos se repetirían.`,
        )
      }
    }
  }
  // Al activar una plaza, sus locales pasan a verse: no pueden repetirse entre sí dentro de ella.
  if (plaza.active && !antes.active) {
    const suyos = visiblesDespues.filter((place) => place.plazaId === plaza.id)
    const nombres = new Set<string>()
    for (const place of suyos) {
      const clave = normalizar(place.name)
      if (nombres.has(clave)) problemas.push(`Dos locales de la plaza se llaman "${place.name}".`)
      nombres.add(clave)
    }
  }
  if (problemas.length > 0) return { ok: false, problemas }

  const categoriasCon = (locales: typeof visiblesAntes) =>
    new Set(
      dataset.categories
        .filter((categoria) =>
          locales.some((place) =>
            place.giros.some((giro) => categoria.giros.some((otro) => otro.id === giro)),
          ),
        )
        .map((categoria) => categoria.label.es),
    )
  const conAntes = categoriasCon(visiblesAntes)
  const conDespues = categoriasCon(visiblesDespues)
  const enPlazaAntes = visiblesAntes.filter((place) => place.plazaId === plaza.id).length
  const enPlazaDespues = visiblesDespues.filter((place) => place.plazaId === plaza.id).length

  const cambiaActiva = antes.active !== plaza.active
  const avisos: string[] = []
  if (cambiaActiva && !plaza.active) {
    avisos.push(
      `La página de la zona deja de existir y su dirección da 404. Los locales de la plaza (${enPlazaAntes} visibles) salen de las listas, del buscador y del sitemap.`,
      'Un local borrado antes de esta plaza seguirá yendo a la portada, no a la zona.',
    )
  }
  if (cambiaActiva && plaza.active) {
    avisos.push(
      `Se publica la página de la zona y salen a la vista ${enPlazaDespues} locales de la plaza.`,
    )
  }
  if (plaza.active && antes.active && enPlazaAntes === 0) {
    avisos.push('La plaza está activa pero no tiene ningún local visible.')
  }

  const impacto: ImpactoPlaza = {
    plaza: { id: plaza.id, nombre: plaza.name },
    cambiaActiva,
    activaAntes: antes.active,
    activaDespues: plaza.active,
    localesAntes: enPlazaAntes,
    localesDespues: enPlazaDespues,
    categoriasSinPagina: [...conAntes].filter((nombre) => !conDespues.has(nombre)),
    categoriasNuevas: [...conDespues].filter((nombre) => !conAntes.has(nombre)),
    avisos,
  }

  return {
    ok: true,
    impacto,
    requiereConfirmacion: cambiaActiva,
    plazas: {
      ...crudo.plazas,
      updatedAt: hoy,
      plazas: filas.map((otra) => (String(otra.id) === plaza.id ? nueva : otra)),
    },
  }
}

export type ResultadoPlaza =
  | {
      ok: true
      /** `true` si esta llamada guardó (o validó en seco); `false` si solo calculó el impacto. */
      confirmado: boolean
      requiereConfirmacion: boolean
      seco: boolean
      pr: Publicacion | null
      mensaje: string
      impacto: ImpactoPlaza
    }
  | { ok: false; problemas: string[] }

/** Guarda una plaza. Un cambio de activa/inactiva espera una confirmación aparte. */
export async function guardarPlaza(
  entorno: EntornoGitHub & { PANEL_ABIERTO?: string },
  cuerpo: unknown,
): Promise<ResultadoPlaza> {
  const cargado = await cargar(entorno)
  const hoy = fechaLocal(new Date())
  const preparada = prepararPlaza(cargado.dataset, cargado.crudo, cuerpo, hoy)
  if (!preparada.ok) return preparada

  const confirmar = EntradaPlazaSchema.parse(cuerpo).confirmar
  const base = { requiereConfirmacion: preparada.requiereConfirmacion, impacto: preparada.impacto }
  if (preparada.requiereConfirmacion && !confirmar) {
    return {
      ok: true,
      confirmado: false,
      seco: cargado.seco,
      pr: null,
      mensaje: 'Esto es lo que cambiaría. No se ha guardado nada.',
      ...base,
    }
  }
  if (cargado.seco) {
    return {
      ok: true,
      confirmado: true,
      seco: true,
      pr: null,
      mensaje: 'Cambio validado. En desarrollo no se commitea.',
      ...base,
    }
  }

  const pr = await publicar(
    entorno,
    [
      {
        ruta: 'data/commercial/plazas.json',
        contenido: `${JSON.stringify(preparada.plazas, null, 2)}\n`,
      },
    ],
    `Panel: editar plaza "${preparada.impacto.plaza.nombre}"`,
  )
  return {
    ok: true,
    confirmado: true,
    seco: false,
    pr,
    mensaje: 'Cambio enviado a la PR.',
    ...base,
  }
}
