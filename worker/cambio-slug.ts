/**
 * Cambiar la dirección (el slug) de un negocio o de una plaza desde el panel.
 *
 * La dirección vieja sigue circulando (buscadores, mensajes, el índice del buscador), así que cambiarla
 * no es editar un campo: va en dos pasos como un borrado y deja una huella en
 * `data/commercial/redirects.json`. La fila guarda el slug ANTIGUO y el id; el destino no se escribe, se
 * resuelve por id al cargar (ver `worker/redireccion.ts`). Por eso una cadena A a B a C lleva de A y de B
 * directo a C, y un local que se oculta o se borra después sigue teniendo un destino válido.
 *
 *  1. **Vista de impacto** (`confirmar: false`). No escribe nada.
 *  2. **Cambio** (`confirmar: true`). Escribe `places.json` o `plazas.json` y `redirects.json` en un solo
 *     commit.
 *
 * El `id` nunca cambia: es la clave de los corazones, las notas y las visitas, y de la carpeta de fotos.
 * Solo cambia la URL. Volver a una dirección anterior quita su fila en el mismo commit; si no, el 301
 * taparía la ficha (`validateRedirects` lo rechaza).
 *
 * Qué NO hace: no cambia el slug de una categoría (tiene uno por idioma y su redirección lee los slugs
 * vivos de la portada), ni toca el mapa: el contorno y los edificios se enlazan por id.
 */
import { z } from 'zod'
import { type CommercialDataset, type DataIssue, validateRelations } from '../src/data/relations.ts'
import { SLUG_PATTERN } from '../src/data/rules.ts'
import { esBorrado, familiaDeRedireccion, type Redirect } from '../src/data/schemas.ts'
import { fechaLocal } from './analitica.ts'
import { anotarRedirecciones } from './borrado.ts'
import { type Cargado, cargar, LIMITES } from './contenido.ts'
import { type EntornoGitHub, type Publicacion, publicar } from './github.ts'

export type TipoDireccion = 'place' | 'plaza'

