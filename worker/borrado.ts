/**
 * Borrar un negocio desde el panel.
 *
 * Borrar no es lo contrario de crear: una ficha que desaparece deja su dirección suelta en buscadores,
 * mensajes y enlaces compartidos. Por eso el borrado va en dos pasos y no es un botón:
 *
 *  1. **Vista de impacto** (`confirmar: false`). No escribe nada. Dice qué direcciones cambian, qué
 *     categorías se quedan sin página y qué queda atrás.
 *  2. **Borrado** (`confirmar: true`). Quita el local, recalcula los campos derivados de su plaza y anota
 *     en `data/commercial/redirects.json` que su dirección pasa, con un 301, a la página de la plaza.
 *
 * Como el resto del contenido, nada llega a producción: el cambio va a la rama del panel con su PR, y se
 * revierte con git, no con un botón.
 *
 * Lo que NO hace, a propósito: no borra las fotos del local. Sus archivos quedan en el repositorio y se
 * limpian a mano si estorban; borrar archivos por una API sin poder verlos antes es peor que dejarlos.
 * Tampoco toca D1: los corazones y las notas de un local que ya no existe se ignoran (`LUGARES`).
 */
import { z } from 'zod'
import {
  type CommercialDataset,
  syncPlazaDerivedFields,
  validateRedirects,
} from '../src/data/relations.ts'
import { RedirectsFileSchema } from '../src/data/schemas.ts'
import { fechaLocal } from './analitica.ts'
import { type Cargado, type Crudo, cargar } from './contenido.ts'
import { type EntornoGitHub, type Publicacion, publicar } from './github.ts'

export const EntradaBorradoSchema = z.strictObject({
  id: z.string().trim().min(1, 'Falta el negocio'),
  /** Sin esto, solo se calcula el impacto. */
  confirmar: z.boolean().optional().default(false),
})

export interface Impacto {
  negocio: { id: string; nombre: string }
  plaza: string
  /** Las direcciones que dejan de ser una ficha y pasan a la página de la plaza. */
  redirecciones: { desde: string; hacia: string }[]
  /** Categorías que se quedan sin ningún local visible, y por tanto sin página. */
  categoriasSinPagina: string[]
  /** `true` si la plaza no tiene página y la dirección antigua va a la portada. */
  destinoEsPortada: boolean
  fotos: number
  avisos: string[]
}

export type PreparadoBorrado =
  | {
      ok: true
      impacto: Impacto
      lugares: Record<string, unknown>
      plazas: Record<string, unknown>
      redirects: Record<string, unknown>
    }
  | { ok: false; problemas: string[] }

const visible = (dataset: CommercialDataset, plazaId: string, activo: boolean): boolean =>
  activo && dataset.plazas.find((plaza) => plaza.id === plazaId)?.active === true

