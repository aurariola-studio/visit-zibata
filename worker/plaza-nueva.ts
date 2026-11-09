/**
 * Crear una plaza desde el panel.
 *
 * **Sin fuente no se añade una plaza** (docs/DATOS.md: "el proyecto no inventa ubicaciones"). Por eso la
 * procedencia no se rellena sola: quien crea la plaza aporta al menos una URL de fuente y una frase de qué
 * evidencia respalda la ubicación. Es el mismo patrón que ya usan Plaza Luna y Xenica:
 *
 *  - `locationSource`: la evidencia que se escribió, más una nota de que la huella es provisional.
 *  - `verification.sources`: las URL aportadas, y `campo:AAAA-MM-DD` **solo si quien la crea declara que lo
 *    comprobó en el lugar** (esa marca afirma una verificación en sitio: no se pone sin que se diga).
 *  - `locationConfidence` y la confianza de `verification`: las elige esa persona.
 *
 * Nace **inactiva**: sin página, sin marcador y sin entrar en el sitemap hasta que alguien la active tras
 * verificarla. Su estado de investigación es `uncertain` (no se sabe si abre), o `coming_soon` si se declara
 * confirmada y en construcción.
 *
 * El contorno inicial es un cuadrado **provisional** de 60 m centrado en el marcador, y `locationSource` lo
 * dice. Se ajusta después con la sección Contorno del formulario de la plaza (con su vista de impacto).
 *
 * Como cualquier escritura del panel, va en dos pasos: sin `confirmar` solo devuelve lo que se guardaría.
 */
import { z } from 'zod'
import { areaM2, normalizarContorno, validarContornoDePlaza } from '../src/data/geometria.ts'
import {
  type CommercialDataset,
  syncPlazaDerivedFields,
  validateRelations,
} from '../src/data/relations.ts'
import { isGoogleMapsUrl, isHttpUrl, LOCATION_CONFIDENCE } from '../src/data/rules.ts'
import { PlazasFileSchema } from '../src/data/schemas.ts'
import { fechaLocal } from './analitica.ts'
import { type Cargado, CONTORNO_DE_ZIBATA, cargar, LIMITES, slugsRedirigidos } from './contenido.ts'
import { type EntornoGitHub, type Publicacion, publicar } from './github.ts'
import { slugDe, unico } from './slug.ts'

/** Medio lado del cuadrado provisional: 30 m, es decir, 60 m de lado. */
const MEDIO_LADO_M = 30
const M_POR_GRADO_LAT = 110_574
const M_POR_GRADO_LNG_ECUADOR = 111_320

export const EntradaPlazaNuevaSchema = z.strictObject({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre no puede ir vacío')
    .max(120)
    .transform((valor) => valor.replace(/\s+/g, ' ')),
  descripcionEs: z.string().trim().max(600).optional().default(''),
  descripcionEn: z.string().trim().max(600).optional().default(''),
  direccion: z.string().trim().max(200).optional().default(''),
  googleMapsUri: z.string().trim().max(500).optional().default(''),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  /** De dónde sale la ubicación: al menos una. */
  fuentes: z
    .array(z.string().trim().max(500))
    .min(1, 'Aporta al menos una fuente (una URL)')
    .max(6),
  /** Una frase de qué evidencia respalda la ubicación. */
  evidencia: z
    .string()
    .trim()
    .min(10, 'Cuenta en una frase qué evidencia respalda la ubicación')
    .max(400),
  /** Declara que lo comprobó en el lugar: añade `campo:AAAA-MM-DD`. */
  aportadoPorMi: z.boolean().optional().default(false),
  confianza: z.enum(LOCATION_CONFIDENCE),
  /** Confirmada y en construcción. Sigue inactiva. */
  proximamente: z.boolean().optional().default(false),
  /** Sin esto, solo se calcula lo que se guardaría. */
  confirmar: z.boolean().optional().default(false),
})

export interface ResumenPlazaNueva {
  id: string
  slug: string
  nombre: string
  estado: string
  confianza: string
  locationSource: string
  fuentes: string[]
  /** m² del cuadrado provisional. */
  areaProvisional: number
  avisos: string[]
}

export type PreparadaPlazaNueva =
  | { ok: true; resumen: ResumenPlazaNueva; plazas: Record<string, unknown> }
  | { ok: false; problemas: string[] }

