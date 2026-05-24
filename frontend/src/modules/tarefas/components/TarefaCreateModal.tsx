import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useToast } from '@/components/feedback'
import { useTarefaResponsaveisQuery } from '../hooks/useTarefaResponsaveisQuery'
import type { ColunaKanban, CriarTarefaPayload, PrioridadeTarefa, TipoTarefa } from '../types/tarefa'
import {
  DEFAULT_FORM_STATE,
  TIPOS_ETAPA_OPTIONS,
  type TarefaFormState,
} from '../utils/tarefasKanbanConstants'
import {
  idColunaPendentes,
  minDatetimeLocalHoje,
  prazoCriacaoValido,
  tarefaFormToPayloadNovaTarefa,
} from '../utils/tarefasKanbanUtils'
import { ColaboradoresChecklist } from './ColaboradoresChecklist'

/** Modal de criação de nova tarefa no Kanban. */
export function TarefaCreateModal({
  colunas,
  isSubmitting,
  onClose,
  onSubmit,
}: Readonly<{
  colunas: ColunaKanban[]
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (payload: CriarTarefaPayload) => Promise<void>
}>) {
  const { showToast } = useToast()
  const responsaveisQuery = useTarefaResponsaveisQuery()
  const colunaPendentesId = useMemo(() => idColunaPendentes(colunas), [colunas])
  const prazoMin = useMemo(() => minDatetimeLocalHoje(), [])
  const [form, setForm] = useState<TarefaFormState>(() => ({ ...DEFAULT_FORM_STATE }))

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }

    globalThis.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      globalThis.removeEventListener('keydown', onKeyDown)
    }
  }, [isSubmitting, onClose])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.titulo.trim()) return
    if (!colunaPendentesId) {
      showToast({
        variant: 'danger',
        message: 'Não foi encontrada a coluna Pendentes no quadro.',
      })
      return
    }
    if (form.prazo && !prazoCriacaoValido(form.prazo)) {
      showToast({
        variant: 'warning',
        message: 'O prazo não pode ser anterior ao dia de hoje.',
      })
      return
    }
    if (form.tipo_etapa === 'PROPOSTA' && !form.proposta_referencia.trim()) {
      showToast({
        variant: 'warning',
        message: 'Informe a referência da proposta.',
      })
      return
    }
    if (
      form.tipo_etapa === 'PRODUCAO' &&
      (!form.proposta_referencia.trim() || !form.ordem_producao_referencia.trim())
    ) {
      showToast({
        variant: 'warning',
        message: 'Informe a referência da proposta e da ordem de produção.',
      })
      return
    }
    await onSubmit(tarefaFormToPayloadNovaTarefa(form, colunaPendentesId))
  }

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tarefa-create-modal-title"
      >
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable tarefa-edit-modal">
          <form className="modal-content" onSubmit={(event) => { handleSubmit(event).catch(() => undefined) }}>
            <div className="modal-header">
              <h2 id="tarefa-create-modal-title" className="modal-title h5 mb-0">
                Nova tarefa
              </h2>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={isSubmitting}
                aria-label="Fechar"
              />
            </div>
            <div className="modal-body">
              <p className="text-muted small mb-3">
                Novas tarefas entram em <strong>Pendentes</strong>. Use as secções abaixo quando
                precisar de classificação, prazo ou equipa.
              </p>

              <section
                className="rounded border bg-body-secondary bg-opacity-25 p-3 mb-3"
                aria-labelledby="tarefa-create-essencial-heading"
              >
                <h3 id="tarefa-create-essencial-heading" className="h6 mb-3">
                  O essencial
                </h3>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label" htmlFor="tarefa-titulo">
                      Título <span className="text-danger">*</span>
                    </label>
                    <input
                      id="tarefa-titulo"
                      className="form-control"
                      value={form.titulo}
                      maxLength={180}
                      required
                      autoFocus
                      autoComplete="off"
                      placeholder="Ex.: Enviar proposta ao cliente, revisar diagrama…"
                      onChange={(event) =>
                        setForm((state) => ({ ...state, titulo: event.target.value }))
                      }
                    />
                    <div className="form-text">Um título curto e acionável ajuda o quadro a ficar legível.</div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="tarefa-prioridade">
                      Prioridade
                    </label>
                    <select
                      id="tarefa-prioridade"
                      className="form-select"
                      value={form.prioridade}
                      onChange={(event) =>
                        setForm((state) => ({
                          ...state,
                          prioridade: event.target.value as PrioridadeTarefa,
                        }))
                      }
                    >
                      <option value="BAIXA">Baixa</option>
                      <option value="MEDIA">Média</option>
                      <option value="ALTA">Alta</option>
                      <option value="URGENTE">Urgente</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="tarefa-prazo">
                      Prazo (opcional)
                    </label>
                    <input
                      id="tarefa-prazo"
                      className="form-control"
                      type="datetime-local"
                      min={prazoMin}
                      value={form.prazo}
                      onChange={(event) =>
                        setForm((state) => ({ ...state, prazo: event.target.value }))
                      }
                    />
                  </div>
                </div>
              </section>

              <section
                className="rounded border p-3 mb-3"
                aria-labelledby="tarefa-create-class-heading"
              >
                <h3 id="tarefa-create-class-heading" className="h6 mb-3">
                  Classificação e referências
                </h3>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="tarefa-tipo-etapa">
                      Tipo de etapa
                    </label>
                    <select
                      id="tarefa-tipo-etapa"
                      className="form-select"
                      value={form.tipo_etapa}
                      onChange={(event) => {
                        const tipo = event.target.value as TipoTarefa
                        setForm((state) => {
                          const next = { ...state, tipo_etapa: tipo }
                          if (tipo === 'NAO_CLASSIFICADA' || tipo === 'INTERNA') {
                            next.proposta_referencia = ''
                            next.ordem_producao_referencia = ''
                          } else if (tipo === 'PROPOSTA') {
                            next.ordem_producao_referencia = ''
                          }
                          return next
                        })
                      }}
                    >
                      {TIPOS_ETAPA_OPTIONS.map((opcao) => (
                        <option key={opcao.value} value={opcao.value}>
                          {opcao.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {form.tipo_etapa === 'PROPOSTA' ? (
                    <div className="col-md-6">
                      <label className="form-label" htmlFor="tarefa-orcamento">
                        Proposta (referência manual)
                      </label>
                      <input
                        id="tarefa-orcamento"
                        className="form-control"
                        value={form.proposta_referencia}
                        maxLength={100}
                        placeholder="Código ou texto livre"
                        onChange={(event) =>
                          setForm((state) => ({
                            ...state,
                            proposta_referencia: event.target.value,
                          }))
                        }
                      />
                    </div>
                  ) : null}
                  {form.tipo_etapa === 'PRODUCAO' ? (
                    <>
                      <div className="col-md-6">
                        <label className="form-label" htmlFor="tarefa-orcamento">
                          Proposta (referência manual)
                        </label>
                        <input
                          id="tarefa-orcamento"
                          className="form-control"
                          value={form.proposta_referencia}
                          maxLength={100}
                          placeholder="Código ou texto livre"
                          onChange={(event) =>
                            setForm((state) => ({
                              ...state,
                              proposta_referencia: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" htmlFor="tarefa-ordem-producao">
                          Ordem de produção (referência manual)
                        </label>
                        <input
                          id="tarefa-ordem-producao"
                          className="form-control"
                          value={form.ordem_producao_referencia}
                          maxLength={100}
                          placeholder="OP ou referência interna"
                          onChange={(event) =>
                            setForm((state) => ({
                              ...state,
                              ordem_producao_referencia: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </>
                  ) : null}
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="tarefa-horas-estipuladas-create">
                      Horas estipuladas (opcional)
                    </label>
                    <input
                      id="tarefa-horas-estipuladas-create"
                      className="form-control"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="ex.: 8,5"
                      value={form.horas_estipuladas}
                      onChange={(event) =>
                        setForm((state) => ({ ...state, horas_estipuladas: event.target.value }))
                      }
                    />
                    <p className="form-text mb-0 small text-muted">
                      Tempo previsto para execução da tarefa (referência).
                    </p>
                  </div>
                </div>
              </section>

              <details className="rounded border p-3 mb-3">
                <summary className="fw-semibold user-select-none" style={{ cursor: 'pointer' }}>
                  Responsável e colaboradores (opcional)
                </summary>
                <div className="row g-3 mt-2">
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="tarefa-responsavel-create">
                      Responsável
                    </label>
                    <select
                      id="tarefa-responsavel-create"
                      className="form-select"
                      value={form.responsavel}
                      disabled={responsaveisQuery.isPending}
                      onChange={(event) =>
                        setForm((state) => ({ ...state, responsavel: event.target.value }))
                      }
                    >
                      <option value="">Sem responsável</option>
                      {(responsaveisQuery.data ?? []).map((responsavel) => (
                        <option key={responsavel.id} value={responsavel.id}>
                          {responsavel.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label" id="tarefa-colaboradores-label">
                      Colaboradores
                    </label>
                    <ColaboradoresChecklist
                      labelId="tarefa-colaboradores-label"
                      colaboradores={form.colaboradores}
                      disabled={responsaveisQuery.isPending}
                      responsaveis={responsaveisQuery.data ?? []}
                      onChange={(colaboradores) =>
                        setForm((state) => ({ ...state, colaboradores }))
                      }
                    />
                    <p className="form-text mb-0">
                      Quem estiver marcado vê a tarefa no quadro e pode classificá-la; a classificação é
                      única para todos — depois, cada um pode iniciar o cronómetro quando for a vez.
                    </p>
                  </div>
                </div>
              </details>

              <div className="mb-1">
                <label className="form-label" htmlFor="tarefa-descricao">
                  Descrição (opcional)
                </label>
                <textarea
                  id="tarefa-descricao"
                  className="form-control"
                  rows={3}
                  value={form.descricao}
                  placeholder="Contexto, links, critérios de aceitação…"
                  onChange={(event) =>
                    setForm((state) => ({ ...state, descricao: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || !form.titulo.trim() || !colunaPendentesId}
              >
                {isSubmitting ? 'Salvando...' : 'Criar tarefa'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop fade show" aria-hidden="true" />
    </>
  )
}
