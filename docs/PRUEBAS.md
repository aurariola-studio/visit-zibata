# Pruebas

Qué se prueba, con qué y qué queda fuera. Lo que no se ha podido verificar se declara aquí y en
[release/FINAL_REMEDIATION_CHECKLIST.md](release/FINAL_REMEDIATION_CHECKLIST.md).

## Comandos

```bash
npm run check          # lint + tipos + tests unitarios + validación de datos + build
npm test               # solo Vitest
npm run test:e2e       # Playwright contra dist/ (requiere npm run build)
npm run perf:budget    # presupuesto de peso del build
npm run data:validate  # estructura, relaciones, coordenadas, fotos y variantes
```

Antes de los E2E, el puerto 4173 debe estar libre: Playwright reutiliza un servidor existente fuera de CI
y podría medir otra aplicación.

## Niveles

**Unitarios y de componentes (Vitest, 144 pruebas).** Lógica pura y componentes con Testing Library:
esquemas y validación de datos (Zod y la validación ligera de runtime, en paridad), relaciones entre
colecciones, catálogo, horarios, búsqueda, filtros, URLs, cámara, hoja inferior, enlaces a Google Maps del
dataset publicado y componentes de la ficha.

**End to end (Playwright, 4 proyectos).** Contra el build de producción servido como en el hosting:

| Proyecto | Motor | Emulación |
| --- | --- | --- |
| `desktop` | Chromium | 1440×900, puntero fino |
| `mobile` | Chromium | Pixel 7, táctil |
| `tablet` | Chromium | iPad (gen 7), táctil |
| `webkit-iphone` | WebKit | iPhone 13, táctil |

Cubren: mapa 3D y marcadores, plazas y fichas, búsqueda y filtros, favoritos, enlaces profundos y botón
atrás, teclado (salto al buscador, Escape), aviso de enlaces caducados, región viva única, táctil (toques
y arrastre de la hoja), responsive en 9 tamaños, seguridad (CSP, enlaces externos, 404) y degradación
(sin WebGL2, sin datos, sin chunk del mapa, sin PMTiles, sin conexión, registro inválido).

**Accesibilidad.** axe-core en inicio, plaza y ficha (sin violaciones graves o críticas), recorrido de
teclado y foco. Ver [ACCESIBILIDAD.md](ACCESIBILIDAD.md).

**Banco de auditoría (fuera del repositorio).** Sondas con Playwright como librería para medir lo que no
es una aserción binaria: carga por viewport, solapes y desbordamientos, colocación de marcadores,
recorridos A–R en escritorio y móvil, fidelidad cartográfica contra el plano, rendimiento y estrés con
300–500 locales sintéticos. Sus resultados se citan en el informe de auditoría.

## Datos de prueba

`src/test/fixtures.ts` contiene datos **ficticios** con la estructura real (nunca negocios reales
inventados). Las pruebas que dependen del dataset publicado (76 locales, 9 plazas activas) usan los
archivos reales y se actualizan cuando cambia el contenido.

## Estabilidad

- La colocación de marcadores depende del tamaño de pantalla: los E2E usan el ayudante `plazaMarker`, que
  abre el grupo "+N" si la plaza está agrupada, en vez de suponer que siempre tiene marcador propio.
- Tras mover la cámara se espera al reposo antes de medir posiciones.
- Suites completas ejecutadas varias veces sin fallos intermitentes tras corregir dos carreras reales
  (sincronización inicial de la URL y arrastre + click en la hoja).

## Qué NO se prueba

- **Safari real en un iPhone/iPad**: solo el motor WebKit emulado en escritorio. No cubre la GPU de iOS,
  las barras dinámicas ni el comportamiento real de `100dvh` en iOS.
- **Arrastre táctil en WebKit**: Playwright solo inyecta gestos de arrastre táctil en Chromium; en WebKit
  se prueban toques.
- **Publicación real** en GitHub Pages (ver [DESPLIEGUE.md](DESPLIEGUE.md)).
- **Lectores de pantalla distintos de NVDA** (VoiceOver, JAWS, TalkBack).
- Navegadores antiguos sin WebGL2: se detecta y se ofrece la guía en modo lista, pero no se prueba en un
  navegador antiguo real.
