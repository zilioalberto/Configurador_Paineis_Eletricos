/**
 * Seções de UI extraídas do `TarefaEditModal` para reduzir a complexidade
 * cognitiva do componente principal. Cada bloco vira um componente focado.
 */
import type { Dispatch, SetStateAction } from 'react'
import { Link } from 'react-router-dom'

import type { ToastContextValue } from '@/components/feedback/toastContext'
import type {
  useAjustarApontamentoHoraMutation,
  useAprovarApontamentoHoraMutation,
  useAtualizarComentarioTarefaMutation,
  useCriarComentarioTarefaMutation,
  useEliminarComentarioTarefaMutation,
  useExcluirTarefaMutation,
  useRejeitarApontamentoHoraMutation,
} from '../hooks/useTarefaMutations'
import type {
  ApontamentoHora,
  ColunaKanban,
  ComentarioTarefa,
  HistoricoTarefaItem,
  PrioridadeTarefa,
  TarefaKanbanItem,
  TarefaResponsavelOption,
  TipoTarefa,
} from '../types/tarefa'
import { TIPOS_ETAPA_OPTIONS, type TarefaFormState } from '../utils/tarefasKanbanConstants'
import {
  formatarDataApontamento,
  formatarDataHora,
  formatarHoras,
  formatarTempo,
  origemApontamento,
  rotuloStatusApontamento,
} from '../utils/tarefasKanbanUtils'
import { ColaboradoresChecklist } from './ColaboradoresChecklist'
import { TarefaPainelExpansivel } from './TarefaPainelExpansivel'

type ShowToast = ToastContextValue['showToast']
type FormAjusteApontamento = { justificativa: string; horas: string; data: string }

const FORM_AJUSTE_VAZIO: FormAjusteApontamento = { justificativa: '', horas: '', data: '' }

export type TarefaTimerPanelProps = Readonly<{
  tarefa: TarefaKanbanItem
  totalHorasApontadas: string
  timerAtivo: boolean
  tempoAtivoSegundos: number
  horasEstipuladasResumo: string
  podeApontarHoras: boolean
  entregue: boolean
  isSavingTime: boolean
  onStartTimer: (tarefa: TarefaKanbanItem) => Promise<void>
  onStopTimer: () => Promise<void>
}>

function TimerBotao({
  tarefa,
  timerAtivo,
  isSavingTime,
  onStartTimer,
  onStopTimer,
}: Pick<
  TarefaTimerPanelProps,
  'tarefa' | 'timerAtivo' | 'isSavingTime' | 'onStartTimer' | 'onStopTimer'
>) {
  if (timerAtivo) {
    return (
      <button
        type="button"
        className="btn btn-sm btn-danger"
        onClick={() => {
          onStopTimer().catch(() => undefined)
        }}
        disabled={isSavingTime}
      >
        {isSavingTime ? 'Registrando...' : 'Parar e registrar'}
      </button>
    )
  }
  return (
    <button
      type="button"
      className="btn btn-sm btn-success"
      onClick={() => {
        onStartTimer(tarefa).catch(() => undefined)
      }}
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
}

export function TarefaTimerPanel({
  tarefa,
  totalHorasApontadas,
  timerAtivo,
  tempoAtivoSegundos,
  horasEstipuladasResumo,
  podeApontarHoras,
  entregue,
  isSavingTime,
  onStartTimer,
  onStopTimer,
}: TarefaTimerPanelProps) {
  return (
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
        <TimerBotao
          tarefa={tarefa}
          timerAtivo={timerAtivo}
          isSavingTime={isSavingTime}
          onStartTimer={onStartTimer}
          onStopTimer={onStopTimer}
        />
      ) : (
        <span className="text-muted small">
          {entregue ? 'Tarefa entregue.' : 'Sem permissão para apontar horas.'}
        </span>
      )}
    </div>
  )
}

