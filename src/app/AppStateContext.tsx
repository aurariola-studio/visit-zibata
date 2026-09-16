import { createContext, type Dispatch, type ReactNode, useContext, useReducer } from 'react'
import { type AppAction, type AppState, appReducer, initialAppState } from './state.ts'

const StateContext = createContext<AppState | null>(null)
const DispatchContext = createContext<Dispatch<AppAction> | null>(null)

export function AppStateProvider({
  children,
  initialState = initialAppState,
}: {
  children: ReactNode
  initialState?: AppState
}) {
  const [state, dispatch] = useReducer(appReducer, initialState)
  return (
    <DispatchContext value={dispatch}>
      <StateContext value={state}>{children}</StateContext>
    </DispatchContext>
  )
}

export function useAppState(): AppState {
  const state = useContext(StateContext)
  if (!state) throw new Error('useAppState debe usarse dentro de <AppStateProvider>')
  return state
}

export function useAppDispatch(): Dispatch<AppAction> {
  const dispatch = useContext(DispatchContext)
  if (!dispatch) throw new Error('useAppDispatch debe usarse dentro de <AppStateProvider>')
  return dispatch
}
