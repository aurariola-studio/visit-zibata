import { useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Escritorio y tablet horizontal: mapa + panel lateral. Por debajo: mapa + hoja inferior. */
export const DESKTOP_QUERY = '(min-width: 900px)'

export const useIsDesktop = () => useMediaQuery(DESKTOP_QUERY)
