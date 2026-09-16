/**
 * Tutorial ligero de 3 pasos. Se puede cerrar o saltar y no vuelve a mostrarse en la sesión
 * (sessionStorage). Es un componente aislado: quitarlo no afecta al resto de la app.
 */
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { t } from '../../i18n/index.ts'
import styles from './OnboardingModal.module.css'

const STORAGE_KEY = 'zibata:onboarding-visto'

export function hasSeenOnboarding(): boolean {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function markSeen(): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // Sin almacenamiento disponible: el tutorial podría reaparecer al recargar, sin más efectos.
  }
}

const STEPS = [
  { title: 'onboarding.step1.title', body: 'onboarding.step1.body', art: 'explore' },
  { title: 'onboarding.step2.title', body: 'onboarding.step2.body', art: 'plaza' },
  { title: 'onboarding.step3.title', body: 'onboarding.step3.body', art: 'discover' },
] as const

function StepArt({ kind }: { kind: (typeof STEPS)[number]['art'] }) {
  return (
    <svg viewBox="0 0 240 132" className={styles.art} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="onb-ground" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f6f1e8" />
          <stop offset="1" stopColor="#e6ddcd" />
        </linearGradient>
      </defs>
      <path d="M20 84 120 34l100 50-100 50z" fill="url(#onb-ground)" stroke="#d1c3b0" />
      <path
        d="M44 84l76-38M70 97l76-38M96 110l76-38"
        stroke="#fffdf9"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {[
        [78, 66],
        [104, 54],
        [150, 84],
        [128, 96],
        [176, 72],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <path d="M0 0l12-6 12 6v10l-12 6-12-6z" fill="#fbf8f2" stroke="#d1c3b0" />
          <path d="M0 0l12 6 12-6" fill="none" stroke="#e6ddcd" />
        </g>
      ))}
      {kind !== 'explore' && (
        <g transform="translate(108 68)">
          <path d="M0 0l16-8 16 8v16l-16 8-16-8z" fill={kind === 'plaza' ? '#8cba37' : '#a7c86a'} />
          <path d="M0 0l16 8 16-8-16-8z" fill="#b8d77c" />
          <path d="M16 8v24l16-8V0z" fill="#6a8736" />
        </g>
      )}
      {kind === 'plaza' && (
        <g transform="translate(96 26)">
          <rect width="56" height="22" rx="11" fill="#536c2a" />
          <circle cx="44" cy="11" r="7" fill="#8cba37" />
          <rect x="10" y="8" width="24" height="6" rx="3" fill="#f3f8ea" />
          <path d="M28 22v14" stroke="#536c2a" strokeWidth="2" />
        </g>
      )}
      {kind === 'explore' && (
        <g
          transform="translate(150 20)"
          fill="none"
          stroke="#536c2a"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M8 22c10-14 30-14 40 0" />
          <path d="M40 14l8 8-10 3" />
          <circle cx="28" cy="44" r="9" fill="#e7f1d4" />
        </g>
      )}
      {kind === 'discover' && (
        <g transform="translate(150 16)">
          <rect width="72" height="52" rx="10" fill="#fcfaf6" stroke="#d1c3b0" />
          <rect x="8" y="9" width="16" height="16" rx="5" fill="#e7f1d4" />
          <rect x="30" y="11" width="32" height="5" rx="2.5" fill="#435a22" />
          <rect x="30" y="20" width="22" height="4" rx="2" fill="#b9a88f" />
          <rect x="8" y="33" width="56" height="11" rx="5.5" fill="#536c2a" />
        </g>
      )}
    </svg>
  )
}

interface OnboardingModalProps {
  open: boolean
  onClose: () => void
}

export function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      setStep(0)
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  const finish = () => {
    markSeen()
    onClose()
  }

  // Clic en el fondo cierra el tutorial (con teclado se cierra con Escape, evento nativo del <dialog>).
  const finishRef = useRef(finish)
  useEffect(() => {
    finishRef.current = finish
  })
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onBackdrop = (event: MouseEvent) => {
      if (event.target === dialog) finishRef.current()
    }
    dialog.addEventListener('click', onBackdrop)
    return () => dialog.removeEventListener('click', onBackdrop)
  }, [])

  const current = STEPS[step] ?? STEPS[0]
  const isLast = step === STEPS.length - 1

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-body"
      onClose={finish}
    >
      <div className={styles.card}>
        <button
          type="button"
          className={styles.close}
          onClick={finish}
          aria-label={t('onboarding.close')}
        >
          <X aria-hidden="true" />
        </button>
        <StepArt kind={current.art} />
        <p className={styles.progress}>
          {t('onboarding.progress', { current: step + 1, total: STEPS.length })}
        </p>
        <h2 id="onboarding-title" className={styles.title}>
          {t(current.title)}
        </h2>
        <p id="onboarding-body" className={styles.body}>
          {t(current.body)}
        </p>
        <div className={styles.dots} aria-hidden="true">
          {STEPS.map((item, index) => (
            <span key={item.art} data-active={index === step} />
          ))}
        </div>
        <div className={styles.actions}>
          {step === 0 ? (
            <button type="button" className={styles.secondary} onClick={finish}>
              {t('onboarding.skip')}
            </button>
          ) : (
            <button
              type="button"
              className={styles.secondary}
              onClick={() => setStep((s) => s - 1)}
            >
              {t('onboarding.back')}
            </button>
          )}
          <button
            type="button"
            className={styles.primary}
            onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
            // biome-ignore lint/a11y/noAutofocus: el foco inicial del diálogo debe estar en la acción principal.
            autoFocus
          >
            {isLast ? t('onboarding.start') : t('onboarding.next')}
          </button>
        </div>
      </div>
    </dialog>
  )
}
