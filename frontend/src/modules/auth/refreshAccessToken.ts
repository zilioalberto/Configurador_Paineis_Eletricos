import axios from 'axios'

import { getApiBaseUrl } from '@/services/apiBaseUrl'
import { tokenStorage } from '@/modules/auth/tokenStorage'

let inFlight: Promise<string> | null = null

/**
 * Renova o access token com o refresh atual.
 * Pedidos concorrentes partilham a mesma promessa.
 */
export function refreshAccessToken(): Promise<string> {
  if (!inFlight) {
    const refresh = tokenStorage.getRefresh()
    if (!refresh) {
      tokenStorage.clear()
      return Promise.reject(new Error('Sem refresh token.'))
    }

    const p = axios
      .post<{ access: string }>(
        `${getApiBaseUrl()}/auth/token/refresh/`,
        { refresh },
        {
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          timeout: 30_000,
        }
      )
      .then((res) => {
        tokenStorage.setAccess(res.data.access)
        return res.data.access
      })
      .catch((err) => {
        tokenStorage.clear()
        throw err
      })
      .finally(() => {
        inFlight = null
      })

    inFlight = p
  }

  return inFlight
}
