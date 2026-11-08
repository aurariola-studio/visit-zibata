/**
 * Borrar un giro suelto desde el panel.
 *
 * Un giro es lo que usa un local para decir qué es; lo apuntan los locales por su id. Por eso solo se borra
 * uno que **nadie usa**: ningún local, visible u oculto, lo tiene. Con locales el Worker responde cuántos
 * son y no hace nada: hay que cambiarles el giro antes (el editor de negocios recalcula las plazas). Va en
 * dos pasos como los demás borrados y solo reescribe `categories.json`.
 *
 * Dos giros no se borran nunca: el **general** de una categoría (la categoría de un local sin giro más
 * concreto sale de él) y, por tanto, el último de una categoría.
 *
 * No deja redirección. Un giro no tiene página propia: solo alimenta filtros, el buscador y las categorías.
 * Los locales ya borrados que lo guardaban en `redirects.json` siguen aportando su gusto al algoritmo, que
 * tolera un giro que ya no está en ninguna categoría (ver `catalog.retiredById`).
 */
import { z } from 'zod'
import {
  type CommercialDataset,
  syncPlazaDerivedFields,
  validateRelations,
} from '../src/data/relations.ts'
import type { Redirect } from '../src/data/schemas.ts'
import { fechaLocal } from './analitica.ts'
import { type Cargado, cargar, LIMITES } from './contenido.ts'
import { type EntornoGitHub, type Publicacion, publicar } from './github.ts'

export const EntradaBorradoGiroSchema = z.strictObject({
  id: z.string().trim().min(1, 'Falta el giro'),
  /** Sin esto, solo se calcula el impacto. */
  confirmar: z.boolean().optional().default(false),
})

export interface ImpactoBorradoGiro {
  giro: { id: string; nombre: string }
  categoria: { id: string; nombre: string }
  /** Locales ya borrados que guardaban este giro en su huella (su gusto deja de sumar a esta categoría). */
  gustosDeLocalesBorrados: number
  avisos: string[]
}

export type PreparadoBorradoGiro =
  | {
      ok: true
      impacto: ImpactoBorradoGiro
      categorias: Record<string, unknown>
    }
  | { ok: false; problemas: string[] }

/** La parte pura: valida, calcula el impacto y deja `categories.json` listo. */
export function prepararBorradoGiro(
  dataset: CommercialDataset,
  crudo: Cargado['crudo'],
  cuerpo: unknown,
  hoy: string,
): PreparadoBorradoGiro {
  const entrada = EntradaBorradoGiroSchema.safeParse(cuerpo)
  if (!entrada.success) {
    return {
      ok: false,
      problemas: entrada.error.issues.map(
        (problema) => `${problema.path.join('.') || 'datos'}: ${problema.message}`,
      ),
    }
  }

  const categoria = dataset.categories.find((fila) =>
    fila.giros.some((giro) => giro.id === entrada.data.id),
  )
  const giro = categoria?.giros.find((fila) => fila.id === entrada.data.id)
  if (!categoria || !giro) return { ok: false, problemas: ['Ese giro ya no existe'] }
  if (giro.general) {
    return {
      ok: false,
      problemas: [
        `"${giro.label.es}" es el giro general de "${categoria.label.es}": un local sin giro más concreto cae en él. No se borra.`,
      ],
    }
  }

  const suyos = dataset.places.filter((place) => place.giros.includes(giro.id))
  if (suyos.length > 0) {
    const visibles = suyos.filter((place) => place.active).length
    return {
      ok: false,
      problemas: [
        `El giro lo usan ${suyos.length} ${suyos.length === 1 ? 'local' : 'locales'} (${visibles} ${visibles === 1 ? 'visible' : 'visibles'}). Cámbiales el giro antes: un giro solo se borra sin locales.`,
      ],
    }
  }

  const categorias = dataset.categories.map((fila) =>
    fila.id === categoria.id
      ? { ...fila, giros: fila.giros.filter((otro) => otro.id !== giro.id) }
      : fila,
  )
  const despues: CommercialDataset = { ...dataset, categories: categorias }
  const problemas = validateRelations(
    { ...despues, plazas: syncPlazaDerivedFields(despues) },
    LIMITES,
  )
    .filter((asunto) => asunto.level === 'error')
    .map((asunto) => asunto.message)
  if (problemas.length > 0) return { ok: false, problemas }

  const previas = (crudo.redirects?.redirects as Redirect[] | undefined) ?? []
  const gustosDeLocalesBorrados = previas.filter(
    (fila) => fila.kind === 'place' && fila.giros.includes(giro.id),
  ).length

  const avisos = [
    'Deja de salir en el buscador (su nombre y sus sinónimos) y en el recuento de la categoría. Ningún local lo usaba, así que ninguna página cambia.',
  ]
  if (gustosDeLocalesBorrados > 0) {
    avisos.push(
      `${gustosDeLocalesBorrados} ${gustosDeLocalesBorrados === 1 ? 'local ya borrado guardaba' : 'locales ya borrados guardaban'} este giro: ese gusto deja de sumar a la categoría, y nada más.`,
    )
  }
  avisos.push(
    'Se revierte con git, no con un botón. Si algún E2E o prueba nombra este giro, fallará en la PR.',
  )

  const filas = (crudo.categories.categories as Record<string, unknown>[] | undefined) ?? []
  return {
    ok: true,
    impacto: {
      giro: { id: giro.id, nombre: giro.label.es },
      categoria: { id: categoria.id, nombre: categoria.label.es },
      gustosDeLocalesBorrados,
      avisos,
    },
    categorias: {
      ...crudo.categories,
      updatedAt: hoy,
      categories: filas.map((fila) =>
        String(fila.id) === categoria.id
          ? {
              ...fila,
              giros: ((fila.giros as { id?: unknown }[] | undefined) ?? []).filter(
                (otro) => String(otro.id) !== giro.id,
              ),
            }
          : fila,
      ),
    },
  }
}

export type ResultadoBorradoGiro =
  | {
      ok: true
      /** `true` si esta llamada borró; `false` si solo calculó el impacto. */
      confirmado: boolean
      seco: boolean
      pr: Publicacion | null
      mensaje: string
      impacto: ImpactoBorradoGiro
    }
  | { ok: false; problemas: string[] }

/** Calcula el impacto y, con `confirmar`, manda el borrado a la PR del panel. */
export async function borrarGiro(
  entorno: EntornoGitHub & { PANEL_ABIERTO?: string },
  cuerpo: unknown,
): Promise<ResultadoBorradoGiro> {
  const cargado = await cargar(entorno)
  const hoy = fechaLocal(new Date())
  const preparado = prepararBorradoGiro(cargado.dataset, cargado.crudo, cuerpo, hoy)
  if (!preparado.ok) return preparado

  if (!EntradaBorradoGiroSchema.parse(cuerpo).confirmar) {
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
        ruta: 'data/commercial/categories.json',
        contenido: `${JSON.stringify(preparado.categorias, null, 2)}\n`,
      },
    ],
    `Panel: borrar giro "${preparado.impacto.giro.nombre}"`,
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
