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

  it('nfesEmitidas inclui filtros, paginação e ordenação', () => {
    const filtros = { numero: '10', competencia: '2026-06' }
    expect(fiscalQueryKeys.nfesEmitidas(filtros, 2, 25, '-valor_total')).toEqual([
      'fiscal',
      'nfes-emitidas',
      filtros,
      2,
      25,
      '-valor_total',
    ])
  })

  it('controleNsu normaliza CNPJ', () => {
    expect(fiscalQueryKeys.controleNsu('07.284.171/0001-39')).toEqual([
      'fiscal',
      'controle-nsu',
      '07284171000139',
    ])
  })

  it('simplesProjecao e relatorioFaturamento usam segmentos estáveis', () => {
    const filtros = { data_inicio: '2025-01-01', data_fim: '2025-12-31', top_clientes: 10 }
    expect(fiscalQueryKeys.simplesProjecao('2026-06')).toEqual([
      'fiscal',
      'simples',
      'projecao-das',
      '2026-06',
    ])
    expect(fiscalQueryKeys.relatorioFaturamento(filtros)).toEqual([
      'fiscal',
      'relatorio-faturamento',
      filtros,
    ])
  })

  it('nfeEmitida e nfeRecebida usam identificadores', () => {
    expect(fiscalQueryKeys.nfeEmitida('pub-1')).toEqual(['fiscal', 'nfe-emitida', 'pub-1'])
    expect(fiscalQueryKeys.nfeRecebida(42)).toEqual(['fiscal', 'nfe-recebida', 42])
  })
})
