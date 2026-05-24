/**
 * Cliente HTTP do shell ERP: orçamentos, margens, parâmetros e meta de módulos.
 */
import apiClient from '@/services/apiClient'
import {
  listarContatosParceiro,
  listarParceiros as listarParceirosCadastro,
} from '@/modules/cadastros/services/cadastrosApi'
import type {
  ConfiguracaoMargemClienteDto,
  ContatoClienteDto,
  ErpModuleMetaDto,
  OrcamentoDto,
  ParametroConfiguracaoDto,
  ParceiroClienteDto,
} from '../types/erp'

/** Metadados do roadmap para páginas `/erp/m/:moduleId`. */
export async function obterErpModuleMeta(moduleSlug: string): Promise<ErpModuleMetaDto> {
  const { data } = await apiClient.get<ErpModuleMetaDto>(`/erp/modules/${moduleSlug}/meta/`)
  return data
}

/** Lista propostas comerciais. */
export async function listarOrcamentos(): Promise<OrcamentoDto[]> {
  const { data } = await apiClient.get<OrcamentoDto[]>('/erp/orcamentos/')
  return data
}

/** Payload mínimo para criar proposta (cliente obrigatório no backend). */
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

/** Cria orçamento em rascunho. */
export async function criarOrcamento(payload: CriarOrcamentoPayload): Promise<OrcamentoDto> {
  const { data } = await apiClient.post<OrcamentoDto>('/erp/orcamentos/', payload)
  return data
}

/** Detalhe de uma proposta por UUID. */
export async function obterOrcamento(id: string): Promise<OrcamentoDto> {
  const { data } = await apiClient.get<OrcamentoDto>(`/erp/orcamentos/${id}/`)
  return data
}

export type OrcamentoItemLinhaPayload = {
  /** Omitir para linha nova; enviar o id da linha existente para atualizar. */
  id?: string
  ordem: number
  tipo?: 'PRODUTO' | 'SERVICO'
  origem?: 'MANUAL' | 'CONFIGURADOR'
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

/** Atualiza cabeçalho e/ou substitui todas as linhas (`itens`). */
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

/** Clientes ativos para selects de orçamento (delega ao módulo cadastros). */
export async function listarClientesOrcamento(): Promise<ParceiroClienteDto[]> {
  return listarParceirosCadastro({ tipo: 'cliente', ativo: '1' })
}

/** Contatos do parceiro selecionado como cliente. */
export async function listarContatosCliente(clienteId: string): Promise<ContatoClienteDto[]> {
  return listarContatosParceiro(clienteId)
}

/** Margens padrão configuradas por cliente. */
export async function listarMargensClientes(): Promise<ConfiguracaoMargemClienteDto[]> {
  const { data } = await apiClient.get<unknown>('/erp/orcamentos/margens-clientes/')
  return normalizeList<ConfiguracaoMargemClienteDto>(data)
}

/** Parâmetros globais do ERP. */
export async function listarParametrosConfiguracao(): Promise<ParametroConfiguracaoDto[]> {
  const { data } = await apiClient.get<ParametroConfiguracaoDto[]>('/erp/configuracoes/parametros/')
  return data
}

export type AtualizarParametroPayload = Partial<{
  valor: string
  descricao: string
}>

/** Atualiza valor/descrição de parâmetro pela chave. */
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
