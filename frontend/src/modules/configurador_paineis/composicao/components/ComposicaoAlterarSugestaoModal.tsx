import { useEffect } from 'react'
import type { ProdutoAlternativa } from '../types/composicao'
import type { SugestaoItem } from '../types/composicao'
import { em } from '../utils/composicaoDisplay'

type Props = {
  sugestao: SugestaoItem
  alternativas: ProdutoAlternativa[]
  loadingAlternativas: boolean
  erroAlternativas: boolean
  loadErroAlternativas: unknown
  alternativaSelecionadaId: string | null
  setAlternativaSelecionadaId: (id: string | null) => void
  aprovarPending: boolean
  onClose: () => void
  onAprovar: (sugestaoId: string, produtoId: string) => void
}

export function ComposicaoAlterarSugestaoModal({
  sugestao,
  alternativas,
  loadingAlternativas,
  erroAlternativas,
  loadErroAlternativas,
  alternativaSelecionadaId,
  setAlternativaSelecionadaId,
  aprovarPending,
  onClose,
  onAprovar,
}: Props) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !aprovarPending) onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [aprovarPending, onClose])

  return (
    <>
      <div
        className="modal fade show d-block"
        style={{ zIndex: 1060 }}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="comp-alterar-title"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable px-2">
          <div className="modal-content">
            <div className="modal-header">
              <h2 id="comp-alterar-title" className="modal-title h5 mb-0">
                Alternativas de catálogo
              </h2>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={aprovarPending}
                aria-label="Fechar"
              />
            </div>
            <div className="modal-body">
              <p className="small text-muted">
                Mesmas regras da sugestão automática para a categoria deste item (ex.: corrente
                compatível; contatora com mesma bobina; montagem alinhada quando aplicável).
                Selecione um produto e confirme para aprovar com substituição.
              </p>
              {loadingAlternativas ? (
                <p className="small text-muted mb-0">Carregando alternativas…</p>
              ) : erroAlternativas ? (
                <p className="text-danger small mb-0">
                  {loadErroAlternativas instanceof Error
                    ? loadErroAlternativas.message
                    : 'Não foi possível carregar as alternativas.'}
                </p>
              ) : alternativas.length === 0 ? (
                <p className="small text-muted mb-0">
                  Nenhuma alternativa listada. Você pode fechar e usar &quot;Aprovar&quot; na linha
                  para manter o produto sugerido.
                </p>
              ) : (
                <div className="table-responsive app-data-table">
                  <table className="table table-sm table-hover align-middle">
                    <thead>
                      <tr>
                        <th aria-hidden />
                        <th>Código</th>
                        <th>Descrição</th>
                        <th>Fabricante</th>
                        <th className="text-end">Preço base</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alternativas.map((a) => (
                        <tr
                          key={a.id}
                          role="button"
                          tabIndex={0}
                          className={
                            alternativaSelecionadaId === a.id ? 'table-active' : undefined
                          }
                          onClick={() => setAlternativaSelecionadaId(a.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setAlternativaSelecionadaId(a.id)
                            }
                          }}
                        >
                          <td>
                            <input
                              type="radio"
                              className="form-check-input"
                              name="alt-prod"
                              checked={alternativaSelecionadaId === a.id}
                              onChange={() => setAlternativaSelecionadaId(a.id)}
                              aria-label={`Selecionar ${a.codigo}`}
                            />
                          </td>
                          <td className="font-monospace fw-semibold">{a.codigo}</td>
                          <td className="small">{a.descricao}</td>
                          <td className="small">{em(a.fabricante)}</td>
                          <td className="text-end small">{em(a.preco_base)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onClose}
                disabled={aprovarPending}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={aprovarPending || !alternativaSelecionadaId}
                onClick={() => onAprovar(sugestao.id, alternativaSelecionadaId!)}
              >
                {aprovarPending ? 'Aprovando…' : 'Aprovar produto selecionado'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div
        className="modal-backdrop fade show"
        style={{ zIndex: 1055 }}
        aria-hidden="true"
        onClick={() => {
          if (!aprovarPending) onClose()
        }}
      />
    </>
  )
}
