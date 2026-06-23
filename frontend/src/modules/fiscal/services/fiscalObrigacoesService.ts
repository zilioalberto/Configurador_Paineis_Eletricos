import apiClient from '@/services/apiClient'

export type StatusObrigacaoFiscal = 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'CANCELADO'
export type TipoObrigacaoFiscal = 'DAS' | 'INSS_DARF' | 'FGTS' | 'ISS' | 'ICMS' | 'OUTRO'
export type StatusReconciliacaoFiscal = 'OK' | 'ALERTA' | 'ERRO' | 'PENDENTE'

export type LinhaComposicaoDto = {
  readonly id: number
  readonly codigo: string
  readonly descricao: string
  readonly valor: string
}

export type LancamentoFinanceiroDto = {
  readonly public_id: string
  readonly valor: string
  readonly data: string
  readonly conta: string
  readonly centro_custo: string
  readonly observacoes: string
}

export type ObrigacaoFiscalDto = {
  readonly public_id: string
  readonly tipo: TipoObrigacaoFiscal
  readonly tipo_label: string
  readonly descricao: string
  readonly valor: string
  readonly valor_estimado: string | null
  readonly data_vencimento: string | null
  readonly data_pagamento: string | null
  readonly status: StatusObrigacaoFiscal
  readonly status_label: string
  readonly numero_documento: string
  readonly observacoes: string
  readonly dados_extra: Record<string, unknown>
  readonly linhas_composicao: readonly LinhaComposicaoDto[]
  readonly lancamento_financeiro: LancamentoFinanceiroDto | null
}

export type AnexoObrigacaoDto = {
  readonly public_id: string
  readonly tipo_arquivo: string
  readonly nome_original: string
  readonly arquivo_url: string | null
  readonly parse_sucesso: boolean
  readonly parse_erros: string
  readonly parsed_data: Record<string, unknown>
}

export type HoleriteCompetenciaDto = {
  readonly id: number
  readonly cpf: string
  readonly nome: string
  readonly tipo: string
  readonly tipo_label: string
  readonly proventos: string
  readonly desconto_inss: string
  readonly base_fgts: string
  readonly fgts_mes: string
  readonly total_liquido: string | null
  readonly colaborador_id: string | null
  readonly colaborador_nome: string
  readonly colaborador_matricula: string
  readonly vinculo_rh: 'VINCULADO' | 'PENDENTE' | 'SUGESTAO'
  readonly valores_aplicados: boolean
  readonly aviso_rh: string
  readonly colaborador_sugerido_id: string | null
  readonly colaborador_sugerido_nome: string
  readonly valores_pendentes: {
    readonly proventos?: string | null
    readonly desconto_inss?: string | null
    readonly base_fgts?: string | null
    readonly fgts_mes?: string | null
    readonly total_liquido?: string | null
  } | null
}

export type ReconciliacaoFiscalDto = {
  readonly tipo: string
  readonly tipo_label: string
  readonly valor_interno: string | null
  readonly valor_contabilidade: string | null
  readonly diferenca: string | null
  readonly diferenca_percentual: string | null
  readonly status: StatusReconciliacaoFiscal
  readonly status_label: string
  readonly mensagem: string
  readonly detalhes: Record<string, unknown>
  readonly fonte_contabilidade: string
  readonly editavel: boolean
}

export type SnapshotIcmsDto = {
  readonly saldo_credor_anterior: string | null
  readonly debitos_saidas: string | null
  readonly creditos_entradas: string | null
  readonly total_debitos: string | null
  readonly total_creditos: string | null
  readonly saldo_credor: string | null
  readonly imposto_a_recolher: string | null
  readonly valor_contabil_entradas: string | null
  readonly valor_contabil_saidas: string | null
}

export type PacoteObrigacaoListDto = {
  readonly public_id: string
  readonly competencia: string
  readonly recebido_em: string | null
  readonly pacote_completo: boolean
  readonly observacoes: string
  readonly total_obrigacoes: number
  readonly total_pendente: string | null
}

export type PacoteObrigacaoDetailDto = PacoteObrigacaoListDto & {
  readonly cnpj: string
  readonly obrigacoes: readonly ObrigacaoFiscalDto[]
  readonly anexos: readonly AnexoObrigacaoDto[]
  readonly holerites: readonly HoleriteCompetenciaDto[]
  readonly reconciliacoes: readonly ReconciliacaoFiscalDto[]
  readonly snapshot_icms: SnapshotIcmsDto | null
}

export type DashboardObrigacoesDto = {
  readonly total_pendente: string
  readonly total_vencido: string
  readonly total_vence_7_dias: string
  readonly quantidade_pendentes: number
  readonly quantidade_vencidas: number
  readonly quantidade_vence_7_dias: number
  readonly alertas: readonly string[]
  readonly competencias_recentes: readonly {
    competencia: string
    public_id: string
    pacote_completo: boolean
  }[]
}

export async function obterDashboardObrigacoes(): Promise<DashboardObrigacoesDto> {
  const response = await apiClient.get<DashboardObrigacoesDto>('/fiscal/obrigacoes/dashboard/')
  return response.data
}

export async function listarPacotesObrigacoes(): Promise<PacoteObrigacaoListDto[]> {
  const response = await apiClient.get<{ results: PacoteObrigacaoListDto[] }>(
    '/fiscal/obrigacoes/pacotes/',
  )
  return response.data.results
}

export async function obterPacoteObrigacao(publicId: string): Promise<PacoteObrigacaoDetailDto> {
  const response = await apiClient.get<PacoteObrigacaoDetailDto>(
    `/fiscal/obrigacoes/pacotes/${publicId}/`,
  )
  return response.data
}

