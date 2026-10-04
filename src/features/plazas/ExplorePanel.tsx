/** Vista de exploración: resumen de Zibatá y plazas ordenadas por número de lugares. */
import { ChevronRight, Construction, X } from 'lucide-react'
import type { CSSProperties } from 'react'
import { CategoryIcon } from '../../components/icons/CategoryIcon.tsx'
import { DEFAULT_PLAZA_TONE, plazaTones } from '../../config/palette.ts'
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
  const tones = plazaTones(catalog.plazas.filter((plaza) => plaza.active).map((plaza) => plaza.id))
  const comingSoon = catalog.plazas.filter((plaza) => plaza.comingSoon === true)
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
                {/* El color identifica la plaza (el mismo del mapa); la cifra va como texto: una
                    insignia numerada se leía como un puesto en un ranking. */}
                <span
                  className={styles.plazaDot}
                  style={
                    {
                      '--plaza-accent': (tones.get(plaza.id) ?? DEFAULT_PLAZA_TONE).accent,
                    } as CSSProperties
                  }
                  aria-hidden="true"
                />
                <span className={styles.plazaInfo}>
                  <span className={styles.plazaName}>{plaza.name}</span>
                  <span className={styles.plazaMeta} aria-hidden="true">
                    <span className={styles.plazaCount}>{t('places.count', { count })}</span>
                    <span className={styles.plazaIcons}>
                      {plaza.categories.slice(0, 6).map((id) => (
                        <CategoryIcon
                          key={id}
                          name={catalog.categoryById.get(id)?.icon ?? ''}
                          size={15}
                        />
                      ))}
                    </span>
                  </span>
                </span>
                <ChevronRight className={styles.chevron} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!headerOnly && comingSoon.length > 0 && (
        <div className={styles.soon}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>{t('plaza.comingSoonList')}</h3>
          </div>
          <ul className={styles.plazaList}>
            {comingSoon.map((plaza) => (
              <li key={plaza.id} className={styles.soonCard}>
                <span className={styles.soonName}>{plaza.name}</span>
                <span className={styles.soonBadge}>
                  <Construction aria-hidden="true" />
                  {t('plaza.comingSoon')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
