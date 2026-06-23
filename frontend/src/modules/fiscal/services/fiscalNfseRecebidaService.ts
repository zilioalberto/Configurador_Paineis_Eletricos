import apiClient from '@/services/apiClient'

import type {
  ObjetivoEntradaFiscal,
  OrigemImportacaoFiscal,
  StatusImportacaoFiscal,
} from '../types/documentoFiscalRecebido'

export type NfseRecebidaDto = {
  readonly id: number
  readonly public_id: string
  readonly identificador: string
  readonly chave_acesso: string
  readonly nsu_adn: string | null
  readonly cnpj_prestador: string
  readonly nome_prestador: string
  readonly cnpj_tomador: string
  readonly nome_tomador: string
  readonly numero: string
  readonly codigo_verificacao: string
  readonly valor_total: string
  readonly data_emissao: string | null
  readonly descricao_servico: string
  readonly status_importacao: StatusImportacaoFiscal
  readonly origem_importacao: OrigemImportacaoFiscal
  readonly objetivo_entrada: ObjetivoEntradaFiscal
  readonly criada_em: string
  readonly atualizada_em: string
}

export type ItemNfseRecebidaDto = {
  readonly id: number
  readonly numero_item: number
  readonly descricao: string
  readonly valor_total: string
}

export type NfseRecebidaDetailDto = NfseRecebidaDto & {
  readonly itens: readonly ItemNfseRecebidaDto[]
  readonly xml_original: string
}

export type ControleNsuNfseAdnDto = {
  readonly id: number
  readonly cnpj: string
  readonly ultimo_nsu: string
  readonly max_nsu: string | null
  readonly ultimo_status: string
  readonly ultimo_motivo: string
  readonly bloqueado_ate: string | null
  readonly ultima_consulta: string | null
}

export type SincronizarNfseAdnResponse = {
  readonly sucesso: boolean
  readonly mensagem: string
  readonly documentos_novos: number
  readonly documentos_importados: number
  readonly documentos_duplicados: number
  readonly erros_importacao: readonly string[]
  readonly alertas?: readonly string[]
  readonly ultimo_status: string
  readonly ultimo_motivo?: string
  readonly ultimo_nsu: string
  readonly max_nsu: string
  readonly detail?: string
}

export async function listarNfseRecebidas(page = 1): Promise<{
  items: NfseRecebidaDto[]
  total: number
}> {
  const response = await apiClient.get<{ results: NfseRecebidaDto[]; count: number }>(
    '/fiscal/nfse-recebidas/',
    { params: { page } },
  )
  return { items: response.data.results, total: response.data.count }
}

export async function obterNfseRecebida(publicId: string): Promise<NfseRecebidaDetailDto> {
  const response = await apiClient.get<NfseRecebidaDetailDto>(`/fiscal/nfse-recebidas/${publicId}/`)
  return response.data
}

export async function obterControleNsuNfseAdn(cnpj: string): Promise<ControleNsuNfseAdnDto> {
  const digits = cnpj.replace(/\D/g, '')
  const response = await apiClient.get<ControleNsuNfseAdnDto>(`/fiscal/nsu-nfse-adn/${digits}/`)
  return response.data
}

export async function sincronizarNfseAdn(): Promise<SincronizarNfseAdnResponse> {
  const response = await apiClient.post<SincronizarNfseAdnResponse>(
    '/fiscal/nfse-recebidas/sincronizar-adn/',
  )
  return response.data
}
