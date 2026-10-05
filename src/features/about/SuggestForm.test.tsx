// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** El formulario lee la clave al importarse: cada prueba lo importa con el entorno ya preparado. */
async function load(key: string | undefined) {
  vi.resetModules()
  if (key === undefined) vi.stubEnv('VITE_WEB3FORMS_KEY', '')
  else vi.stubEnv('VITE_WEB3FORMS_KEY', key)
  return import('./SuggestForm.tsx')
}

describe('SuggestForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('sin clave no se dibuja ningún formulario', async () => {
    const { SuggestForm } = await load(undefined)
    const { canSuggest } = await import('../../config/site.ts')
    expect(canSuggest()).toBe(false)
    const { container } = render(<SuggestForm />)
    expect(container).toBeEmptyDOMElement()
  })

  it('envía a Web3Forms con la clave y sin exponer ningún correo de destino', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const { SuggestForm } = await load('clave-de-prueba')
    render(<SuggestForm />)

    // Escribe quien sea: aquí, el propio negocio, y eso viaja con el mensaje.
    await userEvent.click(screen.getByRole('radio', { name: 'Negocio' }))
    await userEvent.type(screen.getByLabelText(/Lugar o zona/), 'Tomassa')
    await userEvent.type(screen.getByLabelText(/Tu mensaje/), 'Cambió el horario')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.web3forms.com/submit')
    const body = JSON.parse(String(init.body))
    expect(body).toMatchObject({
      access_key: 'clave-de-prueba',
      quien: 'negocio',
      lugar: 'Tomassa',
      mensaje: 'Cambió el horario',
    })
    expect(JSON.stringify(body)).not.toMatch(/@/)
    expect(await screen.findByRole('status')).toHaveTextContent(/Gracias/)
  })

  it('el campo trampa existe, no lo alcanza ninguna persona y descarta el envío', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const { SuggestForm } = await load('clave-de-prueba')
    const { container } = render(<SuggestForm />)

    const trampa = container.querySelector<HTMLInputElement>('input[name="botcheck"]')
    expect(trampa).not.toBeNull()
    // Fuera del tabulador, y con etiqueta propia: quien lo encuentre sabe que debe dejarlo en blanco.
    expect(trampa?.tabIndex).toBe(-1)
    expect(screen.getByLabelText('No rellenes este campo')).toBe(trampa)

    // Un robot que rellena todos los campos también rellena este, y entonces no se envía nada.
    await userEvent.type(screen.getByLabelText(/Tu mensaje/), 'Compra seguidores baratos')
    await userEvent.type(trampa as HTMLInputElement, 'http://spam.example')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))

    expect(fetchMock).not.toHaveBeenCalled()
    // Ve el mismo acuse que si hubiera funcionado: no aprende que se le descartó.
    expect(await screen.findByRole('status')).toHaveTextContent(/Gracias/)
  })

  it('no envía nada sin decir qué cambia', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { SuggestForm } = await load('clave-de-prueba')
    render(<SuggestForm />)

    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText('Escribe tu mensaje.')).toBeInTheDocument()
  })
})
