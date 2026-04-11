import { describe, it, expect } from 'vitest'

import { authDisplayName, type AuthUser } from '@/modules/auth/types'

describe('authDisplayName', () => {
  it('usa nome e sobrenome quando existem', () => {
    const u: AuthUser = {
      email: 'x@y.com',
      first_name: 'João',
      last_name: 'Silva',
      tipo_usuario: 'USUARIO',
    }
    expect(authDisplayName(u)).toBe('João Silva')
  })

  it('usa e-mail quando o nome está vazio', () => {
    const u: AuthUser = {
      email: 'only@email.com',
      first_name: '',
      last_name: '',
      tipo_usuario: 'USUARIO',
    }
    expect(authDisplayName(u)).toBe('only@email.com')
  })
})
