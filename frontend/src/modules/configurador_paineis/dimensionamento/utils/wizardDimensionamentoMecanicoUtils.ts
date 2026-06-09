/** Funções puras do painel de dimensionamento mecânico (testáveis sem React). */

import type {
  ComponenteDisposicaoItem,
  DimensionamentoMecanicoDetalhe,
  LayoutPlacaDetalhe,
} from '../types/dimensionamento'
import {
  expandirInstanciasComponentes,
  mesclarDisposicaoSalva,
  sugerirDisposicaoComponentes,
} from './disposicaoComponentes'
import {
  gerarTrilhosDinLayout,
  TRILHO_DIN_ALTURA_PERFIL_MM,
  type LayoutPlaca,
} from './layoutPlaca'

export type FormStateMecanico = {
  painelProdutoId: string
  canaletaProdutoId: string
  canaletasVerticais: number
  faixasHorizontais: number
  taxaOcupacaoMax: number
}

export function formFromDataMecanico(data: DimensionamentoMecanicoDetalhe): FormStateMecanico {
  const canaleta = data.canaleta_escolhida ?? data.canaleta
  return {
    painelProdutoId: data.painel_escolhido?.produto_id ?? data.paineis_sugeridos[0]?.produto_id ?? '',
    canaletaProdutoId: canaleta?.produto_id ?? '',
    canaletasVerticais: data.canaletas_verticais ?? data.canaletas_verticais_sugeridas ?? 2,
    faixasHorizontais: data.faixas_horizontais ?? data.faixas_horizontais_sugeridas ?? 2,
    taxaOcupacaoMax: Number(data.taxa_ocupacao_max_configurada_percentual) || 80,
  }
}

export function alturaReferenciaCanaletas(
  data: DimensionamentoMecanicoDetalhe,
  painelProdutoId: string
): number {
  const painel =
    data.paineis_sugeridos.find((p) => p.produto_id === painelProdutoId) ??
    data.painel_escolhido ??
    null
  if (painel) return Number(painel.placa_altura_util_mm)
  return data.altura_referencia_canaletas_mm ?? data.altura_placa_min_mm
}

export function sincronizarDisposicaoComItens(
  salva: ComponenteDisposicaoItem[] | undefined,
  layout: LayoutPlaca,
  itens: DimensionamentoMecanicoDetalhe['itens_considerados']
): ComponenteDisposicaoItem[] {
  const merged = mesclarDisposicaoSalva(salva, layout, itens)
  const esperado = expandirInstanciasComponentes(itens).length
  if (merged.length === esperado) return merged
  return sugerirDisposicaoComponentes(layout, itens)
}

export function normalizarLayoutPlacaApi(layout?: LayoutPlacaDetalhe | null): LayoutPlaca | null {
  if (!layout) return null
  const trilhoAltura = layout.trilho_din_altura_perfil_mm ?? TRILHO_DIN_ALTURA_PERFIL_MM
  const trilhos =
    layout.trilhos_din ??
    gerarTrilhosDinLayout(
      layout.canaletas_horizontais,
      layout.zona_componentes.x_mm,
      layout.comprimento_canaleta_horizontal_mm,
      trilhoAltura
    )
  return {
    ...layout,
    trilho_din_altura_perfil_mm: trilhoAltura,
    canaletas_horizontais_intermediarias_y_mm:
      layout.canaletas_horizontais_intermediarias_y_mm ?? [],
    trilhos_din: trilhos,
  }
}
