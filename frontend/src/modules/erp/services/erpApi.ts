import apiClient from '@/services/apiClient'
import {
  listarContatosParceiro,
  listarParceiros as listarParceirosCadastro,
} from '@/modules/cadastros/services/cadastrosApi'
import type {
  ConfiguracaoMargemClienteDto,
  ContatoClienteDto,
  ErpModuleMetaDto,
  OrcamentoConfiguradorPainelDto,
  OrcamentoDto,
  ParametroConfiguracaoDto,
  ParceiroClienteDto,
} from '../types/erp'

export async function obterErpModuleMeta(moduleSlug: string): Promise<ErpModuleMetaDto> {
  const { data } = await apiClient.get<ErpModuleMetaDto>(`/erp/modules/${moduleSlug}/meta/`)
  return data
}

export async function listarOrcamentos(): Promise<OrcamentoDto[]> {
  const { data } = await apiClient.get<OrcamentoDto[]>('/erp/orcamentos/')
  return data
}

export type CriarOrcamentoPayload = {
  titulo: string
  descricao?: string
  cliente: string
  contato_cliente?: string | null
  valido_ate?: string | null
  itens?: Array<{
    tipo?: 'PRODUTO' | 'SERVICO'
    descricao: string
    quantidade?: string | number
    custo_unitario?: string | number
    margem_percentual?: string | number
    preco_unitario?: string | number
    ordem?: number
  }>
}

export async function criarOrcamento(payload: CriarOrcamentoPayload): Promise<OrcamentoDto> {
  const { data } = await apiClient.post<OrcamentoDto>('/erp/orcamentos/', payload)
  return data
}

export async function obterOrcamento(id: string): Promise<OrcamentoDto> {
  const { data } = await apiClient.get<OrcamentoDto>(`/erp/orcamentos/${id}/`)
  return data
}

export type OrcamentoItemLinhaPayload = {
  /** Omitir para linha nova; enviar o id da linha existente para atualizar. */
  id?: string
  ordem: number
  tipo?: 'PRODUTO' | 'SERVICO'
  origem?: 'MANUAL' | 'CONFIGURADOR' | 'CATALOGO'
  produto?: string | null
  descricao: string
  quantidade?: string | number
  custo_unitario?: string | number
  margem_percentual?: string | number
  preco_unitario?: string | number
}

export type AtualizarOrcamentoPayload = Partial<{
  titulo: string
  descricao: string
  cliente: string | null
  contato_cliente: string | null
  status: string
  valido_ate: string | null
  margem_produtos_percentual: string | number
  margem_servicos_percentual: string | number
  /** Substitui todas as linhas do orçamento quando enviado (sync no servidor). */
  itens: OrcamentoItemLinhaPayload[]
}>

export async function atualizarOrcamento(
  id: string,
  payload: AtualizarOrcamentoPayload
): Promise<OrcamentoDto> {
  const { data } = await apiClient.patch<OrcamentoDto>(`/erp/orcamentos/${id}/`, payload)
  return data
}

function normalizeList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (
    data &&
    typeof data === 'object' &&
    'results' in data &&
    Array.isArray((data as { results: T[] }).results)
  ) {
    return (data as { results: T[] }).results
  }
  return []
}

export async function listarClientesOrcamento(): Promise<ParceiroClienteDto[]> {
  return listarParceirosCadastro({ tipo: 'cliente', ativo: '1' })
}

export async function listarContatosCliente(clienteId: string): Promise<ContatoClienteDto[]> {
  return listarContatosParceiro(clienteId)
}

export async function listarMargensClientes(): Promise<ConfiguracaoMargemClienteDto[]> {
  const { data } = await apiClient.get<unknown>('/erp/orcamentos/margens-clientes/')
  return normalizeList<ConfiguracaoMargemClienteDto>(data)
}

export type CriarMargemClientePayload = {
  cliente: string
  margem_produtos_percentual?: string | number
  margem_servicos_percentual?: string | number
}

export async function criarMargemCliente(
  payload: CriarMargemClientePayload
): Promise<ConfiguracaoMargemClienteDto> {
  const { data } = await apiClient.post<ConfiguracaoMargemClienteDto>(
    '/erp/orcamentos/margens-clientes/',
    payload
  )
  return data
}

export type AtualizarMargemClientePayload = Partial<{
  margem_produtos_percentual: string | number
  margem_servicos_percentual: string | number
}>

export async function atualizarMargemCliente(
  id: string,
  payload: AtualizarMargemClientePayload
): Promise<ConfiguracaoMargemClienteDto> {
  const { data } = await apiClient.patch<ConfiguracaoMargemClienteDto>(
    `/erp/orcamentos/margens-clientes/${id}/`,
    payload
  )
  return data
}

export async function listarParametrosConfiguracao(): Promise<ParametroConfiguracaoDto[]> {
  const { data } = await apiClient.get<ParametroConfiguracaoDto[]>('/erp/configuracoes/parametros/')
  return data
}

export type AtualizarParametroPayload = Partial<{
  valor: string
  descricao: string
}>

export type NovaRevisaoOrcamentoPayload = {
  tipo_revisao: 'COMERCIAL' | 'TECNICA'
  paineis_reconfigurar?: string[]
  titulo?: string
  descricao?: string
}

export async function criarNovaRevisaoOrcamento(
  orcamentoId: string,
  payload: NovaRevisaoOrcamentoPayload
): Promise<OrcamentoDto> {
  const { data } = await apiClient.post<OrcamentoDto>(
    `/erp/orcamentos/${orcamentoId}/nova-revisao/`,
    payload
  )
  return data
}

export async function adicionarPainelConfigurador(
  orcamentoId: string,
  descricao_painel: string
): Promise<OrcamentoConfiguradorPainelDto> {
  const { data } = await apiClient.post(
    `/erp/orcamentos/${orcamentoId}/configuradores-painel/`,
    { descricao_painel }
  )
  return data
}

export async function iniciarConfiguradorPainel(
  orcamentoId: string,
  vinculoId: string
): Promise<OrcamentoConfiguradorPainelDto> {
  const { data } = await apiClient.post(
    `/erp/orcamentos/${orcamentoId}/configuradores-painel/${vinculoId}/iniciar-configurador/`
  )
  return data
}

export async function vincularProjetoConfiguradorPainel(
  orcamentoId: string,
  vinculoId: string,
  projetoConfiguradorId: string
): Promise<OrcamentoConfiguradorPainelDto> {
  const { data } = await apiClient.post(
    `/erp/orcamentos/${orcamentoId}/configuradores-painel/${vinculoId}/vincular-projeto/`,
    { projeto_configurador_id: projetoConfiguradorId }
  )
  return data
}

export async function sincronizarComposicaoPainel(
  orcamentoId: string,
  vinculoId: string
): Promise<{ itens_sincronizados: number; orcamento: OrcamentoDto }> {
  const { data } = await apiClient.post(
    `/erp/orcamentos/${orcamentoId}/configuradores-painel/${vinculoId}/sincronizar-composicao/`
  )
  return data
}

export async function atualizarParametroConfiguracao(
  chave: string,
  payload: AtualizarParametroPayload
): Promise<ParametroConfiguracaoDto> {
  const { data } = await apiClient.patch<ParametroConfiguracaoDto>(
    `/erp/configuracoes/parametros/${encodeURIComponent(chave)}/`,
    payload
  )
  return data
}
