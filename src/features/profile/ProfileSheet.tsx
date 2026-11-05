/**
 * La hoja de "Tu Zibatá": tres hojas que se pasan con una fila de pestañas y caben en una pantalla.
 *
 *  - Zonas: tu paso por la guía, con las zonas que ya estrenaste como sellos y el resto en contorno.
 *  - Podio: tus tres de siempre, con lo que has hecho con ellos (visitas, última, nota, corazón).
 *  - Gustos: los tipos de lugar donde más marcas pones.
 *
 * La cabecera y las pestañas no se mueven; el contenido de cada hoja está medido para no necesitar
 * scroll en ningún tamaño de la matriz de pruebas. El orden del podio es interno: en pantalla solo se
 * ve el lugar y sus datos.
 *
 * Vive aparte del botón porque casi nunca se abre: así no viaja en el arranque de la guía.
 */
import { Check, X } from 'lucide-react'
import { type CSSProperties, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CategoryIcon } from '../../components/icons/CategoryIcon.tsx'
import { ProfileIcon } from '../../components/icons/ProfileIcon.tsx'
import { DEFAULT_PLAZA_TONE, type PlazaTone, plazaTones, plazaVars } from '../../config/palette.ts'
import { useCatalog } from '../../data/CatalogContext.tsx'
import { formatNumber, localized, t, useLocale } from '../../i18n/index.ts'
import { alPulsarEnlace } from '../../lib/navegacion.ts'
import { type InfoTopic, rutaDeInfo, rutaDeLugar } from '../../lib/url-state.ts'
import type { Category, Place, Plaza } from '../../types/domain.ts'
import { placeIconName } from '../places/placeIcon.ts'
import { categoryAffinity } from '../ranking/rankPlaces.ts'
import styles from './ProfileButton.module.css'
import type { Marks } from './useMarks.ts'
import { useMarks } from './useMarks.ts'

/** Las hojas, en el orden en que se pasan. */
const HOJAS = [
  { id: 'zonas', label: 'profile.tabZones' },
  { id: 'podio', label: 'profile.tabPodium' },
  { id: 'gustos', label: 'profile.tabTastes' },
] as const

type HojaId = (typeof HOJAS)[number]['id']

/** Las páginas de la guía, también aquí: en un teléfono esta hoja es el camino más corto. */
const LINKS = [
  { topic: 'acerca', label: 'about.openShort' },
  { topic: 'privacidad', label: 'about.privacy' },
  { topic: 'sugerir', label: 'about.suggestShort' },
  { topic: 'tutorial', label: 'about.tutorialShort' },
] as const

/** Cuántos lugares caben en el podio y cuántos gustos se enseñan. */
const TOP = 3
const TOP_GUSTOS = 5

/** Una zona con su color del mapa, si ya la estrenaste y cuántos lugares llevas ahí. */
interface Zone {
  plaza: Plaza
  visited: boolean
  places: number
  tone: PlazaTone
}

/** Un lugar de los tuyos, con todo lo que decide su puesto y lo que se enseña en su renglón. */
interface Ranked {
  place: Place
  rating: number
  visits: number
  favorite: boolean
  opens: number
  last: string
  plazaVisits: number
}

interface Journey {
  visitedPlaces: number
  zones: Zone[]
  zonesVisited: number
  mine: Ranked[]
  tastes: { category: Category; count: number }[]
  tastesRest: number
}

/**
 * El orden de tus tres, en cascada: primero lo que dijiste a propósito (las estrellas), luego lo que
 * hiciste (visitas, corazón), después lo que miraste, y al final los desempates.
 */
function byMine(a: Ranked, b: Ranked): number {
  return (
    b.rating - a.rating ||
    b.visits - a.visits ||
    Number(b.favorite) - Number(a.favorite) ||
    b.opens - a.opens ||
    b.last.localeCompare(a.last) ||
    b.plazaVisits - a.plazaVisits ||
    a.place.name.localeCompare(b.place.name, 'es')
  )
}

