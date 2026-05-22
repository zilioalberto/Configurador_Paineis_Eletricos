import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import {
  useAjustarApontamentoHoraMutation,
  useAprovarApontamentoHoraMutation,
  useAtualizarComentarioTarefaMutation,
  useCriarComentarioTarefaMutation,
  useEliminarComentarioTarefaMutation,
  useExcluirTarefaMutation,
  useRejeitarApontamentoHoraMutation,
} from '../hooks/useTarefaMutations'
import { useTarefaApontamentosQuery } from '../hooks/useTarefaApontamentosQuery'
import { useTarefaComentariosQuery } from '../hooks/useTarefaComentariosQuery'
import { useTarefaHistoricoQuery } from '../hooks/useTarefaHistoricoQuery'
import { useTarefaResponsaveisQuery } from '../hooks/useTarefaResponsaveisQuery'
import type {
  ColunaKanban,
  ComentarioTarefa,
  HistoricoTarefaItem,
  PrioridadeTarefa,
  TarefaKanbanItem,
  TipoTarefa,
} from '../types/tarefa'
import { TIPOS_ETAPA_OPTIONS, type TarefaFormState } from '../utils/tarefasKanbanConstants'
import {
  formatarDataApontamento,
  formatarDataHora,
  formatarHoras,
  formatarTempo,
  horasEstipuladasFormParaApi,
  origemApontamento,
  rotuloStatusApontamento,
  tarefaEntregue,
  tarefaToFormState,
  totalizarHoras,
} from '../utils/tarefasKanbanUtils'
import { ColaboradoresChecklist } from './ColaboradoresChecklist'
import { TarefaPainelExpansivel } from './TarefaPainelExpansivel'

