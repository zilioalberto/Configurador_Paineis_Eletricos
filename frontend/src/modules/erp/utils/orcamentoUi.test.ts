import { describe, expect, it, vi } from 'vitest'

import type { OrcamentoDto } from '../types/erp'
import {
  clampMargemParaCima,
  configuradorFluxoOrcamentoPath,
  configuradorNovoPath,
  orcamentoDetalhePath,
  parseDecimalPt,
  proximaDescricaoPainel,
  rotuloRevisaoOrcamento,
  toDateInputValue,
  validadePadraoProposta,
} from './orcamentoUi'

vi.mock('@/modules/configurador_paineis/configuradorPaths', () => ({
  configuradorPaths: { novaConfiguracao: '/configurador/configuracoes/novo' },
}))

describe('orcamentoUi', () => {
  it('formata datas ISO e vazias', () => {
    expect(toDateInputValue(null)).toBe('')
    expect(toDateInputValue('2026-05-23')).toBe('2026-05-23')
    expect(toDateInputValue('2026-05-23T12:00:00Z')).toMatch(/^2026-05-23/)
    expect(toDateInputValue('invalid')).toBe('')
  })

  it('calcula validade padrão 15 dias à frente', () => {
    const hoje = new Date()
    const esperado = new Date(hoje)
    esperado.setDate(esperado.getDate() + 15)
    expect(validadePadraoProposta()).toBe(esperado.toISOString().slice(0, 10))
  })

  it('rotuloRevisaoOrcamento indica ausência de revisão', () => {
    expect(rotuloRevisaoOrcamento('')).toBe('—')
    expect(rotuloRevisaoOrcamento(null)).toBe('—')
    expect(rotuloRevisaoOrcamento('A')).toBe('A')
  })

  it('monta descrição do próximo painel', () => {
    const orcamento = {
      codigo_base: 'Prop-05012-26',
      titulo: 'Proposta',
      configuradores_painel: [{ id: '1' }, { id: '2' }],
    } as OrcamentoDto
    expect(proximaDescricaoPainel(orcamento)).toBe('Prop-05012-26 — Proposta — Painel 03')
  })

  it('parseDecimalPt aceita vírgula e espaços', () => {
    expect(parseDecimalPt(' 12,5 ')).toBe(12.5)
    expect(parseDecimalPt('abc')).toBeNaN()
  })

  it('clampMargemParaCima não permite reduzir abaixo do mínimo', () => {
    expect(clampMargemParaCima('5', '10')).toBe('10')
    expect(clampMargemParaCima('15', '10')).toBe('15')
    expect(clampMargemParaCima('x', '10')).toBe('10')
    expect(clampMargemParaCima('8', 'x')).toBe('8')
  })

  it('monta URL do configurador com query string', () => {
    expect(
      configuradorNovoPath({
        orcamentoId: 'orc-1',
        vinculoId: 'v-1',
        nome: 'Painel A',
        ordemPainel: 2,
        cliente: ' Cliente X ',
      })
    ).toBe(
      '/configurador/configuracoes/novo?orcamento=orc-1&vinculo=v-1&nome=Painel+A&ordem=2&cliente=Cliente+X'
    )
  })

  it('monta rotas canônicas de orçamento e retorno do configurador', () => {
    expect(orcamentoDetalhePath('orc-1')).toBe('/orcamentos/orc-1')
    expect(
      configuradorFluxoOrcamentoPath('/configurador/composicao?projeto=proj-1', {
        orcamentoId: 'orc-1',
        vinculoId: 'v-1',
      })
    ).toBe('/configurador/composicao?projeto=proj-1&orcamento=orc-1&vinculo=v-1')
    expect(
      configuradorFluxoOrcamentoPath(
        '/configurador/composicao?projeto=proj-1&orcamento=old#itens',
        {
          orcamentoId: 'orc-1',
          vinculoId: 'v-1',
        }
      )
    ).toBe('/configurador/composicao?projeto=proj-1&orcamento=orc-1&vinculo=v-1#itens')
  })
})
