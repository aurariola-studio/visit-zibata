/**
 * Formulario de "Sugiere un cambio". Es nuestro: mismos campos, mismo idioma y mismo diseño que el
 * resto de la guía. Lo único que sale fuera es el envío, cuando la persona pulsa el botón, a la API de
 * Web3Forms, que lo entrega por correo. Navegar por la guía sigue sin hacer una sola petición externa.
 *
 * Escribe quien sea, y la primera fila lo pregunta: vecino, el propio negocio u otro. Saberlo cambia
 * cómo se trata el dato (lo que dice el negocio de su horario vale más que un rumor), y no obliga a
 * nada más: ni correo, ni lugar, ni cuenta.
 *
 * Cabe sin desplazar la hoja: los campos cortos comparten fila en cuanto hay ancho.
 *
 * El correo de destino no está aquí: vive en Web3Forms, atado a la clave pública. Sin clave no se
 * dibuja el formulario, así que nunca hay un botón que no lleve a ningún sitio.
 */
import { useId, useState } from 'react'
import { canSuggest, SUGGEST_FORM_ENDPOINT, SUGGEST_FORM_KEY } from '../../config/site.ts'
import { t } from '../../i18n/index.ts'
import styles from './SuggestForm.module.css'

type Status = 'idle' | 'sending' | 'sent' | 'error'

const WHO = [
  { value: 'vecino', label: 'suggest.whoNeighbor' },
  { value: 'negocio', label: 'suggest.whoOwner' },
  { value: 'otro', label: 'suggest.whoOther' },
] as const

export function SuggestForm() {
  const ids = useId()
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [place, setPlace] = useState('')
  const [contact, setContact] = useState('')
  const [who, setWho] = useState<(typeof WHO)[number]['value']>('vecino')
  const [invalid, setInvalid] = useState(false)

  if (!canSuggest()) return null

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (message.trim().length === 0) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    setStatus('sending')
    try {
      const response = await fetch(SUGGEST_FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: SUGGEST_FORM_KEY,
          subject: place.trim() ? `Zibatá · ${place.trim()}` : 'Zibatá · sugerencia',
          from_name: 'Zibatá · Comer y beber',
          quien: who,
          lugar: place.trim(),
          mensaje: message.trim(),
          contacto: contact.trim(),
          // Campo trampa de Web3Forms: si un robot lo rellena, el envío se descarta sin captcha.
          botcheck: '',
        }),
      })
      if (!response.ok) throw new Error(String(response.status))
      setStatus('sent')
      setMessage('')
      setPlace('')
      setContact('')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <p className={styles.sent} role="status">
        {t('suggest.ok')}
      </p>
    )
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <fieldset className={styles.who}>
        <legend className={styles.label}>{t('suggest.who')}</legend>
        <div className={styles.whoOptions}>
          {WHO.map((option) => (
            <label key={option.value} className={styles.whoOption} data-on={who === option.value}>
              <input
                type="radio"
                name={`${ids}-who`}
                value={option.value}
                checked={who === option.value}
                onChange={() => setWho(option.value)}
              />
              {t(option.label)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.grid}>
        <label className={styles.field} htmlFor={`${ids}-place`}>
          <span className={styles.label}>
            {t('suggest.place')} <span className={styles.hint}>{t('suggest.placeHint')}</span>
          </span>
          <input
            id={`${ids}-place`}
            className={styles.input}
            type="text"
            value={place}
            maxLength={120}
            autoComplete="off"
            onChange={(event) => setPlace(event.target.value)}
          />
        </label>

        <label className={styles.field} htmlFor={`${ids}-contact`}>
          <span className={styles.label}>
            {t('suggest.contact')} <span className={styles.hint}>{t('suggest.contactHint')}</span>
          </span>
          <input
            id={`${ids}-contact`}
            className={styles.input}
            type="email"
            value={contact}
            maxLength={160}
            autoComplete="email"
            onChange={(event) => setContact(event.target.value)}
          />
        </label>
      </div>

      <label className={styles.field} htmlFor={`${ids}-message`}>
        <span className={styles.label}>{t('suggest.message')}</span>
        <textarea
          id={`${ids}-message`}
          className={styles.input}
          rows={3}
          value={message}
          maxLength={1200}
          required
          aria-invalid={invalid}
          aria-describedby={invalid ? `${ids}-error` : undefined}
          onChange={(event) => setMessage(event.target.value)}
        />
      </label>
      {invalid && (
        <p id={`${ids}-error`} className={styles.error}>
          {t('suggest.required')}
        </p>
      )}

      <div className={styles.actions}>
        <button type="submit" className={styles.send} disabled={status === 'sending'}>
          {status === 'sending' ? t('suggest.sending') : t('suggest.send')}
        </button>
        {status === 'error' && (
          <p className={styles.error} role="alert">
            {t('suggest.error')}
          </p>
        )}
      </div>

      <p className={styles.note}>{t('suggest.note')}</p>
    </form>
  )
}
