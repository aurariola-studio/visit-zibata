# Datos de investigación

Registros que **no** se publican en la app, conservados con su evidencia para no repetir la investigación
(ver [research/methodology.md](../../research/methodology.md)). Se regeneran con
`node scripts/research/build-dataset.ts`.

| Archivo | Contenido |
| --- | --- |
| `closed.json` | Negocios cerrados (`closed`) o sustituidos por otro en el mismo local (`removed`) |
| `uncertain.json` | Sin evidencia suficiente para afirmar que operan dentro de Zibatá: candidatos a verificar en campo |
| `rejected.json` | Fuera de Zibatá, fuera del alcance (supermercados, servicios, marcas virtuales) o duplicados |
| `coming-soon.json` | Aperturas anunciadas sin confirmar |
| `beta/` | Copia íntegra de la lista beta original (JSON y CSV) usada como línea base |
