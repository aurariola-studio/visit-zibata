/** PlazaPanel: nombre, descripción, nº de lugares, categorías y lista de establecimientos. */
import { ArrowUpRight, MapPin, SearchX, X } from 'lucide-react'
import { type CSSProperties, useEffect, useRef } from 'react'
import { EmptyState } from '../../components/ui/EmptyState.tsx'
import { DEFAULT_PLAZA_TONE, plazaTones, plazaVars } from '../../config/palette.ts'
import { useCatalog } from '../../data/CatalogContext.tsx'
import { localized, t } from '../../i18n/index.ts'
import { registrar } from '../../lib/eventos.ts'
import { focusPanelHeading } from '../../lib/focus.ts'
import { plazaDirectionsUrl } from '../../lib/maps-url.ts'
import type { Place, Plaza, Sector } from '../../types/domain.ts'
import { PlaceList } from '../places/PlaceList.tsx'
import { CategoryChips } from './CategoryChips.tsx'
import styles from './Panel.module.css'

interface PlazaPanelProps {
  plaza: Plaza
  /** Lugares de la plaza que cumplen los filtros actuales. */
  places: readonly Place[]
  /** Lugares de la plaza por categoría con búsqueda y favoritos aplicados (los mismos que la barra superior). */
  categoryCounts: ReadonlyMap<string, number>
  filtersActive: boolean
  activeCategoryId: string | null
  onCategoryChange: (categoryId: string | null) => void
  categoryHref: (categoryId: string | null) => string
  /**
   * Los sectores con lugares (vacío si hay uno solo) y lo que hace falta para elegirlos. Con dos o más
   * sectores en esta zona, las pastillas bajan de nivel igual que en la barra de arriba: primero los
   * sectores, y al elegir uno, sus categorías.
   */
  sectors?: readonly Sector[]
  sectorCounts?: ReadonlyMap<string, number>
  activeSectorId?: string | null
  onSectorChange?: (sectorId: string | null) => void
  sectorHref?: (sectorId: string | null) => string
  onClearFilters: () => void
  onOpenPlace: (place: Place) => void
  onClose: () => void
}

