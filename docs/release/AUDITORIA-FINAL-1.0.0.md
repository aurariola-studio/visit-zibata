# Auditoría final · Zibatá · Comer y beber · v1.0.0

Fecha: 2026-09-15 · Alcance: repositorio completo, datos, mapa, interfaz, pruebas, seguridad,
accesibilidad, rendimiento, documentación y publicación · Método: verificación directa (ejecutar, medir,
leer), no revisión de intenciones.

> Regla de esta auditoría: nada se marca PASS sin evidencia reproducible. Lo que no se pudo verificar se
> declara NO VERIFICADO, aunque eso impida un veredicto redondo.

## A. Resumen ejecutivo

**Veredicto: listo para usarse.** 55 elementos de remediación cerrados con evidencia, 0 abiertos; 8
defectos nuevos encontrados y corregidos durante la propia ronda (uno de ellos, el CRLF del clon limpio,
habría roto el proyecto en manos de otra persona).

La guía está terminada como producto y verificada en todo lo que se puede verificar sin publicarla: datos
con fuente, mapa reproducible, interfaz probada en cuatro motores y nueve tamaños, accesibilidad
comprobada con un lector de pantalla real, seguridad con CSP activa y sin dependencias externas, y una
documentación que describe lo que hay, no lo que se pretendía.

Quedan **tres cosas que no se han podido verificar** y una limitación de contenido que no depende del
código:

1. La publicación real en GitHub Pages (decisión del propietario: solo commit y etiqueta locales).
2. Safari real en un iPhone o iPad (no hay dispositivo; se probó el motor WebKit emulado).
3. La ejecución real de los workflows de CI en GitHub (no hay repositorio remoto).
4. Horarios en 3 de 76 locales y sin fotografías propias: límite de las fuentes públicas permitidas.

Por eso **no se firma un "cero pendientes"**: se firma "listo para usarse, con tres verificaciones
pendientes de infraestructura y una limitación de contenido declarada".

## B. Remediaciones realizadas

54 elementos (R-01 … R-54) con criterio de aceptación y evidencia en
[FINAL_REMEDIATION_CHECKLIST.md](FINAL_REMEDIATION_CHECKLIST.md). Resumen por bloque:

| Bloque | Elementos | Resultado |
| --- | --- | --- |
| Contenido e investigación | R-01 … R-04, R-13, R-48 | Cobertura medida y explicada; 135/135 registros con estado, motivo y (cuando existe) fuente |
| Interfaz y accesibilidad | R-09, R-12, R-15 … R-18, R-22, R-23, R-28, R-31, R-33, R-34 | Cerrados; 3 defectos adicionales hallados con NVDA y corregidos |
| Datos y validación | R-19, R-21, R-30, R-42 | Validación de runtime sin Zod, tolerante a registros inválidos y con punto-en-polígono |
| Mapa y GIS | R-10, R-11, R-20, R-36, R-46 | Teselas más ligeras, alturas documentadas, rótulos sin colisión, 96,1 % de fidelidad vial |
| Rendimiento | R-19, R-20, R-35, R-37, R-38 | JS inicial −18 %, presupuesto en CI, estrés hasta 500 locales |
| Seguridad y despliegue | R-05, R-08, R-24, R-25, R-27, R-47 | CSP, 404 propio, acciones fijadas por SHA, 0 secretos |
| Pruebas | R-06, R-32, R-39, R-40, R-41 | 4 proyectos E2E, 9 tamaños, 36 recorridos A–R, pruebas de fallo |
| Documentación y release | R-26, R-43, R-44, R-45, R-49 | 11 documentos, CHANGELOG, versión 1.0.0 |

## C. Evidencia

- Suites ejecutadas en esta sesión (registro completo en el espacio de trabajo de la auditoría).
- Transcripción de NVDA: [evidencia/nvda-transcripcion.md](evidencia/nvda-transcripcion.md).
- Manifiesto reproducible del pipeline GIS: `data/geographic/manifest.json` (SHA-256 del PMTiles).
- Auditoría de investigación: `research/business-audit.json`, `research/plaza-audit.json`,
  `research/metrics.json`, `research/sources.md`.

## D. Resultados de la nueva auditoría

Ejecutada sobre el build de producción publicado en una subruta (`/zibata-comer-y-beber/`) y servido por
un servidor estático estricto (404 reales, `Range`, sin *fallback* SPA), igual que GitHub Pages.

