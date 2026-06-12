import { describe, expect, it } from 'vitest'

import {
  DEFAULT_NFES_EMITIDAS_ORDERING,
  proximaOrdenacaoEmitidas,
} from './nfesEmitidasOrdering'

describe('nfesEmitidasOrdering', () => {
  it('alterna asc, desc e volta ao padrao', () => {
    expect(proximaOrdenacaoEmitidas('data_emissao', DEFAULT_NFES_EMITIDAS_ORDERING)).toBe(
      'data_emissao',
    )
    expect(proximaOrdenacaoEmitidas('data_emissao', 'data_emissao')).toBe('-data_emissao')
    expect(proximaOrdenacaoEmitidas('data_emissao', '-data_emissao')).toBe('data_emissao')
    expect(proximaOrdenacaoEmitidas('serie', '-serie')).toBe(DEFAULT_NFES_EMITIDAS_ORDERING)
  })

  it('ordena por serie e destinatario', () => {
    expect(proximaOrdenacaoEmitidas('serie', DEFAULT_NFES_EMITIDAS_ORDERING)).toBe('serie')
    expect(proximaOrdenacaoEmitidas('nome_destinatario', 'serie')).toBe('nome_destinatario')
  })
})
