// @vitest-environment jsdom
import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HoursSchema } from '../../data/schemas.ts'
import { setLocale } from '../../i18n/index.ts'
import { renderWithCatalog } from '../../test/render.tsx'
import { HoursTable } from './HoursTable.tsx'

const semana = { mon: ['09:00-13:00'], tue: ['09:00-13:00'] }

describe('HoursTable: aviso de clases', () => {
  afterEach(async () => {
    await setLocale('es')
  })

  it('con byClasses avisa antes de la tabla y sin dos puntos', async () => {
    await renderWithCatalog(<HoursTable hours={{ ...semana, byClasses: true }} />)
    const aviso = screen.getByText(/depende de las clases/i)
    expect(aviso.textContent).toBe(
      'El horario depende de las clases. Consulta su disponibilidad antes de ir.',
    )
    expect(aviso.textContent).not.toContain(':')
    // Va antes del horario, no después.
    const tabla = document.querySelector('dl')
    expect(
      aviso.compareDocumentPosition(tabla as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('sin byClasses no dice nada', async () => {
    await renderWithCatalog(<HoursTable hours={semana} />)
    expect(screen.queryByText(/depende de las clases/i)).toBeNull()
  })

  it('en inglés se dice en inglés', async () => {
    await setLocale('en')
    await renderWithCatalog(<HoursTable hours={{ ...semana, byClasses: true }} />)
    expect(screen.getByText(/depend on the classes/i)).toBeInTheDocument()
  })
})

describe('HoursTable: aviso de cita', () => {
  afterEach(async () => {
    await setLocale('es')
  })

  it('con byAppointment avisa antes de la tabla y sin dos puntos', async () => {
    await renderWithCatalog(<HoursTable hours={{ ...semana, byAppointment: true }} />)
    const aviso = screen.getByText(/se recomienda reservar/i)
    expect(aviso.textContent).toBe(
      'Se recomienda reservar tu cita. Consulta su disponibilidad antes de ir.',
    )
    expect(aviso.textContent).not.toContain(':')
    const tabla = document.querySelector('dl')
    expect(
      aviso.compareDocumentPosition(tabla as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('el esquema no admite dos avisos en un horario', () => {
    expect(HoursSchema.safeParse({ byClasses: true }).success).toBe(true)
    expect(HoursSchema.safeParse({ byClasses: true, byAppointment: true }).success).toBe(false)
  })

  it('un horario que solo trae el aviso lo enseña, sin decir que no hay horario', async () => {
    const { container } = await renderWithCatalog(<HoursTable hours={{ paidAccess: true }} />)
    expect(container.textContent).toBe(
      'El acceso tiene costo. Consulta su disponibilidad antes de ir.',
    )
  })

  it('sin byAppointment no dice nada, y no se confunde con el de clases', async () => {
    await renderWithCatalog(<HoursTable hours={semana} />)
    expect(screen.queryByText(/reservar/i)).toBeNull()
    await renderWithCatalog(<HoursTable hours={{ ...semana, byClasses: true }} />)
    expect(screen.queryByText(/reservar/i)).toBeNull()
  })

  it('en inglés se dice en inglés', async () => {
    await setLocale('en')
    await renderWithCatalog(<HoursTable hours={{ ...semana, byAppointment: true }} />)
    expect(screen.getByText(/appointment is recommended/i)).toBeInTheDocument()
  })
})

describe('HoursTable: fecha de revisión', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('dice el día guardado, no el anterior, aunque la zona local sea de UTC menos seis', async () => {
    vi.stubEnv('TZ', 'America/Mexico_City')
    await renderWithCatalog(<HoursTable hours={semana} revisado="2026-11-17" />)
    expect(screen.getByText('Horario revisado el 17 de noviembre de 2026.')).toBeInTheDocument()
  })
})