| Prueba | Resultado |
| --- | --- |
| `npm run check` (lint, tipos, 146 pruebas unitarias, validación de datos, build) | PASS |
| `npm run perf:budget` | PASS (6/6 presupuestos) |
| E2E en la raíz (4 proyectos, 208 casos) | 168 PASS · 40 omitidos por dispositivo · 0 fallos |
| E2E en subruta (4 proyectos, 208 casos) | 168 PASS · 40 omitidos · 0 fallos |
| Recorridos A–R (escritorio y móvil) | 36/36 PASS |
| Clon limpio (`git clone` → `npm ci` → `check` → presupuesto → E2E) | PASS (tras corregir `.gitattributes`) |
| Validación de datos | 17 categorías · 12 plazas · 76 locales · 0 errores · 0 avisos |
| Secretos (`gitleaks`) | 0 hallazgos |
| `npm audit` | 0 vulnerabilidades |

Banco de auditoría (sondas independientes sobre el mismo build):

| Sonda | Resultado |
| --- | --- |
| Carga en 11 tamaños (320×568 → 1920×1080, incluido móvil en horizontal) | 0 solapes, 0 desbordamiento, 0 marcadores bajo la interfaz, 0 errores de consola, solo el propio host |
| Rendimiento de carga | LCP 0,5–0,6 s en móvil, CLS ≤ 0,002, 0–2 tareas largas |
| Plazas (12 × 2 perfiles) | Marcador, panel, conteos, orden, URL, cierre y hover correctos; 0 fallos |
| axe (todas las severidades, WCAG 2.0/2.1/2.2 A-AA + buenas prácticas) | 16/16 estados **sin violaciones**, incluidos tutorial, sin WebGL y error de datos |
| Estados de error (PMTiles, datos, red, esquema, relaciones) | Degradación correcta con aviso y reintento |
| Fichas de lugar (76 × comprobaciones) | 0 problemas: categoría, plaza, "Cómo llegar", volver, cerrar y foco |
| Objetivos táctiles (WCAG 2.2) | 0 incumplimientos |
| Fotogramas por segundo (escritorio) | 60,6–61,2 fps en reposo, vuelo y reencuadre; 0 fotogramas > 34 ms; heap 54 MB |
| Recorridos A–R (nueva ejecución) | 36/36 PASS |
| PMTiles publicado | Cabecera z12–z16, 250 teselas, servido por rangos |

## E. Matriz de requisitos

Requisitos del encargo original, con su estado tras esta ronda (antes → ahora cuando cambió).

