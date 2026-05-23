import { useInclusaoManualCatalogoSection } from '../hooks/useInclusaoManualCatalogoSection'
import type { InclusaoManualItem } from '../types/composicao'
import { InclusaoManualCatalogoForm } from './InclusaoManualCatalogoForm'

type Props = {
  projetoId: string
  podeEditar: boolean
  inclusoes: InclusaoManualItem[]
}

function em(v: string | null | undefined) {
  if (v == null || v === '') return '—'
  return v
}

function InclusoesManuaisTable({
  inclusoes,
  podeEditar,
  busy,
  onRemover,
}: Readonly<{
  inclusoes: InclusaoManualItem[]
  podeEditar: boolean
  busy: boolean
  onRemover: (id: string) => void
}>) {
  if (inclusoes.length === 0) {
    return <p className="text-muted small mb-0">Nenhuma inclusão manual registrada.</p>
  }

  return (
    <div className="table-responsive app-data-table">
      <table className="table table-sm table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Código</th>
            <th>Descrição</th>
            <th>Qtd.</th>
            <th>Obs.</th>
            {podeEditar ? <th className="text-end">Ações</th> : null}
          </tr>
        </thead>
        <tbody>
          {inclusoes.map((row) => (
            <tr key={row.id}>
              <td>
                <span className="badge text-bg-secondary">
                  {row.categoria_produto_display ?? row.categoria_produto}
                </span>
              </td>
              <td className="font-monospace fw-semibold">{row.produto?.codigo ?? '—'}</td>
              <td className="small">{em(row.produto?.descricao)}</td>
              <td>{row.quantidade}</td>
              <td className="small">{em(row.observacoes)}</td>
              {podeEditar ? (
                <td className="text-end">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    disabled={busy}
                    onClick={() => onRemover(row.id)}
                  >
                    Remover
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

export function InclusaoManualCatalogoSection({
  projetoId,
  podeEditar,
  inclusoes,
}: Readonly<Props>) {
  const form = useInclusaoManualCatalogoSection(projetoId, podeEditar)

  return (
    <div className="col-12">
      <div className="card border">
        <div className="card-body">
          <h2 className="h5 mb-2">Inclusões manuais (catálogo)</h2>
          <p className="small text-muted mb-3">
            Acrescente materiais do catálogo que não entram pelas sugestões automáticas.
            Busque por código, descrição ou fabricante. Opcionalmente restrinja a busca a uma
            categoria (PLCs, ventiladores, cabos, etc.).
          </p>

          {podeEditar ? (
            <InclusaoManualCatalogoForm {...form} />
          ) : (
            <p className="small text-muted mb-3">
              Projeto finalizado: inclusões manuais não podem ser alteradas.
            </p>
          )}

          <InclusoesManuaisTable
            inclusoes={inclusoes}
            podeEditar={podeEditar}
            busy={form.busy}
            onRemover={form.onRemover}
          />
        </div>
      </div>
    </div>
  )
}