/** La parte pura: valida, calcula el impacto y deja los tres archivos listos. */
export function prepararBorrado(
  dataset: CommercialDataset,
  crudo: Cargado['crudo'],
  cuerpo: unknown,
  hoy: string,
): PreparadoBorrado {
  const entrada = EntradaBorradoSchema.safeParse(cuerpo)
  if (!entrada.success) {
    return {
      ok: false,
      problemas: entrada.error.issues.map(
        (problema) => `${problema.path.join('.') || 'datos'}: ${problema.message}`,
      ),
    }
  }

  const place = dataset.places.find((fila) => fila.id === entrada.data.id)
  if (!place) return { ok: false, problemas: ['Ese negocio ya no existe'] }
  const plaza = dataset.plazas.find((fila) => fila.id === place.plazaId)
  if (!plaza) return { ok: false, problemas: ['La plaza del negocio no existe'] }

  const places = dataset.places.filter((fila) => fila.id !== place.id)
  const plazas = syncPlazaDerivedFields({ ...dataset, places })
  const despues: CommercialDataset = { ...dataset, places, plazas }

  const previas =
    (crudo.redirects?.redirects as { kind: 'place'; slug: string; plazaId: string }[]) ?? []
  const redirecciones = [
    ...previas,
    { kind: 'place' as const, slug: place.slug, plazaId: plaza.id },
  ]
  const problemas = validateRedirects(redirecciones, despues)
    .filter((asunto) => asunto.level === 'error')
    .map((asunto) => asunto.message)
  if (problemas.length > 0) return { ok: false, problemas }

  const base = (crudo.redirects ?? {
    $schema: './schemas/redirects.schema.json',
    version: 1,
  }) as Crudo
  const redirects = { ...base, updatedAt: hoy, redirects: redirecciones }
  const revisado = RedirectsFileSchema.safeParse(redirects)
  if (!revisado.success) {
    return {
      ok: false,
      problemas: revisado.error.issues.map(
        (problema) => `${problema.path.join('.') || 'datos'}: ${problema.message}`,
      ),
    }
  }

  // Una categoría solo publica página si tiene algún local visible: se cuenta antes y después.
  const girosDe = (categoria: CommercialDataset['categories'][number]) =>
    new Set(categoria.giros.map((giro) => giro.id))
  const visibles = (
    conjunto: CommercialDataset,
    categoria: CommercialDataset['categories'][number],
  ) =>
    conjunto.places.filter(
      (fila) =>
        visible(conjunto, fila.plazaId, fila.active) &&
        fila.giros.some((giro) => girosDe(categoria).has(giro)),
    ).length
  const categoriasSinPagina = dataset.categories
    .filter((categoria) => visibles(dataset, categoria) > 0 && visibles(despues, categoria) === 0)
    .map((categoria) => categoria.label.es)

  const avisos: string[] = []
  if (visible(dataset, place.plazaId, place.active)) {
    avisos.push('Sale de las listas, del buscador y del sitemap.')
  } else {
    avisos.push('Ya estaba oculto o en una plaza inactiva: no cambia nada de lo que se ve hoy.')
  }
  avisos.push(
    'Las fotos se quedan en el repositorio. Los corazones y las notas que tenga se ignoran, no se borran.',
  )
  avisos.push(
    'Se revierte con git, no con un botón. Si hay pruebas que nombran este local, fallarán en la PR.',
  )

  const impacto: Impacto = {
    negocio: { id: place.id, nombre: place.name },
    plaza: plaza.name,
    // Solo las plazas activas tienen página: si no, el Worker manda la dirección a la portada.
    redirecciones: plaza.active
      ? [
          { desde: `/es/lugar/${place.slug}`, hacia: `/es/zona/${plaza.slug}` },
          { desde: `/en/place/${place.slug}`, hacia: `/en/area/${plaza.slug}` },
        ]
      : [
          { desde: `/es/lugar/${place.slug}`, hacia: '/es' },
          { desde: `/en/place/${place.slug}`, hacia: '/en' },
        ],
    destinoEsPortada: !plaza.active,
    categoriasSinPagina,
    fotos: place.photos.length,
    avisos,
  }

  const placesCrudos = (crudo.places.places as Record<string, unknown>[] | undefined) ?? []
  const plazasCrudas = (crudo.plazas.plazas as Record<string, unknown>[] | undefined) ?? []
  return {
    ok: true,
    impacto,
    lugares: {
      ...crudo.places,
      updatedAt: hoy,
      places: placesCrudos.filter((fila) => String(fila.id) !== place.id),
    },
    plazas: {
      ...crudo.plazas,
      updatedAt: hoy,
      plazas: plazasCrudas.map((fila, posicion) => ({
        ...fila,
        placeIds: plazas[posicion]?.placeIds ?? [],
        categories: plazas[posicion]?.categories ?? [],
      })),
    },
    redirects,
  }
}

export type ResultadoBorrado =
  | {
      ok: true
      /** `true` si esta llamada borró; `false` si solo calculó el impacto. */
      confirmado: boolean
      seco: boolean
      pr: Publicacion | null
      mensaje: string
      impacto: Impacto
    }
  | { ok: false; problemas: string[] }

/** Calcula el impacto y, con `confirmar`, manda el borrado a la PR del panel. */
export async function borrarNegocio(
  entorno: EntornoGitHub & { PANEL_ABIERTO?: string },
  cuerpo: unknown,
): Promise<ResultadoBorrado> {
  const cargado = await cargar(entorno)
  const hoy = fechaLocal(new Date())
  const preparado = prepararBorrado(cargado.dataset, cargado.crudo, cuerpo, hoy)
  if (!preparado.ok) return preparado

  const confirmar = EntradaBorradoSchema.parse(cuerpo).confirmar
  if (!confirmar) {
    return {
      ok: true,
      confirmado: false,
      seco: cargado.seco,
      pr: null,
      mensaje: 'Esto es lo que cambiaría. No se ha guardado nada.',
      impacto: preparado.impacto,
    }
  }

  if (cargado.seco) {
    return {
      ok: true,
      confirmado: true,
      seco: true,
      pr: null,
      mensaje: 'Borrado validado. En desarrollo no se commitea.',
      impacto: preparado.impacto,
    }
  }

  const pr = await publicar(
    entorno,
    [
      {
        ruta: 'data/commercial/places.json',
        contenido: `${JSON.stringify(preparado.lugares, null, 2)}\n`,
      },
      {
        ruta: 'data/commercial/plazas.json',
        contenido: `${JSON.stringify(preparado.plazas, null, 2)}\n`,
      },
      {
        ruta: 'data/commercial/redirects.json',
        contenido: `${JSON.stringify(preparado.redirects, null, 2)}\n`,
      },
    ],
    `Panel: borrar negocio "${preparado.impacto.negocio.nombre}"`,
  )
  return {
    ok: true,
    confirmado: true,
    seco: false,
    pr,
    mensaje: 'Borrado enviado a la PR.',
    impacto: preparado.impacto,
  }
}