| Área | Requisito | Estado | Evidencia |
| --- | --- | --- | --- |
| Alcance | Exclusivamente Zibatá, extensión actualizable por datos | PASS | `extent.json`, `maxBounds`, velo exterior |
| Geografía | Representación real y fiel al plano del cliente | PASS | 96,1 % de coincidencia vial a 11 m (medición independiente) |
| Stack | MapLibre como único motor; sin Google Maps ni Mapbox | PASS | 0 peticiones externas en E2E |
| Mapa | 3D con zoom, paneo, inclinación y rotación (ratón, trackpad, táctil) | PASS | E2E táctil y de cámara |
| 3D | Edificios con volumen | PASS | `fill-extrusion` desde z13 |
| 3D | Alturas no idénticas sin justificación | PARTIAL → PASS (limitación) | 59 valores; método documentado; **son estimaciones** |
| Vialidades | Jerarquía y nombres según zoom | PASS | 6 clases; rótulos desde z15,5 |
| Plazas | Seleccionables por clic, hover y teclado | PASS | E2E + NVDA |
| Plazas | Reconocibles en la vista inicial | PASS | 9/9 representadas (marcador o "+N") |
| Plazas | Ubicación verificada | UNVERIFIED → PASS (limitación) | 12/12 con fuentes; 3 activas con confianza media, sin campo |
| Selección | Resalte, mapa visible, panel con nombre, descripción, cantidad, categorías y lista | PASS | E2E en 4 proyectos y 9 tamaños |
| Panel | Lateral en escritorio (25–30 %) y hoja inferior en móvil | PASS | 404 px de 1440; hoja con tope de altura |
| Locales | Pertenecen a plazas, con categoría, número de local y horario | PASS | 76/76; relaciones con 0 errores |
| Detalle | Solo campos disponibles, nunca botones vacíos | PASS | Pruebas de componente |
| Imágenes | Formatos modernos, lazy, respaldo | PASS (sin fotos) | Validador de rutas y variantes; ilustración por categoría |
| Horarios | Se muestran cuando existen | PASS | 3/76 con horario real |
| Google Maps | "Cómo llegar" sin Google Places | PASS | 76/76 URLs verificadas por prueba |
| Búsqueda | Nombre, plaza, categoría, subcategoría, etiquetas, descripción; acentos, erratas y sinónimos | PARTIAL → PASS | Prioridad por inicio de palabra; tests |
| Filtros | Categoría + plaza combinables, con recuento y limpieza | PASS | E2E |
| Descubrimiento | Mapa → plaza → local → detalle sin buscar | PASS | Recorridos A–R |
| Inicio | Abre en el mapa con tutorial de 3 pasos que no se repite | PASS | E2E + NVDA |
| Favoritos | En el dispositivo, sin cuentas | PASS | E2E; contador corregido |
| Geolocalización | Solo tras acción explícita; sin guardar ni enviar | PASS | Código y red |
| Estado en la URL | Hash compatible con GitHub Pages | PASS | Enlaces directos, recarga y atrás en subruta |
| SEO | Título, descripción, Open Graph, favicon, HTML semántico | PASS | `index.html`, OG absoluto con `SITE_URL` |
| Datos | Separados del código y actualizables sin tocar componentes | PASS | `data/`, scripts e importador CSV |
| Validación | IDs, relaciones, categorías, coordenadas, URLs, horarios, duplicados, fotos | PASS | `data:validate` 0 errores, 0 avisos |
| Arquitectura | Repositorio de datos reemplazable | PASS | Interfaz `PlacesRepository` |
| Mapa | Actualizable por pipeline reproducible | PASS | SHA-256 idéntico en dos compilaciones |
| Accesibilidad | Contraste, foco, aria, movimiento reducido, semántica | PARTIAL → PASS | axe sin violaciones graves; NVDA real |
| Responsive | Escritorio, tableta y móvil, vertical y horizontal | PASS | 9 tamaños, 0 solapes y 0 desbordamientos |
| Rendimiento | Carga diferida, división de código, 60 fps | PASS | JS inicial 107,7 KB gzip; presupuesto en CI |
| Estados de error | Mapa, datos, sin resultados, sin red, registro inválido | PASS | 9 pruebas de degradación |
| Restricciones | Sin cuentas, backend, pagos, anuncios, reseñas, valoraciones, reservas ni rastreo | PASS | Código y red |
| Hosting | Sitio estático compatible con GitHub Pages | PASS | Servidor estricto, raíz y subruta |
| Hosting | Despliegue real en GitHub Pages | **NO VERIFICADO** | Decisión del propietario: sin remoto |
| CI/CD | install → validate → test → build → e2e → deploy | PASS (definición) | Workflows revisados, acciones fijadas por SHA |
| CI/CD | Ejecución real de los workflows | **NO VERIFICADO** | No hay repositorio remoto |
| Seguridad | Sin secretos, HTML inseguro ni dependencias vulnerables | PASS | gitleaks 0, `npm audit` 0, CSP activa |
| Licencias | Atribución de OpenStreetMap visible | PASS | Visible en todos los tamaños, también a 320 px |
| Pruebas | Unitarias, de componente y E2E significativas | PASS | 146 unitarias + 208 E2E × 2 bases |
| Documentación | Completa y exacta | PASS | 11 documentos + CHANGELOG |
| Datos reales | No inventar negocios ni datos | PASS | 135 registros con estado y evidencia |
| Contenido | Información suficiente para decidir | PARTIAL | Horarios 3/76: límite de fuentes públicas |
| iOS | Funciona en Safari de iPhone/iPad | **NO VERIFICADO** | Sin dispositivo; WebKit emulado PASS |

## F. Matriz de defectos

Defectos encontrados **durante esta ronda** (además de los 38 heredados de la auditoría anterior, todos
cerrados salvo los declarados como limitación):

| ID | Defecto | Cómo se encontró | Severidad | Estado |
| --- | --- | --- | --- | --- |
| R-50 | Un marcador con el foco del teclado podía ocultarse al moverse la cámara | Regresión E2E intermitente | P3 (accesibilidad) | Corregido |
| R-51 | Una plaza elegida nada más cargar quedaba pisada por la sincronización inicial de la URL | WebKit con carga alta (5/15) | P2 (funcional) | Corregido |
| R-52 | "+N" no revelaba la plaza agrupada con un solo toque en pantallas estrechas | iPhone 13 emulado (390×664) | P3 (UX) | Corregido |
| R-53 | El índice de búsqueda se consultaba dos veces por cambio de filtros | Prueba de estrés | P4 (rendimiento) | Corregido |
| R-54 | Arrastrar la hoja y soltar sobre el asa deshacía el gesto | E2E táctil intermitente en tableta | P3 (UX) | Corregido |
| A11Y-1 | Las pastillas se leían "Todo19" | Sesión con NVDA | P3 (accesibilidad) | Corregido |
| A11Y-2 | La marca se leía "ZibatáCOMER Y BEBER" | Sesión con NVDA | P4 (accesibilidad) | Corregido |
| A11Y-3 | Controles de MapLibre anunciados en inglés | Sesión con NVDA | P4 (accesibilidad) | Corregido |

