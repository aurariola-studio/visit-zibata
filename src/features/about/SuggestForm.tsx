/**
 * Formulario de "Sugiere un cambio". Es nuestro de punta a punta: desde la v4.18 el envío va a
 * nuestro propio servidor y no a un tercero, así que usar la guía entera no hace ni una petición
 * fuera del origen.
 *
 * Escribe quien sea, y la primera fila lo pregunta: vecino, el propio negocio u otro. Saberlo cambia
 * cómo se trata el dato (lo que dice el negocio de su horario vale más que un rumor), y no obliga a
 * nada más: ni correo, ni lugar, ni cuenta. Mandar un recado no crea identidad.
 *
 * Cabe sin desplazar la hoja: los campos cortos comparten fila en cuanto hay ancho.
 *
 * Lo que frena el spam son tres cosas que no se ven: el campo trampa, la prueba de trabajo que
 * cuesta mandar el formulario, y que esa prueba valga una sola vez (ver worker/sugerencias.ts).
 */
import { useEffect, useId, useRef, useState } from 'react'
import { SUGGEST_FORM_ENDPOINT } from '../../config/site.ts'
import { useMediaQuery } from '../../hooks/useMediaQuery.ts'
import { t } from '../../i18n/index.ts'
import { secretoConPrueba } from '../../lib/prueba-de-trabajo.ts'
import styles from './SuggestForm.module.css'

type Status = 'idle' | 'sending' | 'sent' | 'error'

/** El borrador y el acuse viven en la sesión: cerrar sin querer no borra lo escrito. */
const BORRADOR = 'zibata:sugerencia-borrador'
const ENVIADA = 'zibata:sugerencia-enviada'

/**
 * Lo que se ve escrito. `trim()` no quita los caracteres de ancho cero, así que un mensaje con solo
 * U+200B pasaba la validación y se enviaba vacío.
 */
const visible = (texto: string): string => texto.replace(/[\u200b-\u200d\u2060\ufeff]/g, '').trim()

