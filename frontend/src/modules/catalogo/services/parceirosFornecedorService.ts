import apiClient from '@/services/apiClient'

export type ParceiroFornecedorOption = {
  id: string
  razao_social: string
  documento: string
}

function normalizeList(data: unknown): ParceiroFornecedorOption[] {
  if (Array.isArray(data)) return data as ParceiroFornecedorOption[]
  if (
    data &&
    typeof data === 'object' &&
    'results' in data &&
    Array.isArray((data as { results: ParceiroFornecedorOption[] }).results)
  ) {
    return (data as { results: ParceiroFornecedorOption[] }).results
  }
  return []
}

/** Fornecedores ativos (mesmo universo do FK `fabricante_parceiro` no produto). */
export async function listarFornecedoresAtivos(): Promise<ParceiroFornecedorOption[]> {
  const response = await apiClient.get<unknown>('/cadastros/parceiros/', {
    params: { tipo: 'fornecedor', ativo: '1', page_size: 500 },
  })
  return normalizeList(response.data)
}
