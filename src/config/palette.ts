/**
 * Colores de identidad, derivados de la paleta de marca (arena #D1C3B0, olivo #536C2A, lima #8CBA37).
 *
 * Dos dimensiones, cada una en la superficie donde responde a la pregunta del usuario:
 *  - Plaza (mapa y cabeceras de plaza): "¿cuál es cuál?" al mirar Zibatá desde arriba.
 *  - Categoría (listas y fichas): "¿qué tipo de comida es?" al elegir dónde comer.
 *
 * Para que nunca parezca que una plaza y una categoría "comparten" color (no significan lo mismo) las
 * dos familias viven en registros distintos y se generan desde HSL, no a mano:
 *  - Plaza: color pleno (saturación media-alta), siempre en una forma sólida (suelo y volumen del mapa,
 *    rombo, punto del marcador).
 *  - Categoría: tinte muy claro de fondo con el icono en tinta oscura; nunca un color pleno.
 * Así, aunque dos tonos caigan en la misma familia cromática, se leen como cosas distintas.
 */

/** Convierte HSL a hexadecimal. Los tonos se definen en HSL porque la regla vive en la saturación. */
function hsl(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100
  const l = lightness / 100
  const k = (n: number) => (n + hue / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const channel = (n: number) => {
    const value = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return Math.round(255 * value)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${channel(0)}${channel(8)}${channel(4)}`
}

/**
 * Aclara (positivo) u oscurece (negativo) un color en su propio tono. Los estados del mapa ·cursor
 * encima y plaza seleccionada· se derivan así del color de cada plaza, en vez de volver todos al verde
 * de marca: la plaza sigue siendo reconocible mientras está seleccionada.
 */
export function shade(hex: string, amount: number): string {
  const value = Number.parseInt(hex.slice(1), 16)
  const channel = (shift: number) => {
    const current = (value >> shift) & 0xff
    const next = amount >= 0 ? current + (255 - current) * amount : current * (1 + amount)
    return Math.round(Math.min(255, Math.max(0, next)))
      .toString(16)
      .padStart(2, '0')
  }
  return `#${channel(16)}${channel(8)}${channel(0)}`
}

export interface PlazaTone {
  /** Suelo de la plaza en el mapa. */
  site: string
  siteOutline: string
  /** Volumen de los edificios de la plaza. */
  building: string
  /** Acento sólido para marcadores y cabeceras (contraste AA sobre superficies claras). */
  accent: string
  /** Fondo suave para insignias y pastillas. */
  soft: string
}

/**
 * Tonos de plaza, repartidos por la rueda de color con saturación media-alta: sobre la maqueta color
 * arena cada plaza se distingue de sus vecinas aunque ninguna esté seleccionada. El primero es el
 * verde de marca. Son doce, más que las plazas activas de hoy.
 */
const PLAZA_HUES = [95, 170, 25, 252, 340, 60, 205, 310, 40, 130, 8, 280]

function plazaTone(hue: number): PlazaTone {
  return {
    site: hsl(hue, 42, 80),
    siteOutline: hsl(hue, 45, 58),
    building: hsl(hue, 45, 63),
    // El acento lleva texto encima (la cifra del marcador) y texto blanco cuando la plaza está
    // seleccionada: se mantiene oscuro para pasar AA en ambos sentidos, también en los tonos amarillos.
    accent: hsl(hue, 55, 26),
    soft: hsl(hue, 42, 93),
  }
}

const PLAZA_TONES: PlazaTone[] = PLAZA_HUES.map(plazaTone)

/** Plazas sin tono asignado (o inactivas): el verde de marca. */
export const DEFAULT_PLAZA_TONE = PLAZA_TONES[0] as PlazaTone

/**
 * Asigna un tono a cada plaza activa, en el orden en que llegan. Se calcula una vez por catálogo:
 * el mapa y los paneles consultan el mismo mapa de tonos.
 */
export function plazaTones(plazaIds: readonly string[]): Map<string, PlazaTone> {
  return new Map(
    plazaIds.map((id, index) => [id, PLAZA_TONES[index % PLAZA_TONES.length] as PlazaTone]),
  )
}

export interface CategoryTone {
  /** Fondo de la placa de categoría: un tinte, nunca un color pleno. */
  soft: string
  /** Trazo del icono sobre ese fondo (contraste AA). */
  ink: string
}

export const NEUTRAL_CATEGORY_TONE: CategoryTone = { soft: '#ece5da', ink: '#665847' }

/**
 * Tinte de fondo y tinta del icono a partir del tono que declara la categoría en los datos
 * (`hue` en research/taxonomy.json → categories.json). Mucho más claros y apagados que cualquier color
 * de plaza. Una categoría nueva sin tono usa el neutro: añadir categorías nunca rompe la interfaz.
 */
export function categoryTone(category: { hue?: number } | undefined): CategoryTone {
  const hue = category?.hue
  return hue === undefined
    ? NEUTRAL_CATEGORY_TONE
    : { soft: hsl(hue, 34, 92), ink: hsl(hue, 38, 33) }
}
