/**
 * Reglas del contorno de una plaza, en un solo sitio y sin dependencias.
 *
 * Las usan tres quienes: `data:validate` (el CI), el Worker (cuando el panel guarda un contorno) y,
 * más adelante, el editor del mapa para avisar mientras se dibuja. Tienen que ser las mismas: si el
 * servidor aceptara lo que el build rechaza, el panel abriría una PR que el CI tumba.
 *
 * **No lo importa `relations.ts` ni nada del paquete inicial de la app**: ahí cada KB cuenta (el
 * presupuesto de `initialJs` está casi agotado). Por la misma razón no usa turf: el área y los cruces
 * se calculan en un plano local (a la escala de una plaza el error es de centímetros).
 *
 * Coordenadas en WGS84, orden `[lng, lat]`, como el resto del dato.
 */

export type Posicion = readonly number[]
export type Anillo = readonly Posicion[]

export interface Problema {
  /** Identificador estable de la regla, para pruebas y para que el editor señale qué falló. */
  regla:
    | 'forma'
    | 'cerrado'
    | 'vertices'
    | 'duplicados'
    | 'autointersecta'
    | 'area'
    | 'fuera-del-contorno'
    | 'cruza-el-contorno'
    | 'marcador'
    | 'solapa'
  mensaje: string
}

export interface OtraPlaza {
  id: string
  anillo: Anillo
}

export interface OpcionesDelContorno {
  /** El contorno de Zibatá (anillo exterior de `extent.json`). Sin él no se comprueba esa regla. */
  contorno?: Anillo
  /** El marcador de la plaza: tiene que caer dentro de su propio polígono. */
  marcador?: { lat: number; lng: number }
  /** Las demás plazas: no se pueden solapar (compartir borde sí). */
  otras?: readonly OtraPlaza[]
}

/** Tope de vértices. La mayor plaza real tiene 12; 100 deja de sobra sin permitir un garabato. */
export const MAX_VERTICES = 100
/** Por debajo de la plaza más pequeña de hoy (938 m²): un contorno menor es un error de dibujo. */
export const MIN_AREA_M2 = 200
/** Tolerancia para "está sobre el borde": medio metro. */
const SOBRE_EL_BORDE_M = 0.5
/** Decimales con que se guardan las coordenadas (unos 11 cm), como en `plazas.json`. */
export const DECIMALES = 6

const M_POR_GRADO_LAT = 110_574
const M_POR_GRADO_LNG_ECUADOR = 111_320

type Punto = readonly [number, number]

/** Proyecta a metros en un plano local centrado en `lat0`. */
function proyectar(anillo: Anillo, lat0: number): Punto[] {
  const kx = M_POR_GRADO_LNG_ECUADOR * Math.cos((lat0 * Math.PI) / 180)
  return anillo.map((p) => [(p[0] ?? 0) * kx, (p[1] ?? 0) * M_POR_GRADO_LAT] as const)
}

const latMedia = (anillo: Anillo): number =>
  anillo.reduce((suma, p) => suma + (p[1] ?? 0), 0) / Math.max(1, anillo.length)

/** Área en m² (fórmula del topógrafo sobre el plano local). */
export function areaM2(anillo: Anillo): number {
  const puntos = proyectar(anillo, latMedia(anillo))
  let doble = 0
  for (let i = 0, j = puntos.length - 1; i < puntos.length; j = i++) {
    const [xi = 0, yi = 0] = puntos[i] ?? []
    const [xj = 0, yj = 0] = puntos[j] ?? []
    doble += xj * yi - xi * yj
  }
  return Math.abs(doble) / 2
}

const cruz = (a: Punto, b: Punto, c: Punto): number =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])

const enCaja = (a: Punto, b: Punto, p: Punto): boolean =>
  p[0] >= Math.min(a[0], b[0]) - 1e-9 &&
  p[0] <= Math.max(a[0], b[0]) + 1e-9 &&
  p[1] >= Math.min(a[1], b[1]) - 1e-9 &&
  p[1] <= Math.max(a[1], b[1]) + 1e-9

