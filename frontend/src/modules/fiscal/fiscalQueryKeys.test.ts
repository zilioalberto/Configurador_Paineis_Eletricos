import { describe, expect, it } from 'vitest'

import { fiscalQueryKeys } from './fiscalQueryKeys'

describe('fiscalQueryKeys', () => {
  it('itensFiscais inclui segmento com search trimada e paginacao', () => {
    expect(fiscalQueryKeys.itensFiscais('  x  ', 2, 25)).toEqual([
      'fiscal',
      'itens-fiscais',
      'x',
      2,
      25,
    ])
  })

  it('produtoBuscaFiscal anexa consulta trimada a chave base', () => {
    expect(fiscalQueryKeys.produtoBuscaFiscal('  abc ')).toEqual([
      'fiscal',
      'produto-busca-fiscal',
      'abc',
    ])
  })
})
