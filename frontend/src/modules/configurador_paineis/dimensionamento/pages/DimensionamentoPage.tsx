import { Navigate, useSearchParams } from 'react-router-dom'

/** Entrada legada: envia para o fluxo de revisão de condutores no wizard. */
export default function DimensionamentoPage() {
  const [searchParams] = useSearchParams()
  const projetoId = searchParams.get('projeto') ?? ''
  const target = projetoId
    ? `/projetos/${encodeURIComponent(projetoId)}/fluxo/dimensionamento`
    : '/projetos'
  return <Navigate to={target} replace />
}
