import axios from 'axios'

import { getApiBaseUrl } from '@/services/apiBaseUrl'
import type { TokenPair } from '@/modules/auth/types'

export async function obtainTokens(email: string, password: string): Promise<TokenPair> {
  const { data } = await axios.post<TokenPair>(
    `${getApiBaseUrl()}/auth/token/`,
    { email, password },
    {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      timeout: 30_000,
    }
  )
  return data
}
