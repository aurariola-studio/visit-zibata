/**
 * Cómo se dibuja cada punto de interés según la distancia a la que se mira, sin tapar nunca un marcador de zona.
 *
 * - Vista completa: un círculo sin ícono, que solo dice que ahí hay algo.
 * - Intermedia: el pin con el ícono, sin nombre.
 * - De cerca: la misma pieza alargada con el nombre, hacia la derecha, la izquierda o colgando por debajo.
 *
 * Manda la zona: de cerca y a media distancia, un punto que pisa un marcador de zona (u otro punto ya puesto) baja un
 * escalón, de nombre a pin, de pin a círculo y de círculo a no verse hasta que alguien se acerque. En la vista completa
 * el círculo se queda en su sitio aunque una zona lo tape en parte: va por debajo y asoma lo que no queda cubierto.
 * Entre dos puntos encimados se ve uno. El punto elegido siempre lleva su nombre.
 */

export interface Caja {
  left: number
  right: number
  top: number
  bottom: number
}

export const MODOS_CON_NOMBRE = [
  'derecha',
  'izquierda',
  'abajo-derecha',
  'abajo-izquierda',
] as const
export type ModoDePunto = (typeof MODOS_CON_NOMBRE)[number] | 'pin' | 'circulo' | 'oculto'

export interface PorColocar {
  id: string
  /** El punto geográfico, en las mismas coordenadas de pantalla que las cajas ocupadas. */
  x: number
  y: number
  /** Ancho de la pieza con el nombre puesto. */
  ancho: number
  elegido: boolean
}

/** Desde este zoom los puntos llevan nombre. Por debajo del umbral de las zonas son un círculo. */
export const NOMBRE_DESDE_ZOOM = 15.5

/** Medidas en píxeles; tienen que coincidir con `PuntoMarkers.module.css`. */
export const LADO = { cerca: 24, medio: 21 } as const
const PICO = 6
const CIRCULO = 12
const HOLGURA = 2

const pisa = (a: Caja, b: Caja) =>
  a.left < b.right + HOLGURA &&
  a.right > b.left - HOLGURA &&
  a.top < b.bottom + HOLGURA &&
  a.bottom > b.top - HOLGURA

const dentro = (caja: Caja, vista: Caja) =>
  caja.left >= vista.left &&
  caja.right <= vista.right &&
  caja.top >= vista.top &&
  caja.bottom <= vista.bottom

function cajaDe({ x, y, ancho }: PorColocar, modo: ModoDePunto, lado: number): Caja {
  if (modo === 'circulo') {
    const r = CIRCULO / 2
    return { left: x - r, right: x + r, top: y - r, bottom: y + r }
  }
  const abajo = modo.startsWith('abajo')
  const total = modo === 'pin' ? lado : ancho
  // La pieza crece hacia un lado; el ícono y el pico se quedan sobre el punto.
  const left = modo.endsWith('izquierda') ? x + lado / 2 - total : x - lado / 2
  return {
    left,
    right: left + total,
    top: abajo ? y : y - lado - PICO,
    bottom: abajo ? y + lado + PICO : y,
  }
}

/** ¿Toca el círculo de un punto alguna de estas cajas? Con una zona encima, el círculo se queda debajo de ella. */
export const circuloPisa = (punto: Pick<PorColocar, 'x' | 'y'>, cajas: readonly Caja[]) => {
  const circulo = cajaDe({ ...punto, id: '', ancho: 0, elegido: false }, 'circulo', 0)
  return cajas.some((caja) => pisa(circulo, caja))
}

export function colocarPuntos(
  puntos: readonly PorColocar[],
  zonas: readonly Caja[],
  zoom: number,
  vista: Caja,
  compactoBajoZoom: number,
): Map<string, ModoDePunto> {
  const modos = new Map<string, ModoDePunto>()
  const cajas = new Map<string, Caja>()
  const completa = zoom < compactoBajoZoom
  const sinPuntos = (caja: Caja, propio: string) =>
    ![...cajas].some(([id, otra]) => id !== propio && pisa(caja, otra))
  const libre = (caja: Caja, propio: string) =>
    !zonas.some((zona) => pisa(caja, zona)) && sinPuntos(caja, propio)
  const poner = (punto: PorColocar, modo: ModoDePunto, lado: number) => {
    modos.set(punto.id, modo)
    if (modo !== 'oculto') cajas.set(punto.id, cajaDe(punto, modo, lado))
  }
  const lado = zoom >= NOMBRE_DESDE_ZOOM ? LADO.cerca : LADO.medio
  const conNombre = (punto: PorColocar, ladoDe: number) =>
    MODOS_CON_NOMBRE.find((modo) => {
      const caja = cajaDe(punto, modo, ladoDe)
      return dentro(caja, vista) && libre(caja, punto.id)
    })

  // El elegido primero y con nombre, haya sitio o no: si no hay uno libre, uno que al menos quepa en la pantalla.
  for (const punto of puntos.filter((p) => p.elegido)) {
    const quepa = () =>
      MODOS_CON_NOMBRE.find((modo) => dentro(cajaDe(punto, modo, LADO.cerca), vista))
    poner(punto, conNombre(punto, LADO.cerca) ?? quepa() ?? 'derecha', LADO.cerca)
  }
  const resto = puntos.filter((p) => !p.elegido)
  // Primero todos con su forma sin nombre: ningún nombre le quita el sitio a otro punto.
  for (const punto of resto) {
    const escalera: ModoDePunto[] = completa ? ['circulo'] : ['pin', 'circulo']
    const modo =
      escalera.find((m) => {
        const caja = cajaDe(punto, m, lado)
        // Fuera de la vista (o bajo la barra, la hoja o los controles) no se dibuja: tampoco recibe el foco.
        return dentro(caja, vista) && (completa ? sinPuntos : libre)(caja, punto.id)
      }) ?? 'oculto'
    poner(punto, modo, lado)
  }
  if (zoom >= NOMBRE_DESDE_ZOOM) {
    for (const punto of resto) {
      if (modos.get(punto.id) === 'oculto') continue
      const modo = conNombre(punto, lado)
      if (modo) poner(punto, modo, lado)
    }
  }
  return modos
}
