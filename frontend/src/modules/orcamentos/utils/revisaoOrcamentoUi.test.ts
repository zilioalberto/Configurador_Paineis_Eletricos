import { describe, expect, it } from 'vitest'

import type { OrcamentoDto } from '../types/orcamentos'
import {
  ehUltimaRevisaoOrcamento,
  montarHistoricoRevisoes,
  podeCriarNovaRevisaoOrcamento,
} from './revisaoOrcamentoUi'

const base: OrcamentoDto = {
  id: 'atual',
  codigo: 'Prop-01 Rev C',
  codigo_base: 'Prop-01',
  revisao: 'C',
  tipo_revisao: 'COMERCIAL',
  orcamento_origem: null,
  titulo: 'Teste',
  descricao: '',
  cliente: null,
  cliente_nome: 'Cliente',
  contato_cliente: null,
  contato_cliente_nome: '',
  contato_cliente_email: '',
  contato_cliente_telefone: '',
  cliente_referencia: '',
  margem_produtos_percentual: '0',
  margem_servicos_percentual: '0',
  perfil_oferta: 'MATERIAIS',
  status: 'ENVIADO',
  valido_ate: null,
  criado_em: '2026-06-01T10:00:00Z',
  atualizado_em: '2026-06-01T10:00:00Z',
  itens: [],
  revisoes_derivadas: [
    {
      id: 'filha',
      codigo: 'Prop-01 Rev D',
      codigo_base: 'Prop-01',
      revisao: 'D',
      tipo_revisao: 'TECNICA',
      status: 'RASCUNHO',
      titulo: 'Teste D',
      criado_em: '2026-06-02T10:00:00Z',
      atualizado_em: '2026-06-02T10:00:00Z',
    },
  ],
}

describe('revisaoOrcamentoUi', () => {
  it('ehUltimaRevisaoOrcamento é falso quando há revisões derivadas', () => {
    expect(ehUltimaRevisaoOrcamento(base)).toBe(false)
  })

  it('montarHistoricoRevisoes ordena por data de criação', () => {
    const linhas = montarHistoricoRevisoes(base)
    expect(linhas.map((l) => l.revisao)).toEqual(['C', 'D'])
    expect(linhas.find((l) => l.atual)?.id).toBe('atual')
  })

  it('podeCriarNovaRevisaoOrcamento exige última revisão e status fechado', () => {
    expect(podeCriarNovaRevisaoOrcamento(base)).toBe(false)
    expect(
      podeCriarNovaRevisaoOrcamento({
        ...base,
        revisoes_derivadas: [],
        status: 'FINALIZADO',
      })
    ).toBe(true)
    expect(
      podeCriarNovaRevisaoOrcamento({
        ...base,
        revisoes_derivadas: [],
        status: 'ENVIADO',
      })
    ).toBe(true)
  })
})