/** ¿Se tocan los segmentos ab y cd (también en un extremo o en un tramo común)? */
function seTocan(a: Punto, b: Punto, c: Punto, d: Punto): boolean {
  const d1 = cruz(a, b, c)
  const d2 = cruz(a, b, d)
  const d3 = cruz(c, d, a)
  const d4 = cruz(c, d, b)
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true
  }
  return (
    (d1 === 0 && enCaja(a, b, c)) ||
    (d2 === 0 && enCaja(a, b, d)) ||
    (d3 === 0 && enCaja(c, d, a)) ||
    (d4 === 0 && enCaja(c, d, b))
  )
}

/** ¿Se cruzan de verdad (un lado a cada lado del otro)? Tocarse en un extremo no cuenta. */
function seCruzan(a: Punto, b: Punto, c: Punto, d: Punto): boolean {
  const d1 = cruz(a, b, c)
  const d2 = cruz(a, b, d)
  const d3 = cruz(c, d, a)
  const d4 = cruz(c, d, b)
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
}

function distanciaAlSegmento(p: Punto, a: Punto, b: Punto): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const largo2 = dx * dx + dy * dy
  const t =
    largo2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / largo2))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

/** Punto dentro de un anillo (trazado de rayo). */
function dentro(p: Punto, anillo: readonly Punto[]): boolean {
  let en = false
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi = 0, yi = 0] = anillo[i] ?? []
    const [xj = 0, yj = 0] = anillo[j] ?? []
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) en = !en
  }
  return en
}

function sobreElBorde(p: Punto, anillo: readonly Punto[]): boolean {
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const a = anillo[j]
    const b = anillo[i]
    if (a && b && distanciaAlSegmento(p, a, b) <= SOBRE_EL_BORDE_M) return true
  }
  return false
}

/** ¿Hay lados no contiguos que se toquen? (un contorno "en lazo" o con un vértice sobre otro lado). */
function seAutointersecta(puntos: readonly Punto[]): boolean {
  const n = puntos.length - 1 // sin el vértice que cierra
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const contiguos = j === i + 1 || (i === 0 && j === n - 1)
      if (contiguos) continue
      const [a, b, c, d] = [puntos[i], puntos[i + 1], puntos[j], puntos[j + 1]]
      if (a && b && c && d && seTocan(a, b, c, d)) return true
    }
  }
  return false
}

const finito = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)

/** Extrae el anillo exterior si la geometría tiene la forma permitida; si no, dice por qué. */
function anilloDe(geometria: unknown): { anillo: Anillo } | { problema: Problema } {
  const falla = (mensaje: string) => ({ problema: { regla: 'forma', mensaje } as Problema })
  const g = (geometria ?? {}) as { type?: unknown; coordinates?: unknown }
  if (g.type !== 'Polygon') return falla('El contorno tiene que ser un solo polígono (Polygon).')
  if (!Array.isArray(g.coordinates) || g.coordinates.length === 0)
    return falla('El polígono no tiene anillo.')
  if (g.coordinates.length > 1) return falla('El polígono no puede tener huecos: un solo anillo.')
  const anillo = g.coordinates[0] as unknown
  if (!Array.isArray(anillo) || anillo.length < 4) {
    return falla('El anillo necesita al menos 3 vértices distintos y cerrarse.')
  }
  for (const p of anillo) {
    if (!Array.isArray(p) || p.length !== 2 || !finito(p[0]) || !finito(p[1])) {
      return falla('Cada vértice son dos números: [longitud, latitud].')
    }
    if (Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90)
      return falla('Hay un vértice fuera del rango de coordenadas.')
  }
  return { anillo: anillo as Anillo }
}

/**
 * Valida el contorno de una plaza. Devuelve una lista vacía si cumple todo.
 *
 * Reglas, todas comprobadas contra las 15 plazas reales antes de hacerlas bloqueantes (ver el test):
 * un solo polígono sin huecos, cerrado, entre 3 y 100 vértices distintos, sin lados que se toquen, de
 * al menos 200 m², dentro del contorno de Zibatá (vértices y lados), con el marcador dentro y sin
 * solaparse con otra plaza.
 */
