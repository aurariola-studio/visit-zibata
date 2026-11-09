import controls from '../../styles/controls.module.css'
import { seccionDireccion } from './direccion.ts'
import { abrirEditor, cerrarEditor, mostrarProblemas } from './editor.ts'
import { pintarFotosFormulario } from './fotos.ts'
import { leerProcedencia, seccionProcedencia, validarProcedencia } from './procedencia.ts'
import type { Cierre, Negocio } from './tipos.ts'
import { DIAS, hoy, MOTIVOS, normalizar, numero, POR_PAGINA, plural, texto } from './tipos.ts'
import { categoriaDeGiro, mapaDeGiros, mapaDePlazas, paginacion, vista } from './vista.ts'
import { zonaDelicada } from './zona-delicada.ts'

/** Las marcas de estado, en el orden en que se ofrecen como filtro. */
const ESTADOS: [string, string][] = [
  ['si', 'Visibles'],
  ['no', 'Ocultos'],
  ['cierre', 'Cerrados temporalmente'],
  ['plaza', 'En una plaza inactiva'],
]

/**
 * La única regla de estado: la marca de la fila, el filtro y el recuento salen de aquí, así que no
 * pueden contradecirse. "Visible" es lo que de verdad sale en la guía: el local activo en una plaza
 * activa y sin cierre.
 */
function estadoDelNegocio(negocio: Negocio): {
  rotulo: string
  marca: string
  nota: string
} {
  if (!negocio.active) return { rotulo: 'Oculto', marca: 'no', nota: 'No se publica' }
  if (vista.datos?.plazas.find((plaza) => plaza.id === negocio.plazaId)?.active === false) {
    return { rotulo: 'Plaza inactiva', marca: 'plaza', nota: 'Su plaza no se publica' }
  }
  if (negocio.cierre) {
    const motivo = MOTIVOS.find(([clave]) => clave === negocio.cierre?.motivo)?.[1] ?? ''
    return {
      rotulo: 'Cerrado temporalmente',
      marca: 'cierre',
      nota: `${motivo} · desde el ${negocio.cierre.desde}`,
    }
  }
  return { rotulo: 'Visible', marca: 'si', nota: '' }
}

export function pintarNegocios(): void {
  if (!vista.raiz || !vista.datos) return
  const cuantos = (marca: string) =>
    vista.datos?.places.filter((negocio) => estadoDelNegocio(negocio).marca === marca).length ?? 0
  const enPlazaInactiva = cuantos('plaza')
  vista.raiz.innerHTML = `
    <div class="barra-contenido">
      <input class="${controls.campo} buscar" type="search" placeholder="Buscar por nombre, plaza o giro" aria-label="Buscar negocio" value="${texto(vista.consulta)}" data-buscar />
      <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-importar>Importar CSV</button>
      <button type="button" class="${controls.base} ${controls.boton} ${controls.principal}" data-nuevo>Nuevo negocio</button>
    </div>
    <div class="barra-filtros">
      <select class="${controls.campo}" aria-label="Filtrar por estado" data-filtro="estado">
        <option value="">Todos los estados</option>
        ${ESTADOS.map(([marca, rotulo]) => `<option value="${marca}"${vista.filtroEstado === marca ? ' selected' : ''}>${rotulo} (${numero(cuantos(marca))})</option>`).join('')}
      </select>
      <select class="${controls.campo}" aria-label="Filtrar por plaza" data-filtro="plaza">
        <option value="">Todas las plazas</option>
        ${[...vista.datos.plazas]
          .sort((a, b) => a.name.localeCompare(b.name, 'es'))
          .map(
            (plaza) =>
              `<option value="${texto(plaza.id)}"${vista.filtroPlaza === plaza.id ? ' selected' : ''}>${texto(plaza.name)}</option>`,
          )
          .join('')}
      </select>
    </div>
    <p class="meta-contenido">${numero(vista.datos.places.length)} negocios · ${numero(cuantos('no'))} ocultos · ${numero(cuantos('cierre'))} cerrados temporalmente${enPlazaInactiva > 0 ? ` · ${numero(enPlazaInactiva)} en plazas inactivas` : ''}</p>
    <p class="meta-contenido meta-resultados" role="status" aria-live="polite" data-resultados></p>
    ${vista.aviso ? `<p class="aviso-contenido" role="status">${texto(vista.aviso)}</p>` : ''}
    <div data-zona-tabla></div>
  `
  pintarZonaNegocios()
}

