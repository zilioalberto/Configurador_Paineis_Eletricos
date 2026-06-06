import { describe, expect, it } from 'vitest'

import { buildClienteSelectOptions, resolverClienteInicial } from './projetoClienteSelect'

const clientes = [
  {
    id: 'c1',
    razao_social: 'ACME Energia LTDA',
    documento: '11222333000144',
  },
] as const

describe('projetoClienteSelect', () => {
  it('resolve cliente da URL pelo cadastro', () => {
    expect(
      resolverClienteInicial('acme energia ltda', [
        { ...clientes[0], tipo_pessoa: 'PJ' } as never,
      ])
    ).toBe('ACME Energia LTDA')
  })

  it('mantém texto livre quando não há match no cadastro', () => {
    expect(resolverClienteInicial('Cliente antigo', [])).toBe('Cliente antigo')
  })

  it('inclui opção legada fora do cadastro', () => {
    const opcoes = buildClienteSelectOptions(
      [{ ...clientes[0], tipo_pessoa: 'PJ' } as never],
      'LEGADO XYZ'
    )
    expect(opcoes[0].label).toContain('fora do cadastro')
    expect(opcoes.some((o) => o.value === 'ACME Energia LTDA')).toBe(true)
  })
})