export function validarContornoDePlaza(
  geometria: unknown,
  opciones: OpcionesDelContorno = {},
): Problema[] {
  const forma = anilloDe(geometria)
  if ('problema' in forma) return [forma.problema]
  const { anillo } = forma
  const problemas: Problema[] = []

  const primero = anillo[0] ?? []
  const ultimo = anillo[anillo.length - 1] ?? []
  if (primero[0] !== ultimo[0] || primero[1] !== ultimo[1]) {
    return [
      {
        regla: 'cerrado',
        mensaje: 'El anillo no se cierra: el último vértice debe ser igual al primero.',
      },
    ]
  }

  const vertices = anillo.slice(0, -1)
  if (vertices.length > MAX_VERTICES) {
    problemas.push({
      regla: 'vertices',
      mensaje: `Demasiados vértices (${vertices.length}); el máximo es ${MAX_VERTICES}.`,
    })
  }
  const claves = new Set(vertices.map((p) => `${p[0]},${p[1]}`))
  const consecutivos = vertices.some((p, i) => {
    const q = vertices[(i + 1) % vertices.length]
    return q !== undefined && p[0] === q[0] && p[1] === q[1]
  })
  if (claves.size < 3 || consecutivos) {
    problemas.push({
      regla: 'duplicados',
      mensaje: 'Hay vértices repetidos seguidos o menos de 3 vértices distintos.',
    })
    return problemas
  }

  const lat0 = latMedia(anillo)
  const puntos = proyectar(anillo, lat0)

  if (seAutointersecta(puntos)) {
    problemas.push({
      regla: 'autointersecta',
      mensaje: 'El contorno se cruza consigo mismo o un vértice toca otro lado.',
    })
    // Con un contorno enredado el área y los solapes no significan nada.
    return problemas
  }

  const area = areaM2(anillo)
  if (area < MIN_AREA_M2) {
    problemas.push({
      regla: 'area',
      mensaje: `El contorno mide ${Math.round(area)} m²; el mínimo es ${MIN_AREA_M2} m².`,
    })
  }

  if (opciones.contorno && opciones.contorno.length >= 4) {
    const limite = proyectar(opciones.contorno, lat0)
    const fuera = puntos
      .slice(0, -1)
      .filter((p) => !dentro(p, limite) && !sobreElBorde(p, limite)).length
    if (fuera > 0) {
      problemas.push({
        regla: 'fuera-del-contorno',
        mensaje: `${fuera === 1 ? 'Un vértice queda' : `${fuera} vértices quedan`} fuera del contorno de Zibatá.`,
      })
    } else {
      // Con todos los vértices dentro, un lado todavía puede salir y volver si el contorno es cóncavo.
      let cruza = false
      for (let i = 0; i < puntos.length - 1 && !cruza; i++) {
        for (let j = 0; j < limite.length - 1 && !cruza; j++) {
          const [a, b, c, d] = [puntos[i], puntos[i + 1], limite[j], limite[j + 1]]
          if (a && b && c && d && seCruzan(a, b, c, d)) cruza = true
        }
      }
      if (cruza) {
        problemas.push({
          regla: 'cruza-el-contorno',
          mensaje: 'Un lado del contorno sale de Zibatá y vuelve a entrar.',
        })
      }
    }
  }

  if (opciones.marcador) {
    const [m] = proyectar([[opciones.marcador.lng, opciones.marcador.lat]], lat0)
    if (m && !dentro(m, puntos) && !sobreElBorde(m, puntos)) {
      problemas.push({
        regla: 'marcador',
        mensaje: 'El marcador de la plaza queda fuera de su contorno.',
      })
    }
  }

  for (const otra of opciones.otras ?? []) {
    if (otra.anillo.length < 4) continue
    if (seSolapan(puntos, proyectar(otra.anillo, lat0))) {
      problemas.push({ regla: 'solapa', mensaje: `El contorno se solapa con "${otra.id}".` })
    }
  }

  return problemas
}

