/**
 * El calendario de visitas de un lugar: un mes, con los días que ya registraste marcados.
 *
 * Esto lo hacía el calendario del sistema, y se cambió por dos razones que el del sistema no puede
 * resolver. La primera es la que importa: **no sabe nada de tus visitas**, así que abría un mes en
 * blanco donde no se veía si ya habías venido ese día, y marcar dos veces el mismo día no se podía
 * distinguir de marcarlo la primera. La segunda es que sale en el idioma del teléfono, no en el de
 * la guía: alguien leyendo en español se encontraba "October 2026" y "Su Mo Tu We Th Fr Sa".
 *
 * El precio de construirlo es el teclado y el lector de pantalla, que en un calendario son trabajo
 * de verdad. Aquí se resuelve con la cuadrícula de días como un grupo de botones: cada día es un
 * botón que alterna (`aria-pressed` dice si esa visita está registrada), las flechas mueven el foco
 * por la rejilla como en cualquier tabla, y el mes se anuncia al cambiar.
 */
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { type RefObject, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { locale, t } from '../../i18n/index.ts'
import { today } from './useVisits.ts'
import styles from './VisitCalendar.module.css'

/** "2026-10-05" sin pasar por Date, que al parsear una fecha suelta la interpreta en UTC. */
const clave = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

/** Lunes primero: es como se lee un calendario en México y en España, no domingo primero. */
const PRIMER_DIA = 1

export function VisitCalendar({
  ancla,
  fechas,
  onToggle,
  onClose,
}: {
  ancla: RefObject<HTMLElement | null>
  fechas: readonly string[]
  onToggle: (fecha: string) => void
  onClose: () => void
}) {
  const hoy = today()
  const [year, setYear] = useState(() => Number(hoy.slice(0, 4)))
  const [month, setMonth] = useState(() => Number(hoy.slice(5, 7)) - 1)
  const rejilla = useRef<HTMLDivElement>(null)
  const caja = useRef<HTMLDivElement>(null)
  const tituloId = useId()

  // Al abrirse, el foco entra en la rejilla: quien navega con teclado no tiene que buscarla.
  useEffect(() => {
    rejilla.current?.querySelector<HTMLButtonElement>('button[tabindex="0"]')?.focus()
  }, [])

  /*
   * El calendario flota fijo sobre la página, colocado a mano a partir del botón que lo abre.
   *
   * Va en un portal al `body`, no dentro de la ficha: la hoja del móvil tiene la muesca de la barra
   * de desplazamiento y `overflow: hidden`, y las dos recortaban el calendario por arriba. Fijo y
   * fuera de la hoja, se coloca donde hay sitio: debajo del botón si cabe con su margen, y si no
   * arriba, y nunca a menos de 16 px de ningún borde. Se recoloca al desplazar, porque el botón se
   * mueve y el calendario no.
   */
  useLayoutEffect(() => {
    const elemento = caja.current
    if (!elemento) return
    const colocar = () => {
      const marco = ancla.current?.getBoundingClientRect()
      if (!marco) return
      const alto = elemento.offsetHeight
      const ancho = elemento.offsetWidth
      const margen = 16
      const abajo = window.innerHeight - marco.bottom - margen
      const arriba = marco.top - margen
      const preferido = abajo >= alto || abajo >= arriba ? marco.bottom + 8 : marco.top - alto - 8
      // Ni por arriba ni por abajo cabe en una pantalla corta: se pega al borde en vez de salirse.
      const top = Math.min(
        Math.max(margen, preferido),
        Math.max(margen, window.innerHeight - alto - margen),
      )
      const izquierda = Math.min(
        Math.max(margen, marco.left),
        Math.max(margen, window.innerWidth - ancho - margen),
      )
      elemento.style.top = `${Math.round(top)}px`
      elemento.style.left = `${Math.round(izquierda)}px`
    }
    colocar()
    window.addEventListener('scroll', colocar, true)
    window.addEventListener('resize', colocar)
    return () => {
      window.removeEventListener('scroll', colocar, true)
      window.removeEventListener('resize', colocar)
    }
  }, [ancla])

  const nombreDelMes = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(year, month, 1),
  )
  /*
   * Las iniciales de los días, en el idioma de la guía. La semana de referencia arranca en domingo
   * (el 7 de junio de 2026 lo fue) para que el índice del array coincida con `getDay()`, que es
   * como JavaScript numera los días: así `(PRIMER_DIA + i) % 7` rota la fila sin desalinearla.
   */
  const diasDeLaSemana = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(new Date(2026, 5, 7 + i)),
  )

  const primero = new Date(year, month, 1).getDay()
  // Cuántas casillas del mes anterior van antes del día 1 para que caiga en su columna.
  const hueco = (primero - PRIMER_DIA + 7) % 7
  const dias = new Date(year, month + 1, 0).getDate()
  const diasDelMesAnterior = new Date(year, month, 0).getDate()
  /*
   * Siempre seis semanas, y sin huecos: las casillas que sobran se rellenan con los días de los
   * meses vecinos, tenues y sin poder pulsarse. Antes eran casillas vacías, y un mes de cuatro o
   * cinco filas dejaba el calendario más bajo y daba un salto al cambiar.
   */
  const sobran = Math.max(0, 42 - hueco - dias)

  const mover = (delta: number) => {
    const destino = new Date(year, month + delta, 1)
    setYear(destino.getFullYear())
    setMonth(destino.getMonth())
  }

  /*
   * Las flechas mueven el foco por la rejilla, no el mes: es lo que se espera de una cuadrícula, y
   * deja Re Pág y Av Pág (o los dos botones) para cambiar de mes.
   */
  const porTeclado = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const pasos: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    }
    const paso = pasos[event.key]
    if (paso === undefined) return
    const botones = [...(rejilla.current?.querySelectorAll('button[data-dia]') ?? [])]
    const actual = botones.indexOf(document.activeElement as HTMLButtonElement)
    const siguiente = botones[actual + paso]
    if (!(siguiente instanceof HTMLButtonElement)) return
    event.preventDefault()
    siguiente.focus()
  }

  return createPortal(
    <div className={styles.calendario} role="dialog" aria-labelledby={tituloId} ref={caja}>
      <div className={styles.cabecera}>
        <button
          type="button"
          className={styles.flecha}
          onClick={() => mover(-1)}
          aria-label={t('visit.prevMonth')}
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        {/* `aria-live`: al cambiar de mes se anuncia sin mover el foco de donde estaba. */}
        <h3 id={tituloId} aria-live="polite">
          {nombreDelMes}
        </h3>
        <button
          type="button"
          className={styles.flecha}
          onClick={() => mover(1)}
          aria-label={t('visit.nextMonth')}
        >
          <ChevronRight aria-hidden="true" />
        </button>
        {/*
         * La cruz, en su esquina. Estaba abajo como enlace subrayado, y eso es la forma de "ir a
         * otro sitio", no la de cerrar algo que flota: lo que se cierra con una cruz arriba a la
         * derecha es lo mismo que ya se cierra así en la hoja de información y en el tutorial.
         */}
        <button
          type="button"
          className={styles.cerrar}
          onClick={onClose}
          aria-label={t('visit.closeCalendar')}
        >
          <X aria-hidden="true" />
        </button>
      </div>

      <div className={styles.semana} aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={diasDeLaSemana[(PRIMER_DIA + i) % 7]}>
            {diasDeLaSemana[(PRIMER_DIA + i) % 7]}
          </span>
        ))}
      </div>

      {/* biome-ignore lint/a11y/useSemanticElements: la rejilla es de botones, no una tabla de datos. */}
      <div
        ref={rejilla}
        className={styles.rejilla}
        role="group"
        aria-label={nombreDelMes}
        onKeyDown={porTeclado}
      >
        {/* Los últimos días del mes anterior completan la primera semana. Se ven, no se pulsan. */}
        {Array.from({ length: hueco }, (_, i) => diasDelMesAnterior - hueco + 1 + i).map((dia) => (
          <span key={`anterior-${dia}`} className={styles.ajeno} aria-hidden="true">
            {dia}
          </span>
        ))}
        {Array.from({ length: dias }, (_, i) => {
          const fecha = clave(year, month, i + 1)
          const visitado = fechas.includes(fecha)
          const futuro = fecha > hoy
          return (
            <button
              key={fecha}
              type="button"
              className={styles.dia}
              data-dia
              data-hoy={fecha === hoy}
              // Un solo día entra en el orden de tabulación; dentro se anda con las flechas.
              tabIndex={
                fecha === hoy || (i === 0 && month !== Number(hoy.slice(5, 7)) - 1) ? 0 : -1
              }
              aria-pressed={visitado}
              // Los días que no han llegado no se pueden visitar.
              disabled={futuro}
              onClick={() => onToggle(fecha)}
            >
              {i + 1}
            </button>
          )
        })}
        {/* Y los primeros del siguiente, para que la última semana tampoco quede a medias. */}
        {Array.from({ length: sobran }, (_, i) => i + 1).map((dia) => (
          <span key={`siguiente-${dia}`} className={styles.ajeno} aria-hidden="true">
            {dia}
          </span>
        ))}
      </div>
    </div>,
    document.body,
  )
}
