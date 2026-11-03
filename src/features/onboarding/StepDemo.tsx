/**
 * Las cinco miniaturas del tutorial.
 *
 * La búsqueda, la ficha y el contacto son las piezas de verdad, montadas en pequeño y con datos de
 * ejemplo. La búsqueda filtra de tres resultados a dos; la ficha se desplaza para enseñar horario y
 * contacto; el formulario escribe el mensaje y responde al enviar. Las piezas quedan inertes: solo
 * se miran. El mapa y las marcas usan la misma materia y una animación de un solo pase.
 */
import { useEffect, useMemo, useState } from 'react'
import { useCatalog } from '../../data/CatalogContext.tsx'
import { useMediaQuery } from '../../hooks/useMediaQuery.ts'
import { t } from '../../i18n/index.ts'
import { assetUrl } from '../../lib/assets.ts'
import type { Catalog, Place, Plaza } from '../../types/domain.ts'
import { SuggestForm } from '../about/SuggestForm.tsx'
import { PlaceCard } from '../places/PlaceCard.tsx'
import { PlaceDetail } from '../places/PlaceDetail.tsx'
import { CategoryChips } from '../plazas/CategoryChips.tsx'
import { SearchBar } from '../search/SearchBar.tsx'
import styles from './StepDemo.module.css'

export type DemoKind = 'map' | 'search' | 'detail' | 'marks' | 'suggest'

interface DemoData {
  place: Place
  plaza: Plaza
}

export function StepDemo({ kind }: { kind: DemoKind }) {
  const catalog = useCatalog()
  const demo = useMemo(() => buildDemo(catalog), [catalog])

  return (
    <div className={styles.demo} aria-hidden="true" inert>
      {kind === 'map' && <MapDemo />}
      {kind === 'search' && demo && (
        <SearchDemo catalog={catalog} place={demo.place} zone={demo.plaza.name} />
      )}
      {kind === 'detail' && demo && <DetailDemo place={demo.place} plaza={demo.plaza} />}
      {kind === 'marks' && demo && <DetailDemo place={demo.place} plaza={demo.plaza} marks />}
      {kind === 'suggest' && <SuggestDemo />}
    </div>
  )
}

/**
 * Escribe un texto letra a letra y avisa cuando termina. Con movimiento reducido lo enseña entero
 * desde el principio, que es el estado final de la animación.
 */
function useTyping(text: string, speed: number, delay = 0): { shown: string; done: boolean } {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [count, setCount] = useState(reduced ? text.length : 0)

  useEffect(() => {
    if (reduced) {
      setCount(text.length)
      return
    }
    setCount(0)
    let index = 0
    let interval = 0
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        index += 1
        setCount(index)
        if (index >= text.length) window.clearInterval(interval)
      }, speed)
    }, delay)
    return () => {
      window.clearTimeout(start)
      window.clearInterval(interval)
    }
  }, [text, speed, delay, reduced])

  return { shown: text.slice(0, count), done: count >= text.length }
}

/** Un local de ejemplo con la forma de uno real, sin datos de ningún negocio. */
function buildDemo(catalog: Catalog): DemoData | null {
  const cafes = catalog.places.filter(
    (place) => catalog.categoryOfGiro.get(place.giros[0] ?? '')?.id === 'desayunos-y-cafe',
  )
  const base = cafes[0] ?? catalog.places[0]
  if (!base) return null
  const plaza = catalog.plazaById.get(base.plazaId)
  if (!plaza) return null
  return {
    place: genericPlace(base, t('onboarding.demo.place1'), 'demo-cafe-1'),
    plaza,
  }
}

function genericPlace(base: Place, name: string, id: string): Place {
  const clone: Place = {
    ...base,
    id,
    slug: id,
    name,
    description: { es: t('onboarding.demo.description'), en: t('onboarding.demo.description') },
    hours: {
      mon: ['08:00-22:00'],
      tue: ['08:00-22:00'],
      wed: ['08:00-22:00'],
      thu: ['08:00-22:00'],
      fri: ['08:00-22:00'],
      sat: ['09:00-23:00'],
      sun: ['09:00-21:00'],
    },
    location: null,
    googleMapsUri: null,
    googlePlaceId: null,
    phone: null,
    photos: [],
    links: { website: 'https://example.com', instagram: 'https://instagram.com/' },
    active: true,
  }
  delete clone.cierre
  delete clone.verification
  return clone
}