/** Lo que llevas hecho, leído del catálogo vigente: lo que ya no existe no cuenta. */
function useJourney(marks: Marks): Journey {
  const catalog = useCatalog()
  return useMemo(() => {
    const find = (id: string) => catalog.placeById.get(id)
    const exists = (place: Place | undefined): place is Place => Boolean(place)
    const visited = [...marks.visits.keys()].map(find).filter(exists)

    // Las zonas llevan su color del mapa: el sello verde de aquí es la misma plaza de allá.
    const visitedZones = new Set(visited.map((place) => place.plazaId))
    const open = catalog.plazas.filter((plaza) => plaza.active)
    const tones = plazaTones(open.map((plaza) => plaza.id))
    const zones: Zone[] = open.map((plaza) => {
      const deLaZona = visited.filter((place) => place.plazaId === plaza.id)
      return {
        plaza,
        visited: visitedZones.has(plaza.id),
        places: deLaZona.length,
        tone: tones.get(plaza.id) ?? DEFAULT_PLAZA_TONE,
      }
    })

    // Cuántas visitas llevas a cada plaza: el penúltimo desempate.
    const plazaVisits = new Map<string, number>()
    for (const [id, dates] of marks.visits) {
      const place = find(id)
      if (!place) continue
      plazaVisits.set(place.plazaId, (plazaVisits.get(place.plazaId) ?? 0) + dates.length)
    }

    // Solo cuenta lo que marcas a propósito: abrir una ficha es curiosidad, no que sea de tus tres.
    // Las aperturas quedan solo para desempatar entre lugares ya marcados.
    const seen = [...new Set([...marks.favorites, ...marks.ratings.keys(), ...marks.visits.keys()])]
      .map(find)
      .filter(exists)

    const mine = seen
      .map((place) => ({
        place,
        rating: marks.ratings.get(place.id) ?? 0,
        visits: marks.visits.get(place.id)?.length ?? 0,
        favorite: marks.favorites.has(place.id),
        opens: marks.interactions.get(place.id)?.opens ?? 0,
        last: marks.visits.get(place.id)?.at(-1) ?? '',
        plazaVisits: plazaVisits.get(place.plazaId) ?? 0,
      }))
      .sort(byMine)
      .slice(0, TOP)

    /*
     * Para los gustos, en cambio, solo cuentan las marcas que pones a propósito: abrir una ficha es
     * curiosidad, no gusto. Se reusa el mismo cálculo que ordena las pastillas de categoría, con las
     * aperturas vacías.
     */
    const marked = [
      ...new Set([...marks.favorites, ...marks.ratings.keys(), ...marks.visits.keys()]),
    ]
      .map(find)
      .filter(exists)
    const affinity = categoryAffinity(
      {
        favorites: marks.favorites,
        ratings: marks.ratings,
        interactions: new Map(),
        visits: marks.visits,
      },
      find,
      Date.now(),
      (giro) => catalog.categoryOfGiro.get(giro)?.id,
    )
    const todos = [...affinity]
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => ({
        category: catalog.categoryById.get(id),
        count: marked.filter((place) =>
          place.giros.some((giro) => catalog.categoryOfGiro.get(giro)?.id === id),
        ).length,
      }))
      .filter((entry): entry is { category: Category; count: number } =>
        Boolean(entry.category && entry.count > 0),
      )
    const tastes = todos.slice(0, TOP_GUSTOS)

    return {
      visitedPlaces: visited.length,
      zones,
      zonesVisited: zones.filter((zone) => zone.visited).length,
      mine,
      tastes,
      tastesRest: Math.max(0, todos.length - tastes.length),
    }
  }, [catalog, marks])
}

/**
 * El nombre corto de la zona para el sello: "Plaza Luna" se lee "Luna". El nombre completo no se
 * pierde: el mapa y el resto de la guía lo llevan entero, y aquí va en el nombre accesible.
 */
function shortZoneName(name: string): string {
  return name.replace(/^Plaza\s+/i, '')
}

/** "20 oct" a partir de la fecha guardada, sin pasar por UTC. */
function fechaCorta(iso: string, idioma: string): string {
  const [anio, mes, dia] = iso.split('-').map(Number)
  if (!anio || !mes || !dia) return iso
  return new Intl.DateTimeFormat(idioma, { day: 'numeric', month: 'short' })
    .format(new Date(anio, mes - 1, dia))
    .replace(/\.$/, '')
}

