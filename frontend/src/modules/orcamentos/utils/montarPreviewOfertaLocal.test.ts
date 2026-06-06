import { describe, expect, it } from 'vitest'

import { montarPreviewOfertaLocal } from './montarPreviewOfertaLocal'

describe('montarPreviewOfertaLocal', () => {
  it('monta seções e totais a partir do formulário', () => {
    const preview = montarPreviewOfertaLocal({
      codigo: 'Prop-001',
      revisao: 'B',
      titulo: 'Fornecimento PLC',
      perfil_oferta: 'MATERIAIS',
      validade: '2026-07-01',
      cliente: {
        nome: 'ACME',
        contato: 'João',
        email: 'joao@acme.com',
        telefone: '',
        endereco: 'Rua A, 10 — Joinville / SC',
        cnpj: '12.345.678/0001-99',
      },
      blocos: [
        {
          id: '1',
          ordem: 0,
          tipo: 'INTRODUCAO',
          titulo: 'Introdução',
          conteudo: 'Texto de abertura.',
          editavel: true,
        },
      ],
      linhasItens: [
        {
          ordem: 1,
          tipo: 'PRODUTO',
          descricao: 'CLP',
          quantidade: '2',
          preco_unitario: '100',
          custo_unitario: '80',
          margem_percentual: '10',
        },
      ],
    })

    expect(preview.codigo).toBe('Prop-001')
    expect(preview.titulo).toBe('Fornecimento PLC')
    expect(preview.secoes).toHaveLength(1)
    expect(preview.investimento.itens).toHaveLength(1)
    expect(preview.totais.total).toBe('200')
    expect(preview.cliente.endereco).toBe('Rua A, 10 — Joinville / SC')
    expect(preview.cliente.cnpj).toBe('12.345.678/0001-99')
  })

  it('aplica desconto no resumo quando flag ativa', () => {
    const preview = montarPreviewOfertaLocal({
      codigo: 'Prop-002',
      titulo: 'Teste',
      perfil_oferta: 'MATERIAIS',
      validade: null,
      desconto_comercial_ativo: true,
      desconto_percentual: '5',
      cliente: { nome: 'ACME', contato: '', email: '', telefone: '' },
      blocos: [],
      linhasItens: [
        {
          ordem: 0,
          tipo: 'PRODUTO',
          descricao: 'Item',
          quantidade: '1',
          custo_unitario: '1000',
          margem_percentual: '0',
          aliquota_ipi: '10',
          preco_unitario: '1100',
        },
      ],
    })

    expect(preview.totais.desconto_ativo).toBe(true)
    expect(preview.totais.desconto_valor).toBe('55')
    expect(preview.totais.impostos_valor).toBe('0')
    expect(preview.totais.total).toBe('1045')
  })
})
