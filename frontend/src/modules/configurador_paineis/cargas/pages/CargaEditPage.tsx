/** Redireciona rota legada `/cargas/:id/editar` para listagem com drawer aberto. */

import { useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { configuradorPaths } from '@/modules/configurador_paineis/configuradorPaths'
import { withFluxoOrigem } from '@/modules/configurador_paineis/projetos/utils/fluxoOrigem'
import { useCargaDetailQuery } from '../hooks/useCargaDetailQuery'

export default function CargaEditPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { data: carga, isPending, isError } = useCargaDetailQuery(id)

  useEffect(() => {
    if (!id) {
      navigate(withFluxoOrigem(configuradorPaths.cargas(), searchParams), { replace: true })
      return
    }
    if (isPending) return
    if (isError || !carga?.projeto) {
      navigate(withFluxoOrigem(configuradorPaths.cargas(), searchParams), { replace: true })
      return
    }

    navigate(
      withFluxoOrigem(configuradorPaths.cargasEditar(carga.projeto, id), searchParams),
      { replace: true }
    )
  }, [carga?.projeto, id, isError, isPending, navigate, searchParams])

  return (
    <div className="container-fluid py-3">
      <p className="text-muted small mb-0">Abrindo edição de carga…</p>
    </div>
  )
}
