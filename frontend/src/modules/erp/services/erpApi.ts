import apiClient from '@/services/apiClient'
import type { ErpModuleMetaDto, OrcamentoDto, ParametroConfiguracaoDto } from '../types/erp'

export async function obterErpModuleMeta(moduleSlug: string): Promise<ErpModuleMetaDto> {
  const { data } = await apiClient.get<ErpModuleMetaDto>(`/erp/modules/${moduleSlug}/meta/`)
  return data
}

export async function listarOrcamentos(): Promise<OrcamentoDto[]> {
  const { data } = await apiClient.get<OrcamentoDto[]>('/erp/orcamentos/')
  return data
}

export type CriarOrcamentoPayload = {
  codigo: string
  titulo: string
  descricao?: string
  cliente_referencia?: string
  valido_ate?: string | null
  itens?: Array<{
    descricao: string
    quantidade?: string | number
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
  descricao: string
  quantidade?: string | number
  preco_unitario?: string | number
}

export type AtualizarOrcamentoPayload = Partial<{
  codigo: string
  titulo: string
  descricao: string
  cliente_referencia: string
  status: string
  valido_ate: string | null
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

export async function listarParametrosConfiguracao(): Promise<ParametroConfiguracaoDto[]> {
  const { data } = await apiClient.get<ParametroConfiguracaoDto[]>('/erp/configuracoes/parametros/')
  return data
}

export type AtualizarParametroPayload = Partial<{
  valor: string
  descricao: string
}>

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
