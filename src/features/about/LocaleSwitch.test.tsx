// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { setLocale } from '../../i18n/index.ts'
import { InfoDialog } from './InfoDialog.tsx'
import { LocaleSwitch } from './LocaleSwitch.tsx'

afterEach(() => setLocale('es'))

describe('LocaleSwitch', () => {
  it('cambia el idioma de la interfaz de un toque y lo recuerda', async () => {
    render(
      <>
        <LocaleSwitch />
        <InfoDialog topic="privacidad" onClose={() => {}} onGoTo={() => {}} />
      </>,
    )
    // La etiqueta habla en el idioma al que lleva: nunca mezcla los dos en una misma frase.
    await userEvent.click(screen.getByRole('button', { name: 'View the guide in English' }))
    expect(screen.getByRole('heading', { name: 'Privacy' })).toBeInTheDocument()
    expect(window.localStorage.getItem('zibata:idioma')).toBe('en')
    expect(screen.getByRole('button', { name: 'Ver la guía en Español' })).toBeInTheDocument()
  })
})