const esCorreo = (texto: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(texto)

const leerBorrador = (): { message: string; place: string; contact: string } => {
  try {
    const guardado = sessionStorage.getItem(BORRADOR)
    if (!guardado) return { message: '', place: '', contact: '' }
    const datos = JSON.parse(guardado) as Record<string, unknown>
    return {
      message: typeof datos.message === 'string' ? datos.message : '',
      place: typeof datos.place === 'string' ? datos.place : '',
      contact: typeof datos.contact === 'string' ? datos.contact : '',
    }
  } catch {
    return { message: '', place: '', contact: '' }
  }
}

const WHO = [
  { value: 'vecino', label: 'suggest.whoNeighbor' },
  { value: 'negocio', label: 'suggest.whoOwner' },
  { value: 'otro', label: 'suggest.whoOther' },
] as const

export function SuggestForm({ demo = false }: { demo?: boolean }) {
  const ids = useId()
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const borrador = demo
    ? {
        message: '',
        place: t('onboarding.demo.place1'),
        contact: '',
      }
    : leerBorrador()
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState(borrador.message)
  const [place, setPlace] = useState(borrador.place)
  const [contact, setContact] = useState(borrador.contact)
  const [who, setWho] = useState<(typeof WHO)[number]['value']>('vecino')
  const [invalid, setInvalid] = useState<'message' | 'contact' | null>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const contactoRef = useRef<HTMLInputElement>(null)
  /**
   * Campo trampa: existe en el formulario pero ninguna persona lo ve ni lo alcanza, así que si
   * llega con algo escrito lo ha escrito un robot de los que rellenan todos los campos. Antes esto
   * se enviaba siempre vacío y codificado a mano, de modo que el comentario prometía una defensa
   * que no existía: sin campo en la página, nada podía rellenarlo nunca.
   */
  const [trap, setTrap] = useState('')

  // El borrador se guarda mientras se escribe: cerrar la ventana, pulsar Atrás o recargar ya no lo borra.
  // En la demostración del tutorial no se toca: pisaría lo que la persona tenga a medio escribir.
  useEffect(() => {
    if (demo) return
    sessionStorage.setItem(BORRADOR, JSON.stringify({ message, place, contact }))
  }, [message, place, contact, demo])

  // La demostración escribe el mensaje para que se vea el formulario llenándose, sin enviar nada.
  useEffect(() => {
    if (!demo) return
    const texto = t('onboarding.demo.message')
    if (reduced) {
      setMessage(texto)
      return
    }
    setMessage('')
    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      setMessage(texto.slice(0, index))
      if (index >= texto.length) window.clearInterval(timer)
    }, 45)
    return () => window.clearInterval(timer)
  }, [demo, reduced])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (visible(message).length === 0) {
      setInvalid('message')
      // El aviso no se anuncia solo: el foco va al campo que falla y el texto vive en una región viva.
      areaRef.current?.focus()
      return
    }
    const correo = contact.trim()
    if (correo && !esCorreo(correo)) {
      setInvalid('contact')
      contactoRef.current?.focus()
      return
    }
    setInvalid(null)
    // Se descarta aquí y no solo en el servidor: es más barato, y el acuse que ve el robot es el
    // mismo que vería si hubiera funcionado, así que no aprende nada probando otra vez.
    if (trap) {
      setStatus('sent')
      return
    }
    /*
     * El mismo texto no se manda dos veces en la misma sesión. Antes, cerrar durante el envío no
     * cancelaba nada y al reabrir no había acuse, así que se volvía a escribir y quedaban dos filas
     * iguales con sellos distintos.
     */
    const huella = `${visible(message).length}:${visible(message).slice(0, 24)}`
    if (sessionStorage.getItem(ENVIADA) === huella) {
      setStatus('sent')
      return
    }
    setStatus('sending')
    try {
      /*
       * El sello: un valor cuya huella empieza por ceros. Buscarlo cuesta uno o dos segundos de
       * CPU, que es lo que hace cara una ráfaga de envíos y no le cuesta nada a quien escribe una
       * vez. El servidor lo guarda como clave única, así que reenviar el mismo no escribe nada.
       */
      const sello = await secretoConPrueba()
      if (!sello) throw new Error('sin sello')
      const response = await fetch(SUGGEST_FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          quien: who,
          lugar: place.trim(),
          mensaje: visible(message),
          contacto: contact.trim(),
          sello,
        }),
      })
      if (!response.ok) throw new Error(String(response.status))
      sessionStorage.setItem(ENVIADA, huella)
      sessionStorage.removeItem(BORRADOR)
      setStatus('sent')
      setMessage('')
      setPlace('')
      setContact('')
      setTrap('')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className={styles.sentBox}>
        <p className={styles.sent} role="status">
          {t('suggest.ok')}
        </p>
        <button
          type="button"
          className={styles.again}
          onClick={() => {
            sessionStorage.removeItem(ENVIADA)
            setStatus('idle')
          }}
        >
          {t('suggest.again')}
        </button>
      </div>
    )
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate data-demo={demo || undefined}>
      {/* Fuera de la vista y fuera del tabulador, pero **con etiqueta**: un control enfocable
          escondido con `aria-hidden` es una violación de accesibilidad, y además deja a quien usa
          lector de pantalla con un campo mudo que no sabe si debe rellenar. Así se lo encuentra
          solo quien recorre los controles, y lo primero que oye es que lo deje en blanco. */}
      <label className={styles.trap} htmlFor={`${ids}-trap`}>
        {t('suggest.trap')}
        <input
          id={`${ids}-trap`}
          type="text"
          name="botcheck"
          value={trap}
          onChange={(event) => setTrap(event.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </label>
      <fieldset className={styles.who}>
        <legend className={styles.label}>{t('suggest.who')}</legend>
        <div className={styles.whoOptions}>
          {WHO.map((option) => (
            <label key={option.value} className={styles.whoOption}>
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
            ref={contactoRef}
            id={`${ids}-contact`}
            className={styles.input}
            type="email"
            value={contact}
            maxLength={160}
            autoComplete="email"
            aria-invalid={invalid === 'contact'}
            aria-describedby={invalid === 'contact' ? `${ids}-contact-error` : undefined}
            onChange={(event) => setContact(event.target.value)}
          />
        </label>
      </div>
      {invalid === 'contact' && (
        <p id={`${ids}-contact-error`} className={styles.error} role="alert">
          {t('suggest.contactInvalid')}
        </p>
      )}

      <div className={styles.field}>
        <span className={styles.labelRow}>
          <label className={styles.label} htmlFor={`${ids}-message`}>
            {t('suggest.message')}
          </label>
          <span className={styles.counter} aria-hidden="true">
            {message.length}/{1200}
          </span>
        </span>
        <textarea
          ref={areaRef}
          id={`${ids}-message`}
          className={styles.area}
          rows={3}
          value={message}
          maxLength={1200}
          required
          aria-invalid={invalid === 'message'}
          aria-describedby={invalid === 'message' ? `${ids}-error` : undefined}
          onChange={(event) => setMessage(event.target.value)}
        />
      </div>
      {invalid === 'message' && (
        <p id={`${ids}-error`} className={styles.error} role="alert">
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
