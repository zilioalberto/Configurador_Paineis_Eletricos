import { describe, expect, it } from 'vitest'

import { calcularResumoFinanceiroOferta } from './totaisOferta'

describe('calcularResumoFinanceiroOferta', () => {
  it('sem desconto mantém total igual ao subtotal das linhas', () => {
    const totais = calcularResumoFinanceiroOferta({
      linhas: [
        {
          ordem: 0,
          tipo: 'SERVICO',
          descricao: 'Montagem',
          quantidade: '1',
          custo_unitario: '500',
          margem_percentual: '20',
          preco_unitario: '600',
        },
      ],
      descontoComercialAtivo: false,
      descontoPercentual: '0',
    })

    expect(totais.desconto_ativo).toBe(false)
    expect(totais.total).toBe('600')
  })
})