export const EntradaCambioSlugSchema = z.strictObject({
  id: z.string().trim().min(1, 'Falta qué cambiar'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Escribe la dirección nueva')
    .max(80, 'Máximo 80 caracteres')
    .regex(
      SLUG_PATTERN,
      'Solo minúsculas, números y guiones, sin espacios, p. ej. "cafe-del-paseo"',
    ),
  /** Sin esto, solo se calcula el impacto. */
  confirmar: z.boolean().optional().default(false),
})

export interface ImpactoCambioSlug {
  tipo: TipoDireccion
  entidad: { id: string; nombre: string }
  antes: string
  despues: string
  /** Lo que pasa con la dirección de hoy, en cada idioma. */
  redirecciones: { desde: string; hacia: string }[]
  /** Direcciones anteriores que ya llevaban aquí y ahora llevarán a la nueva (sin saltos). */
  anterioresQueSeguiran: number
  /** `true` si volver a una dirección que ya tuvo: se quita su redirección. */
  vuelveAUnaAnterior: boolean
  /** `false` si la entidad no tiene página hoy (oculta, o su plaza lo está). */
  tienePagina: boolean
  avisos: string[]
}

export type PreparadoCambioSlug =
  | {
      ok: true
      impacto: ImpactoCambioSlug
      /** El archivo de la entidad ya cambiado, con las claves en su orden. */
      archivo: Record<string, unknown>
      redirects: Record<string, unknown>
    }
  | { ok: false; problemas: string[] }

const SEGMENTOS = {
  place: { es: 'lugar', en: 'place' },
  plaza: { es: 'zona', en: 'area' },
} as const

const mensajes = (asuntos: DataIssue[]): string[] =>
  asuntos.filter((asunto) => asunto.level === 'error').map((asunto) => asunto.message)

/** La parte pura: valida, calcula el impacto y deja el archivo de la entidad y `redirects.json` listos. */
export function prepararCambioSlug(
  tipo: TipoDireccion,
  dataset: CommercialDataset,
  crudo: Cargado['crudo'],
  cuerpo: unknown,
  hoy: string,
): PreparadoCambioSlug {
  const entrada = EntradaCambioSlugSchema.safeParse(cuerpo)
  if (!entrada.success) {
    return {
      ok: false,
      problemas: entrada.error.issues.map(
        (problema) => `${problema.path.join('.') || 'datos'}: ${problema.message}`,
      ),
    }
  }
  const { id, slug: nuevo } = entrada.data

  const nombreDe = tipo === 'place' ? 'negocio' : 'plaza'
  const vivos = tipo === 'place' ? dataset.places : dataset.plazas
  const actual = vivos.find((fila) => fila.id === id)
  if (!actual) return { ok: false, problemas: [`Ese ${nombreDe} ya no existe`] }
  if (actual.slug === nuevo) {
    return { ok: false, problemas: ['Ya tiene esa dirección: no hay nada que cambiar'] }
  }

  const archivoCrudo = tipo === 'place' ? crudo.places : crudo.plazas
  const claveDeFilas = tipo === 'place' ? 'places' : 'plazas'
  const filas = (archivoCrudo[claveDeFilas] as Record<string, unknown>[] | undefined) ?? []
  if (!filas.some((fila) => String(fila.id) === id)) {
    return { ok: false, problemas: [`Ese ${nombreDe} ya no existe`] }
  }

  const previas = (crudo.redirects?.redirects as Redirect[] | undefined) ?? []
  const delTipo = previas.filter((fila) => familiaDeRedireccion(fila) === tipo)
  const kindCambio = tipo === 'place' ? 'place-slug' : 'plaza-slug'
  // La fila de una dirección que esta misma entidad abandonó: volver a ella la libera.
  const propia = delTipo.find(
    (fila) => fila.kind === kindCambio && fila.id === id && fila.slug === nuevo,
  )

  /*
   * Lo que no se puede tomar: el slug o el id de cualquier otro, y las direcciones que ya figuran como
   * redirección (de un borrado, o abandonadas por otra entidad). El id de la propia entidad sí vale.
   */
  const reservados = new Set<string>([
    ...vivos.filter((fila) => fila.id !== id).flatMap((fila) => [fila.slug, fila.id]),
    ...delTipo
      .filter((fila) => fila !== propia)
      .flatMap((fila) => (esBorrado(fila) ? [fila.slug, fila.id] : [fila.slug])),
  ])
  if (reservados.has(nuevo)) {
    return {
      ok: false,
      problemas: [
        `"${nuevo}" ya es la dirección de otro, o lo fue y lleva a otro sitio. Escribe otra.`,
      ],
    }
  }

  const despues: CommercialDataset = {
    ...dataset,
    places:
      tipo === 'place' ? dataset.places.map((fila) => cambiar(fila, id, nuevo)) : dataset.places,
    plazas:
      tipo === 'plaza' ? dataset.plazas.map((fila) => cambiar(fila, id, nuevo)) : dataset.plazas,
  }
  const problemas = mensajes(validateRelations(despues, LIMITES))
  if (problemas.length > 0) return { ok: false, problemas }

  const anotado = anotarRedirecciones(
    crudo,
    [{ kind: kindCambio, id, slug: actual.slug }],
    despues,
    hoy,
    (fila) => fila === propia,
  )
  if (!anotado.ok) return anotado

  // Las que ya llevaban a esta entidad (sus nombres anteriores, y los de un borrado si lo hubiera).
  const anteriores = delTipo.filter(
    (fila) => fila !== propia && fila.kind === kindCambio && fila.id === id,
  ).length

  const tienePagina =
    tipo === 'plaza'
      ? (actual as CommercialDataset['plazas'][number]).active
      : (() => {
          const lugar = actual as CommercialDataset['places'][number]
          return lugar.active && dataset.plazas.find((p) => p.id === lugar.plazaId)?.active === true
        })()

  const [es, en] = [SEGMENTOS[tipo].es, SEGMENTOS[tipo].en]
  const avisos: string[] = []
  if (tienePagina) {
    avisos.push(
      'La dirección antigua pasa, con un 301, a la nueva: los enlaces compartidos y los buscadores siguen llegando.',
      'El sitemap, la dirección canónica y el índice del buscador pasan a la nueva.',
    )
  } else {
    avisos.push(
      `Hoy no tiene página (${tipo === 'place' ? 'está oculto o su plaza lo está' : 'la plaza está inactiva'}): la dirección antigua nunca se publicó. Se anota igual, por si circulaba.`,
    )
  }
  if (anteriores > 0) {
    avisos.push(
      `${anteriores} ${anteriores === 1 ? 'dirección anterior' : 'direcciones anteriores'} también pasarán a la nueva, sin saltos intermedios.`,
    )
  }
  if (propia) {
    avisos.push(
      `Vuelve a una dirección que ya tuvo: su redirección se quita para que no tape la ficha.`,
    )
  }
  if (tipo === 'plaza') {
    avisos.push('Las direcciones de sus locales no cambian: no llevan la de la zona.')
  }
  avisos.push(
    'Se revierte con git, no con un botón. Si algún E2E abre esta dirección por su nombre, fallará en la PR.',
  )

  return {
    ok: true,
    impacto: {
      tipo,
      entidad: { id, nombre: actual.name },
      antes: actual.slug,
      despues: nuevo,
      redirecciones: [
        { desde: `/es/${es}/${actual.slug}`, hacia: `/es/${es}/${nuevo}` },
        { desde: `/en/${en}/${actual.slug}`, hacia: `/en/${en}/${nuevo}` },
      ],
      anterioresQueSeguiran: anteriores,
      vuelveAUnaAnterior: Boolean(propia),
      tienePagina,
      avisos,
    },
    archivo: {
      ...archivoCrudo,
      updatedAt: hoy,
      [claveDeFilas]: filas.map((fila) =>
        String(fila.id) === id ? { ...fila, slug: nuevo } : fila,
      ),
    },
    redirects: anotado.redirects,
  }
}

function cambiar<T extends { id: string; slug: string }>(fila: T, id: string, slug: string): T {
  return fila.id === id ? { ...fila, slug } : fila
}

export type ResultadoCambioSlug =
  | {
      ok: true
      /** `true` si esta llamada cambió la dirección; `false` si solo calculó el impacto. */
      confirmado: boolean
      seco: boolean
      pr: Publicacion | null
      mensaje: string
      impacto: ImpactoCambioSlug
    }
  | { ok: false; problemas: string[] }

/** Calcula el impacto y, con `confirmar`, manda el cambio a la PR del panel. */
export async function cambiarSlug(
  entorno: EntornoGitHub & { PANEL_ABIERTO?: string },
  tipo: TipoDireccion,
  cuerpo: unknown,
): Promise<ResultadoCambioSlug> {
  const cargado = await cargar(entorno)
  const hoy = fechaLocal(new Date())
  const preparado = prepararCambioSlug(tipo, cargado.dataset, cargado.crudo, cuerpo, hoy)
  if (!preparado.ok) return preparado

  if (!EntradaCambioSlugSchema.parse(cuerpo).confirmar) {
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
      mensaje: 'Cambio validado. En desarrollo no se commitea.',
      impacto: preparado.impacto,
    }
  }

  const pr = await publicar(
    entorno,
    [
      {
        ruta: `data/commercial/${tipo === 'place' ? 'places' : 'plazas'}.json`,
        contenido: `${JSON.stringify(preparado.archivo, null, 2)}\n`,
      },
      {
        ruta: 'data/commercial/redirects.json',
        contenido: `${JSON.stringify(preparado.redirects, null, 2)}\n`,
      },
    ],
    `Panel: cambiar la dirección de "${preparado.impacto.entidad.nombre}"`,
  )
  return {
    ok: true,
    confirmado: true,
    seco: false,
    pr,
    mensaje: 'Cambio enviado a la PR.',
    impacto: preparado.impacto,
  }
}
