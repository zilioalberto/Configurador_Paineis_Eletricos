/** Redireciona rota legada `/cargas/novo` para listagem com modal aberto. */

import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { configuradorPaths } from '@/modules/configurador_paineis/configuradorPaths'
import { withFluxoOrigem } from '@/modules/configurador_paineis/projetos/utils/fluxoOrigem'

export default function CargaCreatePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const projetoId = searchParams.get('projeto') ?? ''

  useEffect(() => {
    const base = projetoId ? configuradorPaths.cargas(projetoId) : configuradorPaths.cargas()
    const params = new URLSearchParams(searchParams)
    params.set('novo', '1')
    if (projetoId) params.set('projeto', projetoId)
    navigate(withFluxoOrigem(`${base}?${params.toString()}`, searchParams), { replace: true })
  }, [navigate, projetoId, searchParams])

  return (
    <div className="container-fluid py-3">
      <p className="text-muted small mb-0">Abrindo cadastro de carga…</p>
    </div>
  )
}