Ningún defecto abierto con severidad P1–P3 al cierre de la auditoría.

## G. Matriz de incógnitas

| Incógnita | Por qué no se puede cerrar | Riesgo | Cómo cerrarla |
| --- | --- | --- | --- |
| Comportamiento en Safari real de iOS | No hay dispositivo; WebKit de Playwright no reproduce la GPU ni las barras dinámicas de iOS | Medio: el mapa 3D es exigente en móvil | Abrir la guía publicada en un iPhone y recorrer los journeys A–R |
| Publicación en GitHub Pages | Decisión del propietario: sin repositorio remoto | Bajo: verificado con un servidor estricto equivalente | Subir el repositorio y activar Pages |
| Ejecución real de los workflows | Ídem | Bajo: YAML válido y pasos probados en local | Abrir una pull request de prueba |
| Estado real de los 61 locales `likely_active` | Sin verificación en campo | Medio: un local puede haber cerrado | Visita o llamada; el dataset ya guarda la fecha de verificación |
| Ubicación exacta de 3 plazas activas (confianza media) | Derivada de POIs abiertos, sin campo | Bajo: el marcador cae dentro de la plaza | Verificación en campo con GPS |
| Horarios de 73 locales | No los publican en fuentes propias | Medio para el usuario final | Pedirlos a los negocios o esperar a que los publiquen |

## H. Matriz de documentación

| Documento | Estado | Verificado |
| --- | --- | --- |
| README | Actualizado y corregido (afirmaciones de cartografía y accesibilidad) | Enlaces y comandos revisados |
| docs/ARQUITECTURA.md | Actualizado (validación de runtime, escalabilidad, rendimiento) | Sí |
| docs/DATOS.md | Actualizado (cobertura real y criterio de subcategoría) | Cifras recalculadas del dataset |
| docs/MAPA.md | Nuevo | Cifras del manifiesto |
| docs/PIPELINE-GIS.md | Vigente | Ejecutado (`map:build` reproducible) |
| docs/PRUEBAS.md | Nuevo | Comandos ejecutados |
| docs/SEGURIDAD.md | Nuevo | CSP verificada con control negativo |
| docs/ACCESIBILIDAD.md | Nuevo | Transcripción de NVDA adjunta |
| docs/DESPLIEGUE.md | Nuevo | Servidor estricto local |
| docs/CONTRIBUIR.md | Nuevo | Flujo ejecutado en esta sesión |
| docs/LICENCIAS.md | Vigente | Atribución visible en la interfaz |
| CHANGELOG.md | Nuevo (1.0.0) | Corresponde a los cambios reales |

## I. Matriz de despliegue

| Elemento | Estado | Evidencia |
| --- | --- | --- |
| Build de producción (raíz) | PASS | `npm run build`, E2E 168/168 |
| Build en subruta (`/zibata-comer-y-beber/`) | PASS | E2E 168/168 con esa base |
| Servidor estático estricto (404 reales, `Range`, sin *fallback*) | PASS | 200 en `/`, 404 en recurso inexistente, 206 con `Content-Range` |
| `404.html` propio | PASS | Generado en el build, enlace a la raíz correcta |
| CSP en el HTML publicado | PASS | `<meta>` presente en `index.html` de ambos builds |
| Manifiesto e iconos (`any` y `maskable`) | PASS | 200 con tipo correcto |
| Atribución de OpenStreetMap | PASS | Visible en 9 tamaños |
| Workflows de CI y publicación | PASS (definición) | YAML válido, acciones por SHA, matriz raíz + subruta |
| Ejecución en GitHub Actions | **NO VERIFICADO** | Sin repositorio remoto |
| Publicación en GitHub Pages | **NO VERIFICADO** | Decisión del propietario |
| Versión y etiqueta | PASS | `1.0.0`, commit `a351514`, etiqueta `v1.0.0-mvp` (local) |
| Reproducibilidad desde clon limpio | PASS | `git clone` → `npm ci` → `check` → presupuesto → E2E |

## J. Matriz de rendimiento

