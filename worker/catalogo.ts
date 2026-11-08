/**
 * Los identificadores del catálogo que el Worker conoce, con los mismos datos que el sitio.
 *
 * Es el límite de lo que una cuenta puede marcar: un corazón, una nota o una visita solo valen sobre
 * un lugar que existe. Sin esto, cada slug inventado era una fila más en el conteo público de
 * `senales.ts`, y bastaba una cuenta para desplazar la calibración de todos los lugares reales.
 *
 * Entran todos los lugares, activos o no: una persona que guardó un local que luego se desactivó
 * sigue pudiendo quitarlo o recuperarlo sin que su gesto falle.
 */
import lugares from '../data/commercial/places.json' with { type: 'json' }

export const LUGARES: ReadonlySet<string> = new Set(lugares.places.map((lugar) => lugar.id))
