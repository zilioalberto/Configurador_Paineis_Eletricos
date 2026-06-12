import apiClient from '@/services/apiClient'

import type {
  RelatorioFaturamentoFiltros,
  RelatorioFaturamentoResponse,
} from '../types/relatorioFaturamento'
import type {
  FaturamentoSimplesResponse,
  PerfilTributarioSimplesDto,
  ProjecaoDasSimplesResponse,
} from '../types/simplesNacional'
import { periodoDaCompetencia } from '../utils/periodoCompetencia'

const PERFIL_URL = '/fiscal/simples/perfil/'
const RELATORIO_FATURAMENTO_URL = '/fiscal/relatorios/faturamento/'
const FATURAMENTO_URL = '/fiscal/simples/faturamento/'
const PROJECAO_URL = '/fiscal/simples/projecao-das/'
const AJUSTE_URL = '/fiscal/simples/faturamento-ajuste/'

export async function obterPerfilTributarioSimples(): Promise<PerfilTributarioSimplesDto> {
  const response = await apiClient.get<PerfilTributarioSimplesDto>(PERFIL_URL)
  return response.data
}

export async function atualizarPerfilTributarioSimples(
  payload: Partial<
    Pick<PerfilTributarioSimplesDto, 'folha_salarios_12m' | 'encargos_folha_12m' | 'anexo_servicos_override'>
  >,
): Promise<PerfilTributarioSimplesDto> {
  const response = await apiClient.patch<PerfilTributarioSimplesDto>(PERFIL_URL, payload)
  return response.data
}

export async function obterFaturamentoSimples(
  dataReferencia?: string,
): Promise<FaturamentoSimplesResponse> {
  const params = dataReferencia ? { data_referencia: dataReferencia } : undefined
  const response = await apiClient.get<FaturamentoSimplesResponse>(FATURAMENTO_URL, { params })
  return response.data
}

export async function obterProjecaoDasSimples(
  competencia?: string,
  dataReferencia?: string,
): Promise<ProjecaoDasSimplesResponse> {
  const params: Record<string, string> = {}
  if (competencia) params.competencia = competencia
  if (dataReferencia) params.data_referencia = dataReferencia
  const response = await apiClient.get<ProjecaoDasSimplesResponse>(PROJECAO_URL, { params })
  return response.data
}

export async function salvarAjusteFaturamentoMensal(payload: {
  competencia: string
  valor_ajuste: string
  observacao?: string
}): Promise<void> {
  await apiClient.put(AJUSTE_URL, payload)
}

function relatorioFaturamentoParams(filtros: RelatorioFaturamentoFiltros): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  const add = (key: string, raw: string | number | undefined) => {
    if (raw === undefined || raw === '') return
    params[key] = raw
  }
  const periodoCompetencia = filtros.competencia ? periodoDaCompetencia(filtros.competencia) : null
  add('data_inicio', filtros.data_inicio || periodoCompetencia?.data_inicio)
  add('data_fim', filtros.data_fim || periodoCompetencia?.data_fim)
  add('cliente', filtros.cliente)
  add('objetivo_saida', filtros.objetivo_saida)
  add('anexo_simples', filtros.anexo_simples)
  add('tipo_documento', filtros.tipo_documento)
  if (filtros.top_clientes != null) params.top_clientes = filtros.top_clientes
  return params
}

/** Relatório e dashboard de faturamento (NF-es emitidas importadas). */
export async function obterRelatorioFaturamento(
  filtros: RelatorioFaturamentoFiltros,
): Promise<RelatorioFaturamentoResponse> {
  const response = await apiClient.get<RelatorioFaturamentoResponse>(RELATORIO_FATURAMENTO_URL, {
    params: relatorioFaturamentoParams(filtros),
  })
  return response.data
}
