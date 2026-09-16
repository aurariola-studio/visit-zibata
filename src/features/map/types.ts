export type MapStatus =
  | { state: 'loading' }
  | { state: 'ready' }
  | { state: 'error'; reason: 'webgl' | 'generic' }
