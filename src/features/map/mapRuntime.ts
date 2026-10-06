/** Registro único (por página) del worker de MapLibre. */

import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

let registered = false

/**
 * Hasta la v4.7.0 esto registraba además el protocolo `pmtiles://`, y `reset` existía para
 * descartar la caché de una cabecera que no se había podido leer: sin eso, el reintento fallaba
 * aunque el archivo ya estuviera disponible. Las teselas se sirven sueltas, así que no hay protocolo
 * propio ni caché que invalidar, y reintentar es volver a pedirlas.
 */
export function ensureMapRuntime(): void {
  if (registered) return
  setWorkerUrl(workerUrl)
  registered = true
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
