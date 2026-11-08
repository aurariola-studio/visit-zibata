import controls from '../../styles/controls.module.css'

/**
 * La zona delicada de un formulario: lo que deja una redirección o solo se deshace con git. Va siempre al
 * final y aparte, con su propio título, en vez de mezclada con "Guardar cambios" y "Cancelar". Antes el
 * botón de borrar vivía en el pie, con el mismo peso que las acciones normales, y el cambio de dirección
 * entre dos secciones cualquiera.
 *
 * Nada de esto es más difícil de hacer: cada acción sigue enseñando su impacto y pidiendo confirmación.
 * Lo que cambia es que se distinguen de un vistazo y que no están al lado de "Guardar".
 */

export interface Borrado {
  /** El atributo `data-…` que ya usa el manejador de ese borrado. */
  atributo: string
  /** El texto del botón, p. ej. "Borrar negocio". */
  rotulo: string
  /** El elemento donde el manejador pinta el impacto, ya con su `data-…`. */
  zona: string
}

export function zonaDelicada(partes: { direcciones?: string; borrado?: Borrado }): string {
  if (!partes.direcciones && !partes.borrado) return ''
  const borrado = partes.borrado
    ? `<div class="zona-borrar">
        <p class="ayuda">Borrar lo quita de la guía. Se revierte con git, no con un botón.</p>
        <div class="acciones"><button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" ${partes.borrado.atributo}>${partes.borrado.rotulo}</button></div>
        ${partes.borrado.zona}
      </div>`
    : ''
  return `<section class="editor-seccion zona-delicada" aria-labelledby="titulo-zona-delicada">
      <h3 id="titulo-zona-delicada">Zona delicada</h3>
      <p class="ayuda">Cambios que dejan una redirección o que no se deshacen con un botón. Todos enseñan antes su impacto y piden confirmación.</p>
      ${partes.direcciones ?? ''}
      ${borrado}
    </section>`
}
