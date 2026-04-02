import { Link } from 'react-router-dom'
import type { Projeto } from '../types/projeto'

type ProjetoTableProps = {
  projetos: Projeto[]
  onDeleteRequest: (id: string) => void
}

function formatarNumeroFases(numeroFases: number | null): string {
  if (numeroFases === null) return '-'
  if (numeroFases === 1) return 'Monofásico'
  if (numeroFases === 2) return 'Bifásico'
  if (numeroFases === 3) return 'Trifásico'
  return String(numeroFases)
}

function formatarTipoCorrente(tipo: string): string {
  if (tipo === 'CA') return 'CA'
  if (tipo === 'CC') return 'CC'
  return tipo
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'FINALIZADO':
      return 'badge bg-success'
    case 'EM_ANDAMENTO':
      return 'badge bg-warning text-dark'
    case 'RASCUNHO':
      return 'badge bg-secondary'
    default:
      return 'badge bg-light text-dark'
  }
}

export default function ProjetoTable({
  projetos,
  onDeleteRequest,
}: ProjetoTableProps) {
  if (projetos.length === 0) {
    return <div className="alert alert-info mb-0">Nenhum projeto encontrado.</div>
  }

  return (
    <div className="table-responsive app-data-table">
      <table className="table table-hover align-middle">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nome</th>
            <th>Cliente</th>
            <th>Status</th>
            <th>Tipo painel</th>
            <th>Corrente</th>
            <th>Tensão</th>
            <th>Fases</th>
            <th className="text-end">Ações</th>
          </tr>
        </thead>

        <tbody>
          {projetos.map((projeto) => (
            <tr key={projeto.id}>
              <td>{projeto.codigo}</td>

              <td>{projeto.nome}</td>

              <td>{projeto.cliente || '-'}</td>

              <td>
                <span className={getStatusBadgeClass(projeto.status)}>
                  {projeto.status_display ?? projeto.status}
                </span>
              </td>

              <td>{projeto.tipo_painel_display ?? projeto.tipo_painel}</td>

              <td>{formatarTipoCorrente(projeto.tipo_corrente)}</td>

              <td>{projeto.tensao_nominal || '-'}</td>

              <td>{formatarNumeroFases(projeto.numero_fases)}</td>

              <td className="text-end">
                <div className="table-actions d-flex justify-content-end flex-wrap">
                  <Link
                    to={`/projetos/${projeto.id}`}
                    className="btn btn-sm btn-outline-primary"
                  >
                    Visualizar
                  </Link>

                  <Link
                    to={`/projetos/${projeto.id}/editar`}
                    className="btn btn-sm btn-outline-warning"
                  >
                    Editar
                  </Link>

                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => onDeleteRequest(projeto.id)}
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