/** El cuadrado provisional: 60 m de lado, centrado en el marcador. */
function cuadradoProvisional(lat: number, lng: number): number[][] {
  const dLat = MEDIO_LADO_M / M_POR_GRADO_LAT
  const dLng = MEDIO_LADO_M / (M_POR_GRADO_LNG_ECUADOR * Math.cos((lat * Math.PI) / 180))
  return normalizarContorno([
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
    [lng - dLng, lat - dLat],
  ])
}

const conPunto = (texto: string): string => (/[.!?]$/.test(texto) ? texto : `${texto}.`)

/** La parte pura: valida, arma el registro y deja `plazas.json` listo con una fila más. */
export function prepararPlazaNueva(
  dataset: CommercialDataset,
  crudo: Cargado['crudo'],
  cuerpo: unknown,
  hoy: string,
): PreparadaPlazaNueva {
  const entrada = EntradaPlazaNuevaSchema.safeParse(cuerpo)
  if (!entrada.success) {
    return {
      ok: false,
      problemas: entrada.error.issues.map(
        (problema) => `${problema.path.join('.') || 'datos'}: ${problema.message}`,
      ),
    }
  }
  const dato = entrada.data
  // `slugDe` cae a "lugar-<hora>" si el nombre no tiene letras ni números: eso no es una dirección web.
  if (!/[a-z0-9]/.test(dato.nombre.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase())) {
    return { ok: false, problemas: ['nombre: El nombre necesita letras o números'] }
  }

  // Las fuentes son URL públicas. `campo:` no se escribe a mano: lo pone la casilla, porque afirma una
  // verificación en el lugar.
  const fuentes = [...new Set(dato.fuentes.filter((fuente) => fuente.length > 0))]
  const malas = fuentes.filter((fuente) => !isHttpUrl(fuente))
  if (fuentes.length === 0)
    return { ok: false, problemas: ['fuentes: Aporta al menos una fuente (una URL)'] }
  if (malas.length > 0) {
    return {
      ok: false,
      problemas: [
        `fuentes: "${malas[0]}" no es una URL https. Escribe la dirección completa; para una verificación en el lugar usa la casilla "Lo comprobé yo en el lugar".`,
      ],
    }
  }
  if (dato.googleMapsUri && !isGoogleMapsUrl(dato.googleMapsUri)) {
    return { ok: false, problemas: ['googleMapsUri: Debe ser un enlace https de Google Maps'] }
  }

  const ocupados = new Set([
    ...dataset.plazas.flatMap((plaza) => [plaza.id, plaza.slug]),
    ...slugsRedirigidos(crudo, 'plaza'),
  ])
  const id = unico(slugDe(dato.nombre), ocupados)

  const anillo = cuadradoProvisional(dato.lat, dato.lng)
  const geometry = { type: 'Polygon' as const, coordinates: [anillo] }
  const otras = dataset.plazas.flatMap((otra) =>
    otra.geometry.type === 'Polygon'
      ? [{ id: otra.id, anillo: (otra.geometry.coordinates as number[][][])[0] ?? [] }]
      : [],
  )
  const rotos = validarContornoDePlaza(geometry, {
    contorno: CONTORNO_DE_ZIBATA,
    marcador: { lat: dato.lat, lng: dato.lng },
    otras,
  })
  if (rotos.length > 0) {
    return {
      ok: false,
      problemas: rotos.map(
        (problema) => `El marcador no sirve para crear la plaza aquí: ${problema.mensaje}`,
      ),
    }
  }

  // Solo lo que es verdad al crearla; si luego se ajusta el contorno, esa edición añade su propia cláusula.
  const locationSource = `${conPunto(dato.evidencia)} Huella provisional: cuadrado de 60 m centrado en el marcador, creado desde el panel el ${hoy}.`
  const estado = dato.proximamente ? 'coming_soon' : 'uncertain'
  const sources = [...fuentes, ...(dato.aportadoPorMi ? [`campo:${hoy}`] : [])]
  const descripcion =
    dato.descripcionEs || dato.descripcionEn
      ? {
          es: dato.descripcionEs,
          ...(dato.descripcionEn ? { en: dato.descripcionEn } : {}),
        }
      : null

  // El orden de las claves es el de las demás plazas: el diff de la PR solo muestra una fila nueva.
  const fila: Record<string, unknown> = {
    id,
    slug: id,
    name: dato.nombre,
    description: descripcion,
    address: dato.direccion || null,
    coordinates: { lat: dato.lat, lng: dato.lng },
    geometry,
    active: false,
    ...(dato.proximamente ? { comingSoon: true } : {}),
    ...(dato.googleMapsUri ? { googleMapsUri: dato.googleMapsUri } : {}),
    placeIds: [],
    categories: [],
    locationConfidence: dato.confianza,
    locationSource,
    verification: {
      status: estado,
      confidence: dato.confianza,
      lastVerifiedAt: hoy,
      sources,
    },
  }

  const filas = (crudo.plazas.plazas as Record<string, unknown>[] | undefined) ?? []
  const plazas = { ...crudo.plazas, updatedAt: hoy, plazas: [...filas, fila] }

  // La misma validación del build: lo que no pase aquí sería una PR que el CI tumba.
  const analizado = PlazasFileSchema.safeParse(plazas)
  if (!analizado.success) {
    return {
      ok: false,
      problemas: analizado.error.issues.map(
        (problema) => `${problema.path.slice(2).join('.') || 'plaza'}: ${problema.message}`,
      ),
    }
  }
  const despues: CommercialDataset = {
    ...dataset,
    plazas: syncPlazaDerivedFields({ ...dataset, plazas: analizado.data.plazas }),
  }
  const antes = new Set(
    validateRelations(dataset, LIMITES)
      .filter((asunto) => asunto.level === 'error')
      .map((asunto) => `${asunto.id}|${asunto.message}`),
  )
  const nuevos = validateRelations(despues, LIMITES)
    .filter((asunto) => asunto.level === 'error' && !antes.has(`${asunto.id}|${asunto.message}`))
    .map((asunto) => asunto.message)
  if (nuevos.length > 0) return { ok: false, problemas: nuevos }

  const avisos = [
    'Nace inactiva: no tiene página, ni marcador con su nombre, ni entra en el sitemap hasta que alguien la active.',
    'Pero su contorno SÍ se dibuja en el mapa público, en gris y sin interacción: el build dibuja los edificios que haya dentro y, si no hay ninguno, genera un volumen a partir del cuadrado provisional de 60 m.',
    'Ajusta el contorno con la sección Contorno de su formulario antes de fusionar la PR si no quieres que ese volumen aparezca donde está el marcador.',
    dato.aportadoPorMi
      ? `Se anota "campo:${hoy}": afirma que la ubicación se comprobó en el lugar.`
      : 'No se anota "campo:": no se afirma una verificación en el lugar.',
    'Se revierte con git, no con un botón.',
  ]
  if (id !== slugDe(dato.nombre)) {
    avisos.push(`El nombre ya estaba en uso: la plaza se llamará "${id}" en la dirección.`)
  }

  return {
    ok: true,
    resumen: {
      id,
      slug: id,
      nombre: dato.nombre,
      estado,
      confianza: dato.confianza,
      locationSource,
      fuentes: sources,
      areaProvisional: Math.round(areaM2(anillo)),
      avisos,
    },
    plazas,
  }
}