export function pintarZonaNegocios(): void {
  const zona = vista.raiz?.querySelector<HTMLElement>('[data-zona-tabla]')
  if (!zona || !vista.datos) return
  const plazas = mapaDePlazas()
  const giros = mapaDeGiros()
  const buscado = normalizar(vista.consulta)
  const filas = vista.datos.places
    .filter(
      (negocio) => !vista.filtroEstado || estadoDelNegocio(negocio).marca === vista.filtroEstado,
    )
    .filter((negocio) => !vista.filtroPlaza || negocio.plazaId === vista.filtroPlaza)
    .filter((negocio) => {
      if (!buscado) return true
      return normalizar(
        [
          negocio.name,
          plazas.get(negocio.plazaId) ?? '',
          ...negocio.giros.map((giro) => giros.get(giro) ?? giro),
        ].join(' '),
      ).includes(buscado)
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))

  // La región en vivo está fuera de la zona: esta se reconstruye entera en cada pulsación y un aviso
  // que se recrea no se anuncia.
  const filtrando = Boolean(buscado || vista.filtroEstado || vista.filtroPlaza)
  const resultados = vista.raiz?.querySelector<HTMLElement>('[data-resultados]')
  if (resultados) {
    const total = vista.datos.places.length
    resultados.textContent = filtrando
      ? `${numero(filas.length)} de ${plural(total, 'negocio', 'negocios')}`
      : ''
  }

  if (filas.length === 0) {
    zona.innerHTML = `<div class="vacio"><p>Ningún negocio coincide.</p>${
      filtrando
        ? `<button type="button" class="${controls.base} ${controls.boton} ${controls.fantasma}" data-quitar-filtros>Quitar filtros</button>`
        : ''
    }</div>`
    return
  }

  const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA))
  if (vista.pagina >= paginas) vista.pagina = paginas - 1
  const visibles = filas.slice(vista.pagina * POR_PAGINA, vista.pagina * POR_PAGINA + POR_PAGINA)

  const cuerpo = visibles
    .map((negocio) => {
      const donde = plazas.get(negocio.plazaId) ?? negocio.plazaId
      const que = negocio.giros.map((giro) => giros.get(giro) ?? giro).join(', ')
      const estado = estadoDelNegocio(negocio)
      return `<tr>
        <td class="celda-nombre"><span class="negocio-nombre">${texto(negocio.name)}</span><span class="negocio-detalle">${texto([donde, que].filter(Boolean).join(' · '))}</span></td>
        <td class="tenue celda-nombre col-plaza">${texto(donde)}</td>
        <td class="tenue celda-nombre col-giros">${texto(que)}</td>
        <td class="celda-estado"><span class="marca-estado" data-activo="${estado.marca}" title="${texto(estado.nota)}">${texto(estado.rotulo)}</span></td>
        <td class="accion"><button type="button" class="${controls.base} ${controls.boton} ${controls.fantasma}" data-editar="${texto(negocio.id)}" aria-label="Editar ${texto(negocio.name)}">Editar</button></td>
      </tr>`
    })
    .join('')

  zona.innerHTML = `<div class="tabla"><table>
    <thead><tr>
      <th>Negocio</th>
      <th class="col-plaza">Plaza</th>
      <th class="col-giros">Giros</th>
      <th>Estado</th>
      <th class="accion"><span class="visualmente">Acciones</span></th>
    </tr></thead>
    <tbody>${cuerpo}</tbody>
  </table></div>
  ${paginacion(filas.length, 'negocios')}`
}