/** Dos polígonos simples se solapan si un lado cruza a otro o uno tiene dentro un punto del otro. */
function seSolapan(a: readonly Punto[], b: readonly Punto[]): boolean {
  for (let i = 0; i < a.length - 1; i++) {
    for (let j = 0; j < b.length - 1; j++) {
      const [p, q, r, s] = [a[i], a[i + 1], b[j], b[j + 1]]
      if (p && q && r && s && seCruzan(p, q, r, s)) return true
    }
  }
  // Sin cruces, o está uno dentro del otro o son disjuntos. Se prueban vértices, puntos medios de los
  // lados y el centro, y solo cuentan los que están DENTRO y no sobre el borde (compartir borde vale).
  const muestras = (anillo: readonly Punto[]): Punto[] => {
    const lados = anillo.slice(0, -1).map((p, i) => {
      const q = anillo[i + 1] ?? p
      return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] as const
    })
    const n = anillo.length - 1
    const centro = [
      anillo.slice(0, -1).reduce((s, p) => s + p[0], 0) / n,
      anillo.slice(0, -1).reduce((s, p) => s + p[1], 0) / n,
    ] as const
    return [...anillo.slice(0, -1), ...lados, centro]
  }
  const estaDentro = (p: Punto, anillo: readonly Punto[]) =>
    dentro(p, anillo) && !sobreElBorde(p, anillo)
  return muestras(a).some((p) => estaDentro(p, b)) || muestras(b).some((p) => estaDentro(p, a))
}

/**
 * Deja el contorno como lo guarda el dato: coordenadas redondeadas a 6 decimales, anillo cerrado y
 * exterior en sentido antihorario (RFC 7946, lo que ya hace el build con `turf.rewind`).
 */
export function normalizarContorno(anillo: Anillo): number[][] {
  const redondo = anillo.map((p) => [
    Number((p[0] ?? 0).toFixed(DECIMALES)),
    Number((p[1] ?? 0).toFixed(DECIMALES)),
  ])
  const abierto = redondo.slice(0, -1)
  const puntos = proyectar(abierto, latMedia(abierto))
  let doble = 0
  for (let i = 0, j = puntos.length - 1; i < puntos.length; j = i++) {
    const [xi = 0, yi = 0] = puntos[i] ?? []
    const [xj = 0, yj = 0] = puntos[j] ?? []
    doble += xj * yi - xi * yj
  }
  // Con estos términos `doble` > 0 es sentido antihorario; si es negativo (horario) se invierte.
  const antihorario = doble < 0 ? [...abierto].reverse() : abierto
  const primero = antihorario[0] ?? []
  return [...antihorario, [primero[0] ?? 0, primero[1] ?? 0]]
}

/**
 * ¿Son el mismo contorno? No depende del sentido ni de por qué vértice empieza el anillo: dos anillos
 * con los mismos vértices en el mismo orden cíclico son el mismo polígono. Sirve para decidir "no hay
 * nada que guardar" sin que girar o dar la vuelta al anillo cuente como un cambio.
 */
export function mismoContorno(a: Anillo, b: Anillo): boolean {
  const canonico = (anillo: Anillo): string => {
    const abierto = normalizarContorno(anillo).slice(0, -1)
    if (abierto.length === 0) return ''
    // Empieza por el vértice menor (longitud y luego latitud): el recorrido ya es antihorario.
    let inicio = 0
    abierto.forEach((p, i) => {
      const m = abierto[inicio] ?? p
      if ((p[0] ?? 0) < (m[0] ?? 0) || ((p[0] ?? 0) === (m[0] ?? 0) && (p[1] ?? 0) < (m[1] ?? 0))) {
        inicio = i
      }
    })
    return JSON.stringify([...abierto.slice(inicio), ...abierto.slice(0, inicio)])
  }
  return canonico(a) === canonico(b)
}

/** ¿Está el punto (lat, lng) dentro del anillo? Para el impacto: qué locales quedan fuera. */
export function puntoEnContorno(punto: { lat: number; lng: number }, anillo: Anillo): boolean {
  const lat0 = latMedia(anillo)
  const [p] = proyectar([[punto.lng, punto.lat]], lat0)
  const limite = proyectar(anillo, lat0)
  return p !== undefined && dentro(p, limite)
}
