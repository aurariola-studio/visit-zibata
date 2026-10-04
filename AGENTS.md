# AGENTS.md

Guía para agentes y colaboradores. Contexto del producto y comandos en [README.md](README.md).

## Reglas del proyecto

- Sitio estático: nada de backend, cuentas, API keys ni dependencias de servicios de pago en runtime.
- El mapa es MapLibre con datos propios (`public/map`). Google Maps solo como enlace externo; nunca Google
  Places, scraping ni descarga de fotos de terceros.
- No inventar datos de negocios reales (horarios, teléfonos, descripciones, fotos). Sin reseñas, ratings,
  publicidad, reservas ni rastreo.
- Datos en `data/`, validados con los esquemas de `src/data/schemas.ts`. Textos de UI en `src/i18n/es.ts`.
- Procesamiento GIS solo en `scripts/map` (Node), nunca en el navegador.
- Imports relativos con extensión `.ts`/`.tsx` (los scripts corren con Node sin transpilar).

## Cómo se escribe aquí

- Nada de guion largo (—) ni de comillas angulares (" "): delatan texto generado. Con coma, punto,
  paréntesis o comillas dobles rectas alcanza.
- Vale para todo: textos de interfaz, comentarios del código, documentación, datos y mensajes de
  commit.

## Antes de terminar un cambio

```bash
npm run check          # lint + tipos + tests + build
npm run test:e2e       # si tocaste UI o mapa
```

## Toolset

- delegation: on
- lean-code: on
- verify-loop: on
- rtk: on
- codegraph: off
- worktrees: off
- spec-kit / bmad / superpowers: off
- precommit-hooks: off
- lint-format: on (Biome)
- security-scan: on (Gitleaks en CI)
- ci-cd: on (GitHub Actions → GitHub Pages)
- a11y-perf: on (axe en E2E)
- dep-updates: on (Dependabot)