export function pintarFormulario(negocio: Negocio | null): void {
  if (!vista.datos) return
  vista.formularioActual = {
    id: negocio?.id ?? '',
    nombre: negocio?.name ?? '',
    seleccion: [...(negocio?.giros ?? [])],
    fotos: (negocio?.photos ?? []).map((foto) => ({ ...foto })),
    sucio: false,
    consultaGiro: '',
  }

  const plazas = vista.datos.plazas
    .map(
      (plaza) =>
        `<option value="${texto(plaza.id)}"${plaza.id === negocio?.plazaId ? ' selected' : ''}${plaza.active || negocio?.active === false ? '' : ' disabled'}>${texto(plaza.name)}${plaza.active ? '' : ' (inactiva)'}</option>`,
    )
    .join('')
  const motivos = MOTIVOS.map(
    ([clave, rotulo]) =>
      `<option value="${clave}"${negocio?.cierre?.motivo === clave ? ' selected' : ''}>${rotulo}</option>`,
  ).join('')
  const cierreDesde = negocio?.cierre?.desde ?? hoy()

  abrirEditor(
    'Contenido',
    negocio ? negocio.name : 'Nuevo negocio',
    `<form data-editor="negocio" data-id="${texto(negocio?.id ?? '')}" novalidate>
      <section class="editor-seccion">
        <h3>Identidad</h3>
        <div class="editor-rejilla">
          <label class="campo-form campo-ancho">
            <span class="campo-etiqueta"><span>Nombre</span> <span class="ayuda" data-contador-nombre></span></span>
            <input class="${controls.campo}" type="text" name="nombre" value="${texto(negocio?.name ?? '')}" maxlength="160" required />
            <span class="ayuda">Es el título de la ficha. El de la página añade la zona y el tope son 60 caracteres.</span>
          </label>
          <label class="campo-form">
            <span>Plaza</span>
            <select class="${controls.campo}" name="plazaId" required>
              <option value="">Elige una plaza</option>
              ${plazas}
            </select>
            <span class="ayuda">Al cambiar de plaza, el local se añade al final del orden.</span>
            <span class="ayuda" data-plaza-aviso></span>
          </label>
        </div>
      </section>

      <section class="editor-seccion">
        <h3>Estado en la guía</h3>
        <div class="editor-rejilla">
          <div class="campo-form">
            <span>Visibilidad</span>
            <label class="casilla"><input type="checkbox" name="activo"${negocio?.active === false ? '' : ' checked'}${negocio ? '' : ' disabled'} /><span>Visible en la guía</span></label>
            <span class="ayuda">${negocio ? 'Oculto sale de listas, buscador y sitemap; su ficha y su enlace directo dejan de existir. Se conservan sus datos.' : 'Un negocio nuevo se crea visible. Si todavía no sabes si existe, no se puede añadir.'}</span>
          </div>
          <div class="campo-form" data-grupo="cierre">
            <span>Cierre temporal</span>
            <label class="casilla"><input type="checkbox" name="cierreActivo"${negocio?.cierre ? ' checked' : ''} /><span>Cerrado temporalmente</span></label>
            <span class="ayuda">Sigue en la guía y se avisa de que hoy no abre. No es lo mismo que ocultarlo.</span>
          </div>
          <div class="editor-rejilla campo-ancho cierre-campos" data-cierre-campos${negocio?.cierre ? '' : ' hidden'}>
            <label class="campo-form">
              <span>Motivo</span>
              <select class="${controls.campo}" name="cierreMotivo">${motivos}</select>
            </label>
            <label class="campo-form">
              <span>Desde</span>
              <input class="${controls.campo}" type="date" name="cierreDesde" max="${hoy()}" value="${texto(cierreDesde)}" />
            </label>
          </div>
        </div>
      </section>

      <section class="editor-seccion">
        <h3>Giros <span class="nota">el primero manda</span></h3>
        <p class="ayuda">El primero decide el icono de la ficha y la prioridad del buscador. Los demás salen detrás, con su icono, y todos se buscan igual.</p>
        <div data-giros-zona data-grupo="giros"></div>
      </section>

      <section class="editor-seccion">
        <h3>Descripción</h3>
        <div class="editor-rejilla">
          <label class="campo-form campo-ancho">
            <span class="campo-etiqueta"><span>Español</span> <span class="ayuda" data-contador-es></span></span>
            <textarea class="${controls.campo} ${controls.areaTexto}" name="descripcionEs" rows="3" maxlength="2000" required>${texto(negocio?.description?.es ?? '')}</textarea>
          </label>
          <label class="campo-form campo-ancho">
            <span class="campo-etiqueta"><span>Inglés</span> <span class="ayuda" data-contador-en></span></span>
            <textarea class="${controls.campo} ${controls.areaTexto}" name="descripcionEn" rows="3" maxlength="2000" required>${texto(negocio?.description?.en ?? '')}</textarea>
            <span class="ayuda">La descripción para buscadores se recorta a 160 caracteres.</span>
          </label>
        </div>
      </section>

      <section class="editor-seccion">
        <h3>Fotos <span class="nota">la primera es la portada</span></h3>
        <p class="ayuda">Se reducen a 1600 px y se les quitan los datos de la cámara antes de subirlas. Solo fotos propias o con licencia. Una foto que quites se borra de verdad al guardar el negocio (sigue en el historial de git).</p>
        <div data-fotos-zona data-grupo="fotos"></div>
      </section>

      <section class="editor-seccion">
        <h3>Contacto</h3>
        <div class="editor-rejilla">
          <label class="campo-form">
            <span>Teléfono <span class="ayuda">10 dígitos o con +52</span></span>
            <input class="${controls.campo}" type="tel" name="telefono" value="${texto(negocio?.phone ?? '')}" placeholder="4421234567" />
          </label>
          <label class="campo-form">
            <span>WhatsApp <span class="ayuda">10 dígitos o con +52</span></span>
            <input class="${controls.campo}" type="tel" name="whatsapp" value="${texto(negocio?.links?.whatsapp ?? '')}" placeholder="4421234567" />
          </label>
          <label class="campo-form">
            <span>Sitio web</span>
            <input class="${controls.campo}" type="url" name="sitio" value="${texto(negocio?.links?.website ?? '')}" placeholder="https://" />
          </label>
          <label class="campo-form">
            <span>Instagram</span>
            <input class="${controls.campo}" type="url" name="instagram" value="${texto(negocio?.links?.instagram ?? '')}" placeholder="https://instagram.com/…" />
          </label>
          <label class="campo-form">
            <span>Facebook</span>
            <input class="${controls.campo}" type="url" name="facebook" value="${texto(negocio?.links?.facebook ?? '')}" placeholder="https://facebook.com/…" />
          </label>
          <label class="campo-form">
            <span>Enlace de Google Maps <span class="ayuda">si falta, Cómo llegar usa la plaza</span></span>
            <input class="${controls.campo}" type="url" name="googleMapsUri" value="${texto(negocio?.googleMapsUri ?? '')}" placeholder="https://maps.app.goo.gl/…" />
          </label>
          <label class="campo-form">
            <span>TikTok</span>
            <input class="${controls.campo}" type="url" name="tiktok" value="${texto(negocio?.links?.tiktok ?? '')}" placeholder="https://www.tiktok.com/@…" />
          </label>
          <label class="campo-form">
            <span>Rappi <span class="ayuda">la tienda de este negocio</span></span>
            <input class="${controls.campo}" type="url" name="rappi" value="${texto(negocio?.links?.rappi ?? '')}" placeholder="https://www.rappi.com.mx/…" />
          </label>
          <label class="campo-form">
            <span>Uber Eats</span>
            <input class="${controls.campo}" type="url" name="uberEats" value="${texto(negocio?.links?.uberEats ?? '')}" placeholder="https://www.ubereats.com/…" />
          </label>
          <label class="campo-form">
            <span>DiDi Food</span>
            <input class="${controls.campo}" type="url" name="didiFood" value="${texto(negocio?.links?.didiFood ?? '')}" placeholder="https://www.didi-food.com/…" />
          </label>
        </div>
        <p class="ayuda">Rappi, Uber Eats y DiDi Food dibujan un botón en la ficha solo si hay enlace: nunca uno que no lleve a ningún lado. Vacío lo quita.</p>
      </section>

      <section class="editor-seccion">
        <h3>Ubicación y horario</h3>
        <div class="editor-rejilla">
          <label class="campo-form"><span>Latitud</span><input class="${controls.campo}" type="number" name="lat" step="any" value="${texto(negocio?.location?.lat ?? '')}" placeholder="20.6783" /></label>
          <label class="campo-form"><span>Longitud</span><input class="${controls.campo}" type="number" name="lng" step="any" value="${texto(negocio?.location?.lng ?? '')}" placeholder="-100.3128" /></label>
        </div>
        <p class="ayuda">El horario va en formato 10:00-23:00; varios tramos separados por comas. «No sé» deja el dato como está.</p>
        <div class="horario-acciones">
          <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-copiar-horario>Copiar el lunes a todos</button>
        </div>
        <div class="horario" data-grupo="horario">${DIAS.map(([dia, nombre]) => filaDeHorario(dia, nombre, negocio)).join('')}</div>
      </section>

      ${seccionProcedencia({ verificacion: negocio?.verification, obligatoria: !negocio, conEstado: false })}

      ${negocio ? zonaDelicada({ direcciones: seccionDireccion('negocio', negocio.slug), borrado: { atributo: 'data-borrar-negocio', rotulo: 'Borrar negocio', zona: '<div data-borrado></div>' } }) : ''}

      <footer class="editor-pie">
        <p class="aviso-contenido" data-guardado role="status" hidden></p>
        <div class="problemas" data-problemas role="alert"></div>
        <div class="acciones">
          <button type="submit" class="${controls.base} ${controls.boton} ${controls.principal}">${negocio ? 'Guardar cambios' : 'Crear negocio'}</button>
          <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-cancelar>Cancelar</button>
        </div>
      </footer>
    </form>`,
  )

  pintarGirosFormulario()
  pintarFotosFormulario()
  actualizarCierre()
  actualizarAvisoPlaza()
  actualizarContadores()
}

