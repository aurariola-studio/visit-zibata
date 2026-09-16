import { t } from '../../i18n/index.ts'
import { formatRange, groupWeek, hasAnyHours } from '../../lib/hours.ts'
import type { Hours } from '../../types/domain.ts'
import styles from './HoursTable.module.css'
import { OpenStatus, useZonedNow } from './OpenStatus.tsx'

export function HoursTable({ hours }: { hours: Hours | null }) {
  const now = useZonedNow()
  if (!hasAnyHours(hours)) return null

  const groups = groupWeek(hours).filter((group) => group.ranges !== null)
  return (
    <section className={styles.section} aria-labelledby="place-hours-title">
      <div className={styles.header}>
        <h3 id="place-hours-title" className={styles.title}>
          {t('place.hours')}
        </h3>
        <OpenStatus hours={hours} />
      </div>
      <dl className={styles.table}>
        {groups.map((group) => {
          const first = group.days[0]
          const last = group.days.at(-1)
          if (!first || !last) return null
          const days =
            first === last
              ? t(`day.${first}`)
              : `${t(`dayShort.${first}`)}–${t(`dayShort.${last}`)}`
          const isToday = group.days.includes(now.day)
          return (
            <div key={group.days.join('-')} className={styles.row} data-today={isToday}>
              <dt>
                {days}
                {isToday && <span className={styles.today}>{t('hours.today')}</span>}
              </dt>
              <dd>
                {group.ranges?.length
                  ? group.ranges.map(formatRange).join(', ')
                  : t('hours.closedAllDay')}
              </dd>
            </div>
          )
        })}
      </dl>
      {hours.note && <p className={styles.note}>{hours.note}</p>}
      <p className={styles.note}>{t('hours.timezoneNote')}</p>
    </section>
  )
}
