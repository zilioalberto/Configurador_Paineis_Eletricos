import { Link } from 'react-router-dom'
import type { Projeto } from '../types/projeto'

type ProjetoTableProps = {
  projetos: Projeto[]
  onDelete: (id: string) => void
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

export default function ProjetoTable({ projetos, onDelete }: ProjetoTableProps) {
  if (projetos.length === 0) {
    return <div className="alert alert-info mb-0">Nenhum projeto encontrado.</div>
  }

  function handleDelete(id: string) {
    const confirmou = window.confirm('Deseja realmente excluir este projeto?')
    if (!confirmou) return

    onDelete(id)
  }

  return (
    <div className="table-responsive">
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

              {/* Status com badge */}
              <td>
                <span className={getStatusBadgeClass(projeto.status)}>
                  {projeto.status_display ?? projeto.status}
                </span>
              </td>

              {/* Tipo painel amigável */}
              <td>{projeto.tipo_painel_display ?? projeto.tipo_painel}</td>

              {/* Corrente */}
              <td>{formatarTipoCorrente(projeto.tipo_corrente)}</td>

              {/* Tensão */}
              <td>{projeto.tensao_nominal || '-'}</td>

              {/* Fases */}
              <td>{formatarNumeroFases(projeto.numero_fases)}</td>

              {/* Ações */}
              <td className="text-end">
                <div className="d-flex justify-content-end gap-2 flex-wrap">
                  
                  {/* Visualizar */}
                  <Link
                    to={`/projetos/${projeto.id}`}
                    className="btn btn-sm btn-outline-primary"
                  >
                    Visualizar
                  </Link>

                  {/* Editar */}
                  <Link
                    to={`/projetos/${projeto.id}/editar`}
                    className="btn btn-sm btn-outline-warning"
                  >
                    Editar
                  </Link>

                  {/* Excluir */}
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDelete(projeto.id)}
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