/** Lo que has hecho con ese lugar, en una línea y solo con lo que exista. */
function loQueHiciste(entry: Ranked, idioma: string): string {
  return [
    entry.visits > 0 ? t('profile.visitCount', { count: entry.visits }) : null,
    entry.last ? t('profile.lastVisit', { date: fechaCorta(entry.last, idioma) }) : null,
    entry.rating > 0 ? `${formatNumber(entry.rating)} ★` : null,
    entry.favorite ? t('profile.saved') : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

function Zonas({ journey }: { journey: Journey }) {
  const catalog = useCatalog()
  const total = journey.zones.length
  return (
    <>
      <div className={styles.sheetHead}>
        <h3 className={styles.blockTitle}>{t('profile.journey')}</h3>
        <p className={styles.count}>
          {t('profile.zonesDone', { done: journey.zonesVisited, total })}
        </p>
      </div>
      {journey.visitedPlaces === 0 && (
        <p className={styles.summary}>
          {t('profile.noVisits', { total, places: catalog.places.length })}
        </p>
      )}
      {/* Los sellos son un cuadro, no controles: aquí se mira lo que llevas. */}
      <ul className={styles.zones} aria-label={t('profile.zonesLabel')}>
        {journey.zones.map((zone) => (
          <li
            key={zone.plaza.id}
            className={styles.zone}
            data-visited={zone.visited}
            title={zone.plaza.name}
          >
            {/* La marca es el dibujo: el color de la plaza cuando ya la estrenaste, hueco cuando no. */}
            <span
              className={styles.zoneStamp}
              style={plazaVars(zone.tone, 'zone') as CSSProperties}
              aria-hidden="true"
            >
              {zone.visited && <Check className={styles.zoneCheck} />}
            </span>
            {/* El nombre va fuera del sello: sobre el color de la zona el texto no llega a AA. */}
            <span className={styles.zoneName}>{shortZoneName(zone.plaza.name)}</span>
            <span className="visually-hidden">
              {zone.visited
                ? `, ${t('profile.zoneDone')}, ${t('profile.zonePlaces', { count: zone.places })}`
                : ''}
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}

function Podio({
  journey,
  onOpenPlace,
}: {
  journey: Journey
  onOpenPlace: (place: Place) => void
}) {
  const catalog = useCatalog()
  const idioma = useLocale()
  const tones = plazaTones(catalog.plazas.filter((item) => item.active).map((item) => item.id))
  return (
    <>
      <div className={styles.sheetHead}>
        <h3 className={styles.blockTitle}>{t('profile.podium')}</h3>
        <p className={styles.count}>{t('profile.podiumCount', { count: journey.mine.length })}</p>
      </div>
      {journey.mine.length === 0 ? (
        <p className={styles.empty}>{t('profile.podiumEmpty')}</p>
      ) : (
        <ol className={styles.rankList}>
          {journey.mine.map((entry, index) => {
            const { place } = entry
            const tone = tones.get(place.plazaId) ?? DEFAULT_PLAZA_TONE
            const plaza = catalog.plazaById.get(place.plazaId)
            return (
              <li key={place.id} className={styles.rank}>
                <span className={styles.position} aria-hidden="true">
                  {index + 1}
                </span>
                <a
                  className={styles.rankLink}
                  href={rutaDeLugar(place.slug, idioma, import.meta.env.BASE_URL)}
                  onClick={alPulsarEnlace(() => onOpenPlace(place))}
                  aria-label={`${t('profile.position', {
                    position: index + 1,
                  })}. ${t('place.openDetail', { name: place.name })}`}
                >
                  <span
                    className={styles.rankIcon}
                    style={plazaVars(tone, 'zone') as CSSProperties}
                    aria-hidden="true"
                  >
                    <CategoryIcon name={placeIconName(place, catalog)} size={18} />
                  </span>
                  <span className={styles.rankText}>
                    <span className={styles.rankName}>{place.name}</span>
                    <span className={styles.rankMeta}>
                      {[plaza?.name, loQueHiciste(entry, idioma)].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </a>
              </li>
            )
          })}
        </ol>
      )}
    </>
  )
}

function Gustos({ journey }: { journey: Journey }) {
  const max = journey.tastes[0]?.count ?? 1
  return (
    <>
      <div className={styles.sheetHead}>
        <h3 className={styles.blockTitle}>{t('profile.tastes')}</h3>
        {journey.tastes.length > 0 && (
          <p className={styles.count}>
            {t('profile.tasteTotal', { count: journey.tastes.length + journey.tastesRest })}
          </p>
        )}
      </div>
      {journey.tastes.length === 0 ? (
        <p className={styles.empty}>{t('profile.tastesEmpty')}</p>
      ) : (
        <>
          <ul className={styles.tasteList}>
            {journey.tastes.map((taste) => (
              <li key={taste.category.id} className={styles.taste}>
                <CategoryIcon name={taste.category.icon} size={16} strokeWidth={2} />
                <span className={styles.tasteName}>{localized(taste.category.label)}</span>
                <span className={styles.tasteBar} aria-hidden="true">
                  <span style={{ width: `${Math.round((taste.count / max) * 100)}%` }} />
                </span>
                <span className={styles.tasteCount}>{formatNumber(taste.count)}</span>
              </li>
            ))}
          </ul>
          {journey.tastesRest > 0 && (
            <p className={styles.more}>{t('profile.moreTastes', { count: journey.tastesRest })}</p>
          )}
        </>
      )}
    </>
  )
}

interface SheetProps {
  onClose: () => void
  onOpenInfo: (topic: InfoTopic) => void
  onOpenPlace: (place: Place) => void
}

export function ProfileSheet({ onClose, onOpenInfo, onOpenPlace }: SheetProps) {
  const baseId = useId()
  const tabsRef = useRef<HTMLDivElement>(null)
  const idioma = useLocale()
  const marks = useMarks()
  const journey = useJourney(marks)
  const [hoja, setHoja] = useState<HojaId>('zonas')
  const tabId = (id: HojaId) => `${baseId}-tab-${id}`
  const panelId = (id: HojaId) => `${baseId}-panel-${id}`

  // Al abrir, el foco entra en la pestaña activa: quien navega con teclado sabe dónde está y con las
  // flechas cambia de hoja. Escape la cierra desde cualquier parte, como las demás.
  useEffect(() => {
    tabsRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const porTeclado = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const indice = HOJAS.findIndex((item) => item.id === hoja)
    let destino = indice
    if (event.key === 'ArrowLeft') destino = (indice + HOJAS.length - 1) % HOJAS.length
    else if (event.key === 'ArrowRight') destino = (indice + 1) % HOJAS.length
    else if (event.key === 'Home') destino = 0
    else if (event.key === 'End') destino = HOJAS.length - 1
    else return
    event.preventDefault()
    const siguiente = HOJAS[destino]
    if (!siguiente) return
    setHoja(siguiente.id)
    tabsRef.current?.querySelector<HTMLButtonElement>(`#${tabId(siguiente.id)}`)?.focus()
  }

  // Igual que las hojas de información: fuera del panel, porque la barra superior crea contexto de
  // apilamiento (backdrop-filter) y un `position: fixed` dentro de ella se ancla a la barra.
  return createPortal(
    <div className={styles.veil}>
      <button
        type="button"
        className={styles.veilButton}
        aria-label={t('about.close')}
        onClick={onClose}
      />
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <div className={styles.head}>
          <div className={styles.identity}>
            <span className={styles.bigAvatar} aria-hidden="true">
              <ProfileIcon />
            </span>
            <div>
              <h2 id="profile-title" className={styles.title}>
                {t('profile.title')}
              </h2>
              <p className={styles.subtitle}>{t('profile.subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label={t('about.close')}
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <div
          ref={tabsRef}
          className={styles.tabs}
          role="tablist"
          aria-label={t('profile.tabs')}
          onKeyDown={porTeclado}
        >
          {HOJAS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={tabId(id)}
              className={styles.tab}
              aria-selected={hoja === id}
              aria-controls={panelId(id)}
              tabIndex={hoja === id ? 0 : -1}
              onClick={() => setHoja(id)}
            >
              {t(label)}
            </button>
          ))}
        </div>

        <div
          className={styles.panel}
          role="tabpanel"
          id={panelId(hoja)}
          aria-labelledby={tabId(hoja)}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: el panel solo se desplaza como respaldo; con este tope de tabulación ese caso sigue siendo alcanzable con el teclado.
          tabIndex={0}
        >
          {hoja === 'zonas' && <Zonas journey={journey} />}
          {hoja === 'podio' && <Podio journey={journey} onOpenPlace={onOpenPlace} />}
          {hoja === 'gustos' && <Gustos journey={journey} />}
        </div>

        <p className={styles.storage}>{t('profile.storage')}</p>

        <nav className={styles.links} aria-label={t('about.moreLabel')}>
          {LINKS.map((link) => (
            <a
              key={link.topic}
              className={styles.link}
              href={rutaDeInfo(link.topic, idioma, import.meta.env.BASE_URL)}
              onClick={alPulsarEnlace(() => onOpenInfo(link.topic))}
            >
              {t(link.label)}
            </a>
          ))}
        </nav>
      </div>
    </div>,
    document.body,
  )
}
