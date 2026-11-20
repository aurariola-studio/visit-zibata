/*
 * La cola estándar de la descripción de una zona. Vive aquí y no en `src/i18n` por lo mismo que el texto de
 * los sectores: solo la usa el build, y en el catálogo viajaría en el paquete inicial de cada visita.
 *
 * La descripción de la zona se respeta tal cual. Detrás se añade siempre lo mismo, en tres escalones según
 * quepa en 160 caracteres: la cola larga, la corta, o nada si ni la corta cabe.
 */
import { conCantidad } from '../../src/lib/categorias.ts'
import { LIMITE_DESCRIPCION } from './metadatos.ts'

const COLA = {
  es: {
    larga: {
      one: 'Conoce el lugar que la comunidad tiene para ofrecerte, con horario, contacto y cómo llegar.',
      other: 'Conoce los {count} lugares de la zona, con horarios, contacto y cómo llegar.',
    },
    corta: {
      one: 'Un lugar, con horario, contacto y cómo llegar.',
      other: '{count} lugares, con horarios, contacto y cómo llegar.',
    },
  },
  en: {
    larga: {
      one: 'Find the place the community has to offer, with opening hours, contact details and location.',
      other:
        'Discover the {count} places in the area, with opening hours, contact details and location.',
    },
    corta: {
      one: 'One place, with opening hours, contact details and location.',
      other: '{count} places, with opening hours, contact details and location.',
    },
  },
} as const

/** Termina el texto en punto si acaba en letra o número: detrás va otra frase. */
const conPunto = (texto: string): string => (/[\p{L}\p{N}]$/u.test(texto) ? `${texto}.` : texto)

export function descripcionDeZona(
  descripcion: string,
  lugares: number,
  idioma: 'es' | 'en',
  max = LIMITE_DESCRIPCION,
): string {
  const base = descripcion.replace(/\s+/g, ' ').trim()
  if (!base) return ''
  const unida = (cola: string) => `${conPunto(base)} ${cola}`
  for (const escalon of ['larga', 'corta'] as const) {
    const texto = unida(conCantidad(COLA[idioma][escalon], lugares, idioma))
    if (texto.length <= max) return texto
  }
  return base
}
