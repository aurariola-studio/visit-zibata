import { useSyncExternalStore } from 'react'
import { t } from '../../i18n/index.ts'
import { getOpenStatus, getZonedMoment } from '../../lib/hours.ts'
import type { Hours } from '../../types/domain.ts'
import styles from './OpenStatus.module.css'

// Un único reloj compartido por todas las tarjetas (no un temporizador por tarjeta), que avanza al
// cambiar el minuto y solo corre mientras hay algún componente suscrito.
let moment = getZonedMoment(new Date())
const listeners = new Set<() => void>()
let timer: number | undefined

function tick() {
  moment = getZonedMoment(new Date())
  for (const listener of listeners) listener()
  timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000))
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (timer === undefined) {
    moment = getZonedMoment(new Date())
    timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000))
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      window.clearTimeout(timer)
      timer = undefined
    }
  }
}

/** Hora actual en Querétaro, actualizada cada minuto. */
export function useZonedNow() {
  return useSyncExternalStore(subscribe, () => moment)
}

/** "Abierto · Cierra a las 22:00". No renderiza nada si no hay horario (nunca muestra huecos). */
export function OpenStatus({ hours }: { hours: Hours | null }) {
  const now = useZonedNow()
  const status = getOpenStatus(hours, now)
  if (status.state === 'unknown') return null

  let detail: string | null = null
  if (status.state === 'open') detail = t('hours.closesAt', { time: status.closesAt })
  else if (status.opensAt?.day === now.day)
    detail = t('hours.opensAt', { time: status.opensAt.time })
  else if (status.opensAt) {
    detail = t('hours.opensOn', {
      day: t(`day.${status.opensAt.day}`).toLowerCase(),
      time: status.opensAt.time,
    })
  }

  return (
    <span className={styles.status} data-state={status.state}>
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.label}>
        {status.state === 'open' ? t('hours.open') : t('hours.closed')}
      </span>
      {detail && <span className={styles.detail}>· {detail}</span>}
    </span>
  )
}
