import { describe, expect, it } from 'vitest'

import type { OrcamentoOfertaBlocoDto } from '../types/orcamentos'
import { normalizarBlocosOfertaTemplate } from './ofertaBlocoUi'
import {
  aplicarSequenciaOrdemBlocos,
  reordenarTiposNoGrupo,
  sequenciaTiposEditorVisual,
} from './reordenarBlocosOferta'

describe('reordenarBlocosOferta', () => {
  it('reordenarTiposNoGrupo move item para posição do alvo', () => {
    expect(
      reordenarTiposNoGrupo(
        ['ESCOPO', 'ITENS_FORNECIMENTO', 'SERVICOS'],
        'SERVICOS',
        'ITENS_FORNECIMENTO'
      )
    ).toEqual(['ESCOPO', 'SERVICOS', 'ITENS_FORNECIMENTO'])
  })

  it('aplicarSequenciaOrdemBlocos persiste ordem na prévia', () => {
    const blocos = normalizarBlocosOfertaTemplate(
      [
        {
          id: '1',
          ordem: 0,
          tipo: 'ESCOPO',
          titulo: 'Escopo',
          conteudo: 'A',
        },
        {
          id: '2',
          ordem: 1,
          tipo: 'ITENS_FORNECIMENTO',
          titulo: 'Itens',
          conteudo: 'B',
        },
        {
          id: '3',
          ordem: 2,
          tipo: 'SERVICOS',
          titulo: 'Serviços',
          conteudo: 'C',
        },
      ] as OrcamentoOfertaBlocoDto[],
      'SOLUCAO_COMPLETA'
    )
    const seq = sequenciaTiposEditorVisual(
      'SOLUCAO_COMPLETA',
      ['ESCOPO', 'SERVICOS', 'ITENS_FORNECIMENTO'],
      ['EXCLUSOES'],
      ['PRAZO_ENTREGA', 'CONDICOES_PAGAMENTO', 'CONDICOES_GERAIS', 'GARANTIA', 'OBSERVACOES']
    )
    const atualizados = aplicarSequenciaOrdemBlocos(blocos, 'SOLUCAO_COMPLETA', seq)
    const corpo = atualizados
      .filter((b) => ['ESCOPO', 'ITENS_FORNECIMENTO', 'SERVICOS'].includes(b.tipo))
      .sort((a, b) => a.ordem - b.ordem)
      .map((b) => b.tipo)
    expect(corpo).toEqual(['ESCOPO', 'SERVICOS', 'ITENS_FORNECIMENTO'])
  })
})