export async function criarPacoteObrigacao(
  competencia: string,
  observacoes = '',
): Promise<PacoteObrigacaoDetailDto> {
  const response = await apiClient.post<PacoteObrigacaoDetailDto>(
    '/fiscal/obrigacoes/pacotes/criar/',
    { competencia, observacoes },
  )
  return response.data
}

export async function uploadLotePacote(
  publicId: string,
  arquivos: File[],
): Promise<{ importados: number; pacote: PacoteObrigacaoDetailDto }> {
  const form = new FormData()
  arquivos.forEach((f) => form.append('arquivos', f))
  const response = await apiClient.post<{ importados: number; pacote: PacoteObrigacaoDetailDto }>(
    `/fiscal/obrigacoes/pacotes/${publicId}/upload-lote/`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return response.data
}

export async function reconciliarPacote(
  publicId: string,
): Promise<{ pacote: PacoteObrigacaoDetailDto }> {
  const response = await apiClient.post<{ pacote: PacoteObrigacaoDetailDto }>(
    `/fiscal/obrigacoes/pacotes/${publicId}/reconciliar/`,
  )
  return response.data
}

export type AtualizarContabilidadeReconciliacaoPayload = {
  valor_contabilidade?: string | null
  icms_entradas?: string | null
  icms_saidas?: string | null
  limpar?: boolean
}

export async function atualizarContabilidadeReconciliacao(
  pacoteId: string,
  tipo: string,
  payload: AtualizarContabilidadeReconciliacaoPayload,
): Promise<{ pacote: PacoteObrigacaoDetailDto }> {
  const response = await apiClient.patch<{ pacote: PacoteObrigacaoDetailDto }>(
    `/fiscal/obrigacoes/pacotes/${pacoteId}/reconciliacoes/${tipo}/contabilidade/`,
    payload,
  )
  return response.data
}

export async function marcarObrigacaoPaga(
  publicId: string,
  payload?: { data_pagamento?: string; criar_lancamento_financeiro?: boolean },
): Promise<ObrigacaoFiscalDto> {
  const response = await apiClient.post<ObrigacaoFiscalDto>(
    `/fiscal/obrigacoes/itens/${publicId}/`,
    payload ?? {},
  )
  return response.data
}

export type AtualizarObrigacaoFiscalPayload = {
  descricao?: string
  valor?: string
  data_vencimento?: string | null
  numero_documento?: string
  observacoes?: string
  linhas_composicao?: readonly {
    codigo: string
    descricao?: string
    valor: string
  }[]
}

export async function atualizarObrigacaoFiscal(
  publicId: string,
  payload: AtualizarObrigacaoFiscalPayload,
): Promise<ObrigacaoFiscalDto> {
  const response = await apiClient.patch<ObrigacaoFiscalDto>(
    `/fiscal/obrigacoes/itens/${publicId}/`,
    payload,
  )
  return response.data
}

export async function excluirAnexoObrigacaoFiscal(publicId: string): Promise<void> {
  await apiClient.delete(`/fiscal/obrigacoes/anexos/${publicId}/`)
}

export async function excluirTodosAnexosPacote(
  pacoteId: string,
): Promise<{ excluidos: number; pacote: PacoteObrigacaoDetailDto }> {
  const response = await apiClient.delete<{ excluidos: number; pacote: PacoteObrigacaoDetailDto }>(
    `/fiscal/obrigacoes/pacotes/${pacoteId}/anexos/`,
  )
  return response.data
}

export type AtualizarHoleritePayload = {
  nome?: string
  cpf?: string
  tipo?: string
  proventos?: string
  desconto_inss?: string
  base_fgts?: string
  fgts_mes?: string
  total_liquido?: string | null
  colaborador_id?: string | null
}

export async function atualizarHoleriteCompetencia(
  holeriteId: number,
  payload: AtualizarHoleritePayload,
): Promise<HoleriteCompetenciaDto> {
  const response = await apiClient.patch<HoleriteCompetenciaDto>(
    `/fiscal/obrigacoes/holerites/${holeriteId}/`,
    payload,
  )
  return response.data
}

export type ConciliarHoleritesRhResultDto = {
  readonly total: number
  readonly vinculados: number
  readonly auto_vinculados: number
  readonly pendentes_count: number
  readonly pendentes: readonly { id: number; nome: string; cpf: string }[]
  readonly pacote: PacoteObrigacaoDetailDto
}

export async function conciliarHoleritesRhPacote(
  publicId: string,
): Promise<ConciliarHoleritesRhResultDto> {
  const response = await apiClient.post<ConciliarHoleritesRhResultDto>(
    `/fiscal/obrigacoes/pacotes/${publicId}/holerites/conciliar-rh/`,
  )
  return response.data
}

export type CriarColaboradoresHoleritesResultDto = {
  readonly processados: number
  readonly criados: number
  readonly vinculados: number
  readonly itens: readonly {
    holerite_id: number
    colaborador_id: string
    colaborador_nome: string
    colaborador_matricula?: string
    criado: boolean
    vinculado: boolean
  }[]
  readonly pacote: PacoteObrigacaoDetailDto
}

export async function criarColaboradoresHoleritesPacote(
  publicId: string,
  holeriteId?: number,
): Promise<CriarColaboradoresHoleritesResultDto> {
  const response = await apiClient.post<CriarColaboradoresHoleritesResultDto>(
    `/fiscal/obrigacoes/pacotes/${publicId}/holerites/criar-colaboradores/`,
    holeriteId ? { holerite_id: holeriteId } : {},
  )
  return response.data
}
