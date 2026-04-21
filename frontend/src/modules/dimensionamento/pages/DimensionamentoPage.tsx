import { Navigate, useSearchParams } from 'react-router-dom'

export default function DimensionamentoPage() {
  const [searchParams] = useSearchParams()
  const projetoId = searchParams.get('projeto') ?? ''
  const target = projetoId
    ? `/cargas?projeto=${encodeURIComponent(projetoId)}#dimensionamento-resumo`
    : '/cargas'
  return <Navigate to={target} replace />
}
