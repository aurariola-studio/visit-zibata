/**
 * Borrar una plaza desde el panel.
 *
 * Solo se borra una plaza **vacía**: sin ningún local, visible o no. Una plaza con locales obliga a decidir
 * antes qué pasa con cada uno (borrarlo, con su propia redirección), y adivinarlo desde aquí sería borrar
 * por accidente. Como el borrado de un negocio, va en dos pasos (impacto y confirmación) y se anota en
 * `data/commercial/redirects.json`: la dirección de la zona pasa, con un 301, a la portada.
 *
 * Lo que NO hace: no toca el mapa. El contorno sale del catálogo al instante, pero los edificios de la
 * plaza están horneados en `public/map/plaza-buildings.geojson` y se quedan dibujados, en gris y sin
 * interacción (como una plaza inactiva), hasta que alguien reconstruya el mapa.
 */
import { z } from 'zod'
import {
  type CommercialDataset,
  syncPlazaDerivedFields,
  validateRelations,
} from '../src/data/relations.ts'
import type { Redirect } from '../src/data/schemas.ts'
import { fechaLocal } from './analitica.ts'
import { anotarRedirecciones } from './borrado.ts'
import { type Cargado, cargar, LIMITES } from './contenido.ts'
import { type EntornoGitHub, type Publicacion, publicar } from './github.ts'

export const EntradaBorradoPlazaSchema = z.strictObject({
  id: z.string().trim().min(1, 'Falta la plaza'),
  /** Sin esto, solo se calcula el impacto. */
  confirmar: z.boolean().optional().default(false),
})

export interface ImpactoBorradoPlaza {
  plaza: { id: string; nombre: string }
  /** Las direcciones de la zona, que pasan a la portada. */
  redirecciones: { desde: string; hacia: string }[]
  /** Si la plaza estaba activa, tenía página: el borrado la quita del sitemap. */
  teniaPagina: boolean
  /** Locales ya borrados cuya dirección apuntaba a esta zona y ahora va a la portada. */
  redireccionesDeLocales: number
  avisos: string[]
}

export type PreparadoBorradoPlaza =
  | {
      ok: true
      impacto: ImpactoBorradoPlaza
      plazas: Record<string, unknown>
      redirects: Record<string, unknown>
    }
  | { ok: false; problemas: string[] }

/** La parte pura: valida, calcula el impacto y deja `plazas.json` y `redirects.json` listos. */
export function prepararBorradoPlaza(
  dataset: CommercialDataset,
  crudo: Cargado['crudo'],
  cuerpo: unknown,
  hoy: string,
): PreparadoBorradoPlaza {
  const entrada = EntradaBorradoPlazaSchema.safeParse(cuerpo)
  if (!entrada.success) {
    return {
      ok: false,
      problemas: entrada.error.issues.map(
        (problema) => `${problema.path.join('.') || 'datos'}: ${problema.message}`,
      ),
    }
  }

  const plaza = dataset.plazas.find((fila) => fila.id === entrada.data.id)
  if (!plaza) return { ok: false, problemas: ['Esa plaza ya no existe'] }

  const suyos = dataset.places.filter((place) => place.plazaId === plaza.id)
  if (suyos.length > 0) {
    const visibles = suyos.filter((place) => place.active).length
    return {
      ok: false,
      problemas: [
        `La plaza tiene ${suyos.length} ${suyos.length === 1 ? 'local' : 'locales'} (${visibles} ${visibles === 1 ? 'visible' : 'visibles'}). Bórralos antes: una plaza solo se borra vacía.`,
      ],
    }
  }
  const plazas = dataset.plazas.filter((fila) => fila.id !== plaza.id)
  if (!plazas.some((fila) => fila.active)) {
    return { ok: false, problemas: ['La guía no puede quedarse sin ninguna plaza activa'] }
  }

  const despues: CommercialDataset = {
    ...dataset,
    plazas: syncPlazaDerivedFields({ ...dataset, plazas }),
  }
  const problemas = validateRelations(despues, LIMITES)
    .filter((asunto) => asunto.level === 'error')
    .map((asunto) => asunto.message)
  if (problemas.length > 0) return { ok: false, problemas }

  const anotado = anotarRedirecciones(
    crudo,
    [{ kind: 'plaza', id: plaza.id, slug: plaza.slug }],
    despues,
    hoy,
  )
  if (!anotado.ok) return anotado

  const previas = (crudo.redirects?.redirects as Redirect[] | undefined) ?? []
  const redireccionesDeLocales = previas.filter(
    (fila) => fila.kind === 'place' && fila.plazaId === plaza.id,
  ).length

  const avisos: string[] = []
  avisos.push(
    plaza.active
      ? 'La página de la zona deja de existir y sale del sitemap; su dirección va a la portada.'
      : 'Estaba inactiva: no tenía página. Su dirección va a la portada por si circulaba.',
  )
  if (redireccionesDeLocales > 0) {
    avisos.push(
      `${redireccionesDeLocales} ${redireccionesDeLocales === 1 ? 'dirección' : 'direcciones'} de locales ya borrados que llevaban a esta zona pasan a la portada.`,
    )
  }
  avisos.push(
    'Sus edificios en el mapa se quedan dibujados, en gris y sin interacción, hasta que se reconstruya el mapa (`npm run map:build`).',
    'Se revierte con git, no con un botón. Si algún E2E abre esta zona por su dirección, fallará en la PR.',
  )

  const filas = (crudo.plazas.plazas as Record<string, unknown>[] | undefined) ?? []
  return {
    ok: true,
    impacto: {
      plaza: { id: plaza.id, nombre: plaza.name },
      redirecciones: [
        { desde: `/es/zona/${plaza.slug}`, hacia: '/es' },
        { desde: `/en/area/${plaza.slug}`, hacia: '/en' },
      ],
      teniaPagina: plaza.active,
      redireccionesDeLocales,
      avisos,
    },
    plazas: {
      ...crudo.plazas,
      updatedAt: hoy,
      plazas: filas.filter((fila) => String(fila.id) !== plaza.id),
    },
    redirects: anotado.redirects,
  }
}

export type ResultadoBorradoPlaza =
  | {
      ok: true
      /** `true` si esta llamada borró; `false` si solo calculó el impacto. */
      confirmado: boolean
      seco: boolean
      pr: Publicacion | null
      mensaje: string
      impacto: ImpactoBorradoPlaza
    }
  | { ok: false; problemas: string[] }

/** Calcula el impacto y, con `confirmar`, manda el borrado a la PR del panel. */
export async function borrarPlaza(
  entorno: EntornoGitHub & { PANEL_ABIERTO?: string },
  cuerpo: unknown,
): Promise<ResultadoBorradoPlaza> {
  const cargado = await cargar(entorno)
  const hoy = fechaLocal(new Date())
  const preparado = prepararBorradoPlaza(cargado.dataset, cargado.crudo, cuerpo, hoy)
  if (!preparado.ok) return preparado

  if (!EntradaBorradoPlazaSchema.parse(cuerpo).confirmar) {
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
        ruta: 'data/commercial/plazas.json',
        contenido: `${JSON.stringify(preparado.plazas, null, 2)}\n`,
      },
      {
        ruta: 'data/commercial/redirects.json',
        contenido: `${JSON.stringify(preparado.redirects, null, 2)}\n`,
      },
    ],
    `Panel: borrar plaza "${preparado.impacto.plaza.nombre}"`,
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
