/**
 * Tutorial de cinco preguntas. Cada paso muestra una pieza real de la guía en miniatura y la explica
 * en una frase. Se puede cerrar o saltar y no vuelve a mostrarse en el dispositivo.
 */
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { t } from '../../i18n/index.ts'
import styles from './OnboardingModal.module.css'
import { type DemoKind, StepDemo } from './StepDemo.tsx'
import { markOnboardingSeen } from './seen.ts'

const STEPS = [
  { title: 'onboarding.step1.title', body: 'onboarding.step1.body', demo: 'map' },
  { title: 'onboarding.step2.title', body: 'onboarding.step2.body', demo: 'search' },
  { title: 'onboarding.step3.title', body: 'onboarding.step3.body', demo: 'detail' },
  { title: 'onboarding.step4.title', body: 'onboarding.step4.body', demo: 'marks' },
  { title: 'onboarding.step5.title', body: 'onboarding.step5.body', demo: 'suggest' },
] as const satisfies readonly { title: string; body: string; demo: DemoKind }[]

interface OnboardingModalProps {
  open: boolean
  onClose: () => void
}

export function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      setStep(0)
      dialog.showModal()
      // showModal enfoca el primer control (Cerrar). El foco inicial va a la acción principal.
      requestAnimationFrame(() => primaryRef.current?.focus())
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  const finish = () => {
    markOnboardingSeen()
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
        <div className={styles.topbar}>
          <p className={styles.progress} role="status">
            {t('onboarding.progress', { current: step + 1, total: STEPS.length })}
            <span className="visually-hidden">. {t(current.title)}</span>
          </p>
          <button
            type="button"
            className={styles.close}
            onClick={finish}
            aria-label={t('onboarding.close')}
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <div className={styles.stage} data-demo={current.demo}>
          <StepDemo key={step} kind={current.demo} />
        </div>
        <h2 id="onboarding-title" className={styles.title}>
          {t(current.title)}
        </h2>
        <p id="onboarding-body" className={styles.body}>
          {t(current.body)}
        </p>
        <div className={styles.dots} aria-hidden="true">
          {STEPS.map((item, index) => (
            <span key={item.demo} data-active={index === step} />
          ))}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={finish}>
            {t('onboarding.skip')}
          </button>
          <button
            type="button"
            ref={primaryRef}
            className={styles.primary}
            onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
          >
            {isLast ? t('onboarding.start') : t('onboarding.next')}
          </button>
        </div>
      </div>
    </dialog>
  )
}