function filaDeHorario(dia: string, nombre: string, negocio: Negocio | null): string {
  const valor = negocio?.hours?.[dia]
  const estado = valor === undefined ? 'no' : valor.length === 0 ? 'cerrado' : 'abierto'
  const rangos = estado === 'abierto' ? (valor ?? []).join(', ') : ''
  return `<div class="horario-fila" data-dia="${dia}">
    <span>${nombre}</span>
    <select class="${controls.campo}" data-estado aria-label="${nombre}">
      <option value="no"${estado === 'no' ? ' selected' : ''}>No sé</option>
      <option value="abierto"${estado === 'abierto' ? ' selected' : ''}>Abierto</option>
      <option value="cerrado"${estado === 'cerrado' ? ' selected' : ''}>Cerrado</option>
    </select>
    <input class="${controls.campo}" type="text" data-rangos value="${texto(rangos)}" aria-label="${nombre}, horario"${estado === 'abierto' ? '' : ' disabled'} />
  </div>`
}

/** Un local visible no puede estar en una plaza que no abre: el Worker lo rechaza, y aquí se dice antes. */
function actualizarAvisoPlaza(): void {
  const plazaId = vista.dialogo?.querySelector<HTMLSelectElement>('select[name="plazaId"]')?.value
  const nota = vista.dialogo?.querySelector<HTMLElement>('[data-plaza-aviso]')
  if (!nota) return
  const visible = vista.dialogo?.querySelector<HTMLInputElement>('input[name="activo"]')?.checked
  const plaza = vista.datos?.plazas.find((fila) => fila.id === plazaId)
  nota.textContent =
    plaza && !plaza.active && visible
      ? 'Esa plaza no está activa: un local visible no puede estar en ella. Elige otra, o activa la plaza primero.'
      : ''
}

function actualizarCierre(): void {
  const activo = vista.dialogo?.querySelector<HTMLInputElement>(
    'input[name="cierreActivo"]',
  )?.checked
  const campos = vista.dialogo?.querySelector<HTMLElement>('[data-cierre-campos]')
  if (campos) campos.hidden = !activo
}

export function actualizarContadores(): void {
  const nombre = vista.dialogo?.querySelector<HTMLInputElement>('input[name="nombre"]')?.value ?? ''
  const nombreEl = vista.dialogo?.querySelector<HTMLElement>('[data-contador-nombre]')
  if (nombreEl) {
    nombreEl.textContent = `${nombre.length} de 60`
    nombreEl.dataset.limite = nombre.length > 60 ? 'pasado' : 'bien'
  }
  const pares: [string, string][] = [
    ['descripcionEs', '[data-contador-es]'],
    ['descripcionEn', '[data-contador-en]'],
  ]
  for (const [campo, selector] of pares) {
    const valor =
      vista.dialogo?.querySelector<HTMLTextAreaElement>(`[name="${campo}"]`)?.value ?? ''
    const destino = vista.dialogo?.querySelector<HTMLElement>(selector)
    if (destino) destino.textContent = `${valor.length} caracteres`
  }
}

/* ------------------------------------------------------------------ giros del negocio */

