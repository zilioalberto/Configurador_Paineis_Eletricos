import { describe, expect, it } from 'vitest'

import { montarItensInvestimentoLocal } from './investimentoOferta'
import { normalizarNcmInvestimento, NCM_INVESTIMENTO_PAINEL_PADRAO } from './ncmInvestimento'

describe('ncmInvestimento', () => {
  it('usa padrão 85371090 quando vazio', () => {
    expect(normalizarNcmInvestimento('')).toBe(NCM_INVESTIMENTO_PAINEL_PADRAO)
  })
})

describe('montarItensInvestimentoLocal solução completa', () => {
  it('aplica NCM manual em linha consolidada', () => {
    const bloco = montarItensInvestimentoLocal({
      perfil: 'SOLUCAO_COMPLETA',
      titulo: 'Teste',
      linhas: [
        {
          ordem: 0,
          tipo: 'PRODUTO',
          descricao: 'Item',
          quantidade: '1',
          custo_unitario: '100',
          margem_percentual: '0',
          preco_unitario: '100',
          produtoNcm: '99999999',
        },
      ],
      ncmInvestimento: '85371090',
    })
    expect(bloco.itens[0]?.ncm).toBe('85371090')
  })
})
