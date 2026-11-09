/**
 * Borrar una categoría desde el panel.
 *
 * Solo se borra una categoría **sin locales**: ninguno, visible u oculto, usa uno de sus giros. Con locales,
 * el Worker dice cuántos son y no hace nada; hay que cambiarles el giro antes. Va en dos pasos (impacto y
 * confirmación), como el resto de los borrados.
 *
 * A diferencia de un local o una plaza, no deja redirección: la página de una categoría solo existe si
 * tiene algún local (`prerender.ts`), así que una categoría vacía no tiene ninguna dirección que perder.
 *
 * `otros` no se borra: es la categoría general de reserva. Antes recibía los locales que el CSV importaba
 * sin giro; ya no (un local sin giro se rechaza) y hoy ningún local la usa, así que la guarda la prudencia,
 * no un uso vivo. Quitarla es una decisión del propietario, no un efecto de borrar una categoría.
 *
 * Los locales ya borrados que guardaban uno de sus giros siguen en `redirects.json`: el algoritmo tolera un
 * giro que ya no está en ninguna categoría (deja de sumar a la categoría, nada más), y el impacto lo cuenta.
 */
import { z } from 'zod'
import { type CommercialDataset, validateRelations } from '../src/data/relations.ts'
import type { Redirect } from '../src/data/schemas.ts'
import { fechaLocal } from './analitica.ts'
import { anotarRedirecciones } from './borrado.ts'
import { type Cargado, cargar, LIMITES } from './contenido.ts'
import { type EntornoGitHub, type Publicacion, publicar } from './github.ts'

/** La categoría a la que va lo que se importa sin giro: sin ella el importador no tiene a dónde mandarlo. */
export const CATEGORIA_FIJA = 'otros'

export const EntradaBorradoCategoriaSchema = z.strictObject({
  id: z.string().trim().min(1, 'Falta la categoría'),
  /** Sin esto, solo se calcula el impacto. */
  confirmar: z.boolean().optional().default(false),
})

export interface ImpactoBorradoCategoria {
  categoria: { id: string; nombre: string }
  giros: string[]
  /** Locales ya borrados que guardaban uno de sus giros. Ese gusto deja de sumar a esta categoría. */
  gustosDeLocalesBorrados: number
  /** Cambios de dirección de la categoría que se quitan de `redirects.json`. */
  cambiosDeDireccion: number
  avisos: string[]
}

export type PreparadoBorradoCategoria =
  | {
      ok: true
      impacto: ImpactoBorradoCategoria
      categorias: Record<string, unknown>
      /** Solo si la categoría tenía cambios de dirección: se van con ella, en el mismo commit. */
      redirects: Record<string, unknown> | null
    }
  | { ok: false; problemas: string[] }

