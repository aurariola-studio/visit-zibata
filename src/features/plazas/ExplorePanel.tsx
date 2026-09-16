/** Vista de exploración: resumen de Zibatá y plazas ordenadas por número de lugares. */
import { ChevronRight, X } from 'lucide-react'
import { CategoryIcon } from '../../components/icons/CategoryIcon.tsx'
import { useCatalog } from '../../data/CatalogContext.tsx'
import { localized, t } from '../../i18n/index.ts'
import styles from './Panel.module.css'

interface ExplorePanelProps {
  onSelectPlaza: (plazaId: string) => void
  onClose?: () => void
  /** En la hoja móvil colapsada solo se muestra un encabezado compacto con acceso a la lista. */
  headerOnly?: boolean
  onExpand?: () => void
}

export function ExplorePanel({
  onSelectPlaza,
  onClose,
  headerOnly = false,
  onExpand,
}: ExplorePanelProps) {
  const catalog = useCatalog()
  const plazas = catalog.plazas
    .filter((plaza) => plaza.active)
    .map((plaza) => ({ plaza, count: catalog.placesByPlaza.get(plaza.id)?.length ?? 0 }))
    .sort((a, b) => b.count - a.count || a.plaza.name.localeCompare(b.plaza.name, 'es'))

  if (headerOnly) {
    return (
      <section className={styles.peek} aria-labelledby="explore-title">
        <div>
          <h2 id="explore-title" className={styles.peekTitle}>
            {t('explore.title')}
          </h2>
          <p className={styles.peekText}>
            {t('explore.summary', {
              plazas: t('plazas.count', { count: plazas.length }),
              places: t('places.count', { count: catalog.places.length }),
            })}
          </p>
        </div>
        {onExpand && (
          <button type="button" className={styles.peekButton} onClick={onExpand}>
            {t('explore.openList')}
          </button>
        )}
      </section>
    )
  }

  return (
    <section className={styles.panel} aria-labelledby="explore-title">
      <header className={styles.header}>
        <div className={styles.topline}>
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowDot} aria-hidden="true" />
            {t('explore.list')}
          </p>
          {onClose && (
            <button
              type="button"
              className={styles.close}
              onClick={onClose}
              aria-label={t('panel.close')}
            >
              <X aria-hidden="true" />
            </button>
          )}
        </div>
        <h2 id="explore-title" className={styles.title}>
          {t('explore.title')}
        </h2>
        <p className={styles.lead}>
          {t('explore.summary', {
            plazas: t('plazas.count', { count: plazas.length }),
            places: t('places.count', { count: catalog.places.length }),
          })}
        </p>
        {!headerOnly && <p className={styles.address}>{t('explore.hint')}</p>}
      </header>

      {!headerOnly && (
        <ul className={styles.plazaList}>
          {plazas.map(({ plaza, count }) => (
            <li key={plaza.id}>
              <button
                type="button"
                className={styles.plazaCard}
                onClick={() => onSelectPlaza(plaza.id)}
                aria-label={`${plaza.name}, ${t('places.count', { count })}: ${plaza.categories
                  .map((id) => {
                    const category = catalog.categoryById.get(id)
                    return category ? localized(category.label) : id
                  })
                  .join(', ')}`}
              >
                <span className={styles.plazaBadge} aria-hidden="true">
                  {count}
                </span>
                <span className={styles.plazaInfo}>
                  <span className={styles.plazaName}>{plaza.name}</span>
                  <span className={styles.plazaIcons} aria-hidden="true">
                    {plaza.categories.slice(0, 7).map((id) => (
                      <CategoryIcon
                        key={id}
                        name={catalog.categoryById.get(id)?.icon ?? ''}
                        size={15}
                      />
                    ))}
                  </span>
                </span>
                <ChevronRight className={styles.chevron} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
