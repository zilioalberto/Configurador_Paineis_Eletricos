import { Link } from 'react-router-dom'
import type { Projeto } from '../types/projeto'

type ProjetoTableProps = {
  projetos: Projeto[]
}

function formatarNumeroFases(numeroFases: number | null): string {
  if (numeroFases === null) return '-'
  if (numeroFases === 1) return 'Monofásico'
  if (numeroFases === 2) return 'Bifásico'
  if (numeroFases === 3) return 'Trifásico'
  return String(numeroFases)
}

export default function ProjetoTable({ projetos }: ProjetoTableProps) {
  if (projetos.length === 0) {
    return <div className="alert alert-info mb-0">Nenhum projeto encontrado.</div>
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
              <td>{projeto.status}</td>
              <td>{projeto.tipo_painel}</td>
              <td>{projeto.tipo_corrente}</td>
              <td>{projeto.tensao_nominal || '-'}</td>
              <td>{formatarNumeroFases(projeto.numero_fases)}</td>
              <td className="text-end">
                <div className="d-flex justify-content-end gap-2">
                  <Link
                    to={`/projetos/${projeto.id}`}
                    className="btn btn-sm btn-outline-primary"
                  >
                    Visualizar
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}