export function TarefaEditModal({
  tarefa,
  colunas,
  timerAtivo,
  tempoAtivoSegundos,
  podeEditar,
  podeClassificar,
  podeAlterarClassificacaoComApontamentos,
  podeApontarHoras,
  isSubmitting,
  isSavingTime,
  onClose,
  onSaveEdicao,
  onStartTimer,
  onStopTimer,
}: Readonly<{
  tarefa: TarefaKanbanItem
  colunas: ColunaKanban[]
  timerAtivo: boolean
  tempoAtivoSegundos: number
  podeEditar: boolean
  podeClassificar: boolean
  podeAlterarClassificacaoComApontamentos: boolean
  podeApontarHoras: boolean
  isSubmitting: boolean
  isSavingTime: boolean
  onClose: () => void
  onSaveEdicao: (form: TarefaFormState) => Promise<void>
  onStartTimer: (tarefa: TarefaKanbanItem) => Promise<void>
  onStopTimer: () => Promise<void>
}>) {
  const { showToast } = useToast()
  const { user } = useAuth()
  const responsaveisQuery = useTarefaResponsaveisQuery()
  const apontamentosQuery = useTarefaApontamentosQuery(tarefa.id)
  const historicoQuery = useTarefaHistoricoQuery(tarefa.id)
  const comentariosQuery = useTarefaComentariosQuery(tarefa.id)
  const apontamentos = apontamentosQuery.data ?? []
  const entregue = tarefaEntregue(tarefa)
  const podeVerOrcamentos = hasPermission(user, PERMISSION_KEYS.ORCAMENTO_VISUALIZAR)
  const podeAprovarHoras = hasPermission(user, PERMISSION_KEYS.TAREFA_APROVAR_HORAS)
  const podeAjustarHoras = hasPermission(user, PERMISSION_KEYS.TAREFA_AJUSTAR_HORAS)
  const podeExcluirTarefaKanban = hasPermission(user, PERMISSION_KEYS.TAREFA_EXCLUIR)
  const criarComentarioMutation = useCriarComentarioTarefaMutation()
  const atualizarComentarioMutation = useAtualizarComentarioTarefaMutation()
  const eliminarComentarioMutation = useEliminarComentarioTarefaMutation()
  const excluirTarefaMutation = useExcluirTarefaMutation()
  const aprovarApontamentoMutation = useAprovarApontamentoHoraMutation()
  const rejeitarApontamentoMutation = useRejeitarApontamentoHoraMutation()
  const ajustarApontamentoMutation = useAjustarApontamentoHoraMutation()
  const classificacaoBloqueada =
    apontamentos.length > 0 && !podeAlterarClassificacaoComApontamentos
  const desabilitarClassificacao = !podeClassificar || classificacaoBloqueada
  const podeSalvarAlgumCampo = podeEditar || podeClassificar
  const totalHorasApontadas = useMemo(() => {
    if (!apontamentosQuery.isPending && !apontamentosQuery.isError) {
      return totalizarHoras(apontamentos)
    }
    return tarefa.total_horas_apontadas ?? '0.00'
  }, [
    apontamentos,
    apontamentosQuery.isError,
    apontamentosQuery.isPending,
    tarefa.total_horas_apontadas,
  ])
  const [form, setForm] = useState<TarefaFormState>(() => tarefaToFormState(tarefa))
  const [textoNovoComentario, setTextoNovoComentario] = useState('')
  const [comentarioEmEdicao, setComentarioEmEdicao] = useState<{
    id: string
    texto: string
  } | null>(null)
  const [painelLogHorasAberto, setPainelLogHorasAberto] = useState(false)
  const [painelHistoricoAberto, setPainelHistoricoAberto] = useState(false)
  const [ajusteApontamentoId, setAjusteApontamentoId] = useState<string | null>(null)
  const [formAjusteApontamento, setFormAjusteApontamento] = useState({
    justificativa: '',
    horas: '',
    data: '',
  })

  useEffect(() => {
    setForm(tarefaToFormState(tarefa))
  }, [tarefa])

  const horasEstipuladasResumo = useMemo(() => {
    const v = horasEstipuladasFormParaApi(form.horas_estipuladas)
    return v ? formatarHoras(v) : '—'
  }, [form.horas_estipuladas])

  const mutacoesExtrasPendentes =
    criarComentarioMutation.isPending ||
    atualizarComentarioMutation.isPending ||
    eliminarComentarioMutation.isPending ||
    aprovarApontamentoMutation.isPending ||
    rejeitarApontamentoMutation.isPending ||
    ajustarApontamentoMutation.isPending

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (
        event.key === 'Escape' &&
        !isSubmitting &&
        !isSavingTime &&
        !mutacoesExtrasPendentes
      ) {
        onClose()
      }
    }

    globalThis.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      globalThis.removeEventListener('keydown', onKeyDown)
    }
  }, [isSavingTime, isSubmitting, mutacoesExtrasPendentes, onClose])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.titulo.trim() || !form.coluna || !podeSalvarAlgumCampo) return
    await onSaveEdicao(form)
  }

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tarefa-edit-modal-title"
      >
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable tarefa-edit-modal">
          <form className="modal-content" onSubmit={(event) => { handleSubmit(event).catch(() => undefined) }}>
            <div className="modal-header">
              <div>
                <h2 id="tarefa-edit-modal-title" className="modal-title h5 mb-0">
                  Editar tarefa
                </h2>
                <p className="text-muted small mb-0">{tarefa.status_display}</p>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={isSubmitting || isSavingTime || mutacoesExtrasPendentes}
                aria-label="Fechar"
              />
            </div>
            <div className="modal-body">
              <div className="row g-4 align-items-start">
                <div className="col-lg-7">
              <div className="tarefa-timer-panel mb-3">
                <div className="tarefa-timer-panel__metrics">
                  <div aria-label="Totalizador de horas gastas">
                    <span>Total gasto</span>
                    <strong>{formatarHoras(totalHorasApontadas)}</strong>
                  </div>
                  <div>
                    <span>Tempo em andamento</span>
                    <strong>{timerAtivo ? formatarTempo(tempoAtivoSegundos) : '00:00:00'}</strong>
                  </div>
                  <div aria-label="Horas estipuladas para a tarefa">
                    <span>Estipulado</span>
                    <strong>{horasEstipuladasResumo}</strong>
                  </div>
                </div>
                {podeApontarHoras && !entregue ? (
                  timerAtivo ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => { onStopTimer().catch(() => undefined) }}
                      disabled={isSavingTime}
                    >
                      {isSavingTime ? 'Registrando...' : 'Parar e registrar'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm btn-success"
                      onClick={() => { onStartTimer(tarefa).catch(() => undefined) }}
                      disabled={isSavingTime || tarefa.pode_iniciar === false}
                      title={
                        tarefa.pode_iniciar === false
                          ? 'Classifique a tarefa (orçamento/OP) antes de iniciar o cronômetro.'
                          : undefined
                      }
                    >
                      Iniciar horas
                    </button>
                  )
                ) : (
                  <span className="text-muted small">
                    {entregue ? 'Tarefa entregue.' : 'Sem permissão para apontar horas.'}
                  </span>
                )}
              </div>

              <div className="row g-3">
                <div className="col-md-8">
                  <label className="form-label" htmlFor="tarefa-edit-titulo">
                    Título
                  </label>
                  <input
                    id="tarefa-edit-titulo"
                    className="form-control"
                    value={form.titulo}
                    maxLength={180}
                    required
                    disabled={!podeEditar}
                    onChange={(event) =>
                      setForm((state) => ({ ...state, titulo: event.target.value }))
                    }
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="tarefa-edit-prioridade">
                    Prioridade
                  </label>
                  <select
                    id="tarefa-edit-prioridade"
                    className="form-select"
                    value={form.prioridade}
                    disabled={!podeEditar}
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
                  <label className="form-label" htmlFor="tarefa-edit-responsavel">
                    Responsável
                  </label>
                  <select
                    id="tarefa-edit-responsavel"
                    className="form-select"
                    value={form.responsavel}
                    disabled={!podeEditar || responsaveisQuery.isPending}
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
                <div className="col-md-6">
                  <label className="form-label" htmlFor="tarefa-edit-tipo-etapa">
                    Tipo de etapa
                  </label>
                  <select
                    id="tarefa-edit-tipo-etapa"
                    className="form-select"
                    value={form.tipo_etapa}
                    disabled={desabilitarClassificacao}
                    onChange={(event) =>
                      setForm((state) => ({
                        ...state,
                        tipo_etapa: event.target.value as TipoTarefa,
                      }))
                    }
                  >
                    {TIPOS_ETAPA_OPTIONS.map((opcao) => (
                      <option key={opcao.value} value={opcao.value}>
                        {opcao.label}
                      </option>
                    ))}
                  </select>
                </div>
                {classificacaoBloqueada ? (
                  <div className="col-12">
                    <p className="text-muted small mb-0">
                      Esta tarefa já tem apontamentos de horas. Só é possível alterar a classificação
                      com permissão específica.
                    </p>
                  </div>
                ) : null}
                <div className="col-12">
                  <label className="form-label" id="tarefa-edit-colaboradores-label">
                    Colaboradores
                  </label>
                  <ColaboradoresChecklist
                    labelId="tarefa-edit-colaboradores-label"
                    colaboradores={form.colaboradores}
                    disabled={!podeEditar || responsaveisQuery.isPending}
                    responsaveis={responsaveisQuery.data ?? []}
                    onChange={(colaboradores) =>
                      setForm((state) => ({ ...state, colaboradores }))
                    }
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="tarefa-edit-prazo">
                    Prazo
                  </label>
                  <input
                    id="tarefa-edit-prazo"
                    className="form-control"
                    type="datetime-local"
                    value={form.prazo}
                    disabled={!podeEditar}
                    onChange={(event) =>
                      setForm((state) => ({ ...state, prazo: event.target.value }))
                    }
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="tarefa-edit-orcamento">
                    Proposta
                  </label>
                  <input
                    id="tarefa-edit-orcamento"
                    className="form-control"
                    value={form.proposta_referencia}
                    maxLength={100}
                    disabled={desabilitarClassificacao}
                    onChange={(event) =>
                      setForm((state) => ({
                        ...state,
                        proposta_referencia: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="tarefa-edit-ordem-producao">
                    Ordem de produção
                  </label>
                  <input
                    id="tarefa-edit-ordem-producao"
                    className="form-control"
                    value={form.ordem_producao_referencia}
                    maxLength={100}
                    disabled={desabilitarClassificacao}
                    onChange={(event) =>
                      setForm((state) => ({
                        ...state,
                        ordem_producao_referencia: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="tarefa-edit-horas-estipuladas">
                    Horas estipuladas
                  </label>
                  <input
                    id="tarefa-edit-horas-estipuladas"
                    className="form-control"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="ex.: 8,5"
                    value={form.horas_estipuladas}
                    disabled={!(podeEditar || podeClassificar)}
                    onChange={(event) =>
                      setForm((state) => ({ ...state, horas_estipuladas: event.target.value }))
                    }
                  />
                  <p className="form-text mb-0 small text-muted">
                    Tempo previsto para execução (referência).
                  </p>
                </div>
                <div className="col-12">
                  <label className="form-label" htmlFor="tarefa-edit-descricao">
                    Descrição
                  </label>
                  <textarea
                    id="tarefa-edit-descricao"
                    className="form-control"
                    rows={3}
                    value={form.descricao}
                    disabled={!podeEditar}
                    onChange={(event) =>
                      setForm((state) => ({ ...state, descricao: event.target.value }))
                    }
                  />
                </div>
              </div>

              {podeVerOrcamentos && form.proposta_referencia.trim() ? (
                <div className="mb-3 d-flex flex-wrap gap-2 align-items-center">
                  <Link className="btn btn-sm btn-outline-secondary" to="/erp/orcamentos">
                    Orçamentos (ERP)
                  </Link>
                </div>
              ) : null}
                </div>

                <div className="col-lg-5 tarefa-edit-modal__sidebar">
              <section className="tarefa-hours-log mt-0" aria-label="Comentários da tarefa">
                <div className="tarefa-hours-log__header">
                  <div>
                    <h3>Comentários</h3>
                    <p>Discussão sobre esta tarefa.</p>
                  </div>
                  <span>{(comentariosQuery.data ?? []).length}</span>
                </div>
                {comentariosQuery.isPending ? (
                  <p className="tarefa-hours-log__empty">Carregando comentários...</p>
                ) : null}
                {comentariosQuery.isError ? (
                  <p className="tarefa-hours-log__empty">
                    Não foi possível carregar os comentários.
                  </p>
                ) : null}
                {(comentariosQuery.data ?? []).map((c: ComentarioTarefa) => (
                  <div key={c.id} className="border rounded p-2 mb-2 bg-light">
                    <div className="d-flex justify-content-between gap-2">
                      <small className="text-muted">
                        {c.autor_nome ?? '—'} · {formatarDataHora(c.criado_em)}
                      </small>
                      {podeEditar ? (
                        <span className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-link p-0"
                            onClick={() =>
                              setComentarioEmEdicao({ id: c.id, texto: c.comentario })
                            }
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-link text-danger p-0"
                            disabled={eliminarComentarioMutation.isPending}
                            onClick={() => {
                              if (!globalThis.confirm('Excluir este comentário?')) return
                              eliminarComentarioMutation
                                .mutateAsync({ tarefaId: tarefa.id, comentarioId: c.id })
                                .catch(() =>
                                  showToast({
                                    variant: 'danger',
                                    message: 'Não foi possível excluir.',
                                  })
                                )
                            }}
                          >
                            Excluir
                          </button>
                        </span>
                      ) : null}
                    </div>
                    {comentarioEmEdicao?.id === c.id ? (
                      <div className="mt-2">
                        <textarea
                          className="form-control form-control-sm"
                          rows={3}
                          value={comentarioEmEdicao.texto}
                          onChange={(event) =>
                            setComentarioEmEdicao((prev) =>
                              prev ? { ...prev, texto: event.target.value } : prev
                            )
                          }
                        />
                        <div className="mt-2 d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            disabled={atualizarComentarioMutation.isPending}
                            onClick={() => {
                              const texto = comentarioEmEdicao.texto.trim()
                              if (!texto) return
                              atualizarComentarioMutation
                                .mutateAsync({
                                  tarefaId: tarefa.id,
                                  comentarioId: comentarioEmEdicao.id,
                                  texto,
                                })
                                .then(() => setComentarioEmEdicao(null))
                                .catch(() =>
                                  showToast({
                                    variant: 'danger',
                                    message: 'Não foi possível salvar.',
                                  })
                                )
                            }}
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setComentarioEmEdicao(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mb-0 mt-1 small">{c.comentario}</p>
                    )}
                  </div>
                ))}
                {podeEditar ? (
                  <div className="mt-2">
                    <label className="form-label small" htmlFor="tarefa-novo-comentario">
                      Novo comentário
                    </label>
                    <textarea
                      id="tarefa-novo-comentario"
                      className="form-control form-control-sm"
                      rows={2}
                      value={textoNovoComentario}
                      onChange={(event) => setTextoNovoComentario(event.target.value)}
                      disabled={criarComentarioMutation.isPending}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-primary mt-2"
                      disabled={
                        criarComentarioMutation.isPending || !textoNovoComentario.trim()
                      }
                      onClick={() => {
                        const texto = textoNovoComentario.trim()
                        if (!texto) return
                        criarComentarioMutation
                          .mutateAsync({ tarefaId: tarefa.id, texto })
                          .then(() => setTextoNovoComentario(''))
                          .catch(() =>
                            showToast({
                              variant: 'danger',
                              message: 'Não foi possível enviar o comentário.',
                            })
                          )
                      }}
                    >
                      Enviar
                    </button>
                  </div>
                ) : null}
              </section>

              <TarefaPainelExpansivel
                painelId={`tarefa-${tarefa.id}-log-horas`}
                titulo="Log de horas"
                descricao="Registros feitos pelos colaboradores nesta tarefa."
                badge={
                  <span>
                    {apontamentos.length} registro{apontamentos.length === 1 ? '' : 's'}
                  </span>
                }
                aberto={painelLogHorasAberto}
                onAlternar={() => setPainelLogHorasAberto((aberto) => !aberto)}
              >
                {apontamentosQuery.isPending ? (
                  <p className="tarefa-hours-log__empty">Carregando apontamentos...</p>
                ) : null}

                {apontamentosQuery.isError ? (
                  <p className="tarefa-hours-log__empty">
                    Não foi possível carregar o log de horas.
                  </p>
                ) : null}

                {!apontamentosQuery.isPending &&
                !apontamentosQuery.isError &&
                apontamentos.length === 0 ? (
                  <p className="tarefa-hours-log__empty">
                    Nenhum apontamento registrado até agora.
                  </p>
                ) : null}

                {apontamentos.length > 0 ? (
                  <div className="tarefa-hours-log__list">
                    {apontamentos.map((apontamento) => {
                      const pendenteAprovacao = apontamento.status_aprovacao === 'PENDENTE'
                      const podeAgirAprovacao =
                        podeAprovarHoras && pendenteAprovacao && !entregue
                      const podeAbrirAjuste =
                        podeAjustarHoras &&
                        apontamento.status_aprovacao !== 'CANCELADO' &&
                        !entregue

                      return (
                        <article className="tarefa-hours-log__item" key={apontamento.id}>
                          <div className="tarefa-hours-log__main">
                            <strong>{apontamento.colaborador_nome ?? 'Colaborador'}</strong>
                            <span>{origemApontamento(apontamento)}</span>
                          </div>
                          <div className="tarefa-hours-log__grid">
                            <span>
                              <small>Data</small>
                              {formatarDataApontamento(apontamento.data)}
                            </span>
                            <span>
                              <small>Horas</small>
                              {formatarHoras(apontamento.horas)}
                            </span>
                            <span>
                              <small>Status</small>
                              {rotuloStatusApontamento(apontamento.status_aprovacao)}
                            </span>
                            <span>
                              <small>Registrado em</small>
                              {formatarDataHora(apontamento.criado_em)}
                            </span>
                            <span>
                              <small>Início</small>
                              {formatarDataHora(apontamento.sessao_iniciado_em)}
                            </span>
                            <span>
                              <small>Fim</small>
                              {formatarDataHora(apontamento.sessao_finalizado_em)}
                            </span>
                            <span>
                              <small>Etapa</small>
                              {apontamento.etapa || '-'}
                            </span>
                          </div>
                          {apontamento.aprovado_por_nome ? (
                            <p className="small text-muted mb-1">
                              Aprovação: {apontamento.aprovado_por_nome}
                              {apontamento.aprovado_em
                                ? ` · ${formatarDataHora(apontamento.aprovado_em)}`
                                : ''}
                            </p>
                          ) : null}
                          {apontamento.justificativa_ajuste ? (
                            <p className="small mb-1">
                              <strong>Ajuste:</strong> {apontamento.justificativa_ajuste}
                            </p>
                          ) : null}
                          {apontamento.observacoes ? (
                            <p className="tarefa-hours-log__note">{apontamento.observacoes}</p>
                          ) : null}
                          {podeAgirAprovacao ? (
                            <div className="d-flex flex-wrap gap-2 mt-2">
                              <button
                                type="button"
                                className="btn btn-sm btn-success"
                                disabled={
                                  aprovarApontamentoMutation.isPending ||
                                  rejeitarApontamentoMutation.isPending
                                }
                                onClick={() =>
                                  aprovarApontamentoMutation
                                    .mutateAsync({
                                      apontamentoId: apontamento.id,
                                      tarefaId: tarefa.id,
                                    })
                                    .catch(() =>
                                      showToast({
                                        variant: 'danger',
                                        message: 'Não foi possível aprovar.',
                                      })
                                    )
                                }
                              >
                                Aprovar
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                disabled={
                                  aprovarApontamentoMutation.isPending ||
                                  rejeitarApontamentoMutation.isPending
                                }
                                onClick={() =>
                                  rejeitarApontamentoMutation
                                    .mutateAsync({
                                      apontamentoId: apontamento.id,
                                      tarefaId: tarefa.id,
                                    })
                                    .catch(() =>
                                      showToast({
                                        variant: 'danger',
                                        message: 'Não foi possível rejeitar.',
                                      })
                                    )
                                }
                              >
                                Rejeitar
                              </button>
                            </div>
                          ) : null}
                          {podeAbrirAjuste ? (
                            <div className="mt-2">
                              {ajusteApontamentoId === apontamento.id ? (
                                <div className="border rounded p-2 bg-light">
                                  <label className="form-label small mb-1" htmlFor={`ajuste-just-${apontamento.id}`}>
                                    Justificativa do ajuste (obrigatória)
                                  </label>
                                  <textarea
                                    id={`ajuste-just-${apontamento.id}`}
                                    className="form-control form-control-sm mb-2"
                                    rows={2}
                                    value={formAjusteApontamento.justificativa}
                                    onChange={(event) =>
                                      setFormAjusteApontamento((prev) => ({
                                        ...prev,
                                        justificativa: event.target.value,
                                      }))
                                    }
                                  />
                                  <div className="row g-2 mb-2">
                                    <div className="col-md-6">
                                      <label className="form-label small mb-0" htmlFor={`ajuste-horas-${apontamento.id}`}>
                                        Horas (opcional)
                                      </label>
                                      <input
                                        id={`ajuste-horas-${apontamento.id}`}
                                        type="text"
                                        className="form-control form-control-sm"
                                        value={formAjusteApontamento.horas}
                                        onChange={(event) =>
                                          setFormAjusteApontamento((prev) => ({
                                            ...prev,
                                            horas: event.target.value,
                                          }))
                                        }
                                      />
                                    </div>
                                    <div className="col-md-6">
                                      <label className="form-label small mb-0" htmlFor={`ajuste-data-${apontamento.id}`}>
                                        Data (opcional)
                                      </label>
                                      <input
                                        id={`ajuste-data-${apontamento.id}`}
                                        type="date"
                                        className="form-control form-control-sm"
                                        value={formAjusteApontamento.data}
                                        onChange={(event) =>
                                          setFormAjusteApontamento((prev) => ({
                                            ...prev,
                                            data: event.target.value,
                                          }))
                                        }
                                      />
                                    </div>
                                  </div>
                                  <div className="d-flex gap-2">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-primary"
                                      disabled={ajustarApontamentoMutation.isPending}
                                      onClick={() => {
                                        const justificativa =
                                          formAjusteApontamento.justificativa.trim()
                                        if (!justificativa) {
                                          showToast({
                                            variant: 'warning',
                                            message: 'Informe a justificativa do ajuste.',
                                          })
                                          return
                                        }
                                        ajustarApontamentoMutation
                                          .mutateAsync({
                                            apontamentoId: apontamento.id,
                                            tarefaId: tarefa.id,
                                            payload: {
                                              justificativa_ajuste: justificativa,
                                              ...(formAjusteApontamento.horas.trim()
                                                ? {
                                                    horas: formAjusteApontamento.horas.trim(),
                                                  }
                                                : {}),
                                              ...(formAjusteApontamento.data.trim()
                                                ? {
                                                    data: formAjusteApontamento.data.trim(),
                                                  }
                                                : {}),
                                            },
                                          })
                                          .then(() => {
                                            setAjusteApontamentoId(null)
                                            setFormAjusteApontamento({
                                              justificativa: '',
                                              horas: '',
                                              data: '',
                                            })
                                          })
                                          .catch(() =>
                                            showToast({
                                              variant: 'danger',
                                              message: 'Não foi possível ajustar o apontamento.',
                                            })
                                          )
                                      }}
                                    >
                                      Confirmar ajuste
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-secondary"
                                      disabled={ajustarApontamentoMutation.isPending}
                                      onClick={() => {
                                        setAjusteApontamentoId(null)
                                        setFormAjusteApontamento({
                                          justificativa: '',
                                          horas: '',
                                          data: '',
                                        })
                                      }}
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary"
                                  disabled={ajustarApontamentoMutation.isPending}
                                  onClick={() => {
                                    setAjusteApontamentoId(apontamento.id)
                                    setFormAjusteApontamento({
                                      justificativa: '',
                                      horas: apontamento.horas,
                                      data: apontamento.data,
                                    })
                                  }}
                                >
                                  Ajustar horas
                                </button>
                              )}
                            </div>
                          ) : null}
                        </article>
                      )
                    })}
                  </div>
                ) : null}
              </TarefaPainelExpansivel>

              <TarefaPainelExpansivel
                painelId={`tarefa-${tarefa.id}-historico`}
                titulo="Histórico"
                descricao="Alterações e eventos registrados automaticamente."
                badge={<span>{(historicoQuery.data ?? []).length}</span>}
                aberto={painelHistoricoAberto}
                onAlternar={() => setPainelHistoricoAberto((aberto) => !aberto)}
              >
                {historicoQuery.isPending ? (
                  <p className="tarefa-hours-log__empty">Carregando histórico...</p>
                ) : null}
                {historicoQuery.isError ? (
                  <p className="tarefa-hours-log__empty">
                    Não foi possível carregar o histórico.
                  </p>
                ) : null}
                {!historicoQuery.isPending &&
                !historicoQuery.isError &&
                (historicoQuery.data ?? []).length === 0 ? (
                  <p className="tarefa-hours-log__empty">Sem registros de histórico.</p>
                ) : null}
                {(historicoQuery.data ?? []).length > 0 ? (
                  <div className="tarefa-hours-log__list tarefa-hours-log__list--historico-panel">
                    {(historicoQuery.data ?? []).map((item: HistoricoTarefaItem) => (
                      <article className="tarefa-hours-log__item" key={item.id}>
                        <div className="tarefa-hours-log__main">
                          <strong>{item.tipo_display}</strong>
                          <span>{formatarDataHora(item.criado_em)}</span>
                        </div>
                        <p className="small mb-1">{item.descricao}</p>
                        <p className="small text-muted mb-0">
                          {item.usuario_nome ?? 'Sistema'}
                          {item.coluna_origem || item.coluna_destino ? (
                            <>
                              {' '}
                              ·{' '}
                              {item.coluna_origem
                                ? colunas.find((c) => c.id === item.coluna_origem)?.nome ??
                                  'Coluna'
                                : '—'}
                              {' → '}
                              {item.coluna_destino
                                ? colunas.find((c) => c.id === item.coluna_destino)?.nome ??
                                  'Coluna'
                                : '—'}
                            </>
                          ) : null}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : null}
              </TarefaPainelExpansivel>
                </div>
              </div>
            </div>
            <div className="modal-footer d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div>
                {podeExcluirTarefaKanban ? (
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    disabled={
                      isSubmitting ||
                      isSavingTime ||
                      mutacoesExtrasPendentes ||
                      excluirTarefaMutation.isPending
                    }
                    onClick={() => {
                      if (
                        !globalThis.confirm(
                          'Excluir esta tarefa permanentemente? Esta ação não pode ser desfeita.'
                        )
                      ) {
                        return
                      }
                      excluirTarefaMutation
                        .mutateAsync(tarefa.id)
                        .then(() => {
                          showToast({ variant: 'success', message: 'Tarefa excluída.' })
                          onClose()
                        })
                        .catch((error: unknown) => {
                          let message = 'Não foi possível excluir a tarefa.'
                          if (
                            error &&
                            typeof error === 'object' &&
                            'response' in error &&
                            error.response &&
                            typeof error.response === 'object' &&
                            error.response !== null &&
                            'data' in error.response
                          ) {
                            const data = error.response.data as { detail?: string }
                            if (typeof data.detail === 'string') message = data.detail
                          }
                          showToast({ variant: 'danger', message })
                        })
                    }}
                  >
                    {excluirTarefaMutation.isPending ? 'Excluindo…' : 'Excluir tarefa'}
                  </button>
                ) : null}
              </div>
              <div className="d-flex flex-wrap gap-2 ms-auto">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onClose}
                  disabled={isSubmitting || isSavingTime || mutacoesExtrasPendentes}
                >
                  Fechar
                </button>
                {podeSalvarAlgumCampo ? (
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      isSubmitting ||
                      !form.titulo.trim() ||
                      !form.coluna ||
                      mutacoesExtrasPendentes
                    }
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                ) : null}
              </div>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop fade show" aria-hidden="true" />
    </>
  )
}
