# Contribuir

Guía breve para trabajar en este repositorio. Las reglas del producto están en
[AGENTS.md](../AGENTS.md); el contexto y los comandos, en [README.md](../README.md).

## Preparar el entorno

```bash
npm install
npx playwright install chromium webkit   # solo para E2E
npm run dev
```

Node 22.18+ (CI usa 24). En Windows, los scripts con rutas (`BASE_PATH=/sub/`) requieren
`MSYS_NO_PATHCONV=1` en Git Bash.

## Antes de terminar un cambio

```bash
npm run check          # lint + tipos + tests + validación de datos + build
npm run test:e2e       # si tocaste interfaz o mapa
npm run perf:budget    # si tocaste dependencias o datos
```

Los tres deben salir en verde. Si una prueba falla de forma intermitente, arregla la causa (una carrera
real o una suposición del test), no la ocultes con esperas fijas.

## Convenciones

- **TypeScript estricto**, imports relativos con extensión (`./x.ts`, `./y.tsx`): los scripts corren con
  Node sin transpilar.
- **Biome** para lint y formato (`npm run lint:fix`). No hay configuración personal: lo que diga Biome.
- **Textos de interfaz en `src/i18n/es.ts`**, nunca escritos en los componentes.
- **CSS Modules** por componente, con los tokens de `src/styles/tokens.css`. Nada de estilos en línea
  (la CSP los bloquea) salvo variables calculadas.
- **Comentarios que expliquen el porqué**, en español, solo donde el código no se explique solo.
- Los datos comerciales se editan en `data/commercial` y se validan con `npm run data:validate`; la
  investigación que los respalda vive en `research/` y se regenera con `scripts/research/build-dataset.ts`.

## Qué no se acepta

- Datos de negocios inventados (horarios, teléfonos, descripciones, fotos) o sin fuente verificable.
- Google Places, scraping o descarga de fotografías de terceros.
- Backend, cuentas, pagos, publicidad, reseñas, valoraciones, reservas o rastreo.
- Dependencias nuevas sin una razón clara: primero la plataforma, después lo que ya está instalado.
- Procesamiento GIS en el navegador: va en `scripts/map`.

## Flujo de trabajo

1. Rama por cambio (`git switch -c tema-breve`).
2. Commits pequeños en español, en imperativo ("añade el aviso de conexión").
3. Pull request: CI ejecuta validación de datos, lint, tipos, tests, build, presupuesto de peso, E2E en
   raíz y en subruta, y búsqueda de secretos.
4. Al fusionar en `main`, el workflow de publicación despliega en GitHub Pages.

## Estructura de referencia

- `src/app` composición y estado; `src/features` cada capacidad (mapa, búsqueda, filtros, plazas, lugares,
  favoritos, onboarding); `src/data` acceso y validación de datos; `src/lib` utilidades puras.
- `scripts/` tareas de datos, mapa, imágenes, investigación y rendimiento.
- `docs/` decisiones técnicas: arquitectura, datos, mapa, pipeline GIS, pruebas, seguridad,
  accesibilidad, despliegue y licencias.
