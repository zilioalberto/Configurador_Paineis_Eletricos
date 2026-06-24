import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type AppPageToolbarBadge = {
  key: string
  text: string
  variant?: 'light' | 'primary'
}

export type AppPageToolbarPrimaryAction = {
  label: string
  /** Submete o formulário com este id (botão type="submit"). */
  formId?: string
  /** Ação direta no clique (ex.: abrir modal de criação). */
  onClick?: () => void
  loading?: boolean
  loadingLabel?: string
  disabled?: boolean
}

export type AppPageToolbarConfig = {
  title: string
  subtitle?: string
  badges?: AppPageToolbarBadge[]
  back?: { to: string; label: string }
  /** Indicador compacto do fluxo (ex.: etapas do wizard na barra azul). */
  fluxoSteps?: ReactNode
  primaryAction?: AppPageToolbarPrimaryAction
  actions?: ReactNode
  /** Chave estável para forçar atualização quando o conteúdo de `actions` muda de estado. */
  actionsKey?: string
}

type AppPageToolbarContextValue = {
  toolbar: AppPageToolbarConfig | null
  setToolbar: (config: AppPageToolbarConfig | null) => void
}

const AppPageToolbarContext = createContext<AppPageToolbarContextValue | null>(null)

export function AppPageToolbarProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [toolbar, setToolbar] = useState<AppPageToolbarConfig | null>(null)
  const value = useMemo(() => ({ toolbar, setToolbar }), [toolbar])
  return (
    <AppPageToolbarContext.Provider value={value}>{children}</AppPageToolbarContext.Provider>
  )
}

export function useAppPageToolbarContext() {
  const ctx = useContext(AppPageToolbarContext)
  if (!ctx) {
    throw new Error('useAppPageToolbarContext deve ser usado dentro de AppPageToolbarProvider')
  }
  return ctx
}

/** Define título, voltar e ações na barra azul do portal; limpa ao desmontar. */
export function useAppPageToolbar(config: AppPageToolbarConfig | null) {
  const ctx = useContext(AppPageToolbarContext)
  const setToolbar = ctx?.setToolbar

  const badgeKey = config?.badges?.map((b) => `${b.key}:${b.text}:${b.variant ?? ''}`).join('|') ?? ''

  useEffect(() => {
    if (!setToolbar) return undefined
    setToolbar(config)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `config` muda a cada render; incluí-lo causa loop infinito
  }, [
    setToolbar,
    config?.title,
    config?.subtitle,
    config?.back?.to,
    config?.back?.label,
    config?.fluxoSteps,
    config?.actionsKey,
    config?.primaryAction?.label,
    config?.primaryAction?.formId,
    config?.primaryAction?.onClick,
    config?.primaryAction?.loading,
    config?.primaryAction?.disabled,
    config?.primaryAction?.loadingLabel,
    badgeKey,
  ])

  useEffect(() => {
    if (!setToolbar) return undefined
    return () => setToolbar(null)
  }, [setToolbar])
}

export function useAppPageToolbarState() {
  return useContext(AppPageToolbarContext)?.toolbar ?? null
}