/** La parte pura: valida, calcula el impacto y deja `categories.json` listo. */
export function prepararBorradoCategoria(
  dataset: CommercialDataset,
  crudo: Cargado['crudo'],
  cuerpo: unknown,
  hoy: string,
): PreparadoBorradoCategoria {
  const entrada = EntradaBorradoCategoriaSchema.safeParse(cuerpo)
  if (!entrada.success) {
    return {
      ok: false,
      problemas: entrada.error.issues.map(
        (problema) => `${problema.path.join('.') || 'datos'}: ${problema.message}`,
      ),
    }
  }

  const categoria = dataset.categories.find((fila) => fila.id === entrada.data.id)
  if (!categoria) return { ok: false, problemas: ['Esa categoría ya no existe'] }
  if (categoria.id === CATEGORIA_FIJA) {
    return {
      ok: false,
      problemas: ['Esta categoría no se borra: es a donde va todo local que se importa sin giro.'],
    }
  }

  const giros = new Set(categoria.giros.map((giro) => giro.id))
  const suyos = dataset.places.filter((place) => place.giros.some((giro) => giros.has(giro)))
  if (suyos.length > 0) {
    const visibles = suyos.filter((place) => place.active).length
    return {
      ok: false,
      problemas: [
        `La categoría la usan ${suyos.length} ${suyos.length === 1 ? 'local' : 'locales'} (${visibles} ${visibles === 1 ? 'visible' : 'visibles'}). Cámbiales el giro antes: una categoría solo se borra sin locales.`,
      ],
    }
  }

  const categorias = dataset.categories.filter((fila) => fila.id !== categoria.id)
  const problemas = validateRelations({ ...dataset, categories: categorias }, LIMITES)
    .filter((asunto) => asunto.level === 'error')
    .map((asunto) => asunto.message)
  if (problemas.length > 0) return { ok: false, problemas }

  const previas = (crudo.redirects?.redirects as Redirect[] | undefined) ?? []
  const gustosDeLocalesBorrados = previas.filter(
    (fila) => fila.kind === 'place' && fila.giros.some((giro) => giros.has(giro)),
  ).length

  const suyosCambios = previas.filter(
    (fila) => fila.kind === 'category-slug' && fila.id === categoria.id,
  )
  let redirects: Record<string, unknown> | null = null
  if (suyosCambios.length > 0) {
    const anotado = anotarRedirecciones(
      crudo,
      [],
      { ...dataset, categories: categorias },
      hoy,
      (fila) => fila.kind === 'category-slug' && fila.id === categoria.id,
    )
    if (!anotado.ok) return anotado
    redirects = anotado.redirects
  }

  const avisos = [
    'Deja de salir en los filtros, en el buscador y en las páginas de categorías. Como no tenía locales, no tenía página propia: no se pierde ninguna dirección.',
  ]
  if (gustosDeLocalesBorrados > 0) {
    avisos.push(
      `${gustosDeLocalesBorrados} ${gustosDeLocalesBorrados === 1 ? 'local ya borrado guardaba' : 'locales ya borrados guardaban'} uno de sus giros: ese gusto deja de sumar a esta categoría, y nada más.`,
    )
  }
  if (suyosCambios.length > 0) {
    avisos.push(
      `${suyosCambios.length} ${suyosCambios.length === 1 ? 'dirección antigua' : 'direcciones antiguas'} de esta categoría dejan de redirigir: la categoría ya no existe.`,
    )
  }
  avisos.push(
    'Se revierte con git, no con un botón. Si algún E2E o prueba nombra esta categoría, fallará en la PR.',
  )

  const filas = (crudo.categories.categories as Record<string, unknown>[] | undefined) ?? []
  return {
    ok: true,
    impacto: {
      categoria: { id: categoria.id, nombre: categoria.label.es },
      giros: categoria.giros.map((giro) => giro.label.es),
      gustosDeLocalesBorrados,
      cambiosDeDireccion: suyosCambios.length,
      avisos,
    },
    categorias: {
      ...crudo.categories,
      updatedAt: hoy,
      categories: filas.filter((fila) => String(fila.id) !== categoria.id),
    },
    redirects,
  }
}

export type ResultadoBorradoCategoria =
  | {
      ok: true
      /** `true` si esta llamada borró; `false` si solo calculó el impacto. */
      confirmado: boolean
      seco: boolean
      pr: Publicacion | null
      mensaje: string
      impacto: ImpactoBorradoCategoria
    }
  | { ok: false; problemas: string[] }

/** Calcula el impacto y, con `confirmar`, manda el borrado a la PR del panel. */
export async function borrarCategoria(
  entorno: EntornoGitHub & { PANEL_ABIERTO?: string },
  cuerpo: unknown,
): Promise<ResultadoBorradoCategoria> {
  const cargado = await cargar(entorno)
  const hoy = fechaLocal(new Date())
  const preparado = prepararBorradoCategoria(cargado.dataset, cargado.crudo, cuerpo, hoy)
  if (!preparado.ok) return preparado

  if (!EntradaBorradoCategoriaSchema.parse(cuerpo).confirmar) {
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
      ...(preparado.redirects
        ? [
            {
              ruta: 'data/commercial/redirects.json',
              contenido: `${JSON.stringify(preparado.redirects, null, 2)}\n`,
            },
          ]
        : []),
    ],
    `Panel: borrar categoría "${preparado.impacto.categoria.nombre}"`,
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