export type ResultadoPlazaNueva =
  | {
      ok: true
      /** `true` si esta llamada creó la plaza; `false` si solo calculó lo que se guardaría. */
      confirmado: boolean
      seco: boolean
      pr: Publicacion | null
      mensaje: string
      resumen: ResumenPlazaNueva
    }
  | { ok: false; problemas: string[] }

/** Calcula lo que se guardaría y, con `confirmar`, lo manda a la PR del panel. */
export async function crearPlaza(
  entorno: EntornoGitHub & { PANEL_ABIERTO?: string },
  cuerpo: unknown,
): Promise<ResultadoPlazaNueva> {
  const cargado = await cargar(entorno)
  const hoy = fechaLocal(new Date())
  const preparado = prepararPlazaNueva(cargado.dataset, cargado.crudo, cuerpo, hoy)
  if (!preparado.ok) return preparado

  if (!EntradaPlazaNuevaSchema.parse(cuerpo).confirmar) {
    return {
      ok: true,
      confirmado: false,
      seco: cargado.seco,
      pr: null,
      mensaje: 'Esto es lo que se guardaría. No se ha guardado nada.',
      resumen: preparado.resumen,
    }
  }
  if (cargado.seco) {
    return {
      ok: true,
      confirmado: true,
      seco: true,
      pr: null,
      mensaje: 'Plaza validada. En desarrollo no se commitea.',
      resumen: preparado.resumen,
    }
  }
  const pr = await publicar(
    entorno,
    [
      {
        ruta: 'data/commercial/plazas.json',
        contenido: `${JSON.stringify(preparado.plazas, null, 2)}\n`,
      },
    ],
    `Panel: plaza nueva "${preparado.resumen.nombre}"`,
  )
  return {
    ok: true,
    confirmado: true,
    seco: false,
    pr,
    mensaje: 'Plaza enviada a la PR.',
    resumen: preparado.resumen,
  }
}
