/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" para incluir el modo depuración del mapa en un build de producción. */
  readonly VITE_ENABLE_MAP_DEBUG?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
