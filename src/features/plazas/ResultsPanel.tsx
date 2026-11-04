/**
 * Resultados de búsqueda / filtros: una sola lista, en el orden que decidió el algoritmo.
 *
 * Antes se agrupaban por plaza, con una cabecera por zona. Una búsqueda que devolvía ocho locales
 * abría ocho secciones de uno o dos: la cabecera ocupaba más que el resultado y partía la lista justo
 * cuando lo que se quiere es comparar. El nombre de la zona no se pierde: ahora es una fila de cada
 * tarjeta, que es donde se lee sin cortar el orden.
 */
import { SearchX, X } from 'lucide-react'
import { EmptyState } from '../../components/ui/EmptyState.tsx'
import { t } from '../../i18n/index.ts'
import type { Place } from '../../types/domain.ts'
import { PlaceList } from '../places/PlaceList.tsx'
import styles from './Panel.module.css'

interface ResultsPanelProps {
  places: readonly Place[]
  onOpenPlace: (place: Place) => void
  onClearFilters: () => void
  /** La zona que acota la búsqueda, si hay una elegida. */
  plazaName?: string
  /** Suelta la zona y deja la búsqueda como estaba. */
  onClearPlaza?: () => void
}

export function ResultsPanel({
  places,
  onOpenPlace,
  onClearFilters,
  plazaName,
  onClearPlaza,
}: ResultsPanelProps) {
  return (
    <section className={styles.panel} aria-labelledby="results-title">
      <header className={styles.header}>
        <div className={styles.topline}>
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowDot} aria-hidden="true" />
            <span>{t('filters.results', { count: places.length })}</span>
          </p>
          <button
            type="button"
            className={styles.close}
            onClick={onClearFilters}
            aria-label={t('filters.clear')}
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <h2 id="results-title" className={styles.title}>
          {t('results.title')}
        </h2>
      </header>

      {places.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title={
            plazaName ? t('results.empty.zone', { plaza: plazaName }) : t('results.empty.title')
          }
          action={
            <div className={styles.emptyActions}>
              {plazaName && onClearPlaza && (
                <button type="button" className={styles.textButton} onClick={onClearPlaza}>
                  {t('results.empty.wholeGuide')}
                </button>
              )}
              <button type="button" className={styles.textButton} onClick={onClearFilters}>
                {t('filters.clear')}
              </button>
            </div>
          }
        >
          {plazaName ? t('results.empty.zoneBody') : t('results.empty.body')}
        </EmptyState>
      ) : (
        <PlaceList places={places} onOpen={onOpenPlace} showPlaza label={t('results.title')} />
      )}
    </section>
  )
}
