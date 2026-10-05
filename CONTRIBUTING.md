# Contribuir

La guía completa está en [docs/CONTRIBUIR.md](docs/CONTRIBUIR.md): flujo de trabajo, convenciones de
código y de escritura, y cómo correr las pruebas.

Lo mínimo:

```bash
npm ci
npm run dev
npm run check      # lint + tipos + tests + build, antes de abrir un pull request
npm run test:e2e   # si tocaste interfaz o mapa
```

Para corregir un dato de un negocio (un horario, un teléfono, que ya cerró) no hace falta abrir un
pull request: está el formulario "Sugiere un cambio" dentro de la propia guía.
