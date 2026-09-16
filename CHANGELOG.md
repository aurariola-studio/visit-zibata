# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versionado semántico.

## [1.0.0] — 2026-09-15

Primera versión completa de la guía: datos verificados, mapa propio y la ronda final de correcciones,
endurecimiento y documentación. El detalle de cada corrección, con su evidencia, está en
[docs/release/FINAL_REMEDIATION_CHECKLIST.md](docs/release/FINAL_REMEDIATION_CHECKLIST.md).

### Contenido

- Dataset verificado: **76 locales en 9 plazas activas**, 135 registros auditados con estado, confianza,
  motivo y fuentes (investigación del 2026-09-14).
- Teléfono y WhatsApp de Masaru desde su sitio oficial; cobertura de contenido medida y documentada.
- Punto del marcador de Centro Zibatá corregido para que caiga dentro de su propio polígono.

### Añadido

- Enlace «Ir al buscador» como primer elemento con teclado.
- Aviso cuando un enlace apunta a un lugar que ya no está en la guía, con limpieza de la URL.
- Aviso de falta de conexión (la guía ya cargada sigue siendo usable).
- `Escape` cierra la ficha, el panel y el tutorial.
- Política de seguridad de contenido (CSP) en el build, `404.html` propio e iconos «maskable» separados.
- Presupuesto de peso (`npm run perf:budget`) y proyectos E2E de tableta y WebKit (iPhone emulado).
- Documentación: mapa, pruebas, seguridad, accesibilidad, despliegue y guía de contribución.

### Cambiado

- Validación de datos en el navegador sin Zod: **JS inicial 131,6 → 107,7 KB gzip (−18 %)**; un registro
  inválido se omite con aviso en lugar de bloquear la guía.
- Búsqueda: prioridad por inicio de palabra («bar» ya no trae «barista» ni «gastrobar»), términos de una
  letra ignorados de forma coherente con el indicador de filtros, y caché de la última consulta.
- Mapa: teselas z13 sin huellas menores de 60 m² (−23 % de peso en la vista inicial móvil), alturas
  estimadas con más variación (13 → 59 valores), rótulos que quedaban bajo los marcadores retirados,
  rumbo de la cámara según la forma del área libre y «+N» que acerca hasta revelar las plazas agrupadas.
- Interfaz: la barra superior se mide para reservar espacio al mapa; los controles pasan a fila cuando no
  caben en columna; la hoja expandida deja visible la barra; una sola región `aria-live`.
- Accesibilidad: pastillas con nombre accesible («Todo, 76 lugares»), marca separada del lema y controles
  de MapLibre en español (correcciones salidas de la sesión con NVDA).
- Reloj compartido para el estado «abierto/cerrado» (un temporizador en vez de uno por tarjeta).

### Corregido

- Una plaza seleccionada nada más cargar podía quedar descartada por la sincronización inicial de la URL.
- Un marcador con el foco del teclado podía ocultarse al moverse la cámara y perder el foco.
- Arrastrar la hoja inferior y soltar sobre el asa deshacía el gesto.
- El contador de favoritos incluía identificadores que ya no están en la guía.
- README: coincidencia cartográfica real (96 %/89 % a 11 m) y alcance real de la accesibilidad.

### Seguridad

- CSP verificada con control negativo; 0 peticiones externas en los recorridos E2E.
- `gitleaks` sin hallazgos; `npm audit` sin vulnerabilidades; acciones de CI fijadas por SHA.

### No incluido (limitaciones declaradas)

- La guía **no está publicada**: la versión se etiqueta en local, sin repositorio remoto.
- **Safari real en iOS** sin probar (solo WebKit emulado).
- Horarios en 3/76 locales y sin fotografías propias: límite de las fuentes públicas permitidas.
- 61 de los 76 locales son `likely_active` (evidencia documental reciente, sin verificación en campo).
