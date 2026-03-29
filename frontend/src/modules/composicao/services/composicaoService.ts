import apiClient from '@/services/apiClient'
import type {
  AprovarSugestaoResponse,
  ComposicaoSnapshot,
  ProdutoAlternativa,
} from '../types/composicao'

export async function obterComposicaoPorProjeto(
  projetoId: string
): Promise<ComposicaoSnapshot> {
  const response = await apiClient.get<ComposicaoSnapshot>(
    `/composicao/projeto/${projetoId}/`
  )
  return response.data
}

export async function gerarSugestoesComposicao(
  projetoId: string,
  limparAntes = true
): Promise<ComposicaoSnapshot> {
  const response = await apiClient.post<ComposicaoSnapshot>(
    `/composicao/projeto/${projetoId}/gerar-sugestoes/`,
    { limpar_antes: limparAntes }
  )
  return response.data
}

export async function reavaliarPendenciasComposicao(
  projetoId: string
): Promise<ComposicaoSnapshot> {
  const response = await apiClient.post<ComposicaoSnapshot>(
    `/composicao/projeto/${projetoId}/reavaliar-pendencias/`,
    {}
  )
  return response.data
}

export async function listarAlternativasSugestao(
  sugestaoId: string
): Promise<ProdutoAlternativa[]> {
  const response = await apiClient.get<{ alternativas: ProdutoAlternativa[] }>(
    `/composicao/sugestoes/${sugestaoId}/alternativas/`
  )
  return response.data.alternativas
}

export async function aprovarSugestao(
  sugestaoId: string,
  produtoId?: string | null
): Promise<AprovarSugestaoResponse> {
  const body =
    produtoId != null && produtoId !== '' ? { produto_id: produtoId } : {}
  const response = await apiClient.post<AprovarSugestaoResponse>(
    `/composicao/sugestoes/${sugestaoId}/aprovar/`,
    body
  )
  return response.data
}
