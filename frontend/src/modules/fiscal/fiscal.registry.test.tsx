import { describe, expect, it } from 'vitest'

import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'

import { fiscalMenuItems, fiscalRoutes } from './fiscal.registry'

describe('fiscal.registry', () => {
  it('define menu e rotas com permissao de visualizar lista', () => {
    expect(fiscalMenuItems).toEqual([
      expect.objectContaining({
        to: '/fiscal',
        label: 'Fiscal',
        requiresPermission: PERMISSION_KEYS.FISCAL_VISUALIZAR,
      }),
    ])
    expect(fiscalRoutes.map((r) => r.path)).toEqual([
      '/fiscal',
      '/fiscal/itens-fiscais',
      '/fiscal/nfes',
      '/fiscal/sefaz-distribuicao',
      '/fiscal/nfse-recebidas',
      '/fiscal/nfse-recebidas/:id',
      '/fiscal/obrigacoes',
      '/fiscal/obrigacoes/:id',
      '/fiscal/relatorios/nfes',
      '/fiscal/relatorios/faturamento',
      '/fiscal/nfes/importar',
      '/fiscal/nfes/buscar-chave',
      '/fiscal/nfes-emitidas',
      '/fiscal/nfes-emitidas/importar',
      '/fiscal/nfes-emitidas/:id',
      '/fiscal/simples/projecao-das',
      '/fiscal/nfes/:id/importar-catalogo',
      '/fiscal/nfes/:id',
      '/fiscal/nsu',
    ])
    expect(fiscalRoutes.every((r) => r.element != null)).toBe(true)
  })
})