function pintarGirosFormulario(): void {
  const zona = vista.dialogo?.querySelector<HTMLElement>('[data-giros-zona]')
  if (!zona || !vista.formularioActual) return
  const seleccion = vista.formularioActual.seleccion
  const total = seleccion.length
  const usados = new Set(seleccion)
  const buscado = normalizar(vista.formularioActual.consultaGiro)

  const fila = (id: string, indice: number) => {
    const nombre = mapaDeGiros().get(id) ?? id
    const categoria = categoriaDeGiro(id)
    return `<li class="giro-elegido" data-giro-id="${texto(id)}">
      <span class="giro-puesto" aria-hidden="true">${indice + 1}</span>
      <span class="giro-texto">
        <span class="negocio-nombre">${texto(nombre)}</span>
        <span class="meta">${texto(categoria)}</span>
      </span>
      <span class="giro-acciones">
        <button type="button" class="${controls.base} ${controls.botonIcono} ${controls.mini} ${controls.fantasma}" data-giro-subir="${texto(id)}" aria-label="Subir ${texto(nombre)}" title="Subir"${indice === 0 ? ' disabled' : ''}>↑</button>
        <button type="button" class="${controls.base} ${controls.botonIcono} ${controls.mini} ${controls.fantasma}" data-giro-bajar="${texto(id)}" aria-label="Bajar ${texto(nombre)}" title="Bajar"${indice === total - 1 ? ' disabled' : ''}>↓</button>
        <button type="button" class="${controls.base} ${controls.boton} ${controls.fantasma}" data-giro-quitar="${texto(id)}">Quitar</button>
      </span>
    </li>`
  }

  const grupos = (vista.datos?.categories ?? [])
    .map((categoria) => {
      const opciones = categoria.giros.filter((giro) => {
        if (usados.has(giro.id)) return false
        if (!buscado) return true
        return normalizar(`${giro.label.es} ${giro.label.en ?? ''} ${categoria.label.es}`).includes(
          buscado,
        )
      })
      if (opciones.length === 0) return ''
      return `<div class="grupo-giros">
        <p class="grupo-titulo">${texto(categoria.label.es)}</p>
        <div class="giros-opciones">${opciones
          .map(
            (giro) =>
              `<button type="button" class="opcion-anadir ${controls.base} ${controls.boton} ${controls.fantasma}" data-anadir-giro-id="${texto(giro.id)}"${total >= 3 ? ' disabled' : ''}>
                <span>${texto(giro.label.es)}</span>
                <span class="meta">Añadir</span>
              </button>`,
          )
          .join('')}</div>
      </div>`
    })
    .join('')

  zona.innerHTML = `
    <ol class="giros-elegidos">${seleccion.map((id, indice) => fila(id, indice)).join('')}</ol>
    <p class="giros-cuenta"><strong>${numero(total)}</strong> de 3 en total${total >= 3 ? ': quita uno para añadir otro' : ''}</p>
    <div class="buscador-giro">
      <input class="${controls.campo}" type="search" data-buscar-giro placeholder="Buscar un giro para añadir" aria-label="Buscar un giro" value="${texto(vista.formularioActual.consultaGiro)}" />
      <div class="giro-catalogo" tabindex="0" role="group" aria-label="Giros disponibles">${grupos || '<p class="vacio">No queda ningún giro que coincida.</p>'}</div>
    </div>`
}

function moverGiro(id: string, direccion: -1 | 1): void {
  if (!vista.formularioActual) return
  const lista = vista.formularioActual.seleccion
  const indice = lista.indexOf(id)
  const destino = indice + direccion
  if (indice < 0 || destino < 0 || destino >= lista.length) return
  const elegido = lista[indice]
  const vecino = lista[destino]
  if (!elegido || !vecino) return
  lista[indice] = vecino
  lista[destino] = elegido
  vista.formularioActual.sucio = true
  pintarGirosFormulario()
}

function quitarGiro(id: string): void {
  if (!vista.formularioActual) return
  vista.formularioActual.seleccion = vista.formularioActual.seleccion.filter((giro) => giro !== id)
  vista.formularioActual.sucio = true
  pintarGirosFormulario()
}

function anadirGiro(id: string): void {
  if (!vista.formularioActual) return
  if (vista.formularioActual.seleccion.length >= 3) return
  if (vista.formularioActual.seleccion.includes(id)) return
  vista.formularioActual.seleccion.push(id)
  vista.formularioActual.sucio = true
  pintarGirosFormulario()
}

function valorDe(formulario: HTMLFormElement, nombre: string): string {
  const campo = formulario.elements.namedItem(nombre)
  if (campo instanceof RadioNodeList) return campo.value.trim()
  if (
    campo instanceof HTMLInputElement ||
    campo instanceof HTMLTextAreaElement ||
    campo instanceof HTMLSelectElement
  ) {
    return campo.value.trim()
  }
  return ''
}

function validarHorario(formEl: HTMLFormElement): string[] {
  const problemas: string[] = []
  const formato = /^([01]?\d|2[0-3]):[0-5]\d-([01]?\d|2[0-3]):[0-5]\d$/
  for (const fila of formEl.querySelectorAll<HTMLElement>('.horario-fila')) {
    const dia = fila.dataset.dia
    const nombreDia = DIAS.find(([clave]) => clave === dia)?.[1] ?? dia ?? ''
    const estado = fila.querySelector<HTMLSelectElement>('select[data-estado]')?.value ?? 'no'
    if (estado !== 'abierto') continue
    const rangos = (fila.querySelector<HTMLInputElement>('[data-rangos]')?.value ?? '')
      .split(',')
      .map((rango) => rango.trim())
      .filter(Boolean)
    if (rangos.length === 0) {
      problemas.push(`horario: El ${nombreDia.toLowerCase()} está abierto pero no tiene horario.`)
      continue
    }
    if (rangos.some((rango) => !formato.test(rango))) {
      problemas.push(
        `horario: El ${nombreDia.toLowerCase()} tiene un horario que no es 10:00-23:00.`,
      )
    }
  }
  return problemas
}

