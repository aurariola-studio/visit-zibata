// @vitest-environment jsdom
import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
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
