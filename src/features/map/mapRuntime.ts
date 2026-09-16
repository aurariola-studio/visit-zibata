/** Registro único (por página) del worker de MapLibre y del protocolo pmtiles://. */

import { addProtocol, removeProtocol, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { Protocol } from 'pmtiles'

let registered = false

/**
 * `reset`: al reintentar tras un fallo se registra un protocolo nuevo, porque pmtiles conserva en caché la
 * cabecera que no pudo leer y el reintento volvería a fallar aunque el archivo ya esté disponible.
 */
export function ensureMapRuntime({ reset = false }: { reset?: boolean } = {}): void {
  if (!registered) setWorkerUrl(workerUrl)
  if (registered && !reset) return
  if (registered) removeProtocol('pmtiles')
  addProtocol('pmtiles', new Protocol().tile)
  registered = true
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
