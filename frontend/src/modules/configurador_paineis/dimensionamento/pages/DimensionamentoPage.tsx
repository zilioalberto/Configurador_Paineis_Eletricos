import { Navigate, useSearchParams } from 'react-router-dom'
import { withFluxoOrigem } from '@/modules/configurador_paineis/projetos/utils/fluxoOrigem'
import { configuradorPaths } from '@/modules/configurador_paineis/configuradorPaths'

/** Entrada legada: envia para o fluxo de revisão de condutores no wizard. */
export default function DimensionamentoPage() {
  const [searchParams] = useSearchParams()
  const projetoId = searchParams.get('projeto') ?? ''
  const target = projetoId
    ? withFluxoOrigem(configuradorPaths.configuracaoFluxo(projetoId, 'dimensionamento'), searchParams)
    : configuradorPaths.configuracoes
  return <Navigate to={target} replace />
}
