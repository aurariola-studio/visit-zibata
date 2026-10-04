// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { today, toggleVisitToday, visitsStore } from './useVisits.ts'
import { VisitButton } from './VisitButton.tsx'

const stored = () => JSON.parse(window.localStorage.getItem('zibata:visitas') ?? '{}')

describe('VisitButton', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.dispatchEvent(new StorageEvent('storage', { key: 'zibata:visitas' }))
  })
  afterEach(() => {
    vi.useRealTimers()
    visitsStore.write(new Map())
  })

  it('marca la visita de hoy y la cuenta', async () => {
    render(<VisitButton placeId="cafe-aurora" placeName="Café Aurora" />)
    expect(screen.getByText('Registra tu primera visita')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Registrar tu visita de hoy/ }))
    expect(stored()).toEqual({ 'cafe-aurora': [today()] })
    expect(screen.getByRole('button', { name: /Quitar la visita de hoy/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    // La cuenta va dentro del botón (con su nombre para lectores de pantalla) y el aviso al lado.
    expect(screen.getByText('1 visita')).toBeInTheDocument()
    expect(screen.getByText('Toca para deshacer, solo hoy')).toBeInTheDocument()
  })

  it('el mismo día se puede deshacer', async () => {
    render(<VisitButton placeId="cafe-aurora" placeName="Café Aurora" />)
    const button = screen.getByRole('button')
    await userEvent.click(button)
    await userEvent.click(button)
    expect(stored()).toEqual({})
  })

  it('la visita de otro día ya no se deshace, se acumula', () => {
    toggleVisitToday('cafe-aurora', '2026-09-24')
    toggleVisitToday('cafe-aurora', '2026-09-25')
    expect(stored()).toEqual({ 'cafe-aurora': ['2026-09-24', '2026-09-25'] })
    // Desmarcar hoy solo quita la de hoy: la de ayer ya ocurrió.
    toggleVisitToday('cafe-aurora', '2026-09-25')
    expect(stored()).toEqual({ 'cafe-aurora': ['2026-09-24'] })
  })

  it('"hoy" es el día de la persona, no el de UTC', () => {
    vi.useFakeTimers()
    // 23:30 en México (UTC-6) es el día siguiente en UTC: la visita cuenta como del día local.
    vi.setSystemTime(new Date('2026-09-26T05:30:00Z'))
    const local = new Date('2026-09-26T05:30:00Z')
    const expected = new Date(local.getTime() - local.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 10)
    expect(today()).toBe(expected)
  })
})
