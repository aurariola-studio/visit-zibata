/** Sincroniza plaza / lugar / categoría con el hash de la URL (enlaces compartibles, botón atrás). */
import { useEffect, useLayoutEffect, useRef } from 'react'
import { buildHash, parseHash } from '../lib/url-state.ts'
import type { Catalog } from '../types/domain.ts'
import { useAppDispatch, useAppState } from './AppStateContext.tsx'

export function useUrlSync(catalog: Catalog): void {
  const state = useAppState()
  const dispatch = useAppDispatch()
  /** Último hash derivado del estado; `null` hasta el primer render (en el que manda la URL). */
  const lastHash = useRef<string | null>(null)

  // URL → estado: al cargar y con atrás/adelante del navegador. Antes de pintar (layout effect): si fuera
  // un efecto normal, una selección hecha en cuanto aparece la interfaz (dispositivo lento o un toque
  // rápido) quedaría pisada por esta sincronización inicial.
  useLayoutEffect(() => {
    const syncFromLocation = () => {
      const parsed = parseHash(window.location.hash)
      const place = parsed.placeSlug ? catalog.placeBySlug.get(parsed.placeSlug) : undefined
      const plaza = place
        ? catalog.plazaById.get(place.plazaId)
        : parsed.plazaSlug
          ? catalog.plazaBySlug.get(parsed.plazaSlug)
          : undefined
      const category = parsed.categoryId ? catalog.categoryById.get(parsed.categoryId) : undefined
      // Un enlace a un lugar o plaza que ya no se publica: se avisa y se limpia la URL para no compartirlo.
      const missingLink =
        (parsed.placeSlug !== null && !place) || (parsed.plazaSlug !== null && !plaza?.active)
      if (missingLink) {
        const clean = buildHash({
          plazaSlug: null,
          placeSlug: null,
          categoryId: category?.id ?? null,
          infoTopic: null,
        })
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${window.location.search}${clean}`,
        )
      }
      dispatch({
        type: 'syncFromUrl',
        plazaId: plaza?.active ? plaza.id : null,
        placeId: place?.id ?? null,
        categoryId: category?.id ?? null,
        missingLink,
        infoTopic: parsed.infoTopic,
      })
    }
    syncFromLocation()
    window.addEventListener('popstate', syncFromLocation)
    return () => window.removeEventListener('popstate', syncFromLocation)
  }, [catalog, dispatch])

  // Estado → URL: solo cuando el estado cambia, nunca en el primer render (evita pisar un enlace
  // entrante antes de que el estado lo refleje).
  useEffect(() => {
    const plaza = state.selectedPlazaId ? catalog.plazaById.get(state.selectedPlazaId) : undefined
    const place = state.selectedPlaceId ? catalog.placeById.get(state.selectedPlaceId) : undefined
    const hash = buildHash({
      plazaSlug: plaza?.slug ?? null,
      placeSlug: place?.slug ?? null,
      categoryId: state.activeCategoryId,
      infoTopic: state.infoTopic,
    })
    const previous = lastHash.current
    lastHash.current = hash
    if (previous === null || previous === hash) return
    if (hash === (window.location.hash || '#/')) return

    const url = `${window.location.pathname}${window.location.search}${hash}`
    // Cambiar de plaza o lugar crea una entrada de historial (atrás la cierra); la categoría no.
    const selectionChanged = hash.split('?')[0] !== previous.split('?')[0]
    if (selectionChanged) window.history.pushState(null, '', url)
    else window.history.replaceState(null, '', url)
  }, [
    catalog,
    state.selectedPlazaId,
    state.selectedPlaceId,
    state.activeCategoryId,
    state.infoTopic,
  ])
}
