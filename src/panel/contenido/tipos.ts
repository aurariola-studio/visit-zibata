export interface Giro {
  id: string
  label: { es: string; en?: string }
  icon: string
  synonyms: string[]
  general?: boolean
}

export interface Categoria {
  id: string
  slug: { es: string; en: string }
  label: { es: string; en?: string }
  icon: string
  hue?: number
  schemaType?: string
  order: number
  synonyms: string[]
  giros: Giro[]
}

export interface PlazaResumen {
  id: string
  slug: string
  name: string
  description: { es: string; en?: string } | null
  address: string | null
  coordinates: { lat: number; lng: number }
  googleMapsUri?: string
  /** El contorno. Falta en lo que el panel simula sin él; el editor del contorno no sale si no está. */
  geometry?: { type: string; coordinates: unknown }
  active: boolean
  comingSoon?: boolean
}

export interface Foto {
  src: string
  alt: string
  width?: number
  height?: number
  variants?: number[]
  placeholder?: string
  credit?: string
}

export interface Cierre {
  motivo: 'remodelacion' | 'vacaciones' | 'traspaso'
  desde: string
}

export interface Negocio {
  id: string
  slug: string
  name: string
  plazaId: string
  giros: string[]
  description: { es: string; en?: string } | null
  hours: Record<string, string[]> | null
  location: { lat: number; lng: number } | null
  googleMapsUri: string | null
  phone: string | null
  links: Record<string, string | null>
  photos: Foto[]
  cierre?: Cierre
  active: boolean
}

/** Un ajuste a mano de un edificio del mapa, tal como lo manda el Worker. */
export interface AjusteEdificio {
  accion: 'ocultar' | 'altura'
  punto: { lat: number; lng: number }
  alturaM?: number
  motivo: string
  creado: string
}

export interface Datos {
  ref: string
  seco: boolean
  pr: { url: string; numero: number } | null
  categories: Categoria[]
  plazas: PlazaResumen[]
  places: Negocio[]
  /** Ausente en un Worker anterior a los ajustes de edificios. */
  edificios?: { valido: boolean; ajustes: AjusteEdificio[] }
}

/** Lo que el rail necesita saber de la rama del contenido. */
export interface EstadoContenido {
  seco: boolean
  pr: { url: string; numero: number } | null
}

export type ModoContenido = 'negocios' | 'categorias' | 'plazas' | 'edificios'

export interface FormularioAbierto {
  id: string
  nombre: string
  /** Los giros elegidos, en orden: el primero manda. */
  seleccion: string[]
  fotos: Foto[]
  sucio: boolean
  consultaGiro: string
}

export const DIAS: [string, string][] = [
  ['mon', 'Lunes'],
  ['tue', 'Martes'],
  ['wed', 'Miércoles'],
  ['thu', 'Jueves'],
  ['fri', 'Viernes'],
  ['sat', 'Sábado'],
  ['sun', 'Domingo'],
]

export const MOTIVOS: [Cierre['motivo'], string][] = [
  ['remodelacion', 'Remodelación u obra'],
  ['vacaciones', 'Vacaciones'],
  ['traspaso', 'Cambio de dueño'],
]

/** Con 103 locales, veinte por página dejan la lista legible sin convertirla en un archivo. */
export const POR_PAGINA = 20
/** El mismo tope que valida el Worker para una foto ya reducida. */
export const TOPE_FOTO = 4 * 1024 * 1024
/** El lado mayor de una foto. El original se reduce en el navegador antes de salir. */
export const LADO_FOTO = 1600

export const texto = (valor: unknown): string =>
  String(valor ?? '').replace(
    /[&<>"']/g,
    (caracter) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caracter] ??
      caracter,
  )

export const numero = (valor: number): string => new Intl.NumberFormat('es-MX').format(valor)

/** "1 local" y "2 locales": el número con su palabra en singular o plural. */
export const plural = (valor: number, singular: string, plurales: string): string =>
  `${numero(valor)} ${valor === 1 ? singular : plurales}`

export const normalizar = (valor: string): string =>
  valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

/** El mismo día que usa el Worker: Zibatá, no Greenwich. */
export const hoy = (): string =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Mexico_City' }).format(new Date())

export const sinonimosDe = (valor: string): string[] => [
  ...new Set(
    valor
      .split(',')
      .map((parte) => parte.trim())
      .filter(Boolean),
  ),
]