function MapDemo() {
  return (
    <div className={styles.map}>
      {/* Recorte del mapa real que ya usa la tarjeta social, sin la marca encima. */}
      <img className={styles.mapImage} src={assetUrl('tutorial/mapa.webp')} alt="" />
      <span className={styles.finger} />
      <span className={styles.fingerA} />
      <span className={styles.fingerB} />
    </div>
  )
}

function SearchDemo({ catalog, place, zone }: { catalog: Catalog; place: Place; zone: string }) {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [cycle, setCycle] = useState(0)

  useEffect(() => {
    if (reduced) return
    const id = window.setInterval(() => setCycle((value) => value + 1), 8000)
    return () => window.clearInterval(id)
  }, [reduced])

  return (
    <SearchAnimation key={cycle} catalog={catalog} place={place} zone={zone} reduced={reduced} />
  )
}

function SearchAnimation({
  catalog,
  place,
  zone,
  reduced,
}: {
  catalog: Catalog
  place: Place
  zone: string
  reduced: boolean
}) {
  const [phase, setPhase] = useState(reduced ? 4 : 0)

  useEffect(() => {
    if (reduced) {
      setPhase(4)
      return
    }
    const timers = [
      window.setTimeout(() => setPhase(1), 1000),
      window.setTimeout(() => setPhase(2), 2000),
      window.setTimeout(() => setPhase(3), 3000),
    ]
    return () => {
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [reduced])

  const query = t('onboarding.demo.query')
  const { shown } = useTyping(query, 180, reduced ? 0 : 5000)
  const categories = catalog.categories.slice(0, 4)
  const counts = new Map(categories.map((category, index) => [category.id, 18 - index * 3]))
  const activeCategory = phase >= 1 ? (categories[0]?.id ?? null) : null
  const openNow = phase >= 2
  const selectedZone = phase >= 3 ? zone : null
  const count = phase >= 1 ? 1 : 2

  return (
    <div className={styles.search}>
      <img className={styles.searchMap} src={assetUrl('tutorial/mapa.webp')} alt="" />
      <div className={styles.searchTop}>
        <div className={styles.searchBar}>
          <SearchBar value={shown} onChange={() => {}} />
        </div>
        <CategoryChips
          categories={categories}
          counts={counts}
          totalCount={42}
          activeId={activeCategory}
          onChange={() => {}}
          hrefFor={() => '#'}
          label={t('filters.categories')}
          variant="floating"
        />
        <div className={styles.filters}>
          <span className={styles.zonePill} data-active={selectedZone ? true : undefined}>
            <span className={styles.zonePin} />
            {selectedZone ?? t('filters.allPlazas')}
          </span>
          <span className={styles.switchRow}>
            <span className={styles.switch} data-on={openNow || undefined}>
              <span className={styles.knob} />
            </span>
            {t('filters.openNow')}
          </span>
        </div>
      </div>
      <div className={styles.searchResults}>
        <p className={styles.searchCount}>{t('filters.results', { count })}</p>
        <div className={styles.searchList}>
          <PlaceCard place={place} onOpen={() => {}} showPlaza compact />
        </div>
      </div>
    </div>
  )
}

function DetailDemo({
  place,
  plaza,
  marks = false,
}: {
  place: Place
  plaza: Plaza
  marks?: boolean
}) {
  return (
    <div className={styles.fichaFrame} data-marks={marks || undefined}>
      <div className={styles.fichaInner} data-marks={marks || undefined}>
        <PlaceDetail
          place={place}
          plaza={plaza}
          backLabel={t('place.backToPlaza', { plaza: plaza.name })}
          onBack={() => {}}
          onClose={() => {}}
          focusOnMount={false}
        />
      </div>
      {marks && <span className={`${styles.tap} ${styles.tapMarks}`} />}
    </div>
  )
}

function SuggestDemo() {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [cycle, setCycle] = useState(0)

  useEffect(() => {
    if (reduced) return
    const id = window.setInterval(() => setCycle((value) => value + 1), 9000)
    return () => window.clearInterval(id)
  }, [reduced])

  return (
    <div className={styles.contactFrame}>
      <div className={styles.contactInner} key={cycle}>
        <SuggestForm demo />
      </div>
    </div>
  )
}
