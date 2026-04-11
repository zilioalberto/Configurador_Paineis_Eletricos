import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import axios from 'axios'

import apiClient from '@/services/apiClient'
import { normalizeAxiosError } from '@/services/http/normalizeAxiosError'
import { obtainTokens } from '@/modules/auth/authCredentials'
import { refreshAccessToken } from '@/modules/auth/refreshAccessToken'
import { tokenStorage } from '@/modules/auth/tokenStorage'
import type { AuthUser } from '@/modules/auth/types'

type AuthStatus = 'loading' | 'ready'

type AuthContextValue = {
  user: AuthUser | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      setStatus('loading')
      const refresh = tokenStorage.getRefresh()
      const access = tokenStorage.getAccess()

      if (!refresh && !access) {
        if (!cancelled) {
          setUser(null)
          setStatus('ready')
        }
        return
      }

      try {
        if (!access && refresh) {
          await refreshAccessToken()
        }
        const { data } = await apiClient.get<AuthUser>('auth/me/')
        if (!cancelled) setUser(data)
      } catch (e) {
        // DRF pode devolver 403 em falhas de auth quando não há cabeçalho WWW-Authenticate.
        const st = axios.isAxiosError(e) ? e.response?.status : undefined
        if (st === 401 || st === 403) {
          tokenStorage.clear()
        }
        if (!cancelled) setUser(null)
      }
      if (!cancelled) setStatus('ready')
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const tokens = await obtainTokens(email, password)
      tokenStorage.setTokens(tokens.access, tokens.refresh)
      const { data } = await apiClient.get<AuthUser>('auth/me/')
      setUser(data)
    } catch (e) {
      tokenStorage.clear()
      setUser(null)
      throw normalizeAxiosError(e)
    }
  }, [])

  const logout = useCallback(() => {
    tokenStorage.clear()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, status, login, logout }),
    [user, status, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  }
  return ctx
}
