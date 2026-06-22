import { Link } from 'react-router-dom'
import { catalogoPaths } from '../catalogoPaths'
import type { ServicoListItem } from '../types/servico'

type ServicoTableProps = Readonly<{
  servicos: ServicoListItem[]
  canManage: boolean
  onDeleteRequest: (id: string) => void
}>

export default function ServicoTable({ servicos, canManage, onDeleteRequest }: ServicoTableProps) {
  if (servicos.length === 0) {
    return (
      <p className="text-muted mb-0">
        Nenhum serviço encontrado.{' '}
        {canManage ? (
          <Link to={catalogoPaths.servicoNovo}>Cadastrar serviço</Link>
        ) : null}
      </p>
    )
  }

  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle">
        <thead>
          <tr>
            <th>Código</th>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Unidade</th>
            <th className="text-end">Custo de referência</th>
            <th>Ativo</th>
            {canManage ? <th className="text-end">Ações</th> : null}
          </tr>
        </thead>
        <tbody>
          {servicos.map((s) => (
            <tr key={s.id}>
              <td>
                <Link to={catalogoPaths.servicoEditar(s.id)} className="fw-semibold">
                  {s.codigo}
                </Link>
              </td>
              <td>{s.descricao}</td>
              <td>{s.categoria || '—'}</td>
              <td>{s.unidade_medida_display ?? s.unidade_medida}</td>
              <td className="text-end">{s.custo_referencia}</td>
              <td>{s.ativo ? 'Sim' : 'Não'}</td>
              {canManage ? (
                <td className="text-end">
                  <Link
                    to={catalogoPaths.servicoEditar(s.id)}
                    className="btn btn-sm btn-outline-primary me-1"
                  >
                    Editar
                  </Link>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => onDeleteRequest(s.id)}
                  >
                    Excluir
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