export function PlazaPanel({
  plaza,
  places,
  categoryCounts,
  filtersActive,
  activeCategoryId,
  onCategoryChange,
  categoryHref,
  sectors = [],
  sectorCounts,
  activeSectorId = null,
  onSectorChange,
  sectorHref,
  onClearFilters,
  onOpenPlace,
  onClose,
}: PlazaPanelProps) {
  const catalog = useCatalog()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const allPlaces = catalog.placesByPlaza.get(plaza.id) ?? []
  // El mismo color que la plaza tiene en el mapa: al abrir el panel se reconoce de dónde viene.
  const tone =
    plazaTones(catalog.plazas.filter((item) => item.active).map((item) => item.id)).get(plaza.id) ??
    DEFAULT_PLAZA_TONE
  const categories = plaza.categories
    .map((id) => catalog.categoryById.get(id))
    .filter((category) => category !== undefined)
  /*
   * Con dos o más sectores en esta zona, un solo carril baja de nivel: primero los sectores y, al elegir
   * uno, sus categorías con el sector a la izquierda. Mezclar las categorías de todos en una tira
   * obligaba a recorrer Comida para llegar a Salud. Con un solo sector, no hay nada que subir.
   */
  const zoneSectors = sectors.filter((sector) =>
    categories.some((category) => category.sectorId === sector.id),
  )
  const porSectores =
    zoneSectors.length >= 2 && onSectorChange !== undefined && sectorHref !== undefined
  const sector = porSectores ? zoneSectors.find((item) => item.id === activeSectorId) : undefined
  const categoriasDelSector = sector
    ? categories.filter((category) => category.sectorId === sector.id)
    : categories
  // Quitar la categoría dentro de un sector deja el sector, no la zona entera.
  const quitaAlSector = (id: string | null) => id === null && sector !== undefined

  // biome-ignore lint/correctness/useExhaustiveDependencies: el foco se mueve al título cada vez que cambia la plaza mostrada.
  useEffect(() => {
    focusPanelHeading(headingRef.current)
  }, [plaza.id])

  return (
    <section
      className={styles.panel}
      style={plazaVars(tone) as CSSProperties}
      aria-labelledby="plaza-panel-title"
    >
      <header className={styles.header} data-sello="plaza">
        {/*
         * El matasellos: decoración de fondo, no un dato. Lleva el nombre de la zona en el color de
         * esa zona, al 14 %, y el texto le pasa por encima sin apartarse. Es lo único de la guía que
         * está ahí solo por carácter, y por eso aparece una vez por panel y nunca en una fila.
         */}
        <span className={styles.sello} aria-hidden="true">
          {plaza.name}
        </span>
        <div className={styles.topline}>
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowDot} aria-hidden="true" />
            {t('plaza.label')} · {t('places.count', { count: allPlaces.length })}
          </p>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label={t('panel.close')}
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <h2 id="plaza-panel-title" ref={headingRef} tabIndex={-1} className={styles.title}>
          {plaza.name}
        </h2>
        {plaza.description && <p className={styles.lead}>{localized(plaza.description)}</p>}
        <p className={styles.address}>
          {plaza.address && (
            <span className={styles.addressText}>
              <MapPin aria-hidden="true" />
              {plaza.address}
            </span>
          )}
          {/* `data-nosnippet` no vale en un `<a>`: se envuelve, y el envoltorio no genera caja. */}
          <span className={styles.sinFragmento} data-nosnippet="">
            <a
              className={styles.inlineLink}
              href={plazaDirectionsUrl(plaza)}
              onClick={() => registrar('salida', plaza.id, 'maps')}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('plaza.directions')}
              <ArrowUpRight aria-hidden="true" />
            </a>
          </span>
        </p>
      </header>

      {porSectores && !sector ? (
        <CategoryChips
          categories={zoneSectors}
          counts={sectorCounts}
          activeId={null}
          onChange={(id) => onSectorChange?.(id)}
          hrefFor={(id) => sectorHref?.(id) ?? ''}
          label={t('filters.sectors')}
          hideAll
        />
      ) : (
        (sector !== undefined || categories.length > 1) && (
          <CategoryChips
            categories={categoriasDelSector}
            counts={categoryCounts}
            totalCount={places.length}
            activeId={activeCategoryId}
            onChange={(id) =>
              quitaAlSector(id) ? onSectorChange?.(activeSectorId) : onCategoryChange(id)
            }
            hrefFor={(id) =>
              quitaAlSector(id) && sectorHref ? sectorHref(activeSectorId) : categoryHref(id)
            }
            label={t('filters.categories')}
            hideAll={sector !== undefined}
            clearMark={sector !== undefined}
            lead={
              sector && onSectorChange && sectorHref
                ? {
                    label: localized(sector.label),
                    icon: sector.icon,
                    selected: activeCategoryId === null,
                    href: activeCategoryId === null ? sectorHref(null) : sectorHref(sector.id),
                    hint:
                      activeCategoryId === null ? t('filters.sectorBack') : t('filters.sectorAll'),
                    onPress: () => onSectorChange(activeCategoryId === null ? null : sector.id),
                  }
                : undefined
            }
          />
        )
      )}

      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>{t('plaza.places')}</h3>
        <span className={styles.count}>
          {filtersActive
            ? t('filters.results', { count: places.length })
            : t('places.count', { count: places.length })}
        </span>
      </div>

      {allPlaces.length === 0 ? (
        <p className={styles.note}>{t('plaza.empty')}</p>
      ) : places.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title={t('results.empty.title')}
          action={
            <button type="button" className={styles.textButton} onClick={onClearFilters}>
              {t('plaza.showAll')}
            </button>
          }
        >
          {t('plaza.filteredEmpty')}
        </EmptyState>
      ) : (
        <>
          <PlaceList places={places} onOpen={onOpenPlace} label={t('plaza.places')} byOpenNow />
          {filtersActive && (
            <button type="button" className={styles.textButton} onClick={onClearFilters}>
              {t('plaza.showAll')}
            </button>
          )}
        </>
      )}
    </section>
  )
}
