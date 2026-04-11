import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { obtainTokens } from '@/modules/auth/authCredentials'

describe('obtainTokens', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('POST auth/token e devolve par de tokens', async () => {
    const spy = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { access: 'a', refresh: 'r' },
    })
    const pair = await obtainTokens('u@x.com', 'secret')
    expect(pair).toEqual({ access: 'a', refresh: 'r' })
    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/token\/$/),
      { email: 'u@x.com', password: 'secret' },
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        timeout: 30_000,
      })
    )
  })
})
