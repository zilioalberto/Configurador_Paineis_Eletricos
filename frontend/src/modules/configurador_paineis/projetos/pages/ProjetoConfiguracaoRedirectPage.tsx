import { Navigate, useParams } from 'react-router-dom'
import { configuradorPaths } from '../../configuradorPaths'

/** Redireciona `/configurador/configuracoes/:id` para cargas do projeto (fluxo wizard). */
export default function ProjetoConfiguracaoRedirectPage() {
  const { id } = useParams<{ id: string }>()
  if (!id) {
    return <Navigate to={configuradorPaths.configuracoes} replace />
  }
  return <Navigate to={configuradorPaths.cargas(id)} replace />
}
