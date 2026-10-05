import '@fontsource/instrument-sans/400.css'
import '@fontsource/instrument-sans/500.css'
import '@fontsource/instrument-sans/600.css'
import '@fontsource/fraunces/600.css'
// Solo para la firma de autoría: la guía de marca de aurariola.com pide esta monoespaciada para su
// wordmark, y es lo único del proyecto que la usa.
import '@fontsource/kode-mono/600.css'
import './styles/tokens.css'
import './styles/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App.tsx'
import { locale } from './i18n/index.ts'

const root = document.getElementById('root')
if (!root) throw new Error('No se encontró el elemento #root')

// El idioma del documento sigue al idioma activo: lo usan lectores de pantalla y el propio navegador.
document.documentElement.lang = locale

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
