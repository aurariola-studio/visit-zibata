import { locale, t } from '../../i18n/index.ts'
import { formatRange, groupWeek, hasAnyHours } from '../../lib/hours.ts'
import type { Hours } from '../../types/domain.ts'
import styles from './HoursTable.module.css'
import { OpenStatus, useZonedNow } from './OpenStatus.tsx'

/**
 * El horario del lugar.
 *
 * `cerrado` es el cierre temporal, y lo único que hace es callar el estado en vivo: un local en obra
 * tiene su horario de siempre bien puesto, así que `getOpenStatus` responde "Abierto" con razón y
 * aun así sería falso. La ficha ya lo dice arriba con todas sus letras y en ámbar; repetirlo aquí en
 * verde fue justo lo que salió publicado en la v4.20.
 */
export function HoursTable({
  hours,
  cerrado = false,
  revisado,
}: {
  hours: Hours | null
  cerrado?: boolean
  revisado?: string
}) {
  const now = useZonedNow()
  /*
   * Sin horario se dice, no se calla. La ficha saltaba de la descripción a los iconos y no había forma
   * de saber si faltaba el dato o si el bloque no existía.
   */
  if (!hasAnyHours(hours)) {
    return (
      <section className={styles.section} aria-label={t('place.hours')}>
        <p className={styles.note}>{t('hours.none')}</p>
      </section>
    )
  }

  const groups = groupWeek(hours).filter((group) => group.ranges !== null)
  return (
    <section className={styles.section} aria-label={t('place.hours')}>
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
                {isToday &&
                  (cerrado ? (
                    <span className={styles.today}>{t('hours.today')}</span>
                  ) : (
                    <OpenStatus hours={hours} today />
                  ))}
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
      {revisado && (
        <p className={styles.note}>{t('hours.reviewed', { date: fechaLarga(revisado) })}</p>
      )}
    </section>
  )
}

/** La fecha de verificación, en el idioma de la página. */
function fechaLarga(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(
    fecha,
  )
}
