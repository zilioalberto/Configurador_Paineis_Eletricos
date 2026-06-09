import { describe, expect, it } from 'vitest'
import { atualizarCanaletaIntermediariaY, gerarLayoutPlaca } from './layoutPlaca'
import {
  ajustarLayoutPlacaParaItens,
  ajustarPosicaoArraste,
  criarMapaEscopoPorComposicaoItem,
  disposicaoTemSobreposicao,
  expandirInstanciasComponentes,
  idsComponentesComConflitoDisposicao,
  mesclarDisposicaoSalva,
  montarTooltipComponenteDisposicao,
  rectSobrepoeCanaletas,
  rotuloComponenteCurto,
  segmentarTrilhosDinComDisposicao,
  sugerirDisposicaoComponentes,
  validarDisposicaoComponentes,
} from './disposicaoComponentes'
import type { DimensionamentoMecanicoItem } from '../types/dimensionamento'

const itensExemplo: DimensionamentoMecanicoItem[] = [
  {
    composicao_item_id: 'a1',
    produto_codigo: 'REL-1',
    produto_descricao: 'Relé 1',
    quantidade: '2',
    largura_mm: '22',
    altura_mm: '90',
    modo_montagem: 'TRILHO_DIN',
    parte_painel: 'COMANDO',
    categoria_produto: 'RELE_INTERFACE',
  },
  {
    composicao_item_id: 'b1',
    produto_codigo: 'DISJ-1',
    produto_descricao: 'Disjuntor',
    quantidade: '1',
    largura_mm: '18',
    altura_mm: '80',
    modo_montagem: 'TRILHO_DIN',
    parte_painel: 'COMANDO',
    categoria_produto: 'DISJUNTOR',
  },
]

