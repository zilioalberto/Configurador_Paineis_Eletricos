import { describe, expect, it } from 'vitest'

import { isAppAdmin } from '@/modules/auth/appAdmin'
import type { AuthUser } from '@/modules/auth/types'

function user(partial: Partial<AuthUser> & Pick<AuthUser, 'email'>): AuthUser {
  return {
    email: partial.email,
    first_name: partial.first_name ?? '',
    last_name: partial.last_name ?? '',
    tipo_usuario: partial.tipo_usuario ?? 'USUARIO',
    is_staff: partial.is_staff,
    is_superuser: partial.is_superuser,
  }
}

describe('isAppAdmin', () => {
  it('retorna false sem utilizador', () => {
    expect(isAppAdmin(null)).toBe(false)
  })

  it('ADMIN da aplicação é admin', () => {
    expect(isAppAdmin(user({ email: 'a@b.com', tipo_usuario: 'ADMIN' }))).toBe(true)
  })

  it('USUARIO comum não é admin', () => {
    expect(isAppAdmin(user({ email: 'a@b.com', tipo_usuario: 'USUARIO' }))).toBe(false)
  })

  it('superusuário Django é admin', () => {
    expect(
      isAppAdmin(user({ email: 'a@b.com', tipo_usuario: 'USUARIO', is_superuser: true }))
    ).toBe(true)
  })
})
