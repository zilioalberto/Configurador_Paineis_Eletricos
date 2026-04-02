import { Link } from 'react-router-dom'
import type { ProdutoListItem } from '../types/produto'

type ProdutoTableProps = {
  produtos: ProdutoListItem[]
  onDeleteRequest: (id: string) => void
}

export default function ProdutoTable({ produtos, onDeleteRequest }: ProdutoTableProps) {
  if (produtos.length === 0) {
    return (
      <p className="text-muted mb-0">
        Nenhum produto encontrado. <Link to="/catalogo/novo">Cadastrar produto</Link>
      </p>
    )
  }

  return (
    <div className="table-responsive app-data-table">
      <table className="table table-hover align-middle">
        <thead>
          <tr>
            <th>Código</th>
            <th>Descrição</th>
            <th>Categoria</th>
            <th>Fabricante</th>
            <th>Valor unit.</th>
            <th>Ativo</th>
            <th className="text-end">Ações</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((p) => (
            <tr key={p.id}>
              <td>
                <Link to={`/catalogo/${p.id}`}>{p.codigo}</Link>
              </td>
              <td>{p.descricao}</td>
              <td>
                <span className="badge text-bg-secondary">
                  {p.categoria_display ?? p.categoria_nome ?? '—'}
                </span>
              </td>
              <td>{p.fabricante || '—'}</td>
              <td>{p.valor_unitario}</td>
              <td>{p.ativo ? 'Sim' : 'Não'}</td>
              <td className="text-end">
                <div className="d-flex justify-content-end gap-2 flex-wrap table-actions">
                  <Link
                    to={`/catalogo/${p.id}/editar`}
                    className="btn btn-sm btn-outline-primary"
                  >
                    Editar
                  </Link>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => onDeleteRequest(p.id)}
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
