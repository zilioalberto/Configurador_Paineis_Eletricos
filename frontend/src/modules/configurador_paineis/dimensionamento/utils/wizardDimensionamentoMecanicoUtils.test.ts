import { describe, expect, it } from 'vitest'

import type { DimensionamentoMecanicoDetalhe } from '../types/dimensionamento'
import { gerarLayoutPlaca } from './layoutPlaca'
import {
  alturaReferenciaCanaletas,
  formFromDataMecanico,
  normalizarLayoutPlacaApi,
  sincronizarDisposicaoComItens,
} from './wizardDimensionamentoMecanicoUtils'

function baseDetalhe(
  overrides: Partial<DimensionamentoMecanicoDetalhe> = {}
): DimensionamentoMecanicoDetalhe {
  return {
    taxa_ocupacao_max_configurada_percentual: '80',
    area_componentes_mm2: '10000',
    area_zona_util_min_mm2: '12000',
    largura_zona_util_mm: 280,
    altura_zona_util_mm: 400,
    altura_placa_min_mm: 400,
    largura_placa_min_mm: 300,
    profundidade_min_mm: 120,
    taxa_ocupacao_calculada_percentual: '45',
    canaletas_verticais_sugeridas: 2,
    faixas_horizontais_sugeridas: 2,
    canaletas_verticais: 2,
    faixas_horizontais: 2,
    folga_profundidade_mm: 30,
    margem_placa_mm: 20,
    canaletas_catalogo: [],
    itens_considerados: [],
    itens_sem_dimensao: [],
    paineis_sugeridos: [
      {
        produto_id: 'painel-1',
        produto_codigo: 'P1',
        produto_descricao: 'Painel 1',
        placa_largura_util_mm: '300',
        placa_altura_util_mm: '450',
        profundidade_mm: '150',
        tipo_painel: 'COMANDO',
        grau_protecao_ip: 'IP54',
      },
    ],
    memoria_calculo: '',
    ...overrides,
  }
}

describe('wizardDimensionamentoMecanicoUtils', () => {
  it('formFromDataMecanico prioriza escolhas salvas', () => {
    const form = formFromDataMecanico(
      baseDetalhe({
        painel_escolhido: {
          produto_id: 'painel-salvo',
          produto_codigo: 'PS',
          produto_descricao: 'Salvo',
          placa_largura_util_mm: '280',
          placa_altura_util_mm: '420',
          profundidade_mm: '140',
          tipo_painel: 'COMANDO',
          grau_protecao_ip: 'IP54',
        },
        canaleta_escolhida: {
          produto_id: 'can-1',
          produto_codigo: 'C1',
          produto_descricao: 'Canaleta',
          largura_base_mm: '30',
          altura_mm: '50',
        },
        canaletas_verticais: 3,
        faixas_horizontais: 4,
      })
    )

    expect(form).toEqual({
      painelProdutoId: 'painel-salvo',
      canaletaProdutoId: 'can-1',
      canaletasVerticais: 3,
      faixasHorizontais: 4,
      taxaOcupacaoMax: 80,
    })
  })

  it('alturaReferenciaCanaletas usa placa do painel selecionado', () => {
    const data = baseDetalhe()
    expect(alturaReferenciaCanaletas(data, 'painel-1')).toBe(450)
    expect(alturaReferenciaCanaletas(data, 'inexistente')).toBe(400)
  })

  it('normalizarLayoutPlacaApi gera trilhos quando ausentes na API', () => {
    const layout = gerarLayoutPlaca(355, 355, 2, 3, 30)
    const normalizado = normalizarLayoutPlacaApi({
      ...layout,
      trilhos_din: undefined,
    })

    expect(normalizado?.trilhos_din).toHaveLength(2)
    expect(normalizado?.canaletas_horizontais_intermediarias_y_mm).toEqual(
      layout.canaletas_horizontais_intermediarias_y_mm
    )
  })

  it('sincronizarDisposicaoComItens recalcula quando faltam instâncias', () => {
    const layout = gerarLayoutPlaca(355, 355, 2, 2, 30)
    const itens = [
      {
        composicao_item_id: 'cmp-1',
        produto_codigo: 'K1',
        produto_descricao: 'Contator',
        quantidade: '2',
        largura_mm: '45',
        altura_mm: '80',
        profundidade_mm: '70',
        modo_montagem: 'TRILHO_DIN',
        parte_painel: 'POTENCIA',
        categoria_produto: 'CONTATORA',
      },
    ]

    const disposicao = sincronizarDisposicaoComItens([], layout, itens)
    expect(disposicao).toHaveLength(2)
    expect(disposicao.every((d) => d.instancia_id.startsWith('cmp-1#'))).toBe(true)
  })
})