export type TarefaCamposPrincipaisProps = Readonly<{
  form: TarefaFormState
  setForm: Dispatch<SetStateAction<TarefaFormState>>
  podeEditar: boolean
  podeClassificar: boolean
  desabilitarClassificacao: boolean
  classificacaoBloqueada: boolean
  podeVerOrcamentos: boolean
  responsaveis: TarefaResponsavelOption[]
  responsaveisPending: boolean
}>

export function TarefaCamposPrincipais({
  form,
  setForm,
  podeEditar,
  podeClassificar,
  desabilitarClassificacao,
  classificacaoBloqueada,
  podeVerOrcamentos,
  responsaveis,
  responsaveisPending,
}: TarefaCamposPrincipaisProps) {
  const responsavelDesabilitado = !podeEditar || responsaveisPending
  return (
    <>
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
            onChange={(event) => setForm((state) => ({ ...state, titulo: event.target.value }))}
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
            disabled={responsavelDesabilitado}
            onChange={(event) =>
              setForm((state) => ({ ...state, responsavel: event.target.value }))
            }
          >
            <option value="">Sem responsável</option>
            {responsaveis.map((responsavel) => (
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
              Esta tarefa já tem apontamentos de horas. Só é possível alterar a classificação com
              permissão específica.
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
            disabled={responsavelDesabilitado}
            responsaveis={responsaveis}
            onChange={(colaboradores) => setForm((state) => ({ ...state, colaboradores }))}
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
            onChange={(event) => setForm((state) => ({ ...state, prazo: event.target.value }))}
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
              setForm((state) => ({ ...state, proposta_referencia: event.target.value }))
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
              setForm((state) => ({ ...state, ordem_producao_referencia: event.target.value }))
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
            onChange={(event) => setForm((state) => ({ ...state, descricao: event.target.value }))}
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
    </>
  )
}

export type TarefaComentariosSectionProps = Readonly<{
  tarefaId: string
  comentarios: ComentarioTarefa[]
  isPending: boolean
  isError: boolean
  podeEditar: boolean
  comentarioEmEdicao: { id: string; texto: string } | null
  setComentarioEmEdicao: Dispatch<SetStateAction<{ id: string; texto: string } | null>>
  textoNovoComentario: string
  setTextoNovoComentario: Dispatch<SetStateAction<string>>
  criarMutation: ReturnType<typeof useCriarComentarioTarefaMutation>
  atualizarMutation: ReturnType<typeof useAtualizarComentarioTarefaMutation>
  eliminarMutation: ReturnType<typeof useEliminarComentarioTarefaMutation>
  showToast: ShowToast
}>

function ComentarioItem({
  tarefaId,
  comentario,
  podeEditar,
  comentarioEmEdicao,
  setComentarioEmEdicao,
  atualizarMutation,
  eliminarMutation,
  showToast,
}: Readonly<{
  tarefaId: string
  comentario: ComentarioTarefa
  podeEditar: boolean
  comentarioEmEdicao: { id: string; texto: string } | null
  setComentarioEmEdicao: Dispatch<SetStateAction<{ id: string; texto: string } | null>>
  atualizarMutation: ReturnType<typeof useAtualizarComentarioTarefaMutation>
  eliminarMutation: ReturnType<typeof useEliminarComentarioTarefaMutation>
  showToast: ShowToast
}>) {
  const emEdicao = comentarioEmEdicao?.id === comentario.id
  return (
    <div className="border rounded p-2 mb-2 bg-light">
      <div className="d-flex justify-content-between gap-2">
        <small className="text-muted">
          {comentario.autor_nome ?? '—'} · {formatarDataHora(comentario.criado_em)}
        </small>
        {podeEditar ? (
          <span className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-link p-0"
              onClick={() => setComentarioEmEdicao({ id: comentario.id, texto: comentario.comentario })}
            >
              Editar
            </button>
            <button
              type="button"
              className="btn btn-sm btn-link text-danger p-0"
              disabled={eliminarMutation.isPending}
              onClick={() => {
                if (!globalThis.confirm('Excluir este comentário?')) return
                eliminarMutation
                  .mutateAsync({ tarefaId, comentarioId: comentario.id })
                  .catch(() =>
                    showToast({ variant: 'danger', message: 'Não foi possível excluir.' })
                  )
              }}
            >
              Excluir
            </button>
          </span>
        ) : null}
      </div>
      {emEdicao ? (
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
              disabled={atualizarMutation.isPending}
              onClick={() => {
                const texto = comentarioEmEdicao.texto.trim()
                if (!texto) return
                atualizarMutation
                  .mutateAsync({ tarefaId, comentarioId: comentarioEmEdicao.id, texto })
                  .then(() => setComentarioEmEdicao(null))
                  .catch(() =>
                    showToast({ variant: 'danger', message: 'Não foi possível salvar.' })
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
        <p className="mb-0 mt-1 small">{comentario.comentario}</p>
      )}
    </div>
  )
}

export function TarefaComentariosSection({
  tarefaId,
  comentarios,
  isPending,
  isError,
  podeEditar,
  comentarioEmEdicao,
  setComentarioEmEdicao,
  textoNovoComentario,
  setTextoNovoComentario,
  criarMutation,
  atualizarMutation,
  eliminarMutation,
  showToast,
}: TarefaComentariosSectionProps) {
  return (
    <section className="tarefa-hours-log mt-0" aria-label="Comentários da tarefa">
      <div className="tarefa-hours-log__header">
        <div>
          <h3>Comentários</h3>
          <p>Discussão sobre esta tarefa.</p>
        </div>
        <span>{comentarios.length}</span>
      </div>
      {isPending ? <p className="tarefa-hours-log__empty">Carregando comentários...</p> : null}
      {isError ? (
        <p className="tarefa-hours-log__empty">Não foi possível carregar os comentários.</p>
      ) : null}
      {comentarios.map((comentario) => (
        <ComentarioItem
          key={comentario.id}
          tarefaId={tarefaId}
          comentario={comentario}
          podeEditar={podeEditar}
          comentarioEmEdicao={comentarioEmEdicao}
          setComentarioEmEdicao={setComentarioEmEdicao}
          atualizarMutation={atualizarMutation}
          eliminarMutation={eliminarMutation}
          showToast={showToast}
        />
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
            disabled={criarMutation.isPending}
          />
          <button
            type="button"
            className="btn btn-sm btn-primary mt-2"
            disabled={criarMutation.isPending || !textoNovoComentario.trim()}
            onClick={() => {
              const texto = textoNovoComentario.trim()
              if (!texto) return
              criarMutation
                .mutateAsync({ tarefaId, texto })
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
  )
}

type AjusteApontamentoFormProps = Readonly<{
  apontamento: ApontamentoHora
  tarefaId: string
  formAjusteApontamento: FormAjusteApontamento
  setFormAjusteApontamento: Dispatch<SetStateAction<FormAjusteApontamento>>
  setAjusteApontamentoId: Dispatch<SetStateAction<string | null>>
  ajustarMutation: ReturnType<typeof useAjustarApontamentoHoraMutation>
  showToast: ShowToast
}>

function AjusteApontamentoForm({
  apontamento,
  tarefaId,
  formAjusteApontamento,
  setFormAjusteApontamento,
  setAjusteApontamentoId,
  ajustarMutation,
  showToast,
}: AjusteApontamentoFormProps) {
  function confirmarAjuste() {
    const justificativa = formAjusteApontamento.justificativa.trim()
    if (!justificativa) {
      showToast({ variant: 'warning', message: 'Informe a justificativa do ajuste.' })
      return
    }
    const horas = formAjusteApontamento.horas.trim()
    const data = formAjusteApontamento.data.trim()
    ajustarMutation
      .mutateAsync({
        apontamentoId: apontamento.id,
        tarefaId,
        payload: {
          justificativa_ajuste: justificativa,
          ...(horas ? { horas } : {}),
          ...(data ? { data } : {}),
        },
      })
      .then(() => {
        setAjusteApontamentoId(null)
        setFormAjusteApontamento(FORM_AJUSTE_VAZIO)
      })
      .catch(() =>
        showToast({ variant: 'danger', message: 'Não foi possível ajustar o apontamento.' })
      )
  }

  return (
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
          setFormAjusteApontamento((prev) => ({ ...prev, justificativa: event.target.value }))
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
              setFormAjusteApontamento((prev) => ({ ...prev, horas: event.target.value }))
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
              setFormAjusteApontamento((prev) => ({ ...prev, data: event.target.value }))
            }
          />
        </div>
      </div>
      <div className="d-flex gap-2">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={ajustarMutation.isPending}
          onClick={confirmarAjuste}
        >
          Confirmar ajuste
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          disabled={ajustarMutation.isPending}
          onClick={() => {
            setAjusteApontamentoId(null)
            setFormAjusteApontamento(FORM_AJUSTE_VAZIO)
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

type ApontamentoAcoesAprovacaoProps = Readonly<{
  apontamento: ApontamentoHora
  tarefaId: string
  aprovarMutation: ReturnType<typeof useAprovarApontamentoHoraMutation>
  rejeitarMutation: ReturnType<typeof useRejeitarApontamentoHoraMutation>
  showToast: ShowToast
}>

function ApontamentoAcoesAprovacao({
  apontamento,
  tarefaId,
  aprovarMutation,
  rejeitarMutation,
  showToast,
}: ApontamentoAcoesAprovacaoProps) {
  const desabilitar = aprovarMutation.isPending || rejeitarMutation.isPending
  return (
    <div className="d-flex flex-wrap gap-2 mt-2">
      <button
        type="button"
        className="btn btn-sm btn-success"
        disabled={desabilitar}
        onClick={() =>
          aprovarMutation
            .mutateAsync({ apontamentoId: apontamento.id, tarefaId })
            .catch(() => showToast({ variant: 'danger', message: 'Não foi possível aprovar.' }))
        }
      >
        Aprovar
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        disabled={desabilitar}
        onClick={() =>
          rejeitarMutation
            .mutateAsync({ apontamentoId: apontamento.id, tarefaId })
            .catch(() => showToast({ variant: 'danger', message: 'Não foi possível rejeitar.' }))
        }
      >
        Rejeitar
      </button>
    </div>
  )
}

type ApontamentoLogItemProps = Readonly<{
  apontamento: ApontamentoHora
  tarefaId: string
  podeAprovarHoras: boolean
  podeAjustarHoras: boolean
  entregue: boolean
  ajusteApontamentoId: string | null
  setAjusteApontamentoId: Dispatch<SetStateAction<string | null>>
  formAjusteApontamento: FormAjusteApontamento
  setFormAjusteApontamento: Dispatch<SetStateAction<FormAjusteApontamento>>
  aprovarMutation: ReturnType<typeof useAprovarApontamentoHoraMutation>
  rejeitarMutation: ReturnType<typeof useRejeitarApontamentoHoraMutation>
  ajustarMutation: ReturnType<typeof useAjustarApontamentoHoraMutation>
  showToast: ShowToast
}>

function ApontamentoLogItem({
  apontamento,
  tarefaId,
  podeAprovarHoras,
  podeAjustarHoras,
  entregue,
  ajusteApontamentoId,
  setAjusteApontamentoId,
  formAjusteApontamento,
  setFormAjusteApontamento,
  aprovarMutation,
  rejeitarMutation,
  ajustarMutation,
  showToast,
}: ApontamentoLogItemProps) {
  const pendenteAprovacao = apontamento.status_aprovacao === 'PENDENTE'
  const podeAgirAprovacao = podeAprovarHoras && pendenteAprovacao && !entregue
  const podeAbrirAjuste =
    podeAjustarHoras && apontamento.status_aprovacao !== 'CANCELADO' && !entregue
  const ajusteAberto = ajusteApontamentoId === apontamento.id

  return (
    <article className="tarefa-hours-log__item">
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
          {apontamento.aprovado_em ? ` · ${formatarDataHora(apontamento.aprovado_em)}` : ''}
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
        <ApontamentoAcoesAprovacao
          apontamento={apontamento}
          tarefaId={tarefaId}
          aprovarMutation={aprovarMutation}
          rejeitarMutation={rejeitarMutation}
          showToast={showToast}
        />
      ) : null}
      {podeAbrirAjuste ? (
        <div className="mt-2">
          {ajusteAberto ? (
            <AjusteApontamentoForm
              apontamento={apontamento}
              tarefaId={tarefaId}
              formAjusteApontamento={formAjusteApontamento}
              setFormAjusteApontamento={setFormAjusteApontamento}
              setAjusteApontamentoId={setAjusteApontamentoId}
              ajustarMutation={ajustarMutation}
              showToast={showToast}
            />
          ) : (
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              disabled={ajustarMutation.isPending}
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
}

export type TarefaLogHorasPanelProps = Readonly<{
  tarefaId: string
  apontamentos: ApontamentoHora[]
  isPending: boolean
  isError: boolean
  aberto: boolean
  onAlternar: () => void
  podeAprovarHoras: boolean
  podeAjustarHoras: boolean
  entregue: boolean
  ajusteApontamentoId: string | null
  setAjusteApontamentoId: Dispatch<SetStateAction<string | null>>
  formAjusteApontamento: FormAjusteApontamento
  setFormAjusteApontamento: Dispatch<SetStateAction<FormAjusteApontamento>>
  aprovarMutation: ReturnType<typeof useAprovarApontamentoHoraMutation>
  rejeitarMutation: ReturnType<typeof useRejeitarApontamentoHoraMutation>
  ajustarMutation: ReturnType<typeof useAjustarApontamentoHoraMutation>
  showToast: ShowToast
  painelId: string
}>

export function TarefaLogHorasPanel({
  tarefaId,
  apontamentos,
  isPending,
  isError,
  aberto,
  onAlternar,
  podeAprovarHoras,
  podeAjustarHoras,
  entregue,
  ajusteApontamentoId,
  setAjusteApontamentoId,
  formAjusteApontamento,
  setFormAjusteApontamento,
  aprovarMutation,
  rejeitarMutation,
  ajustarMutation,
  showToast,
  painelId,
}: TarefaLogHorasPanelProps) {
  const vazio = !isPending && !isError && apontamentos.length === 0
  return (
    <TarefaPainelExpansivel
      painelId={painelId}
      titulo="Log de horas"
      descricao="Registros feitos pelos colaboradores nesta tarefa."
      badge={
        <span>
          {apontamentos.length} registro{apontamentos.length === 1 ? '' : 's'}
        </span>
      }
      aberto={aberto}
      onAlternar={onAlternar}
    >
      {isPending ? <p className="tarefa-hours-log__empty">Carregando apontamentos...</p> : null}
      {isError ? (
        <p className="tarefa-hours-log__empty">Não foi possível carregar o log de horas.</p>
      ) : null}
      {vazio ? (
        <p className="tarefa-hours-log__empty">Nenhum apontamento registrado até agora.</p>
      ) : null}
      {apontamentos.length > 0 ? (
        <div className="tarefa-hours-log__list">
          {apontamentos.map((apontamento) => (
            <ApontamentoLogItem
              key={apontamento.id}
              apontamento={apontamento}
              tarefaId={tarefaId}
              podeAprovarHoras={podeAprovarHoras}
              podeAjustarHoras={podeAjustarHoras}
              entregue={entregue}
              ajusteApontamentoId={ajusteApontamentoId}
              setAjusteApontamentoId={setAjusteApontamentoId}
              formAjusteApontamento={formAjusteApontamento}
              setFormAjusteApontamento={setFormAjusteApontamento}
              aprovarMutation={aprovarMutation}
              rejeitarMutation={rejeitarMutation}
              ajustarMutation={ajustarMutation}
              showToast={showToast}
            />
          ))}
        </div>
      ) : null}
    </TarefaPainelExpansivel>
  )
}

export type TarefaHistoricoPanelProps = Readonly<{
  historico: HistoricoTarefaItem[]
  isPending: boolean
  isError: boolean
  aberto: boolean
  onAlternar: () => void
  colunas: ColunaKanban[]
  painelId: string
}>

function nomeColuna(colunas: ColunaKanban[], colunaId: string | null | undefined): string {
  if (!colunaId) return '—'
  return colunas.find((c) => c.id === colunaId)?.nome ?? 'Coluna'
}

function HistoricoItem({
  item,
  colunas,
}: Readonly<{ item: HistoricoTarefaItem; colunas: ColunaKanban[] }>) {
  const temMovimentacao = Boolean(item.coluna_origem || item.coluna_destino)
  return (
    <article className="tarefa-hours-log__item">
      <div className="tarefa-hours-log__main">
        <strong>{item.tipo_display}</strong>
        <span>{formatarDataHora(item.criado_em)}</span>
      </div>
      <p className="small mb-1">{item.descricao}</p>
      <p className="small text-muted mb-0">
        {item.usuario_nome ?? 'Sistema'}
        {temMovimentacao ? (
          <>
            {' '}
            · {nomeColuna(colunas, item.coluna_origem)}
            {' → '}
            {nomeColuna(colunas, item.coluna_destino)}
          </>
        ) : null}
      </p>
    </article>
  )
}

export function TarefaHistoricoPanel({
  historico,
  isPending,
  isError,
  aberto,
  onAlternar,
  colunas,
  painelId,
}: TarefaHistoricoPanelProps) {
  const vazio = !isPending && !isError && historico.length === 0
  return (
    <TarefaPainelExpansivel
      painelId={painelId}
      titulo="Histórico"
      descricao="Alterações e eventos registrados automaticamente."
      badge={<span>{historico.length}</span>}
      aberto={aberto}
      onAlternar={onAlternar}
    >
      {isPending ? <p className="tarefa-hours-log__empty">Carregando histórico...</p> : null}
      {isError ? (
        <p className="tarefa-hours-log__empty">Não foi possível carregar o histórico.</p>
      ) : null}
      {vazio ? <p className="tarefa-hours-log__empty">Sem registros de histórico.</p> : null}
      {historico.length > 0 ? (
        <div className="tarefa-hours-log__list tarefa-hours-log__list--historico-panel">
          {historico.map((item) => (
            <HistoricoItem key={item.id} item={item} colunas={colunas} />
          ))}
        </div>
      ) : null}
    </TarefaPainelExpansivel>
  )
}

export type ExcluirTarefaButtonProps = Readonly<{
  tarefa: TarefaKanbanItem
  disabledExterno: boolean
  excluirMutation: ReturnType<typeof useExcluirTarefaMutation>
  showToast: ShowToast
  onClose: () => void
}>

function mensagemErroExclusao(error: unknown): string {
  const padrao = 'Não foi possível excluir a tarefa.'
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response
  ) {
    const data = (error.response as { data?: { detail?: string } }).data
    if (data && typeof data.detail === 'string') return data.detail
  }
  return padrao
}

export function ExcluirTarefaButton({
  tarefa,
  disabledExterno,
  excluirMutation,
  showToast,
  onClose,
}: ExcluirTarefaButtonProps) {
  return (
    <button
      type="button"
      className="btn btn-outline-danger"
      disabled={disabledExterno || excluirMutation.isPending}
      onClick={() => {
        if (
          !globalThis.confirm(
            'Excluir esta tarefa permanentemente? Esta ação não pode ser desfeita.'
          )
        ) {
          return
        }
        excluirMutation
          .mutateAsync(tarefa.id)
          .then(() => {
            showToast({ variant: 'success', message: 'Tarefa excluída.' })
            onClose()
          })
          .catch((error: unknown) =>
            showToast({ variant: 'danger', message: mensagemErroExclusao(error) })
          )
      }}
    >
      {excluirMutation.isPending ? 'Excluindo…' : 'Excluir tarefa'}
    </button>
  )
}
