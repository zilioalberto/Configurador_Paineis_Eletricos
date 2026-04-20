import { Link } from 'react-router-dom'
import type { CargaListItem } from '../types/carga'

type CargaTableProps = {
  cargas: CargaListItem[]
  projetoId: string
  onDeleteRequest: (id: string) => void
  canManage: boolean
}

function em(val: string | null | undefined) {
  if (val == null || val === '') return '—'
  return val
}

/** Potência sempre na unidade cadastrada (potencia_corrente_valor / potencia_corrente_unidade). */
function formatPotencia(c: CargaListItem) {
  if (c.potencia_corrente_valor != null && c.potencia_corrente_valor !== '') {
    const u = c.potencia_corrente_unidade ?? ''
    return u ? `${c.potencia_corrente_valor} ${u}` : c.potencia_corrente_valor
  }
  return '—'
}

function formatCorrente(c: CargaListItem) {
  if (c.corrente_calculada_a != null && c.corrente_calculada_a !== '') {
    return `${c.corrente_calculada_a} A`
  }
  return '—'
}

export default function CargaTable({
  cargas,
  projetoId,
  onDeleteRequest,
  canManage,
}: CargaTableProps) {
  if (cargas.length === 0) {
    return (
      <p className="text-muted mb-0">
        Nenhuma carga cadastrada para este projeto.{' '}
        {canManage ? <Link to={`/cargas/novo?projeto=${projetoId}`}>Cadastrar carga</Link> : null}
      </p>
    )
  }

  return (
    <div className="table-responsive app-data-table">
      <table className="table table-hover align-middle">
        <thead>
          <tr>
            <th>Tag</th>
            <th>Descrição</th>
            <th>Tipo</th>
            <th>Potência</th>
            <th>Corrente</th>
            <th>Tensão</th>
            <th>Fases</th>
            <th>Qtd.</th>
            <th>Ativo</th>
            {canManage ? <th className="text-end">Ações</th> : null}
          </tr>
        </thead>
        <tbody>
          {cargas.map((c) => (
            <tr key={c.id}>
              <td>
                <Link to={`/cargas/${c.id}`}>{c.tag}</Link>
              </td>
              <td>{c.descricao}</td>
              <td>
                <span className="badge text-bg-secondary">
                  {c.tipo_display ?? c.tipo}
                </span>
              </td>
              <td>{formatPotencia(c)}</td>
              <td>{formatCorrente(c)}</td>
              <td>
                <div>{em(c.projeto_tensao_display)}</div>
                {c.projeto_tipo_corrente_display ? (
                  <div className="small text-muted">
                    {c.projeto_tipo_corrente_display}
                  </div>
                ) : null}
              </td>
              <td>{em(c.projeto_fases_display)}</td>
              <td>{c.quantidade}</td>
              <td>{c.ativo ? 'Sim' : 'Não'}</td>
              {canManage ? (
                <td className="text-end">
                  <div className="d-flex justify-content-end gap-2 flex-wrap table-actions">
                    <Link
                      to={`/cargas/${c.id}/editar`}
                      className="btn btn-sm btn-outline-primary"
                    >
                      Editar
                    </Link>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => onDeleteRequest(c.id)}
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
