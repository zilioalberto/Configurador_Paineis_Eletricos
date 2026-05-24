import { useQuery } from '@tanstack/react-query'
import { composicaoQueryKeys } from '../composicaoQueryKeys'
import { obterComposicaoPorProjeto } from '../services/composicaoService'

/** Query do snapshot unificado (sugestões, pendências, itens aprovados). */
export function useComposicaoSnapshotQuery(projetoId: string | null) {
  return useQuery({
    queryKey: composicaoQueryKeys.snapshot(projetoId ?? ''),
    queryFn: () => obterComposicaoPorProjeto(projetoId!),
    enabled: Boolean(projetoId),
  })
}
