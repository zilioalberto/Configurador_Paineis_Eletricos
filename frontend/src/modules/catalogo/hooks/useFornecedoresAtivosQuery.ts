import { useQuery } from '@tanstack/react-query'
import { listarFornecedoresAtivos } from '../services/parceirosFornecedorService'

export const fornecedoresAtivosQueryKey = ['cadastros', 'parceiros', 'fornecedores', 'ativos'] as const

/** Query de fornecedores ativos para o campo fabricante_parceiro. */
export function useFornecedoresAtivosQuery(enabled: boolean) {
  return useQuery({
    queryKey: fornecedoresAtivosQueryKey,
    queryFn: listarFornecedoresAtivos,
    enabled,
    staleTime: 5 * 60_000,
  })
}
