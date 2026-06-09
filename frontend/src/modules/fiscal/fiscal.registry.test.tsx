import { describe, expect, it } from 'vitest'

import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'

import { fiscalMenuItems, fiscalRoutes } from './fiscal.registry'

describe('fiscal.registry', () => {
  it('define menu e rotas com permissao de visualizar lista', () => {
    expect(fiscalMenuItems).toEqual([
      expect.objectContaining({
        to: '/fiscal',
        label: 'Fiscal',
        requiresPermission: PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA,
      }),
    ])
    expect(fiscalRoutes.map((r) => r.path)).toEqual([
      '/fiscal',
      '/fiscal/itens-fiscais',
      '/fiscal/nfes',
      '/fiscal/relatorios/nfes',
      '/fiscal/nfes/importar',
      '/fiscal/nfes-emitidas/importar',
      '/fiscal/nfes/:id',
      '/fiscal/nsu',
    ])
    expect(fiscalRoutes.every((r) => r.element != null)).toBe(true)
  })
})
