/**
 * Cliente HTTP do módulo Orçamentos: propostas, margens, parâmetros e meta de módulos.
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
  OrcamentoConfiguradorPainelDto,
  OrcamentoDto,
  OrcamentoDtoComLinkEnvio,
  EnviarOfertaClientePayload,
  OrcamentoOfertaBlocoDto,
  OrcamentoPreviewOfertaDto,
  ParametroConfiguracaoDto,
  ParceiroClienteDto,
  PerfilOferta,
  TipoBlocoOferta,
  TipoArquivoOferta,
} from '../types/orcamentos'

/** Metadados do roadmap para páginas `/erp/m/:moduleId`. */
export async function obterErpModuleMeta(moduleSlug: string): Promise<ErpModuleMetaDto> {
  const { data } = await apiClient.get<ErpModuleMetaDto>(`/erp/modules/${moduleSlug}/meta/`)
  return data
}

/** Lista propostas comerciais. */
export async function listarOrcamentos(): Promise<OrcamentoDto[]> {
  const { data } = await apiClient.get<OrcamentoDto[]>('/orcamentos/')
  return data
}

/** Payload mínimo para criar proposta (cliente obrigatório no backend). */
export type CriarOrcamentoPayload = {
  titulo: string
  descricao?: string
  cliente: string
  contato_cliente?: string | null
  valido_ate?: string | null
  perfil_oferta?: PerfilOferta
  oferta_blocos?: Array<{
    ordem: number
    tipo: TipoBlocoOferta
    titulo: string
    conteudo?: string
  }>
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
  const { data } = await apiClient.post<OrcamentoDto>('/orcamentos/', payload)
  return data
}

/** Detalhe de uma proposta por UUID. */
export async function obterOrcamento(id: string): Promise<OrcamentoDto> {
  const { data } = await apiClient.get<OrcamentoDto>(`/orcamentos/${id}/`)
  return data
}

export type OrcamentoItemLinhaPayload = {
  /** Omitir para linha nova; enviar o id da linha existente para atualizar. */
  id?: string
  ordem: number
  tipo?: 'PRODUTO' | 'SERVICO'
  origem?: 'MANUAL' | 'CONFIGURADOR' | 'CATALOGO'
  produto?: string | null
  servico?: string | null
  descricao: string
  quantidade?: string | number
  custo_unitario?: string | number
  margem_percentual?: string | number
  preco_unitario?: string | number
}

export type OrcamentoOfertaBlocoPayload = Pick<
  OrcamentoOfertaBlocoDto,
  'ordem' | 'tipo' | 'titulo' | 'conteudo'
> & {
  id?: string
}

export type AtualizarOrcamentoPayload = Partial<{
  titulo: string
  descricao: string
  cliente: string | null
  contato_cliente: string | null
  status: string
  valido_ate: string | null
  perfil_oferta: PerfilOferta
  margem_produtos_percentual: string | number
  margem_servicos_percentual: string | number
  /** Substitui todas as linhas do orçamento quando enviado (sync no servidor). */
  itens: OrcamentoItemLinhaPayload[]
  /** Substitui todos os blocos textuais editáveis da oferta quando enviado. */
  oferta_blocos: OrcamentoOfertaBlocoPayload[]
}>

/** Atualiza cabeçalho e/ou substitui todas as linhas (`itens`). */
export async function atualizarOrcamento(
  id: string,
  payload: AtualizarOrcamentoPayload
): Promise<OrcamentoDto> {
  const { data } = await apiClient.patch<OrcamentoDto>(`/orcamentos/${id}/`, payload)
  return data
}

export async function atualizarOfertaOrcamento(
  id: string
): Promise<{ itens_atualizados: number; orcamento: OrcamentoDto }> {
  const { data } = await apiClient.post<{ itens_atualizados: number; orcamento: OrcamentoDto }>(
    `/orcamentos/${id}/atualizar-oferta/`
  )
  return data
}

export async function reabrirOfertaOrcamento(id: string): Promise<OrcamentoDto> {
  const { data } = await apiClient.post<OrcamentoDto>(`/orcamentos/${id}/reabrir/`)
  return data
}

export async function obterPreviewOfertaOrcamento(
  id: string
): Promise<OrcamentoPreviewOfertaDto> {
  const { data } = await apiClient.get<OrcamentoPreviewOfertaDto>(
    `/orcamentos/${id}/preview-oferta/`
  )
  return data
}

