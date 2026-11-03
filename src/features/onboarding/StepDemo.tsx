/**
 * Las cinco miniaturas del tutorial.
 *
 * La búsqueda, la ficha y el contacto son las piezas de verdad, montadas en pequeño y con datos de
 * ejemplo: el buscador real, las cápsulas reales, la tarjeta real y la ficha real. Las miniaturas
 * quedan inertes, así que solo se miran; el texto de la tarjeta es el que explica. El mapa y las
 * marcas usan la misma materia y la misma animación de un solo pase.
 */
import { Check, Clock, Coffee, Heart, MapPin, Phone, Star } from 'lucide-react'
import { type CSSProperties, useEffect, useMemo, useState } from 'react'
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
  second: Place
  plaza: Plaza
}

export function StepDemo({ kind }: { kind: DemoKind }) {
  const catalog = useCatalog()
  const demo = useMemo(() => buildDemo(catalog), [catalog])

  return (
    <div className={styles.demo} aria-hidden="true" inert>
      {kind === 'map' && <MapDemo />}
      {kind === 'search' && demo && (
        <SearchDemo catalog={catalog} place={demo.place} second={demo.second} />
      )}
      {kind === 'detail' && demo && <DetailDemo place={demo.place} plaza={demo.plaza} />}
      {kind === 'marks' && <MarksDemo zone={demo?.plaza.name ?? ''} />}
      {kind === 'suggest' && <SuggestDemo />}
    </div>
  )
}

/**
 * Escribe un texto letra a letra y avisa cuando termina. Con movimiento reducido lo enseña entero
 * desde el principio, que es el estado final de la animación.
 */
function useTyping(text: string, speed: number): { shown: string; done: boolean } {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [count, setCount] = useState(reduced ? text.length : 0)

  useEffect(() => {
    if (reduced) {
      setCount(text.length)
      return
    }
    setCount(0)
    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      setCount(index)
      if (index >= text.length) window.clearInterval(timer)
    }, speed)
    return () => window.clearInterval(timer)
  }, [text, speed, reduced])

  return { shown: text.slice(0, count), done: count >= text.length }
}

/** Dos locales de ejemplo con la misma forma que uno real, sin datos de ningún negocio. */
function buildDemo(catalog: Catalog): DemoData | null {
  const cafes = catalog.places.filter(
    (place) => catalog.categoryOfGiro.get(place.giros[0] ?? '')?.id === 'desayunos-y-cafe',
  )
  const base = cafes[0] ?? catalog.places[0]
  if (!base) return null
  const plaza = catalog.plazaById.get(base.plazaId)
  if (!plaza) return null
  const other = cafes[1] ?? base
  return {
    place: genericPlace(base, t('onboarding.demo.place1'), 'demo-cafe-1'),
    second: genericPlace(other, t('onboarding.demo.place2'), 'demo-cafe-2'),
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
      <span className={styles.drag} />
      <span className={styles.pinch} />
      <span className={styles.pinchInner} />
    </div>
  )
}

function SearchDemo({ catalog, place, second }: { catalog: Catalog; place: Place; second: Place }) {
  const { shown } = useTyping(place.name, 55)
  const categories = catalog.categories.slice(0, 4)
  const counts = new Map(categories.map((category, index) => [category.id, 18 - index * 3]))

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
          activeId={null}
          onChange={() => {}}
          hrefFor={() => '#'}
          label={t('filters.categories')}
          variant="floating"
        />
      </div>
      <div className={styles.searchResults}>
        <PlaceCard place={place} onOpen={() => {}} showPlaza />
        <PlaceCard place={second} onOpen={() => {}} showPlaza />
      </div>
    </div>
  )
}

function DetailDemo({ place, plaza }: { place: Place; plaza: Plaza }) {
  return (
    <div className={styles.ficha}>
      <div className={styles.fichaInner}>
        <PlaceDetail
          place={place}
          plaza={plaza}
          backLabel={t('place.backToPlaza', { plaza: plaza.name })}
          onBack={() => {}}
          onClose={() => {}}
          focusOnMount={false}
        />
      </div>
    </div>
  )
}

function MarksDemo({ zone }: { zone: string }) {
  return (
    <div className={styles.detail}>
      <Head zone={zone} />
      <Rows />
      <div className={styles.markRow}>
        <span className={styles.visit}>
          <Check className={styles.visitCheck} />
          {t('visit.action')}
        </span>
        <span className={styles.heart}>
          <Heart className={styles.actionIcon} />
        </span>
      </div>
      <div className={styles.rating}>
        <span className={styles.stars}>
          {[0, 1, 2, 3, 4].map((index) => (
            <Star key={index} className={styles.star} />
          ))}
        </span>
        <span className={styles.ratingLabel}>{t('rating.legend')}</span>
      </div>
      <span className={`${styles.tap} ${styles.tapMarks}`} />
    </div>
  )
}

function SuggestDemo() {
  return (
    <div className={styles.contact}>
      <SuggestForm demo />
      <span className={`${styles.tap} ${styles.tapSend}`} />
    </div>
  )
}

function Head({ zone }: { zone: string }) {
  return (
    <div className={styles.head}>
      <span className={styles.avatar}>
        <Coffee className={styles.avatarIcon} />
      </span>
      <span className={styles.titles}>
        <span className={styles.name}>{t('onboarding.demo.place1')}</span>
        <span className={styles.zone}>{zone}</span>
      </span>
    </div>
  )
}

function Rows() {
  return (
    <div className={styles.rows}>
      {[
        { icon: Clock, label: t('place.hours') },
        { icon: Phone, label: t('place.contact') },
        { icon: MapPin, label: t('place.location') },
      ].map(({ icon: Icon, label }, index) => (
        <span key={label} className={styles.row} style={{ '--i': index } as CSSProperties}>
          <Icon className={styles.rowIcon} />
          {label}
        </span>
      ))}
    </div>
  )
}
