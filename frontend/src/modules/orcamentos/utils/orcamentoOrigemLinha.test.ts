import { describe, expect, it } from 'vitest'

import {
  exibirNcmLinhaOrcamento,
  rotuloOrigemLinhaOrcamento,
  tituloPainelRef,
} from './orcamentoOrigemLinha'

describe('orcamentoOrigemLinha', () => {
  it('traduz origens conhecidas', () => {
    expect(rotuloOrigemLinhaOrcamento('CONFIGURADOR')).toBe('Configurador')
    expect(rotuloOrigemLinhaOrcamento('CATALOGO')).toBe('Catálogo')
    expect(rotuloOrigemLinhaOrcamento('MANUAL')).toBe('Manual')
    expect(rotuloOrigemLinhaOrcamento('HERANCA_REVISAO')).toBe('Revisão')
    expect(rotuloOrigemLinhaOrcamento()).toBe('—')
  })

  it('formata referência curta do painel', () => {
    expect(tituloPainelRef('P1')).toBe('Painel 1')
    expect(tituloPainelRef('P2')).toBe('Painel 2')
    expect(tituloPainelRef('')).toBe('')
  })

  it('oculta NCM para serviços', () => {
    expect(exibirNcmLinhaOrcamento('SERVICO', '85381000')).toBe('—')
    expect(exibirNcmLinhaOrcamento('PRODUTO', '85381000')).toBe('85381000')
    expect(exibirNcmLinhaOrcamento('PRODUTO', '')).toBe('—')
  })
})