| Métrica | Valor | Presupuesto | Estado |
| --- | --- | --- | --- |
| JS inicial (gzip) | 107,7 KB | 120 KB | PASS (antes 131,6 KB) |
| CSS inicial (gzip) | 7,2 KB | 10 KB | PASS |
| Chunk del mapa (gzip) | 283,5 KB | 320 KB | PASS |
| Datos comerciales (gzip) | 15,2 KB | 20 KB | PASS |
| PMTiles | 1 582 KB | 1 900 KB | PASS (antes 1 651 KB) |
| Teselas z13 (primera vista en móvil) | 230,6 KB | n/d | −23 % respecto a la versión anterior |
| Mapa listo (escritorio / móvil, local) | 0,7 s / 0,6 s | n/d | Medido con 76 y con 500 locales |
| Estrés 500 locales · latencia de tecleo | ≤ 0,3 s | n/d | Sin tareas largas > 120 ms |
| Estrés 500 locales · memoria | 25–51 MB | n/d | n/d |

## K. Matriz de contenido

| Dato | Cobertura | Fuente | Verificado |
| --- | --- | --- | --- |
| Locales publicados | 76 en 9 plazas activas | Investigación 2026-09-14 | 76/76 con estado y fuentes |
| Estado de verificación | 15 `active`, 61 `likely_active` | Evidencia documental | 76/76 con fecha y fuentes |
| Descripción | 75/76 | Fuente oficial o guía local | Sin texto inventado |
| Subcategoría | 45/76 | Criterio documentado | Coherente con la búsqueda |
| Enlaces oficiales | 65/76 | Web o redes del negocio | https y `noopener` |
| Teléfono | 10/76 | Publicado por el negocio | Formato E.164 |
| WhatsApp | 1/76 | Web oficial | Formato E.164 |
| Horario | 3/76 | Publicado por el negocio | Se muestra solo si existe |
| Fotografías | 0/76 | n/d | Respaldo por categoría, sin imágenes rotas |
| Registros no publicados | 59 (48 inciertos, 3 cerrados, 5 rechazados, 1 retirado, 1 próximo, 1 duplicado) | n/d | Conservados con su evidencia |

## L. Certificación final

Se certifica que, a 2026-09-15, la guía **Zibatá · Comer y beber v1.0.0** (commit `a351514`, etiqueta
`v1.0.0-mvp`):

1. Funciona de principio a fin en escritorio, tableta y teléfono, en Chromium y en WebKit, y en los nueve
   tamaños de pantalla probados, sin errores de consola ni peticiones externas.
2. Publica solo datos con fuente: 76 locales y 9 plazas, cada registro con estado, confianza, fecha y
   referencias; nada inventado y nada tomado de Google.
3. Se reconstruye byte a byte desde un clon limpio siguiendo su propia documentación.
4. Degrada con dignidad: sin WebGL2, sin datos, sin mapa, sin red o con un registro corrupto, la guía
   sigue siendo utilizable y lo explica.
5. Es accesible por teclado y con lector de pantalla (NVDA real), con una sola región viva y foco
   gestionado.
6. No expone secretos, no depende de terceros en ejecución y declara una CSP verificada.

**No se certifica** (y por eso esta no es una certificación de "cero pendientes"):

- El funcionamiento en Safari real de iOS.
- La publicación en GitHub Pages ni la ejecución de sus workflows.
- Que los 61 locales `likely_active` sigan abiertos hoy: su evidencia es documental y reciente, no de
  campo.

## M. Estado final del proyecto

| Dimensión | Estado |
| --- | --- |
| Producto | Completo para su alcance: explorar, buscar, filtrar, ver ficha y llegar |
| Datos | 76 locales · 9 plazas · 17 categorías · 135 registros auditados |
| Mapa | Propio y reproducible (PMTiles 1,58 MB), 96,1 % de fidelidad vial |
| Calidad | 146 pruebas unitarias · 208 E2E × 2 bases · 36 recorridos · 0 fallos |
| Rendimiento | JS inicial 107,7 KB gzip; presupuesto automático en CI |
| Accesibilidad | axe sin violaciones graves; NVDA real; 3 defectos corregidos |
| Seguridad | CSP activa · 0 secretos · 0 vulnerabilidades · 0 terceros |
| Documentación | 11 documentos + CHANGELOG, corregidos contra la realidad |
| Publicación | **Pendiente**: solo commit y etiqueta locales, por decisión del propietario |
| Riesgo principal | Que un local haya cerrado desde la investigación (2026-09-14) |
