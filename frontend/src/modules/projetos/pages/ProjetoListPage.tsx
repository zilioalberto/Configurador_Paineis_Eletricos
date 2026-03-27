import { Link } from 'react-router-dom'
import ProjetoTable from '../components/ProjetoTable'
import { useProjetos } from '../hooks/useProjetos'

export default function ProjetoListPage() {
  const { projetos, loading, error, recarregar } = useProjetos()

  return (
    <div className="container-fluid py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Projetos</h1>
          <p className="text-muted mb-0">
            Gerencie os projetos do configurador de painéis.
          </p>
        </div>

        <div className="d-flex gap-2">
          <button type="button" className="btn btn-outline-secondary" onClick={() => void recarregar()}>
            Atualizar
          </button>

          <Link to="/projetos/novo" className="btn btn-primary">
            Novo Projeto
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading && <p className="mb-0">Carregando projetos...</p>}

          {!loading && error && (
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          )}

          {!loading && !error && <ProjetoTable projetos={projetos} />}
        </div>
      </div>
    </div>
  )
}