export async function baixarDocxOfertaOrcamento(id: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/orcamentos/${id}/gerar-docx-oferta/`, {
    responseType: 'blob',
    headers: {
      Accept: '*/*',
    },
  })
  return data
}

export async function uploadArquivoOfertaOrcamento(
  id: string,
  tipo: TipoArquivoOferta,
  arquivo: File
): Promise<OrcamentoDto> {
  const formData = new FormData()
  formData.append('tipo', tipo)
  formData.append('arquivo', arquivo)
  const { data } = await apiClient.post<OrcamentoDto>(
    `/orcamentos/${id}/arquivos-oferta/`,
    formData
  )
  return data
}

export async function baixarArquivoOfertaOrcamento(
  orcamentoId: string,
  arquivoId: string
): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(
    `/orcamentos/${orcamentoId}/arquivos-oferta/${arquivoId}/download/`,
    {
      responseType: 'blob',
      headers: { Accept: '*/*' },
    }
  )
  return data
}

export type MarcarOfertaEnviadaPayload = Partial<{
  pdf_final_id: string
  destinatario_nome: string
  destinatario_email: string
  assunto: string
  mensagem: string
}>

export async function enviarOfertaClienteOrcamento(
  id: string,
  payload: EnviarOfertaClientePayload
): Promise<OrcamentoDtoComLinkEnvio> {
  const { data } = await apiClient.post<OrcamentoDtoComLinkEnvio>(
    `/orcamentos/${id}/enviar-oferta-cliente/`,
    payload
  )
  return data
}

export async function marcarOfertaEnviadaOrcamento(
  id: string,
  payload: MarcarOfertaEnviadaPayload
): Promise<OrcamentoDto> {
  const { data } = await apiClient.post<OrcamentoDto>(
    `/orcamentos/${id}/marcar-oferta-enviada/`,
    payload
  )
  return data
}

export async function gerarBlocosPadraoOfertaOrcamento(
  id: string,
  perfilOferta: PerfilOferta
): Promise<OrcamentoDto> {
  const { data } = await apiClient.post<OrcamentoDto>(
    `/orcamentos/${id}/gerar-blocos-padrao-oferta/`,
    { perfil_oferta: perfilOferta }
  )
  return data
}

export async function revisarPrecoCatalogoItemOrcamento(
  orcamentoId: string,
  itemId: string,
  custoReferencia: string | number,
  justificativa: string
): Promise<OrcamentoDto> {
  const { data } = await apiClient.post<OrcamentoDto>(
    `/orcamentos/${orcamentoId}/itens/${itemId}/revisar-preco-catalogo/`,
    { custo_referencia: custoReferencia, justificativa }
  )
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
  const { data } = await apiClient.get<unknown>('/orcamentos/margens-clientes/')
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
    '/orcamentos/margens-clientes/',
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
    `/orcamentos/margens-clientes/${id}/`,
    payload
  )
  return data
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
    `/orcamentos/${orcamentoId}/nova-revisao/`,
    payload
  )
  return data
}

export async function adicionarPainelConfigurador(
  orcamentoId: string,
  descricao_painel: string
): Promise<OrcamentoConfiguradorPainelDto> {
  const { data } = await apiClient.post(
    `/orcamentos/${orcamentoId}/configuradores-painel/`,
    { descricao_painel }
  )
  return data
}

export async function iniciarConfiguradorPainel(
  orcamentoId: string,
  vinculoId: string
): Promise<OrcamentoConfiguradorPainelDto> {
  const { data } = await apiClient.post(
    `/orcamentos/${orcamentoId}/configuradores-painel/${vinculoId}/iniciar-configurador/`
  )
  return data
}

export async function vincularProjetoConfiguradorPainel(
  orcamentoId: string,
  vinculoId: string,
  projetoConfiguradorId: string
): Promise<OrcamentoConfiguradorPainelDto> {
  const { data } = await apiClient.post(
    `/orcamentos/${orcamentoId}/configuradores-painel/${vinculoId}/vincular-projeto/`,
    { projeto_configurador_id: projetoConfiguradorId }
  )
  return data
}

export async function sincronizarComposicaoPainel(
  orcamentoId: string,
  vinculoId: string
): Promise<{ itens_sincronizados: number; orcamento: OrcamentoDto }> {
  const { data } = await apiClient.post(
    `/orcamentos/${orcamentoId}/configuradores-painel/${vinculoId}/sincronizar-composicao/`
  )
  return data
}

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
