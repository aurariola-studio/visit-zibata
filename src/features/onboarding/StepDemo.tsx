/**
 * Las cinco miniaturas del tutorial.
 *
 * La búsqueda, la ficha y el contacto son las piezas de verdad, montadas en pequeño y con datos de
 * ejemplo. La búsqueda enseña los filtros y el texto; la ficha se desplaza hasta el final; el
 * formulario escribe el mensaje y responde. Las piezas quedan inertes: solo se miran. Las
 * animaciones se repiten y con movimiento reducido quedan quietas.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
import { today } from '../visits/useVisits.ts'
import styles from './StepDemo.module.css'

export type DemoKind = 'map' | 'search' | 'detail' | 'marks' | 'suggest'

interface DemoData {
  place: Place
  plaza: Plaza
  /** Los cuatro resultados de ejemplo del paso de buscar. */
  results: [Place, Place, Place, Place]
}

export function StepDemo({ kind }: { kind: DemoKind }) {
  const catalog = useCatalog()
  const demo = useMemo(() => buildDemo(catalog), [catalog])

  return (
    <div className={styles.demo} aria-hidden="true" inert>
      {kind === 'map' && <MapDemo />}
      {kind === 'search' && demo && (
        <SearchDemo catalog={catalog} results={demo.results} zone={demo.plaza.name} />
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
  // Si la plaza del guion no existe en el catálogo, se usa la del local base.
  const plazaId = (id: string) => (catalog.plazaById.has(id) ? id : base.plazaId)
  const horario = (abierto: boolean) => {
    const dia = abierto ? ['08:00-22:00'] : []
    return { mon: dia, tue: dia, wed: dia, thu: dia, fri: dia, sat: dia, sun: dia }
  }
  return {
    place: genericPlace(base, {
      id: 'demo-cafe',
      name: t('onboarding.demo.place1'),
      giros: base.giros,
      plazaId: base.plazaId,
      hours: horario(true),
    }),
    plaza,
    /*
     * Los cuatro resultados que se turnan al filtrar, en el orden del paso: sin filtros, cafés,
     * zona y abierto ahora. Así cada filtro no solo baja el número, también cambia lo que se ve.
     */
    results: [
      genericPlace(base, {
        id: 'demo-italiana',
        name: t('onboarding.demo.place3'),
        giros: ['pizza', 'cocina-italiana'],
        plazaId: plazaId('xentric-zibata'),
        hours: horario(true),
      }),
      genericPlace(base, {
        id: 'demo-brunch',
        name: t('onboarding.demo.place2'),
        giros: ['brunch', 'cafeteria'],
        plazaId: plazaId('plaza-loop'),
        hours: horario(true),
      }),
      genericPlace(base, {
        id: 'demo-abuela',
        name: t('onboarding.demo.place4'),
        giros: ['desayunos', 'cafeteria'],
        plazaId: plazaId('xentric-anahuac'),
        hours: horario(false),
      }),
      genericPlace(base, {
        id: 'demo-dia',
        name: t('onboarding.demo.place5'),
        giros: ['desayunos', 'cafeteria'],
        plazaId: plazaId('xentric-anahuac'),
        hours: horario(true),
      }),
    ],
  }
}

function genericPlace(
  base: Place,
  demo: { id: string; name: string; giros: string[]; plazaId: string; hours: Place['hours'] },
): Place {
  const clone: Place = {
    ...base,
    ...demo,
    slug: demo.id,
    secundarios: [],
    description: { es: t('onboarding.demo.description'), en: t('onboarding.demo.description') },
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

function SearchDemo({
  catalog,
  results,
  zone,
}: {
  catalog: Catalog
  results: [Place, Place, Place, Place]
  zone: string
}) {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [cycle, setCycle] = useState(0)

  useEffect(() => {
    if (reduced) return
    const id = window.setInterval(() => setCycle((value) => value + 1), 10000)
    return () => window.clearInterval(id)
  }, [reduced])

  return (
    <SearchAnimation
      key={cycle}
      catalog={catalog}
      results={results}
      zone={zone}
      reduced={reduced}
    />
  )
}

function SearchAnimation({
  catalog,
  results,
  zone,
  reduced,
}: {
  catalog: Catalog
  results: [Place, Place, Place, Place]
  zone: string
  reduced: boolean
}) {
  const [phase, setPhase] = useState(reduced ? 4 : 0)

  /*
   * Cada filtro baja el número de resultados y se queda a la vista un momento antes del siguiente:
   * categoría, zona, abierto ahora y, al final, el texto escrito. Doce, cuatro, tres, dos y uno:
   * los cinco números se leen distintos, así que se ve qué hizo cada filtro.
   */
  useEffect(() => {
    if (reduced) {
      setPhase(4)
      return
    }
    const timers = [
      window.setTimeout(() => setPhase(1), 1200),
      window.setTimeout(() => setPhase(2), 3000),
      window.setTimeout(() => setPhase(3), 4800),
    ]
    return () => {
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [reduced])

  const query = t('onboarding.demo.query')
  const { shown, done } = useTyping(query, 150, reduced ? 0 : 6000)
  const categories = catalog.categories.slice(0, 4)
  const counts = new Map(categories.map((category, index) => [category.id, 18 - index * 3]))
  const activeCategory = phase >= 1 ? (categories[0]?.id ?? null) : null
  const openNow = phase >= 3
  const selectedZone = phase >= 2 ? zone : null
  const count = done ? 1 : phase >= 3 ? 2 : phase >= 2 ? 3 : phase >= 1 ? 4 : 12
  // Cada filtro deja a la vista el resultado que le toca, no el mismo local con otro número.
  const shownPlace =
    phase === 0 ? results[0] : phase === 1 ? results[1] : phase === 2 ? results[2] : results[3]

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
          <PlaceCard place={shownPlace} onOpen={() => {}} showPlaza compact />
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
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const frameRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [phase, setPhase] = useState(reduced ? 4 : 0)

  // Las marcas cuentan una historia corta: corazón, estrellas y visita, en bucle.
  useEffect(() => {
    if (!marks) return
    if (reduced) {
      setPhase(3)
      return
    }
    let timers: number[] = []
    const start = () => {
      setPhase(0)
      timers = [
        window.setTimeout(() => setPhase(1), 1400),
        window.setTimeout(() => setPhase(2), 3800),
        window.setTimeout(() => setPhase(3), 5800),
      ]
    }
    start()
    const loop = window.setInterval(start, 10000)
    return () => {
      for (const timer of timers) window.clearTimeout(timer)
      window.clearInterval(loop)
    }
  }, [marks, reduced])

  /*
   * La ficha real mide distinto en cada idioma y con cada dato. Se mide su alto y se desplaza
   * exactamente lo que sobra, para que el final también se vea. En las marcas, el desplazamiento
   * lleva hasta el bloque personal, y además se miden los tres puntos que toca el dedo: el corazón
   * de arriba, la cuarta estrella y la visita. Así el dedo cae donde está cada control y no donde
   * supone una medida fija. La animación no arranca hasta que las medidas están puestas.
   */
  useLayoutEffect(() => {
    const frame = frameRef.current
    const inner = innerRef.current
    if (!frame || !inner) return
    const medir = () => {
      if (marks) {
        /*
         * Los puntos se miden dentro de la ficha, en sus propias unidades: el dedo vive dentro de
         * la ficha y se mueve con ella, así que da igual el desplazamiento o la escala de la
         * miniatura. La escala se saca comparando el ancho dibujado con el de maquetación, y de
         * paso sirve durante la entrada de la tarjeta.
         */
        const caja = inner.getBoundingClientRect()
        const escala = caja.width / inner.offsetWidth || 1
        const centroDe = (el: Element | null, desvio = 0) => {
          if (!el) return null
          const r = el.getBoundingClientRect()
          return {
            x: Math.round((r.left - caja.left + r.width / 2) / escala) + desvio,
            y: Math.round((r.top - caja.top + r.height / 2) / escala) + desvio,
          }
        }
        const personal = inner.querySelector('section[data-nosnippet]') as HTMLElement | null
        // En el corazón el dedo toca la esquina del botón: en el centro lo tapaba entero.
        const corazon = centroDe(inner.querySelector('button[aria-pressed]'), 12)
        const estrellas = centroDe(inner.querySelectorAll('span[data-fill]')[3] ?? null)
        const visita = centroDe(personal?.querySelector('button') ?? null)
        const top = personal ? (personal.getBoundingClientRect().top - caja.top) / escala : 0
        frame.style.setProperty('--marks-scroll', `-${Math.ceil(Math.max(0, top - 42))}px`)
        for (const [nombre, punto] of [
          ['--tap-corazon', corazon],
          ['--tap-estrellas', estrellas],
          ['--tap-visita', visita],
        ] as const) {
          if (punto) frame.style.setProperty(nombre, `${punto.x}px ${punto.y}px`)
        }
        return
      }
      const visible = frame.clientHeight - 12
      const extra = Math.max(0, inner.getBoundingClientRect().height - visible)
      frame.style.setProperty('--ficha-scroll', `-${Math.ceil(extra / 0.9)}px`)
    }
    medir()
    setReady(true)
    // La letra llega después del primer trazado y puede mover un poco el contenido.
    document.fonts?.ready.then(medir)
    /*
     * La ficha entra deslizándose desde la derecha, y mientras dura el dedo quedaría a un lado.
     * Cuando el deslizamiento termina se vuelve a medir, ya con la ficha quieta.
     */
    inner.addEventListener('animationend', medir)
    const observer = new ResizeObserver(medir)
    observer.observe(frame)
    observer.observe(inner)
    return () => {
      inner.removeEventListener('animationend', medir)
      observer.disconnect()
    }
  }, [marks])

  const demo = marks
    ? {
        favorite: phase >= 1,
        favorites: phase >= 1 ? 13 : 12,
        yours: phase >= 1,
        rating: phase >= 2 ? 4 : null,
        visitDate: phase >= 3 ? today() : null,
      }
    : undefined

  return (
    <div
      className={styles.fichaFrame}
      data-marks={marks || undefined}
      data-ready={ready || undefined}
      ref={frameRef}
    >
      <div
        className={styles.fichaInner}
        data-marks={marks || undefined}
        data-ready={ready || undefined}
        ref={innerRef}
      >
        <PlaceDetail
          place={place}
          plaza={plaza}
          backLabel={t('place.backToPlaza', { plaza: plaza.name })}
          onBack={() => {}}
          onClose={() => {}}
          focusOnMount={false}
          demo={demo}
        />
        {/* En las marcas el dedo va dentro de la ficha: así se mueve con ella y cae sobre su control. */}
        {marks && <span className={`${styles.finger} ${styles.marksFinger}`} />}
      </div>
      {!marks && <span className={`${styles.finger} ${styles.fichaFinger}`} />}
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