function validarNegocio(formEl: HTMLFormElement): string[] {
  const problemas: string[] = []
  const nombre = valorDe(formEl, 'nombre')
  const plazaId = valorDe(formEl, 'plazaId')
  const descripcionEs = valorDe(formEl, 'descripcionEs')
  const descripcionEn = valorDe(formEl, 'descripcionEn')
  const lat = valorDe(formEl, 'lat')
  const lng = valorDe(formEl, 'lng')
  const total = vista.formularioActual?.seleccion.length ?? 0

  if (!nombre) problemas.push('nombre: El nombre es obligatorio.')
  if (!plazaId) problemas.push('plazaId: Elige una plaza.')
  if (total === 0) problemas.push('giros: Elige al menos un giro.')
  if (total > 3) problemas.push('giros: El tope son tres giros.')
  if (vista.formularioActual && vista.formularioActual.seleccion.length > 0) {
    const ids = vista.formularioActual.seleccion
    if (new Set(ids).size !== ids.length) problemas.push('giros: Hay un giro repetido.')
  }
  if (!descripcionEs) problemas.push('descripcionEs: Falta la descripción en español.')
  if (!descripcionEn) problemas.push('descripcionEn: Falta la descripción en inglés.')
  if (Boolean(lat) !== Boolean(lng)) {
    problemas.push('lat: Indica la latitud y la longitud, o ninguna de las dos.')
  }
  if (formEl.querySelector<HTMLInputElement>('input[name="cierreActivo"]')?.checked) {
    const desde = valorDe(formEl, 'cierreDesde')
    if (!desde) problemas.push('cierre: Indica desde cuándo está cerrado.')
    else if (desde > hoy()) problemas.push('cierre: El cierre no puede empezar en el futuro.')
  }
  vista.formularioActual?.fotos.forEach((foto, indice) => {
    if (!foto.alt.trim()) problemas.push(`fotos.${indice}.alt: Escribe el texto alternativo.`)
  })
  problemas.push(...validarHorario(formEl))
  for (const campo of ['tiktok', 'rappi', 'uberEats', 'didiFood']) {
    const enlace = valorDe(formEl, campo)
    if (enlace && !/^https?:\/\/\S+$/i.test(enlace)) {
      problemas.push(`${campo}: Escribe la dirección completa, con https://.`)
    }
  }
  problemas.push(...validarProcedencia(formEl, !formEl.dataset.id))
  return problemas
}

function leerFormulario(formulario: HTMLFormElement): {
  cuerpo: Record<string, unknown>
  problemas: string[]
} {
  const problemas = validarNegocio(formulario)
  if (problemas.length > 0) return { cuerpo: {}, problemas }

  const nombre = valorDe(formulario, 'nombre')
  const plazaId = valorDe(formulario, 'plazaId')
  const descripcionEs = valorDe(formulario, 'descripcionEs')
  const descripcionEn = valorDe(formulario, 'descripcionEn')
  const latTexto = valorDe(formulario, 'lat')
  const lngTexto = valorDe(formulario, 'lng')
  const giros = vista.formularioActual?.seleccion ?? []

  const horario: Record<string, string[]> = {}
  for (const fila of formulario.querySelectorAll<HTMLElement>('.horario-fila')) {
    const dia = fila.dataset.dia
    if (!dia) continue
    const estado = fila.querySelector<HTMLSelectElement>('select[data-estado]')?.value ?? 'no'
    if (estado === 'no') continue
    if (estado === 'cerrado') {
      horario[dia] = []
      continue
    }
    horario[dia] = (fila.querySelector<HTMLInputElement>('[data-rangos]')?.value ?? '')
      .split(',')
      .map((rango) => rango.trim())
      .filter(Boolean)
  }

  const cierreActivo =
    formulario.querySelector<HTMLInputElement>('input[name="cierreActivo"]')?.checked ?? false
  const cierre = cierreActivo
    ? {
        motivo: valorDe(formulario, 'cierreMotivo') as Cierre['motivo'],
        desde: valorDe(formulario, 'cierreDesde'),
      }
    : null

  const cuerpo = {
    id: formulario.dataset.id || undefined,
    nombre,
    plazaId,
    giros,
    descripcionEs,
    descripcionEn,
    telefono: valorDe(formulario, 'telefono'),
    sitio: valorDe(formulario, 'sitio'),
    instagram: valorDe(formulario, 'instagram'),
    facebook: valorDe(formulario, 'facebook'),
    tiktok: valorDe(formulario, 'tiktok'),
    rappi: valorDe(formulario, 'rappi'),
    uberEats: valorDe(formulario, 'uberEats'),
    didiFood: valorDe(formulario, 'didiFood'),
    whatsapp: valorDe(formulario, 'whatsapp'),
    googleMapsUri: valorDe(formulario, 'googleMapsUri'),
    lat: latTexto ? Number(latTexto) : null,
    lng: lngTexto ? Number(lngTexto) : null,
    horario: Object.keys(horario).length > 0 ? horario : null,
    cierre,
    fotos: vista.formularioActual?.fotos.map((foto) => ({ src: foto.src, alt: foto.alt })) ?? [],
    activo: formulario.querySelector<HTMLInputElement>('input[name="activo"]')?.checked ?? true,
    verificacion: leerProcedencia(formulario, false),
  }
  return { cuerpo, problemas }
}

