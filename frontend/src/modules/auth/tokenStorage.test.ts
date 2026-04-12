import { describe, it, expect, beforeEach } from 'vitest'

import { tokenStorage } from '@/modules/auth/tokenStorage'

describe('tokenStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    tokenStorage.clear()
  })

  it('persiste access e refresh com setTokens', () => {
    tokenStorage.setTokens('access-one', 'refresh-one')
    expect(tokenStorage.getAccess()).toBe('access-one')
    expect(tokenStorage.getRefresh()).toBe('refresh-one')
  })

  it('clear remove ambos', () => {
    tokenStorage.setTokens('a', 'r')
    tokenStorage.clear()
    expect(tokenStorage.getAccess()).toBeNull()
    expect(tokenStorage.getRefresh()).toBeNull()
  })

  it('setAccess atualiza só o access', () => {
    tokenStorage.setTokens('a', 'r')
    tokenStorage.setAccess('b')
    expect(tokenStorage.getAccess()).toBe('b')
    expect(tokenStorage.getRefresh()).toBe('r')
  })
})
