import { describe, expect, it } from 'vitest'

import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasAnyPermission, hasPermission } from '@/modules/auth/permissions'
import type { AuthUser } from '@/modules/auth/types'

function user(partial: Partial<AuthUser> & Pick<AuthUser, 'email'>): AuthUser {
  return {
    email: partial.email,
    first_name: partial.first_name ?? '',
    last_name: partial.last_name ?? '',
    tipo_usuario: partial.tipo_usuario ?? 'USUARIO',
    is_staff: partial.is_staff,
    is_superuser: partial.is_superuser,
    permissoes: partial.permissoes ?? [],
  }
}

describe('permissions helpers', () => {
  it('retorna false sem utilizador', () => {
    expect(hasPermission(null, PERMISSION_KEYS.PROJETO_VISUALIZAR)).toBe(false)
  })

  it('retorna true quando permissao existe na lista do utilizador', () => {
    expect(
      hasPermission(
        user({
          email: 'tais@empresa.com',
          permissoes: [PERMISSION_KEYS.PROJETO_VISUALIZAR],
        }),
        PERMISSION_KEYS.PROJETO_VISUALIZAR
      )
    ).toBe(true)
  })

  it('retorna true para administrador mesmo sem lista explicita', () => {
    expect(hasPermission(user({ email: 'admin@empresa.com', tipo_usuario: 'ADMIN' }), 'x.y')).toBe(
      true
    )
  })

  it('valida qualquer permissao da lista', () => {
    expect(
      hasAnyPermission(
        user({
          email: 'm@empresa.com',
          permissoes: [PERMISSION_KEYS.ALMOXARIFADO_VISUALIZAR_TAREFAS],
        }),
        [PERMISSION_KEYS.PROJETO_VISUALIZAR, PERMISSION_KEYS.ALMOXARIFADO_VISUALIZAR_TAREFAS]
      )
    ).toBe(true)
  })
})
