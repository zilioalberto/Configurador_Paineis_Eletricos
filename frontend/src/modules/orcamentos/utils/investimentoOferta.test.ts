import { describe, expect, it } from 'vitest'

import { montarItensInvestimentoLocal } from './investimentoOferta'

describe('montarItensInvestimentoLocal', () => {
  it('usa descrição customizada na solução completa consolidada', () => {
    const { modo, itens } = montarItensInvestimentoLocal({
      perfil: 'SOLUCAO_COMPLETA',
      titulo: 'Painel 01',
      linhas: [
        {
          ordem: 0,
          tipo: 'PRODUTO',
          descricao: 'Item',
          quantidade: '1',
          preco_unitario: '1000',
          custo_unitario: '800',
          margem_percentual: '10',
        },
      ],
      investimentoDescricao: 'Painel elétrico — escopo completo',
    })

    expect(modo).toBe('CONSOLIDADO')
    expect(itens[0]?.descricao).toBe('Painel elétrico — escopo completo')
  })
})