describe('disposicaoComponentes', () => {
  const layout = gerarLayoutPlaca(355, 355, 2, 3, 30)

  it('expande quantidade em instâncias', () => {
    const inst = expandirInstanciasComponentes(itensExemplo)
    expect(inst).toHaveLength(3)
    expect(inst[0].instancia_id).toBe('a1#0')
    expect(inst[1].instancia_id).toBe('a1#1')
  })

  it('sugere dois trilhos com componentes centralizados sem sobrepor canaletas', () => {
    const disposicao = sugerirDisposicaoComponentes(layout, itensExemplo)
    expect(disposicao).toHaveLength(3)
    expect(disposicao.every((d) => d.trilho_indice !== null)).toBe(true)
    expect(disposicaoTemSobreposicao(disposicao, layout)).toBe(false)
    for (const item of disposicao) {
      expect(
        rectSobrepoeCanaletas(
          {
            x_mm: item.x_mm,
            y_mm: item.y_mm,
            largura_mm: item.largura_mm,
            altura_mm: item.altura_mm,
          },
          layout
        )
      ).toBe(false)
    }
  })

  it('ajusta arraste mantendo centralização no trilho', () => {
    const itemUnico = [itensExemplo[1]]
    const disposicao = sugerirDisposicaoComponentes(layout, itemUnico)
    const alvo = disposicao[0]
    const ajustado = ajustarPosicaoArraste(alvo, alvo.x_mm + 20, alvo.y_mm + 5, layout, [])
    expect(ajustado).not.toBeNull()
    expect(ajustado?.manual).toBe(true)
    expect(ajustado?.x_mm).toBeGreaterThanOrEqual(layout.zona_componentes.x_mm)
  })

  it('posiciona disjuntor caixa moldada de proteção geral no trilho superior à esquerda', () => {
    const layoutDoisTrilhos = gerarLayoutPlaca(355, 355, 2, 2, 30)
    const itens: DimensionamentoMecanicoItem[] = [
      {
        composicao_item_id: 'dg1',
        produto_codigo: 'DCM-GERAL',
        produto_descricao: 'Disjuntor geral',
        quantidade: '1',
        largura_mm: '105',
        altura_mm: '160',
        modo_montagem: 'TRILHO_DIN',
        parte_painel: 'PROTECAO_GERAL',
        categoria_produto: 'DISJUNTOR_CAIXA_MOLDADA',
      },
      {
        composicao_item_id: 'r1',
        produto_codigo: 'REL-1',
        produto_descricao: 'Relé',
        quantidade: '1',
        largura_mm: '22',
        altura_mm: '90',
        modo_montagem: 'TRILHO_DIN',
        parte_painel: 'COMANDO',
        categoria_produto: 'RELE_INTERFACE',
      },
    ]
    const disposicao = sugerirDisposicaoComponentes(layoutDoisTrilhos, itens)
    const trilhos = layoutDoisTrilhos.trilhos_din ?? []
    const idxSuperior = trilhos.reduce(
      (melhor, t, idx) =>
        t.y_mm + t.altura_mm / 2 < trilhos[melhor].y_mm + trilhos[melhor].altura_mm / 2
          ? idx
          : melhor,
      0
    )
    const dcm = disposicao.find((d) => d.produto_codigo === 'DCM-GERAL')
    expect(dcm).toBeDefined()
    expect(dcm?.trilho_indice).toBe(idxSuperior)
    expect(dcm?.x_mm).toBe(trilhos[idxSuperior].x_mm + 10)
    expect(validarDisposicaoComponentes(disposicao, layoutDoisTrilhos)).toEqual([])
  })

  it('posiciona bornes adjacentes no trilho inferior sem espaço entre eles', () => {
    const itens: DimensionamentoMecanicoItem[] = [
      {
        composicao_item_id: 'b1',
        produto_codigo: 'BORNE-1',
        produto_descricao: 'Borne 1',
        quantidade: '1',
        largura_mm: '8',
        altura_mm: '45',
        modo_montagem: 'TRILHO_DIN',
        parte_painel: 'COMANDO',
        categoria_produto: 'BORNE',
      },
      {
        composicao_item_id: 'b2',
        produto_codigo: 'BORNE-2',
        produto_descricao: 'Borne 2',
        quantidade: '1',
        largura_mm: '8',
        altura_mm: '45',
        modo_montagem: 'TRILHO_DIN',
        parte_painel: 'COMANDO',
        categoria_produto: 'BORNE',
      },
    ]
    const disposicao = sugerirDisposicaoComponentes(layout, itens)
    const trilhos = layout.trilhos_din ?? []
    const idxInferior = trilhos.reduce(
      (melhor, t, idx) =>
        t.y_mm + t.altura_mm / 2 > trilhos[melhor].y_mm + trilhos[melhor].altura_mm / 2
          ? idx
          : melhor,
      0
    )
    const bornes = disposicao.filter((d) => d.produto_codigo.startsWith('BORNE'))
    expect(bornes).toHaveLength(2)
    expect(bornes[0].trilho_indice).toBe(idxInferior)
    expect(bornes[0].x_mm).toBe(trilhos[idxInferior].x_mm + 10)
    expect(bornes[1].x_mm).toBe(bornes[0].x_mm + bornes[0].largura_mm)
  })

  it('agrupa disjuntores acima das contatoras quando ha linhas disponiveis', () => {
    const layoutQuatroFaixas = gerarLayoutPlaca(500, 500, 2, 4, 30)
    const itens: DimensionamentoMecanicoItem[] = [
      {
        composicao_item_id: 'dj1',
        produto_codigo: 'DJ-1',
        produto_descricao: 'Disjuntor 1',
        quantidade: '1',
        largura_mm: '60',
        altura_mm: '80',
        modo_montagem: 'TRILHO_DIN',
        parte_painel: 'PROTECAO_CARGA',
        categoria_produto: 'DISJUNTOR_MOTOR',
      },
      {
        composicao_item_id: 'dj2',
        produto_codigo: 'DJ-2',
        produto_descricao: 'Disjuntor 2',
        quantidade: '1',
        largura_mm: '60',
        altura_mm: '80',
        modo_montagem: 'TRILHO_DIN',
        parte_painel: 'PROTECAO_CARGA',
        categoria_produto: 'DISJUNTOR_MOTOR',
      },
      {
        composicao_item_id: 'ct1',
        produto_codigo: 'CT-1',
        produto_descricao: 'Contatora 1',
        quantidade: '1',
        largura_mm: '55',
        altura_mm: '75',
        modo_montagem: 'TRILHO_DIN',
        parte_painel: 'ACIONAMENTO_CARGA',
        categoria_produto: 'CONTATORA',
      },
      {
        composicao_item_id: 'ct2',
        produto_codigo: 'CT-2',
        produto_descricao: 'Contatora 2',
        quantidade: '1',
        largura_mm: '55',
        altura_mm: '75',
        modo_montagem: 'TRILHO_DIN',
        parte_painel: 'ACIONAMENTO_CARGA',
        categoria_produto: 'CONTATORA',
      },
    ]

    const disposicao = sugerirDisposicaoComponentes(layoutQuatroFaixas, itens)
    const disjuntores = disposicao.filter((item) => item.produto_codigo.startsWith('DJ-'))
    const contatoras = disposicao.filter((item) => item.produto_codigo.startsWith('CT-'))

    expect(disposicao).toHaveLength(4)
    expect(new Set(disjuntores.map((item) => item.trilho_indice)).size).toBe(1)
    expect(new Set(contatoras.map((item) => item.trilho_indice)).size).toBe(1)
    expect(disjuntores[0].y_mm).toBeLessThan(contatoras[0].y_mm)
    expect(validarDisposicaoComponentes(disposicao, layoutQuatroFaixas)).toEqual([])
  })

  it('nao sobrepoe disjuntor geral e bornes no mesmo trilho', () => {
    const layoutUnico = gerarLayoutPlaca(355, 355, 2, 2, 30)
    const itens: DimensionamentoMecanicoItem[] = [
      {
        composicao_item_id: 'md-geral',
        produto_codigo: 'MD-GERAL',
        produto_descricao: 'Minidisjuntor geral',
        quantidade: '1',
        largura_mm: '18',
        altura_mm: '90',
        modo_montagem: 'TRILHO_DIN',
        parte_painel: 'PROTECAO_GERAL',
        categoria_produto: 'MINIDISJUNTOR',
      },
      {
        composicao_item_id: 'b1',
        produto_codigo: 'BORNE-1',
        produto_descricao: 'Borne 1',
        quantidade: '1',
        largura_mm: '8',
        altura_mm: '45',
        modo_montagem: 'TRILHO_DIN',
        parte_painel: 'COMANDO',
        categoria_produto: 'BORNE',
      },
      {
        composicao_item_id: 'b2',
        produto_codigo: 'BORNE-2',
        produto_descricao: 'Borne 2',
        quantidade: '1',
        largura_mm: '8',
        altura_mm: '45',
        modo_montagem: 'TRILHO_DIN',
        parte_painel: 'COMANDO',
        categoria_produto: 'BORNE',
      },
    ]
    const disposicao = sugerirDisposicaoComponentes(layoutUnico, itens)
    expect(disposicao).toHaveLength(3)
    expect(validarDisposicaoComponentes(disposicao, layoutUnico)).toEqual([])
    expect(disposicaoTemSobreposicao(disposicao, layoutUnico)).toBe(false)
    const md = disposicao.find((d) => d.produto_codigo === 'MD-GERAL')
    expect(md).toBeDefined()
    for (const borne of disposicao.filter((d) => d.produto_codigo.startsWith('BORNE'))) {
      expect(borne.x_mm).toBeGreaterThanOrEqual((md?.x_mm ?? 0) + (md?.largura_mm ?? 0))
    }
  })

  it('validarDisposicaoComponentes detecta componente sobre canaleta', () => {
    const trilhos = layout.trilhos_din ?? []
    const trilhoMeio = trilhos[Math.min(1, trilhos.length - 1)]
    const itemSobreCanaleta = {
      instancia_id: 'x1',
      composicao_item_id: 'x1',
      produto_codigo: 'CONT-GRANDE',
      produto_descricao: 'Contator',
      modo_montagem: 'TRILHO_DIN',
      x_mm: trilhoMeio.x_mm + 10,
      y_mm: layout.canaletas_horizontais[1]?.y_mm ?? 0,
      largura_mm: 45,
      altura_mm: 120,
      trilho_indice: 1,
      manual: true,
    }
    expect(validarDisposicaoComponentes([itemSobreCanaleta], layout).some((m) =>
      m.includes('sobrepõe canaleta')
    )).toBe(true)
    expect(disposicaoTemSobreposicao([itemSobreCanaleta], layout)).toBe(true)
  })

  it('montarTooltipComponenteDisposicao inclui código e carga', () => {
    const tooltip = montarTooltipComponenteDisposicao(
      {
        produto_codigo: '3TS2910-1AB42',
        produto_descricao: 'Contator trifásico',
      },
      { carga_descricao: 'MOTOR 1CV' }
    )
    expect(tooltip).toBe('Contator trifásico (3TS2910-1AB42)\nMOTOR 1CV')
  })

  it('montarTooltipComponenteDisposicao usa parte do painel sem carga', () => {
    const tooltip = montarTooltipComponenteDisposicao(
      { produto_codigo: 'DCM-GERAL', produto_descricao: 'Disjuntor caixa moldada' },
      { parte_painel: 'PROTECAO_GERAL' }
    )
    expect(tooltip).toBe('Disjuntor caixa moldada (DCM-GERAL)\nProteção geral')
  })

  it('componente montado em placa centraliza na faixa e mantém trilho DIN recortável', () => {
    const layoutBase = gerarLayoutPlaca(355, 355, 2, 2, 30)
    expect(layoutBase.trilhos_din).toHaveLength(1)

    const itens: DimensionamentoMecanicoItem[] = [
      {
        composicao_item_id: 'placa-1',
        produto_codigo: 'DCM-PLACA',
        produto_descricao: 'Disjuntor em placa',
        quantidade: '1',
        largura_mm: '105',
        altura_mm: '160',
        modo_montagem: 'PLACA',
        parte_painel: 'PROTECAO_GERAL',
        categoria_produto: 'DISJUNTOR_CAIXA_MOLDADA',
      },
    ]

    const layoutAjustado = ajustarLayoutPlacaParaItens(layoutBase, itens)
    expect(layoutAjustado.trilhos_din).toHaveLength(1)

    const disposicao = sugerirDisposicaoComponentes(layoutBase, itens)
    expect(disposicao).toHaveLength(1)
    expect(disposicao[0].trilho_indice).toBeNull()

    const zona = layoutBase.zona_componentes
    expect(disposicao[0].x_mm).toBe(Math.round(zona.x_mm + (zona.largura_mm - 105) / 2))

    const sup = layoutBase.canaletas_horizontais.find((c) => c.fixa_extremidade === 'superior')
    const inf = layoutBase.canaletas_horizontais.find((c) => c.fixa_extremidade === 'inferior')
    expect(sup).toBeDefined()
    expect(inf).toBeDefined()
    const yInicio = (sup?.y_mm ?? 0) + (sup?.altura_mm ?? 0)
    const yFim = inf?.y_mm ?? 0
    const expectedY = Math.round(yInicio + (yFim - yInicio - 160) / 2)
    expect(disposicao[0].y_mm).toBe(expectedY)
    expect(disposicaoTemSobreposicao(disposicao, layoutAjustado)).toBe(false)
  })

  it('mantém 3VJ e ambas contatoras 3TS ao mover canaleta intermediária para cima', () => {
    const itensPainel: DimensionamentoMecanicoItem[] = [
      {
        composicao_item_id: 'a',
        produto_codigo: '5SL13107MB',
        produto_descricao: 'Minidisjuntor',
        quantidade: '1',
        largura_mm: '45',
        altura_mm: '55',
        modo_montagem: 'TRILHO_DIN',
        parte_painel: 'COMANDO',
        categoria_produto: 'MINIDISJUNTOR',
      },
      {
        composicao_item_id: 'b1',
        produto_codigo: 'DISJUNTORMOTOR1_6',
        produto_descricao: 'Disjuntor motor 1',
        quantidade: '1',
        largura_mm: '60',
        altura_mm: '80',
        modo_montagem: 'TRILHO_DIN',
        parte_painel: 'COMANDO',
        categoria_produto: 'DISJUNTOR',
      },
      {
        composicao_item_id: 'b2',
        produto_codigo: 'DISJUNTORMOTOR1_6',
        produto_descricao: 'Disjuntor motor 2',
        quantidade: '1',
        largura_mm: '60',
        altura_mm: '80',
        modo_montagem: 'TRILHO_DIN',
        parte_painel: 'COMANDO',
        categoria_produto: 'DISJUNTOR',
      },
      {
        composicao_item_id: 'c1',
        produto_codigo: '3TS29100BB4',
        produto_descricao: 'Contator 1',
        quantidade: '1',
        largura_mm: '55',
        altura_mm: '75',
        modo_montagem: 'TRILHO_DIN',
        parte_painel: 'COMANDO',
        categoria_produto: 'CONTATOR',
      },
      {
        composicao_item_id: 'c2',
        produto_codigo: '3TS29100BB4',
        produto_descricao: 'Contator 2',
        quantidade: '1',
        largura_mm: '55',
        altura_mm: '75',
        modo_montagem: 'TRILHO_DIN',
        parte_painel: 'COMANDO',
        categoria_produto: 'CONTATOR',
      },
      {
        composicao_item_id: 't1',
        produto_codigo: '1521680000',
        produto_descricao: 'Borne 1',
        quantidade: '1',
        largura_mm: '6',
        altura_mm: '45',
        modo_montagem: 'TRILHO_DIN',
        parte_painel: 'COMANDO',
        categoria_produto: 'BORNE',
      },
      {
        composicao_item_id: 't2',
        produto_codigo: '1521680000',
        produto_descricao: 'Borne 2',
        quantidade: '1',
        largura_mm: '6',
        altura_mm: '45',
        modo_montagem: 'TRILHO_DIN',
        parte_painel: 'COMANDO',
        categoria_produto: 'BORNE',
      },
      {
        composicao_item_id: 't3',
        produto_codigo: '1521850000',
        produto_descricao: 'Borne 3',
        quantidade: '3',
        largura_mm: '6',
        altura_mm: '45',
        modo_montagem: 'TRILHO_DIN',
        parte_painel: 'COMANDO',
        categoria_produto: 'BORNE',
      },
      {
        composicao_item_id: 't4',
        produto_codigo: '1521850000',
        produto_descricao: 'Borne 4',
        quantidade: '3',
        largura_mm: '6',
        altura_mm: '45',
        modo_montagem: 'TRILHO_DIN',
        parte_painel: 'COMANDO',
        categoria_produto: 'BORNE',
      },
      {
        composicao_item_id: 'vj',
        produto_codigo: '3VJ',
        produto_descricao: 'Disjuntor caixa moldada',
        quantidade: '1',
        largura_mm: '100',
        altura_mm: '100',
        modo_montagem: 'PLACA',
        parte_painel: 'COMANDO',
        categoria_produto: 'DISJUNTOR_CAIXA_MOLDADA',
      },
    ]

    const esperado = expandirInstanciasComponentes(itensPainel).length
    const layoutBase = gerarLayoutPlaca(355, 355, 2, 3, 30, undefined, 50)
    const canaletaInter = layoutBase.canaletas_horizontais.find((c) => c.arrastavel)
    expect(canaletaInter).toBeDefined()

    const assertPainelCompleto = (layout: ReturnType<typeof gerarLayoutPlaca>) => {
      const disposicao = sugerirDisposicaoComponentes(layout, itensPainel)
      expect(disposicao).toHaveLength(esperado)
      expect(disposicao.filter((d) => d.produto_codigo.startsWith('3TS'))).toHaveLength(2)
      expect(disposicao.find((d) => d.produto_codigo === '3VJ')).toBeDefined()
      expect(disposicaoTemSobreposicao(disposicao, layout)).toBe(false)
    }

    assertPainelCompleto(layoutBase)

    const layoutSubido = atualizarCanaletaIntermediariaY(
      layoutBase,
      canaletaInter!.indice_faixa!,
      120
    )
    expect(layoutSubido.canaletas_horizontais_intermediarias_y_mm[0]).toBeLessThan(
      layoutBase.canaletas_horizontais_intermediarias_y_mm[0]
    )
    assertPainelCompleto(layoutSubido)
  })

  it('mesclarDisposicaoSalva retorna sugestão quando não há disposição salva', () => {
    const sugerida = sugerirDisposicaoComponentes(layout, itensExemplo)
    expect(mesclarDisposicaoSalva(undefined, layout, itensExemplo)).toEqual(sugerida)
  })

  it('mesclarDisposicaoSalva completa instâncias faltantes a partir de disposição parcial', () => {
    const disposicao = sugerirDisposicaoComponentes(layout, itensExemplo)
    const mesclada = mesclarDisposicaoSalva([disposicao[0]], layout, itensExemplo)
    expect(mesclada).toHaveLength(3)
    expect(mesclada.map((d) => d.instancia_id).sort((a, b) => a.localeCompare(b))).toEqual(
      disposicao.map((d) => d.instancia_id).sort((a, b) => a.localeCompare(b))
    )
  })

  it('idsComponentesComConflitoDisposicao marca sobreposição entre componentes', () => {
    const disposicao = sugerirDisposicaoComponentes(layout, itensExemplo)
    const conflituosa = [
      disposicao[0],
      { ...disposicao[1], x_mm: disposicao[0].x_mm, y_mm: disposicao[0].y_mm },
    ]
    const ids = idsComponentesComConflitoDisposicao(conflituosa, layout)
    expect(ids.size).toBeGreaterThan(0)
    expect(validarDisposicaoComponentes(conflituosa, layout).length).toBeGreaterThan(0)
  })

  it('rotuloComponenteCurto trunca códigos longos', () => {
    expect(rotuloComponenteCurto('ABCDEFGHIJ', 5)).toBe('ABCD…')
    expect(rotuloComponenteCurto('ABC')).toBe('ABC')
  })

  it('criarMapaEscopoPorComposicaoItem indexa escopo por composicao_item_id', () => {
    const mapa = criarMapaEscopoPorComposicaoItem(itensExemplo)
    expect(mapa.get('a1')?.categoria_produto).toBe('RELE_INTERFACE')
    expect(mapa.get('b1')?.parte_painel).toBe('COMANDO')
  })

  it('segmenta trilho DIN com folga de 10 mm sob componente em placa', () => {
    const layoutBase = gerarLayoutPlaca(355, 355, 2, 2, 30)
    const trilho = layoutBase.trilhos_din[0]
    const disposicao = [
      {
        instancia_id: 'dcm#0',
        composicao_item_id: 'dcm',
        produto_codigo: '3VJ',
        produto_descricao: 'DCM placa',
        modo_montagem: 'PLACA',
        x_mm: 200,
        y_mm: 80,
        largura_mm: 105,
        altura_mm: 160,
        trilho_indice: null,
        manual: false,
      },
    ]
    const segmentos = segmentarTrilhosDinComDisposicao(layoutBase.trilhos_din, disposicao)
    expect(segmentos).toHaveLength(2)
    expect(segmentos[0].x_mm).toBe(trilho.x_mm)
    expect(segmentos[0].x_mm + segmentos[0].largura_mm).toBe(190)
    expect(segmentos[1].x_mm).toBe(315)
    expect(segmentos[1].x_mm + segmentos[1].largura_mm).toBe(trilho.x_mm + trilho.largura_mm)
  })
})
