import { describe, expect, it } from 'vitest'

import { projetoListaLinha } from './projetoListaTestFactories'

describe('projetoListaLinha', () => {
  it('preenche defaults elétricos repetidos da lista', () => {
    const linha = projetoListaLinha({
      id: 'x',
      codigo: '01',
      nome: 'N',
      cliente: 'C',
      responsavel_nome: 'R',
      status: 'EM_ANDAMENTO',
    })
    expect(linha.tensao_nominal).toBe(380)
    expect(linha.tipo_corrente_comando).toBe('CA')
    expect(linha.possui_neutro).toBe(true)
  })

  it('permite sobrescrever campos', () => {
    expect(
      projetoListaLinha({
        id: 'x',
        codigo: '01',
        nome: 'N',
        cliente: 'C',
        responsavel_nome: 'R',
        status: 'FINALIZADO',
        tensao_nominal: 220,
      }).tensao_nominal
    ).toBe(220)
  })
})
