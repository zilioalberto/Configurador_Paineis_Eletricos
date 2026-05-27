import type { ParametroConfiguracaoDto } from '../types/orcamentos'

type Props = Readonly<{
  lista: ParametroConfiguracaoDto[]
  podeGerenciar: boolean
  editandoChave: string | null
  valorRascunho: string
  descricaoRascunho: string
  salvandoChave: string | null
  onIniciarEdicao: (p: ParametroConfiguracaoDto) => void
  onCancelarEdicao: () => void
  onValorChange: (valor: string) => void
  onDescricaoChange: (descricao: string) => void
  onGuardar: (chave: string) => void
}>

export default function ParametrosErpTable({
  lista,
  podeGerenciar,
  editandoChave,
  valorRascunho,
  descricaoRascunho,
  salvandoChave,
  onIniciarEdicao,
  onCancelarEdicao,
  onValorChange,
  onDescricaoChange,
  onGuardar,
}: Props) {
  if (lista.length === 0) {
    return <p className="text-muted mb-0">Nenhum parâmetro nesta aba.</p>
  }

  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle">
        <thead>
          <tr>
            <th>Chave</th>
            <th>Valor</th>
            <th>Descrição</th>
            {podeGerenciar ? <th aria-label="Ações" /> : null}
          </tr>
        </thead>
        <tbody>
          {lista.map((p) => (
            <tr key={p.id}>
              <td>
                <code>{p.chave}</code>
              </td>
              <td>
                {editandoChave === p.chave && podeGerenciar ? (
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={valorRascunho}
                    onChange={(e) => onValorChange(e.target.value)}
                    disabled={salvandoChave === p.chave}
                    aria-label={`Valor de ${p.chave}`}
                  />
                ) : (
                  p.valor || '—'
                )}
              </td>
              <td>
                {editandoChave === p.chave && podeGerenciar ? (
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={descricaoRascunho}
                    onChange={(e) => onDescricaoChange(e.target.value)}
                    disabled={salvandoChave === p.chave}
                    aria-label={`Descrição de ${p.chave}`}
                  />
                ) : (
                  p.descricao || '—'
                )}
              </td>
              {podeGerenciar ? (
                <td>
                  {editandoChave === p.chave ? (
                    <div className="d-flex flex-wrap gap-1">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={salvandoChave === p.chave}
                        onClick={() => onGuardar(p.chave)}
                      >
                        {salvandoChave === p.chave ? '…' : 'Guardar'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        disabled={salvandoChave === p.chave}
                        onClick={onCancelarEdicao}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => onIniciarEdicao(p)}
                    >
                      Editar
                    </button>
                  )}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
