# Seguridad y privacidad

Todo lo que se publica es público: no hay servidor, sesión, base de datos ni secretos. La superficie de
ataque se reduce a lo que el navegador ejecuta y a los enlaces que ofrece la guía.

## Principios

- **Sin backend ni credenciales.** Ninguna API key, token ni servicio de pago, ni en el código ni en el
  build. `npm run build` no lee variables secretas.
- **Sin terceros en runtime.** No hay CDN, analítica, publicidad, mapas de terceros ni fuentes remotas:
  todas las peticiones van al propio origen. Un E2E comprueba que un recorrido completo no genera ni una
  petición externa.
- **Google Maps solo como enlace.** Nunca Google Places, ni scraping, ni descarga de fotos.
- **Sin datos personales.** No hay cuentas, formularios ni rastreo. Los favoritos viven en
  `localStorage` del dispositivo y nunca salen de él.

## Content Security Policy

Se inyecta en el build como `<meta http-equiv="Content-Security-Policy">` (GitHub Pages no permite
cabeceras propias), solo en producción: el servidor de desarrollo necesita estilos en línea para HMR.

```
default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:;
font-src 'self'; connect-src 'self'; worker-src 'self' blob:; child-src 'self' blob:;
manifest-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'self'
```

- `blob:` en imágenes y workers lo usa MapLibre internamente; `data:` lo usan iconos embebidos.
- `frame-ancestors` **no** puede declararse en `<meta>`: si el hosting admite cabeceras, añade
  `Frame-Ancestors: 'none'` o `X-Frame-Options: DENY` (ver [DESPLIEGUE.md](DESPLIEGUE.md)).
- Verificación: un E2E recorre inicio → plaza → ficha → búsqueda y exige **0 violaciones de CSP y 0
  peticiones externas** en los cuatro proyectos; un control negativo confirma que la política sí bloquea
  estilos en línea y `fetch` a dominios externos, tanto en Chromium como en WebKit.

## Enlaces y datos de entrada

- Los enlaces externos son `https`, se abren con `target="_blank"` y `rel="noopener noreferrer"`, y un E2E
  lo comprueba en la ficha.
- El esquema de datos rechaza `javascript:`, `data:` y rutas absolutas en enlaces y fotos. La misma regla
  se aplica al cargar los datos en el navegador (`src/data/rules.ts`), así que un archivo publicado sin
  pasar por el build tampoco puede colar un enlace peligroso: el registro se descarta con un aviso.
- El estado de la URL (`#/plaza/...`) se valida contra una expresión de slug antes de usarse; un enlace a
  un registro inexistente muestra un aviso y limpia la URL.
- React escapa el contenido; no se usa `dangerouslySetInnerHTML` en ninguna parte.

## Geolocalización

El botón "Mi ubicación" pide permiso **solo tras una acción explícita** del usuario. La posición se usa
para centrar el mapa en memoria: no se almacena, no se envía a ningún servidor y no queda en la URL. Si el
permiso se deniega, se muestra un aviso y la guía sigue igual de usable.

## Dependencias y supervisión

- `npm audit` sin vulnerabilidades (0 en dependencias de producción y de desarrollo).
- Dependabot semanal para npm y mensual para las acciones de GitHub (fijadas por SHA).
- Gitleaks en cada pull request; además se hizo una búsqueda local de secretos sobre todo el árbol de
  trabajo antes de la versión 1.0.0.

## Qué queda fuera

- Cabeceras que dependen del hosting (`frame-ancestors`, HSTS, `Referrer-Policy`): no se pueden fijar
  desde un sitio estático en GitHub Pages.
- No hay prueba de penetración externa ni análisis dinámico: la aplicación no tiene servidor propio que
  atacar, pero tampoco se ha auditado el hosting de terceros.
- La CSP no puede proteger de un compromiso del propio repositorio o del hosting: cualquiera con acceso de
  escritura publica lo que quiera.
