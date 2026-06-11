import { describe, expect, it } from 'vitest'

import { PERMISSION_KEYS } from './permissionKeys'
import { groupPermissionOptions } from './permissionGroups'

describe('permissionGroups', () => {
  it('agrupa permissoes fiscais na secao Fiscal', () => {
    const sections = groupPermissionOptions([
      { value: PERMISSION_KEYS.FISCAL_VISUALIZAR, label: 'Ver módulo fiscal' },
      { value: PERMISSION_KEYS.FISCAL_EDITAR, label: 'Editar módulo fiscal' },
      { value: PERMISSION_KEYS.PROJETO_VISUALIZAR, label: 'Ver projetos' },
    ])

    const fiscal = sections.find((section) => section.id === 'fiscal')
    expect(fiscal?.permissions.map((p) => p.value)).toEqual([
      PERMISSION_KEYS.FISCAL_VISUALIZAR,
      PERMISSION_KEYS.FISCAL_EDITAR,
    ])
  })
})
