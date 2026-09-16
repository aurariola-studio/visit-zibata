import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

export function EmptyState({
  icon,
  title,
  children,
  action,
  tone = 'neutral',
}: {
  icon: ReactNode
  title: string
  children?: ReactNode
  action?: ReactNode
  tone?: 'neutral' | 'error'
}) {
  return (
    <div className={styles.empty} data-tone={tone} role={tone === 'error' ? 'alert' : 'status'}>
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <p className={styles.title}>{title}</p>
      {children && <p className={styles.body}>{children}</p>}
      {action}
    </div>
  )
}