export async function enviarNegocio(
  formulario: HTMLFormElement,
  recargar: () => Promise<void>,
): Promise<void> {
  if (vista.subiendoFoto || vista.guardando) {
    mostrarProblemas(formulario, [
      vista.subiendoFoto
        ? 'Espera a que termine la foto antes de guardar.'
        : 'El cambio anterior todavía se está guardando.',
    ])
    return
  }
  mostrarProblemas(formulario, [])
  const { cuerpo, problemas } = leerFormulario(formulario)
  if (problemas.length > 0) {
    mostrarProblemas(formulario, problemas)
    return
  }

  const boton = formulario.querySelector<HTMLButtonElement>('button[type="submit"]')
  if (boton) boton.disabled = true
  vista.guardando = true
  try {
    const respuesta = await fetch('/api/panel/contenido/negocio', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
    const resultado = (await respuesta.json().catch(() => null)) as {
      ok?: boolean
      seco?: boolean
      pr?: { url: string; numero: number; creada: boolean } | null
      mensaje?: string
      problemas?: string[]
      avisos?: string[]
      negocio?: { id: string; nombre: string; nuevo: boolean }
    } | null

    if (respuesta.status === 403) {
      mostrarProblemas(formulario, ['Sin permiso. Revisa la regla de Access.'])
      return
    }
    if (respuesta.status === 503) {
      mostrarProblemas(formulario, ['Falta GITHUB_TOKEN en el Worker.'])
      return
    }
    if (!respuesta.ok || !resultado?.ok) {
      mostrarProblemas(
        formulario,
        resultado?.problemas?.length ? resultado.problemas : ['No se pudo guardar.'],
      )
      return
    }

    const avisos = resultado.avisos?.length ? ` Avisos: ${resultado.avisos.join(' · ')}` : ''
    if (vista.formularioActual) vista.formularioActual.sucio = false

    // Un negocio nuevo se queda abierto: así se le pueden subir fotos en el mismo gesto.
    if (resultado.negocio?.nuevo && !resultado.seco && vista.formularioActual) {
      vista.formularioActual.id = resultado.negocio.id
      vista.formularioActual.nombre = resultado.negocio.nombre
      formulario.dataset.id = resultado.negocio.id
      const titulo = vista.dialogo?.querySelector<HTMLElement>('[data-editor-titulo]')
      if (titulo) titulo.textContent = resultado.negocio.nombre
      const guardado = formulario.querySelector<HTMLElement>('[data-guardado]')
      if (guardado) {
        guardado.hidden = false
        guardado.textContent =
          'Negocio creado. Ya puedes añadir fotos; el resto de cambios van a la misma PR.'
      }
      pintarFotosFormulario()
      vista.formularioActual.sucio = false
      await recargar()
      return
    }

    vista.aviso =
      (resultado.pr
        ? `${resultado.mensaje ?? 'Guardado.'} ${resultado.pr.creada ? 'PR abierta' : 'Añadido a la PR'} #${resultado.pr.numero}.`
        : (resultado.mensaje ?? 'Validado en desarrollo. No se commitea.')) + avisos
    cerrarEditor(true)
    await recargar()
  } catch {
    mostrarProblemas(formulario, ['No se pudo hablar con el servidor.'])
  } finally {
    vista.guardando = false
    if (boton) boton.disabled = false
  }
}

function copiarLunes(): void {
  const lunes = vista.dialogo?.querySelector<HTMLElement>('[data-dia="mon"]')
  if (!lunes) return
  const estado = lunes.querySelector<HTMLSelectElement>('select[data-estado]')?.value ?? 'no'
  const rangos = lunes.querySelector<HTMLInputElement>('[data-rangos]')?.value ?? ''
  for (const fila of vista.dialogo?.querySelectorAll<HTMLElement>('.horario-fila') ?? []) {
    if (fila.dataset.dia === 'mon') continue
    const select = fila.querySelector<HTMLSelectElement>('select[data-estado]')
    const input = fila.querySelector<HTMLInputElement>('[data-rangos]')
    if (select) select.value = estado
    if (input) {
      input.value = estado === 'abierto' ? rangos : ''
      input.disabled = estado !== 'abierto'
    }
  }
  if (vista.formularioActual) vista.formularioActual.sucio = true
}

/** Clics dentro del diálogo que son del negocio: giros y horario. Devuelve si lo atendió. */
export function alPulsarNegocio(objetivo: HTMLElement, recargar: () => Promise<void>): boolean {
  const anadir = objetivo.closest<HTMLElement>('[data-anadir-giro-id]')
  if (anadir?.dataset.anadirGiroId) {
    anadirGiro(anadir.dataset.anadirGiroId)
    return true
  }
  const quitar = objetivo.closest<HTMLElement>('[data-giro-quitar]')
  if (quitar?.dataset.giroQuitar) {
    quitarGiro(quitar.dataset.giroQuitar)
    return true
  }
  const subirGiro = objetivo.closest<HTMLElement>('[data-giro-subir]')
  if (subirGiro?.dataset.giroSubir) {
    moverGiro(subirGiro.dataset.giroSubir, -1)
    return true
  }
  const bajarGiro = objetivo.closest<HTMLElement>('[data-giro-bajar]')
  if (bajarGiro?.dataset.giroBajar) {
    moverGiro(bajarGiro.dataset.giroBajar, 1)
    return true
  }
  if (objetivo.closest('[data-copiar-horario]')) {
    copiarLunes()
    return true
  }
  const formulario = objetivo.closest<HTMLFormElement>('form[data-editor="negocio"]')
  if (formulario && objetivo.closest('[data-borrar-negocio]')) {
    void pedirImpactoBorrado(formulario)
    return true
  }
  if (formulario && objetivo.closest('[data-confirmar-borrado]')) {
    void confirmarBorrado(formulario, recargar)
    return true
  }
  if (formulario && objetivo.closest('[data-cancelar-borrado]')) {
    const zona = formulario.querySelector<HTMLElement>('[data-borrado]')
    if (zona) zona.innerHTML = ''
    formulario.querySelector<HTMLElement>('[data-borrar-negocio]')?.focus()
    return true
  }
  return false
}

/** La búsqueda de giros del formulario de negocio. Devuelve si lo atendió. */
export function alEscribirNegocio(objetivo: HTMLElement): boolean {
  const buscarGiro = objetivo.closest<HTMLInputElement>('[data-buscar-giro]')
  if (!buscarGiro || !vista.formularioActual) return false
  vista.formularioActual.consultaGiro = buscarGiro.value
  vista.formularioActual.sucio = true
  pintarGirosFormulario()
  const nuevo = vista.dialogo?.querySelector<HTMLInputElement>('[data-buscar-giro]')
  nuevo?.focus()
  nuevo?.setSelectionRange(nuevo.value.length, nuevo.value.length)
  return true
}

/** Los cambios de plaza, cierre, visibilidad y horario. Devuelve si lo atendió. */
export function alCambiarNegocio(objetivo: HTMLElement): boolean {
  if (!vista.formularioActual) return false
  if (objetivo.matches('select[name="plazaId"]')) {
    actualizarAvisoPlaza()
    vista.formularioActual.sucio = true
    return true
  }
  if (objetivo.matches('input[name="cierreActivo"]')) {
    actualizarCierre()
    vista.formularioActual.sucio = true
    return true
  }
  if (objetivo.matches('input[name="activo"]')) {
    actualizarAvisoPlaza()
    vista.formularioActual.sucio = true
    return true
  }
  const estado = objetivo.closest<HTMLSelectElement>('select[data-estado]')
  if (estado) {
    const fila = estado.closest<HTMLElement>('.horario-fila')
    const rangos = fila?.querySelector<HTMLInputElement>('[data-rangos]')
    if (rangos) rangos.disabled = estado.value !== 'abierto'
    vista.formularioActual.sucio = true
    return true
  }
  if (objetivo.matches('[data-rangos]') || objetivo.matches('[name="cierreDesde"]')) {
    vista.formularioActual.sucio = true
    return true
  }
  return false
}

/* ------------------------------------------------------------------ borrar */

interface Impacto {
  negocio: { id: string; nombre: string }
  plaza: string
  redirecciones: { desde: string; hacia: string }[]
  categoriasSinPagina: string[]
  destinoEsPortada: boolean
  fotos: number
  avisos: string[]
}

interface RespuestaBorrado {
  ok?: boolean
  confirmado?: boolean
  seco?: boolean
  pr?: { url: string; numero: number; creada: boolean } | null
  mensaje?: string
  problemas?: string[]
  impacto?: Impacto
}

/** Habla con el Worker. Los errores salen en el formulario y devuelven `null`. */
async function llamarBorrado(
  formulario: HTMLFormElement,
  cuerpo: { id: string; confirmar?: boolean },
): Promise<RespuestaBorrado | null> {
  try {
    const respuesta = await fetch('/api/panel/contenido/negocio/borrar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
    const resultado = (await respuesta.json().catch(() => null)) as RespuestaBorrado | null
    if (respuesta.status === 403) {
      mostrarProblemas(formulario, ['Sin permiso. Revisa la regla de Access.'])
      return null
    }
    if (respuesta.status === 503) {
      mostrarProblemas(formulario, ['Falta GITHUB_TOKEN en el Worker.'])
      return null
    }
    if (!respuesta.ok || !resultado?.ok) {
      mostrarProblemas(
        formulario,
        resultado?.problemas?.length ? resultado.problemas : ['No se pudo borrar.'],
      )
      return null
    }
    return resultado
  } catch {
    mostrarProblemas(formulario, ['No se pudo hablar con el servidor.'])
    return null
  }
}

/** Primer paso: enseña qué cambiaría, sin guardar nada. */
async function pedirImpactoBorrado(formulario: HTMLFormElement): Promise<void> {
  const id = formulario.dataset.id
  const zona = formulario.querySelector<HTMLElement>('[data-borrado]')
  if (!id || !zona || vista.guardando) return
  mostrarProblemas(formulario, [])
  const resultado = await llamarBorrado(formulario, { id })
  if (!resultado?.impacto) return
  const { impacto } = resultado

  const direcciones = impacto.redirecciones
    .map(
      (fila) =>
        `<li><code>${texto(fila.desde)}</code> pasa a <code>${texto(fila.hacia)}</code> (redirección permanente)</li>`,
    )
    .join('')
  const categorias = impacto.categoriasSinPagina.length
    ? `<p class="aviso-contenido">Se queda sin página: ${impacto.categoriasSinPagina.map(texto).join(', ')}. No tiene ningún otro local visible.</p>`
    : ''
  zona.innerHTML = `<section class="editor-seccion impacto-borrado" aria-labelledby="titulo-borrado" tabindex="-1">
      <h3 id="titulo-borrado">Si borras ${texto(impacto.negocio.nombre)}</h3>
      <ul class="impacto-lista">${direcciones}</ul>
      <p class="impacto-contenido">Su ficha deja de existir y quien llegue por la dirección antigua verá ${impacto.destinoEsPortada ? `la portada, porque ${texto(impacto.plaza)} no está activa` : texto(impacto.plaza)}.</p>
      ${categorias}
      <ul class="impacto-lista">${impacto.avisos.map((aviso) => `<li>${texto(aviso)}</li>`).join('')}</ul>
      <div class="acciones">
        <button type="button" class="${controls.base} ${controls.boton} ${controls.principal}" data-confirmar-borrado>Borrar este negocio</button>
        <button type="button" class="${controls.base} ${controls.boton} ${controls.secundario}" data-cancelar-borrado>Mejor no</button>
      </div>
    </section>`
  zona.querySelector<HTMLElement>('section')?.focus()
}

/** Segundo paso: el borrado va a la PR del panel. */
async function confirmarBorrado(
  formulario: HTMLFormElement,
  recargar: () => Promise<void>,
): Promise<void> {
  const id = formulario.dataset.id
  if (!id || vista.guardando) return
  mostrarProblemas(formulario, [])
  const botones = formulario.querySelectorAll<HTMLButtonElement>('[data-borrado] button')
  for (const boton of botones) boton.disabled = true
  vista.guardando = true
  try {
    const resultado = await llamarBorrado(formulario, { id, confirmar: true })
    if (!resultado) return
    vista.aviso = resultado.pr
      ? `${resultado.mensaje ?? 'Borrado.'} ${resultado.pr.creada ? 'PR abierta' : 'Añadido a la PR'} #${resultado.pr.numero}.`
      : (resultado.mensaje ?? 'Validado en desarrollo. No se commitea.')
    if (vista.formularioActual) vista.formularioActual.sucio = false
    cerrarEditor(true)
    await recargar()
  } finally {
    vista.guardando = false
    for (const boton of botones) boton.disabled = false
  }
}
