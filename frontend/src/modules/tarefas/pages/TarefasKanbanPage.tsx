import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type DragEvent,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import type { AuthUser } from '@/modules/auth/types'
import { hasPermission } from '@/modules/auth/permissions'
import { useKanbanTarefasQuery } from '../hooks/useKanbanTarefasQuery'
import {
  useAjustarApontamentoHoraMutation,
  useAprovarApontamentoHoraMutation,
  useAtualizarComentarioTarefaMutation,
  useAtualizarTarefaMutation,
  useClassificarTarefaMutation,
  useCriarComentarioTarefaMutation,
  useCriarQuadroPadraoTarefasMutation,
  useCriarTarefaMutation,
  useEliminarComentarioTarefaMutation,
  useExcluirTarefaMutation,
  useIniciarTimerTarefaMutation,
  useMoverTarefaMutation,
  usePararTimerTarefaMutation,
  useRejeitarApontamentoHoraMutation,
} from '../hooks/useTarefaMutations'
import { useTarefaApontamentosQuery } from '../hooks/useTarefaApontamentosQuery'
import { useTarefaComentariosQuery } from '../hooks/useTarefaComentariosQuery'
import { useTarefaHistoricoQuery } from '../hooks/useTarefaHistoricoQuery'
import { useTarefaDashboardHorasDiaQuery } from '../hooks/useTarefaDashboardHorasDiaQuery'
import { useTarefaTimerAtivoQuery } from '../hooks/useTarefaTimerAtivoQuery'
import { tarefasQueryKeys } from '../tarefasQueryKeys'
import { useTarefaResponsaveisQuery } from '../hooks/useTarefaResponsaveisQuery'
import type {
  ApontamentoHora,
  ColunaKanban,
  ComentarioTarefa,
  CriarTarefaPayload,
  HistoricoTarefaItem,
  PrioridadeTarefa,
  TarefaKanbanItem,
  TipoTarefa,
} from '../types/tarefa'

type FiltroSituacao = 'todas' | 'abertas' | 'vencidas' | 'concluidas'

type VisualizacaoTarefas = 'kanban' | 'lista' | 'calendario' | 'dashboard'

type ColunaRenderizada = ColunaKanban & {
  tarefasVisiveis: TarefaKanbanItem[]
}

type TarefaVisivel = TarefaKanbanItem & {
  colunaNome: string
  colunaStatus: string
}

type TarefaFormState = {
  titulo: string
  descricao: string
  coluna: string
  responsavel: string
  colaboradores: string[]
  prioridade: PrioridadeTarefa
  prazo: string
  tipo_etapa: TipoTarefa
  proposta_referencia: string
  ordem_producao_referencia: string
  horas_estipuladas: string
}

const TIPOS_ETAPA_OPTIONS: Array<{ value: TipoTarefa; label: string }> = [
  { value: 'NAO_CLASSIFICADA', label: 'Não classificada' },
  { value: 'PROPOSTA', label: 'Proposta (orçamento)' },
  { value: 'PRODUCAO', label: 'Produção (OP)' },
  { value: 'INTERNA', label: 'Interna' },
]

const DEFAULT_FORM_STATE: TarefaFormState = {
  titulo: '',
  descricao: '',
  coluna: '',
  responsavel: '',
  colaboradores: [],
  prioridade: 'MEDIA',
  prazo: '',
  tipo_etapa: 'NAO_CLASSIFICADA',
  proposta_referencia: '',
  ordem_producao_referencia: '',
  horas_estipuladas: '',
}

const FILTROS_SITUACAO: Array<[FiltroSituacao, string]> = [
  ['todas', 'Mostrar todas'],
  ['abertas', 'Abertas'],
  ['vencidas', 'Vencidas'],
  ['concluidas', 'Concluídas'],
]

const VISUALIZACOES_TAREFAS: Array<[VisualizacaoTarefas, string]> = [
  ['kanban', 'Kanban'],
  ['lista', 'Lista'],
  ['calendario', 'Calendário'],
  ['dashboard', 'Dashboard'],
]

function colunaStatusClass(status: string): string {
  switch (status) {
    case 'FINALIZADA':
    case 'CONCLUIDO':
      return 'kanban-column--done'
    case 'INICIADA':
    case 'EM_ANDAMENTO':
      return 'kanban-column--active'
    case 'BLOQUEADO':
      return 'kanban-column--blocked'
    case 'CANCELADO':
      return 'kanban-column--cancelled'
    default:
      return 'kanban-column--pending'
  }
}

function prioridadeClass(prioridade: string): string {
  switch (prioridade) {
    case 'URGENTE':
      return 'kanban-priority-badge--urgente'
    case 'ALTA':
      return 'kanban-priority-badge--alta'
    case 'BAIXA':
      return 'kanban-priority-badge--baixa'
    default:
      return 'kanban-priority-badge--media'
  }
}

function prioridadeAccentClass(prioridade: string): string {
  switch (prioridade) {
    case 'URGENTE':
      return 'kanban-task-card--urgente'
    case 'ALTA':
      return 'kanban-task-card--alta'
    case 'BAIXA':
      return 'kanban-task-card--baixa'
    default:
      return 'kanban-task-card--media'
  }
}

function formatarPrazo(iso: string | null): string {
  if (!iso) return 'Sem prazo'
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return 'Sem prazo'
  return data.toLocaleDateString('pt-BR', { dateStyle: 'short' })
}

function formatarDataHora(iso: string | null): string {
  if (!iso) return '-'
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return '-'
  return data.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function formatarDataApontamento(iso: string | null): string {
  if (!iso) return '-'
  const [ano, mes, dia] = iso.split('-')
  if (!ano || !mes || !dia) return iso
  return `${dia}/${mes}/${ano}`
}

function formatarDataCompleta(iso: string | null): string {
  if (!iso) return 'Sem prazo'
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return 'Sem prazo'
  return data.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Data civil local (YYYY-MM-DD), alinhada ao `timezone.localdate()` do servidor. */
function dataLocalHoje(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatarHoras(horas: string): string {
  const valor = Number(horas)
  if (Number.isNaN(valor)) return `${horas}h`
  return `${valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}h`
}

function horasEstipuladasApiParaForm(api: string | null | undefined): string {
  if (api == null || api === '') return ''
  const n = Number(api)
  if (Number.isNaN(n)) return ''
  return String(n).replace('.', ',')
}

/** Valor decimal para a API (`null` limpa o campo). */
function horasEstipuladasFormParaApi(texto: string): string | null {
  const t = texto.trim().replace(/\s/g, '').replace(',', '.')
  if (!t) return null
  const n = Number(t)
  if (Number.isNaN(n) || n < 0) return null
  return n.toFixed(2)
}

function totalizarHoras(apontamentos: ApontamentoHora[]): string {
  const totalCentavos = apontamentos.reduce((total, apontamento) => {
    const horas = Number(apontamento.horas)
    if (Number.isNaN(horas)) return total
    return total + Math.round(horas * 100)
  }, 0)
  return (totalCentavos / 100).toFixed(2)
}

function totalizarHorasTarefas(tarefas: TarefaKanbanItem[]): string {
  const totalCentavos = tarefas.reduce((total, tarefa) => {
    const horas = Number(tarefa.total_horas_apontadas)
    if (Number.isNaN(horas)) return total
    return total + Math.round(horas * 100)
  }, 0)
  return (totalCentavos / 100).toFixed(2)
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return ''
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return ''
  const offsetMs = data.getTimezoneOffset() * 60 * 1000
  return new Date(data.getTime() - offsetMs).toISOString().slice(0, 16)
}

function formatarTempo(segundos: number): string {
  const seguro = Math.max(0, Math.floor(segundos))
  const horas = Math.floor(seguro / 3600)
  const minutos = Math.floor((seguro % 3600) / 60)
  const resto = seguro % 60
  return [horas, minutos, resto].map((parte) => String(parte).padStart(2, '0')).join(':')
}

function tarefaToFormState(tarefa: TarefaKanbanItem): TarefaFormState {
  return {
    titulo: tarefa.titulo,
    descricao: tarefa.descricao,
    coluna: tarefa.coluna,
    responsavel: tarefa.responsavel ? String(tarefa.responsavel) : '',
    colaboradores: (tarefa.colaboradores ?? []).map((colaborador) => String(colaborador)),
    prioridade: tarefa.prioridade,
    prazo: toDatetimeLocalValue(tarefa.prazo),
    tipo_etapa: tarefa.tipo_etapa ?? 'NAO_CLASSIFICADA',
    proposta_referencia: tarefa.proposta_referencia,
    ordem_producao_referencia: tarefa.ordem_producao_referencia,
    horas_estipuladas: horasEstipuladasApiParaForm(tarefa.horas_estipuladas),
  }
}

function iniciaisResponsavel(nome: string | null): string {
  if (!nome?.trim()) return '?'
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
}

function referenciasTarefa(tarefa: TarefaKanbanItem): string[] {
  return [tarefa.proposta_referencia, tarefa.ordem_producao_referencia].filter(
    (valor): valor is string => Boolean(valor),
  )
}

function origemApontamento(apontamento: ApontamentoHora): string {
  return apontamento.sessao_id ? 'Cronômetro' : 'Manual'
}

function rotuloStatusApontamento(status: string): string {
  switch (status) {
    case 'PENDENTE':
      return 'Pendente'
    case 'APROVADO':
      return 'Aprovado'
    case 'REJEITADO':
      return 'Rejeitado'
    case 'AJUSTADO':
      return 'Ajustado'
    case 'CANCELADO':
      return 'Cancelado'
    case 'REPROVADO':
      return 'Reprovado'
    default:
      return status
  }
}

function tarefaVencida(tarefa: TarefaKanbanItem): boolean {
  if (!tarefa.prazo || tarefaEntregue(tarefa)) return false
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return new Date(tarefa.prazo) < hoje
}

function tarefaEntregue(tarefa: TarefaKanbanItem): boolean {
  return tarefa.status === 'CONCLUIDA'
}

/** Responsável, criador ou colaborador da tarefa (ex.: marcado na criação). */
function usuarioEnvolvidoNaTarefa(user: AuthUser | null, tarefa: TarefaKanbanItem): boolean {
  const uid = user?.id
  if (typeof uid !== 'number') return false
  if (tarefa.responsavel === uid) return true
  if (tarefa.criador === uid) return true
  return (tarefa.colaboradores ?? []).includes(uid)
}

function usuarioPodeClassificarTarefa(user: AuthUser | null, tarefa: TarefaKanbanItem): boolean {
  if (hasPermission(user, PERMISSION_KEYS.TAREFA_CLASSIFICAR)) return true
  return usuarioEnvolvidoNaTarefa(user, tarefa)
}

function tarefaPrazoTimestamp(tarefa: TarefaKanbanItem): number | null {
  if (!tarefa.prazo) return null
  const timestamp = new Date(tarefa.prazo).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

function tarefaCombinaBusca(tarefa: TarefaKanbanItem, termo: string): boolean {
  if (!termo) return true
  const texto = [
    tarefa.titulo,
    tarefa.descricao,
    tarefa.responsavel_nome,
    ...(tarefa.colaboradores_nomes ?? []),
    tarefa.proposta_referencia,
    tarefa.ordem_producao_referencia,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return texto.includes(termo)
}

function tarefaCombinaSituacao(
  tarefa: TarefaKanbanItem,
  filtro: FiltroSituacao
): boolean {
  if (filtro === 'abertas') return !tarefaEntregue(tarefa)
  if (filtro === 'vencidas') return tarefaVencida(tarefa)
  if (filtro === 'concluidas') return tarefaEntregue(tarefa)
  return true
}

function tarefaFormToPayload(form: TarefaFormState): CriarTarefaPayload {
  const prazoDate = form.prazo ? new Date(form.prazo) : null
  return {
    titulo: form.titulo.trim(),
    descricao: form.descricao.trim(),
    coluna: form.coluna,
    responsavel: form.responsavel ? Number(form.responsavel) : null,
    colaboradores: form.colaboradores.map((colaborador) => Number(colaborador)),
    prioridade: form.prioridade,
    prazo: prazoDate && !Number.isNaN(prazoDate.getTime()) ? prazoDate.toISOString() : null,
    tipo_etapa: form.tipo_etapa,
    proposta_referencia: form.proposta_referencia.trim(),
    ordem_producao_referencia: form.ordem_producao_referencia.trim(),
    horas_estipuladas: horasEstipuladasFormParaApi(form.horas_estipuladas),
  }
}

/** Coluna inicial para novas tarefas (quadro de 3 colunas: Pendentes). */
function idColunaPendentes(colunas: ColunaKanban[]): string | null {
  const pendente = colunas.find((coluna) => coluna.status_semantico === 'PENDENTE')
  if (pendente) return pendente.id
  const ordenadas = [...colunas].sort((a, b) => a.ordem - b.ordem)
  return ordenadas[0]?.id ?? null
}

function minDatetimeLocalHoje(): string {
  const inicio = new Date()
  inicio.setHours(0, 0, 0, 0)
  const offsetMs = inicio.getTimezoneOffset() * 60 * 1000
  return new Date(inicio.getTime() - offsetMs).toISOString().slice(0, 16)
}

/** Prazo opcional; se preenchido, não pode ser antes do início do dia atual (hora local). */
function prazoCriacaoValido(prazoLocal: string): boolean {
  if (!prazoLocal.trim()) return true
  const escolhido = new Date(prazoLocal)
  if (Number.isNaN(escolhido.getTime())) return false
  const inicioHoje = new Date()
  inicioHoje.setHours(0, 0, 0, 0)
  return escolhido >= inicioHoje
}

function tarefaFormToPayloadNovaTarefa(form: TarefaFormState, colunaId: string): CriarTarefaPayload {
  const prazoDate = form.prazo ? new Date(form.prazo) : null
  const tipo = form.tipo_etapa
  let orc = form.proposta_referencia.trim()
  let op = form.ordem_producao_referencia.trim()
  if (tipo === 'NAO_CLASSIFICADA' || tipo === 'INTERNA') {
    orc = ''
    op = ''
  } else if (tipo === 'PROPOSTA') {
    op = ''
  }
  return {
    titulo: form.titulo.trim(),
    descricao: form.descricao.trim(),
    coluna: colunaId,
    responsavel: form.responsavel ? Number(form.responsavel) : null,
    colaboradores: form.colaboradores.map((colaborador) => Number(colaborador)),
    prioridade: form.prioridade,
    prazo: prazoDate && !Number.isNaN(prazoDate.getTime()) ? prazoDate.toISOString() : null,
    tipo_etapa: tipo,
    proposta_referencia: orc,
    ordem_producao_referencia: op,
    horas_estipuladas: horasEstipuladasFormParaApi(form.horas_estipuladas),
  }
}

function toggleColaborador(colaboradores: string[], colaboradorId: string): string[] {
  if (colaboradores.includes(colaboradorId)) {
    return colaboradores.filter((id) => id !== colaboradorId)
  }
  return [...colaboradores, colaboradorId]
}

function ColaboradoresChecklist({
  labelId,
  colaboradores,
  disabled,
  responsaveis,
  onChange,
}: Readonly<{
  labelId: string
  colaboradores: string[]
  disabled: boolean
  responsaveis: Array<{ id: number; label: string; email: string }>
  onChange: (colaboradores: string[]) => void
}>) {
  if (responsaveis.length === 0) {
    return (
      <div className="tarefa-collaborators-picker is-empty" aria-labelledby={labelId}>
        Nenhum colaborador disponível.
      </div>
    )
  }

  return (
    <fieldset className="tarefa-collaborators-picker" aria-labelledby={labelId}>
      {responsaveis.map((responsavel) => {
        const value = String(responsavel.id)
        return (
          <label className="tarefa-collaborators-picker__option" key={responsavel.id}>
            <input
              type="checkbox"
              checked={colaboradores.includes(value)}
              disabled={disabled}
              onChange={() => onChange(toggleColaborador(colaboradores, value))}
            />
            <span>
              <strong>{responsavel.label}</strong>
              <small>{responsavel.email}</small>
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}

function TarefasListaView({
  tarefas,
  onOpen,
}: Readonly<{
  tarefas: TarefaVisivel[]
  onOpen: (tarefa: TarefaKanbanItem) => void
}>) {
  return (
    <section className="tarefas-view-panel tarefas-list-view" aria-label="Lista de tarefas">
      {tarefas.length === 0 ? (
        <p className="tarefas-view-empty">Nenhuma tarefa encontrada para os filtros atuais.</p>
      ) : (
        <div className="tarefas-list-table-wrap">
          <table className="tarefas-list-table">
            <thead>
              <tr>
                <th>Tarefa</th>
                <th>Coluna</th>
                <th>Responsável</th>
                <th>Prazo</th>
                <th>Prioridade</th>
                <th>Status</th>
                <th>Horas</th>
              </tr>
            </thead>
            <tbody>
              {tarefas.map((tarefa) => (
                <tr key={tarefa.id}>
                  <td>
                    <button
                      type="button"
                      className="tarefas-list-table__task"
                      onClick={() => onOpen(tarefa)}
                    >
                      <strong>{tarefa.titulo}</strong>
                    </button>
                  </td>
                  <td>{tarefa.colunaNome}</td>
                  <td>{tarefa.responsavel_nome ?? 'Sem responsável'}</td>
                  <td className={tarefaVencida(tarefa) ? 'is-danger' : undefined}>
                    {formatarPrazo(tarefa.prazo)}
                  </td>
                  <td>
                    <span className={`kanban-priority-badge ${prioridadeClass(tarefa.prioridade)}`}>
                      {tarefa.prioridade_display}
                    </span>
                  </td>
                  <td>{tarefa.status_display}</td>
                  <td>{formatarHoras(tarefa.total_horas_apontadas ?? '0.00')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function TarefasCalendarioView({
  tarefas,
  onOpen,
}: Readonly<{
  tarefas: TarefaVisivel[]
  onOpen: (tarefa: TarefaKanbanItem) => void
}>) {
  const tarefasComPrazo = tarefas
    .filter((tarefa) => tarefaPrazoTimestamp(tarefa) !== null)
    .sort((a, b) => (tarefaPrazoTimestamp(a) ?? 0) - (tarefaPrazoTimestamp(b) ?? 0))
  const grupos = tarefasComPrazo.reduce<Array<{ key: string; label: string; tarefas: TarefaVisivel[] }>>(
    (acc, tarefa) => {
      const data = new Date(tarefa.prazo ?? '')
      const key = data.toISOString().slice(0, 10)
      const existente = acc.find((grupo) => grupo.key === key)
      if (existente) {
        existente.tarefas.push(tarefa)
      } else {
        acc.push({ key, label: formatarDataCompleta(tarefa.prazo), tarefas: [tarefa] })
      }
      return acc
    },
    []
  )

  return (
    <section className="tarefas-view-panel tarefas-calendar-view" aria-label="Calendário de tarefas">
      {grupos.length === 0 ? (
        <p className="tarefas-view-empty">Nenhuma tarefa com prazo para exibir no calendário.</p>
      ) : (
        <div className="tarefas-calendar-grid">
          {grupos.map((grupo) => (
            <article className="tarefas-calendar-day" key={grupo.key}>
              <header>
                <strong>{grupo.label}</strong>
                <span>{grupo.tarefas.length}</span>
              </header>
              <div className="tarefas-calendar-day__items">
                {grupo.tarefas.map((tarefa) => (
                  <button
                    type="button"
                    key={tarefa.id}
                    className={`tarefas-calendar-item ${tarefaVencida(tarefa) ? 'is-danger' : ''}`}
                    onClick={() => onOpen(tarefa)}
                  >
                    <strong>{tarefa.titulo}</strong>
                    <span>{tarefa.colunaNome}</span>
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function TarefasDashboardView({
  tarefas,
  colunas,
}: Readonly<{
  tarefas: TarefaVisivel[]
  colunas: ColunaRenderizada[]
}>) {
  const concluidas = tarefas.filter(tarefaEntregue).length
  const emAndamento = tarefas.filter((tarefa) =>
    ['INICIADA', 'EM_ANDAMENTO'].includes(tarefa.status),
  ).length
  const vencidas = tarefas.filter(tarefaVencida).length
  const horas = formatarHoras(totalizarHorasTarefas(tarefas))
  const prioridades: Array<[PrioridadeTarefa, string]> = [
    ['URGENTE', 'Urgentes'],
    ['ALTA', 'Altas'],
    ['MEDIA', 'Médias'],
    ['BAIXA', 'Baixas'],
  ]

  return (
    <section className="tarefas-view-panel tarefas-dashboard-view" aria-label="Dashboard de tarefas">
      <div className="tarefas-dashboard-cards">
        <article>
          <span>Total</span>
          <strong>{tarefas.length}</strong>
        </article>
        <article>
          <span>Trabalhando</span>
          <strong>{emAndamento}</strong>
        </article>
        <article>
          <span>Entregue</span>
          <strong>{concluidas}</strong>
        </article>
        <article>
          <span>Vencidas</span>
          <strong>{vencidas}</strong>
        </article>
        <article>
          <span>Horas gastas</span>
          <strong>{horas}</strong>
        </article>
      </div>

      <div className="tarefas-dashboard-grid">
        <article className="tarefas-dashboard-panel">
          <h2>Prioridade</h2>
          {prioridades.map(([prioridade, label]) => {
            const total = tarefas.filter((tarefa) => tarefa.prioridade === prioridade).length
            const percentual = tarefas.length ? (total / tarefas.length) * 100 : 0
            return (
              <div className="tarefas-dashboard-bar" key={prioridade}>
                <span>{label}</span>
                <div>
                  <strong style={{ width: `${percentual}%` }} />
                </div>
                <em>{total}</em>
              </div>
            )
          })}
        </article>
        <article className="tarefas-dashboard-panel">
          <h2>Colunas</h2>
          {colunas.map((coluna) => {
            const total = coluna.tarefasVisiveis.length
            const percentual = tarefas.length ? (total / tarefas.length) * 100 : 0
            return (
              <div className="tarefas-dashboard-bar" key={coluna.id}>
                <span>{coluna.nome}</span>
                <div>
                  <strong style={{ width: `${percentual}%` }} />
                </div>
                <em>{total}</em>
              </div>
            )
          })}
        </article>
      </div>
    </section>
  )
}

function TarefaCard({
  tarefa,
  podeMover,
  podeApontarHoras,
  arrastando,
  timerAtivo,
  tempoAtivoLabel,
  isSavingTime,
  jornadaPermiteIniciarTimer = true,
  onDragStart,
  onDragEnd,
  onDropBefore,
  onOpen,
  onStartTimer,
  onStopTimer,
}: Readonly<{
  tarefa: TarefaKanbanItem
  podeMover: boolean
  podeApontarHoras: boolean
  arrastando: boolean
  timerAtivo: boolean
  tempoAtivoLabel: string | null
  isSavingTime: boolean
  jornadaPermiteIniciarTimer?: boolean
  onDragStart: (event: DragEvent<HTMLElement>, tarefa: TarefaKanbanItem) => void
  onDragEnd: () => void
  onDropBefore: (event: DragEvent<HTMLElement>, tarefa: TarefaKanbanItem) => void
  onOpen: (tarefa: TarefaKanbanItem) => void
  onStartTimer: (tarefa: TarefaKanbanItem) => Promise<void>
  onStopTimer: () => Promise<void>
}>) {
  const referencias = referenciasTarefa(tarefa)
  const responsavelNome = tarefa.responsavel_nome ?? 'Sem responsável'
  const totalColaboradores = (tarefa.colaboradores_nomes ?? []).length
  const prazoVencido = tarefaVencida(tarefa)
  const totalHorasLabel = formatarHoras(tarefa.total_horas_apontadas ?? '0.00')
  const podeControlarTimer = podeApontarHoras && !tarefaEntregue(tarefa)
  const podeIniciarTimer = tarefa.pode_iniciar !== false && jornadaPermiteIniciarTimer
  const rotuloTipoEtapa =
    tarefa.tipo_etapa_display ??
    TIPOS_ETAPA_OPTIONS.find((opcao) => opcao.value === tarefa.tipo_etapa)?.label
  const mostrarTipoEtapa =
    Boolean(tarefa.tipo_etapa && tarefa.tipo_etapa !== 'NAO_CLASSIFICADA') && Boolean(rotuloTipoEtapa)

  function handleTimerButtonClick(
    event: MouseEvent<HTMLButtonElement>,
    action: () => Promise<void>
  ) {
    event.preventDefault()
    event.stopPropagation()
    void action()
  }

  return (
    <article
      className={`kanban-task-card ${prioridadeAccentClass(tarefa.prioridade)} ${
        podeMover ? 'is-draggable' : ''
      } ${
        arrastando ? 'is-dragging' : ''
      } ${
        timerAtivo ? 'is-timing' : ''
      }`}
      draggable={podeMover}
      data-testid={`kanban-card-${tarefa.id}`}
      role="button"
      tabIndex={0}
      aria-label={`Abrir tarefa ${tarefa.titulo}`}
      onClick={() => onOpen(tarefa)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        onOpen(tarefa)
      }}
      onDragStart={(event) => onDragStart(event, tarefa)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        if (!podeMover) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(event) => onDropBefore(event, tarefa)}
    >
      <div className="kanban-task-card__topline">
        <span className="kanban-task-card__bar" aria-hidden="true" />
        <span className="kanban-task-card__menu" aria-hidden="true">
          ...
        </span>
      </div>
      <div className="kanban-task-card__title-row">
        <h3 className="kanban-task-card__title">{tarefa.titulo}</h3>
        <span className={`kanban-priority-badge ${prioridadeClass(tarefa.prioridade)}`}>
          {tarefa.prioridade_display}
        </span>
      </div>
      {mostrarTipoEtapa ? (
        <p className="kanban-task-card__description kanban-task-card__tipo-etapa small mb-0">
          {rotuloTipoEtapa}
        </p>
      ) : null}
      {tarefa.descricao ? (
        <p className="kanban-task-card__description">{tarefa.descricao}</p>
      ) : null}
      <div className="kanban-task-card__people-row">
        <span className="kanban-task-card__avatar" aria-hidden="true">
          {iniciaisResponsavel(tarefa.responsavel_nome)}
        </span>
        <span className="kanban-task-card__assignee">{responsavelNome}</span>
        {totalColaboradores > 0 ? (
          <span className="kanban-task-card__collaborators">
            +{totalColaboradores} colab.
          </span>
        ) : null}
      </div>
      <div className="kanban-task-card__metrics">
        <span className={prazoVencido ? 'is-danger' : undefined}>
          Prazo {formatarPrazo(tarefa.prazo)}
        </span>
        <span>{tarefa.status_display}</span>
      </div>
      <div className="kanban-task-card__time-row">
        <div
          className="kanban-task-card__spent"
          aria-label={`Total de horas gastas: ${totalHorasLabel}`}
        >
          <span>Total</span>
          <strong>{totalHorasLabel}</strong>
        </div>
        {podeControlarTimer ? (
          <div className="kanban-task-card__time-actions">
            {timerAtivo ? (
              <button
                type="button"
                className="kanban-task-card__time-button kanban-task-card__time-button--stop"
                aria-label={`Parar horas de ${tarefa.titulo}`}
                title="Parar horas"
                disabled={isSavingTime}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => handleTimerButtonClick(event, onStopTimer)}
              >
                <span aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                className="kanban-task-card__time-button kanban-task-card__time-button--play"
                aria-label={`Iniciar horas de ${tarefa.titulo}`}
                title={
                  !jornadaPermiteIniciarTimer
                    ? 'Fora da jornada de trabalho (cadastro em RH).'
                    : podeIniciarTimer
                      ? 'Iniciar horas'
                      : 'Classifique a tarefa (orçamento/OP) antes de iniciar o cronômetro.'
                }
                disabled={isSavingTime || !podeIniciarTimer}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => handleTimerButtonClick(event, () => onStartTimer(tarefa))}
              >
                <span aria-hidden="true" />
              </button>
            )}
          </div>
        ) : null}
      </div>
      {timerAtivo && tempoAtivoLabel ? (
        <div className="kanban-task-card__timer" aria-label="Tempo em contagem">
          <span className="kanban-task-card__timer-icon" aria-hidden="true" />
          {tempoAtivoLabel}
        </div>
      ) : null}
      {referencias.length > 0 ? (
        <div className="kanban-task-card__refs">
          {referencias.map((referencia) => (
            <span key={referencia}>{referencia}</span>
          ))}
        </div>
      ) : null}
    </article>
  )
}

function TarefaCreateModal({
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
          <form className="modal-content" onSubmit={(event) => void handleSubmit(event)}>
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

function TarefaPainelExpansivel({
  painelId,
  titulo,
  descricao,
  badge,
  aberto,
  onAlternar,
  children,
}: Readonly<{
  painelId: string
  titulo: string
  descricao: string
  badge: ReactNode
  aberto: boolean
  onAlternar: () => void
  children: ReactNode
}>) {
  const triggerId = `${painelId}-acc-trigger`
  const panelId = `${painelId}-acc-panel`
  return (
    <section className="tarefa-hours-log tarefa-hours-log--accordion mt-3">
      <button
        type="button"
        id={triggerId}
        className="tarefa-hours-log__accordion-trigger"
        aria-expanded={aberto}
        aria-controls={panelId}
        onClick={onAlternar}
      >
        <div className="tarefa-hours-log__header tarefa-hours-log__header--accordion mb-0">
          <div>
            <h3>{titulo}</h3>
            <p>{descricao}</p>
          </div>
          <span className="tarefa-hours-log__accordion-meta">
            {badge}
            <span className="tarefa-hours-log__accordion-chevron" aria-hidden>
              {aberto ? '▾' : '▸'}
            </span>
          </span>
        </div>
      </button>
      {aberto ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          className="tarefa-hours-log__accordion-body"
        >
          {children}
        </div>
      ) : null}
    </section>
  )
}

function TarefaEditModal({
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
          <form className="modal-content" onSubmit={(event) => void handleSubmit(event)}>
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
                      onClick={() => void onStopTimer()}
                      disabled={isSavingTime}
                    >
                      {isSavingTime ? 'Registrando...' : 'Parar e registrar'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm btn-success"
                      onClick={() => void onStartTimer(tarefa)}
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
                              void eliminarComentarioMutation
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
                              void atualizarComentarioMutation
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
                        void criarComentarioMutation
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
                                  void aprovarApontamentoMutation
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
                                  void rejeitarApontamentoMutation
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
                                        void ajustarApontamentoMutation
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
                      void excluirTarefaMutation
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

export default function TarefasKanbanPage() {
  const queryClient = useQueryClient()
  const { data, isPending, isError, error, refetch, isFetching } = useKanbanTarefasQuery()
  const criarQuadroPadraoMutation = useCriarQuadroPadraoTarefasMutation()
  const criarMutation = useCriarTarefaMutation()
  const atualizarMutation = useAtualizarTarefaMutation()
  const classificarMutation = useClassificarTarefaMutation()
  const moverMutation = useMoverTarefaMutation()
  const iniciarTimerMutation = useIniciarTimerTarefaMutation()
  const pararTimerMutation = usePararTimerTarefaMutation()
  const { showToast } = useToast()
  const { user } = useAuth()
  const quadro = data?.quadro ?? null
  const totalTarefas = quadro?.total_tarefas ?? 0
  const podeCriar = hasPermission(user, PERMISSION_KEYS.TAREFA_CRIAR)
  const podeVerRelatorioHoras = hasPermission(
    user,
    PERMISSION_KEYS.TAREFA_VISUALIZAR_RELATORIOS
  )
  const podeMover = hasPermission(user, PERMISSION_KEYS.TAREFA_EDITAR)
  const podeAlterarClassificacaoComApontamentos = hasPermission(
    user,
    PERMISSION_KEYS.TAREFA_ALTERAR_CLASSIFICACAO_COM_APONTAMENTOS
  )
  const podeApontarHoras = hasPermission(user, PERMISSION_KEYS.TAREFA_APONTAR_HORAS)
  const dataDashboardHoras = useMemo(() => dataLocalHoje(), [])
  const dashboardHorasQuery = useTarefaDashboardHorasDiaQuery(
    user?.id,
    dataDashboardHoras,
    podeApontarHoras
  )
  const dashboardHoras = dashboardHorasQuery.data
  const timerQuery = useTarefaTimerAtivoQuery(podeApontarHoras)
  const sessaoAtiva = timerQuery.data?.sessao ?? null
  const jornadaPermiteIniciarTimer =
    timerQuery.data?.jornada_permite_iniciar_cronometro !== false
  const podeGerenciarQuadro = hasPermission(user, PERMISSION_KEYS.TAREFA_GERENCIAR_QUADRO)
  const podeCriarQuadroPadrao = podeCriar || podeGerenciarQuadro
  const [busca, setBusca] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState<FiltroSituacao>('todas')
  const [visualizacao, setVisualizacao] = useState<VisualizacaoTarefas>('kanban')
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TarefaKanbanItem | null>(null)
  const [timerTick, setTimerTick] = useState(() => Date.now())

  const podeClassificar = useMemo(
    () =>
      editingTask ? usuarioPodeClassificarTarefa(user, editingTask) : false,
    [user, editingTask]
  )

  useEffect(() => {
    if (!sessaoAtiva) return undefined
    const intervalId = globalThis.setInterval(() => setTimerTick(Date.now()), 1000)
    return () => globalThis.clearInterval(intervalId)
  }, [sessaoAtiva])

  useEffect(() => {
    const iso = timerQuery.data?.pausa_automatica_prevista_em
    if (!iso || !sessaoAtiva) return undefined
    const ms = new Date(iso).getTime() - Date.now()
    if (Number.isNaN(ms) || ms <= 0 || ms > 86_400_000) return undefined
    const id = globalThis.setTimeout(() => {
      void pararTimerMutation
        .mutateAsync()
        .then(() => {
          showToast({
            variant: 'success',
            message: 'Contagem encerrada automaticamente ao fim da jornada.',
          })
        })
        .catch(() => {
          void queryClient.invalidateQueries({ queryKey: tarefasQueryKeys.timerAtivo() })
          void queryClient.invalidateQueries({ queryKey: tarefasQueryKeys.kanban() })
        })
    }, ms)
    return () => globalThis.clearTimeout(id)
  }, [
    timerQuery.data?.pausa_automatica_prevista_em,
    sessaoAtiva?.id,
    pararTimerMutation,
    queryClient,
    showToast,
  ])

  const tarefasVencidas = useMemo(() => {
    return (
      quadro?.colunas.reduce(
        (total, coluna) => total + coluna.tarefas.filter(tarefaVencida).length,
        0
      ) ?? 0
    )
  }, [quadro])

  const colunasRenderizadas = useMemo<ColunaRenderizada[]>(() => {
    const termo = busca.trim().toLowerCase()
    return (
      quadro?.colunas.map((coluna) => ({
        ...coluna,
        tarefasVisiveis: coluna.tarefas.filter(
          (tarefa) =>
            tarefaCombinaBusca(tarefa, termo) &&
            tarefaCombinaSituacao(tarefa, filtroSituacao)
        ),
      })) ?? []
    )
  }, [quadro, busca, filtroSituacao])

  const totalVisivel = useMemo(
    () => colunasRenderizadas.reduce((total, coluna) => total + coluna.tarefasVisiveis.length, 0),
    [colunasRenderizadas]
  )

  const tarefasVisiveis = useMemo<TarefaVisivel[]>(
    () =>
      colunasRenderizadas.flatMap((coluna) =>
        coluna.tarefasVisiveis.map((tarefa) => ({
          ...tarefa,
          colunaNome: coluna.nome,
          colunaStatus: coluna.status_semantico,
        }))
      ),
    [colunasRenderizadas]
  )

  const timerAtivoSegundos = useMemo(() => {
    if (!sessaoAtiva) return 0
    const inicio = new Date(sessaoAtiva.iniciado_em).getTime()
    if (Number.isNaN(inicio)) return 0
    return Math.max(0, Math.floor((timerTick - inicio) / 1000))
  }, [sessaoAtiva, timerTick])

  const abrirNovaTarefa = useCallback(() => {
    setCreateModalOpen(true)
  }, [])

  const handleCreateTarefa = useCallback(
    async (payload: CriarTarefaPayload) => {
      try {
        await criarMutation.mutateAsync(payload)
        setCreateModalOpen(false)
        showToast({ variant: 'success', message: 'Tarefa criada com sucesso.' })
      } catch (err) {
        showToast({
          variant: 'danger',
          title: 'Não foi possível criar a tarefa',
          message: err instanceof Error ? err.message : 'Tente novamente.',
        })
      }
    },
    [criarMutation, showToast]
  )

  const handleSaveEdicaoTarefa = useCallback(
    async (form: TarefaFormState) => {
      if (!editingTask) return
      const tarefaId = editingTask.id
      const full = tarefaFormToPayload(form)
      const podeEditarTarefa = hasPermission(user, PERMISSION_KEYS.TAREFA_EDITAR)
      const podeClassificarTarefa = usuarioPodeClassificarTarefa(user, editingTask)

      try {
        if (podeEditarTarefa && podeClassificarTarefa) {
          await atualizarMutation.mutateAsync({ tarefaId, payload: full })
        } else if (podeEditarTarefa) {
          const {
            tipo_etapa: _tipo,
            proposta_referencia: _orc,
            ordem_producao_referencia: _op,
            ...restante
          } = full
          await atualizarMutation.mutateAsync({ tarefaId, payload: restante })
        } else if (podeClassificarTarefa) {
          await classificarMutation.mutateAsync({
            tarefaId,
            payload: {
              tipo_etapa: full.tipo_etapa ?? 'NAO_CLASSIFICADA',
              proposta_referencia: full.proposta_referencia,
              ordem_producao_referencia: full.ordem_producao_referencia,
              horas_estipuladas: full.horas_estipuladas ?? null,
            },
          })
        } else {
          return
        }
        setEditingTask(null)
        showToast({ variant: 'success', message: 'Tarefa atualizada.' })
      } catch (err) {
        showToast({
          variant: 'danger',
          title: 'Não foi possível atualizar a tarefa',
          message: err instanceof Error ? err.message : 'Tente novamente.',
        })
      }
    },
    [atualizarMutation, classificarMutation, editingTask, showToast, user]
  )

  const handleStartTimer = useCallback(
    async (tarefa: TarefaKanbanItem) => {
      if (tarefaEntregue(tarefa)) {
        showToast({
          variant: 'warning',
          message: 'Tarefas entregues não aceitam contagem de horas.',
        })
        return
      }
      if (tarefa.pode_iniciar === false) {
        showToast({
          variant: 'warning',
          message:
            'Classifique a tarefa corretamente antes de iniciar. Proposta exige orçamento, produção exige OP e interna não usa vínculo.',
        })
        return
      }
      if (timerQuery.data?.jornada_permite_iniciar_cronometro === false) {
        showToast({
          variant: 'warning',
          message:
            timerQuery.data?.jornada_mensagem?.trim() ||
            'Fora da jornada de trabalho; não é possível iniciar o cronómetro.',
        })
        return
      }

      try {
        if (sessaoAtiva && sessaoAtiva.tarefa !== tarefa.id) {
          await pararTimerMutation.mutateAsync()
        }
        await iniciarTimerMutation.mutateAsync(tarefa.id)
        setTimerTick(Date.now())
        showToast({
          variant: 'success',
          message:
            sessaoAtiva && sessaoAtiva.tarefa !== tarefa.id
              ? 'Tarefa anterior registrada e nova contagem iniciada.'
              : 'Contagem de horas iniciada.',
        })
      } catch (err) {
        showToast({
          variant: 'danger',
          title: 'Não foi possível iniciar a contagem',
          message: err instanceof Error ? err.message : 'Tente novamente.',
        })
      }
    },
    [iniciarTimerMutation, pararTimerMutation, sessaoAtiva, showToast, timerQuery]
  )

  const handleStopTimer = useCallback(async () => {
    if (!sessaoAtiva) return

    try {
      await pararTimerMutation.mutateAsync()
      showToast({ variant: 'success', message: 'Horas registradas na tarefa.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Não foi possível registrar as horas',
        message: err instanceof Error ? err.message : 'Tente novamente.',
      })
    }
  }, [pararTimerMutation, sessaoAtiva, showToast])

  const handleCriarQuadroPadrao = useCallback(async () => {
    try {
      await criarQuadroPadraoMutation.mutateAsync()
      showToast({ variant: 'success', message: 'Quadro padrão criado.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Não foi possível criar o quadro',
        message: err instanceof Error ? err.message : 'Tente novamente.',
      })
    }
  }, [criarQuadroPadraoMutation, showToast])

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLElement>, tarefa: TarefaKanbanItem) => {
      if (!podeMover) return
      setDraggingTaskId(tarefa.id)
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', tarefa.id)
    },
    [podeMover]
  )

  const handleDragEnd = useCallback(() => {
    setDraggingTaskId(null)
    setDragOverColumnId(null)
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>, colunaId: string, ordem: number) => {
      event.preventDefault()
      event.stopPropagation()
      setDragOverColumnId(null)

      if (!podeMover) return
      const tarefaId = event.dataTransfer.getData('text/plain') || draggingTaskId
      if (!tarefaId) return

      void moverMutation
        .mutateAsync({ tarefaId, colunaId, ordem })
        .then(() => {
          showToast({ variant: 'success', message: 'Tarefa movida.' })
        })
        .catch((err) => {
          showToast({
            variant: 'danger',
            title: 'Não foi possível mover a tarefa',
            message: err instanceof Error ? err.message : 'Tente novamente.',
          })
        })
        .finally(() => {
          setDraggingTaskId(null)
        })
    },
    [draggingTaskId, moverMutation, podeMover, showToast]
  )

  return (
    <div className="tarefas-kanban-page">
      <header className="tarefas-board-topbar">
        <div className="tarefas-board-brand">
          <span className="tarefas-board-brand__mark" aria-hidden="true">
            Z
          </span>
          <div>
            <div className="tarefas-board-brand__section">Quadros</div>
            <h1 className="tarefas-board-brand__title">Tarefas e Kanban</h1>
          </div>
        </div>

        <div className="tarefas-board-search input-group input-group-sm">
          <span className="input-group-text border-end-0 bg-body-secondary" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
            </svg>
          </span>
          <label className="visually-hidden" htmlFor="tarefas-busca">
            Buscar tarefas
          </label>
          <input
            id="tarefas-busca"
            className="form-control border-start-0"
            value={busca}
            placeholder="Código, título, responsável…"
            onChange={(event) => setBusca(event.target.value)}
          />
        </div>
        <div className="tarefas-kanban-toolbar__actions">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            Atualizar
          </button>
          {podeVerRelatorioHoras ? (
            <Link to="/tarefas/horas-gestao" className="btn btn-sm btn-outline-secondary">
              Gestão de horas
            </Link>
          ) : null}
          {podeCriar ? (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => abrirNovaTarefa()}
              disabled={!quadro}
            >
              Nova tarefa
            </button>
          ) : null}
        </div>
      </header>

      {isPending ? (
        <div className="kanban-loading-state">
          <div className="card-body">Carregando Kanban...</div>
        </div>
      ) : null}

      {isError ? (
        <div className="alert alert-danger" role="alert">
          Não foi possível carregar o Kanban de tarefas.
          {error && 'message' in error ? ` ${String(error.message)}` : ''}
        </div>
      ) : null}

      {!isPending && !isError && !quadro ? (
        <div className="kanban-empty-state">
          <h2 className="h5 mb-2">Nenhum quadro ativo encontrado</h2>
          <p className="text-muted mb-3">
            Crie um quadro padrão com colunas iniciais para liberar o cadastro de tarefas.
          </p>
          {podeCriarQuadroPadrao ? (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => void handleCriarQuadroPadrao()}
              disabled={criarQuadroPadraoMutation.isPending}
            >
              {criarQuadroPadraoMutation.isPending ? 'Criando...' : 'Criar quadro padrão'}
            </button>
          ) : (
            <p className="text-muted small mb-0">
              Seu usuário pode visualizar tarefas, mas precisa da permissão de gerenciar quadros
              ou criar tarefas para iniciar a estrutura padrão.
            </p>
          )}
        </div>
      ) : null}

      {quadro ? (
        <>
          <section className="tarefas-board-titlebar" aria-label="Quadro ativo">
            <div className="tarefas-board-titlebar__identity">
              <strong>{quadro.nome}</strong>
              {quadro.equipe ? <span>{quadro.equipe}</span> : null}
            </div>
            <div className="tarefas-board-tabs" role="tablist" aria-label="Visualizações de tarefas">
              {VISUALIZACOES_TAREFAS.map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={visualizacao === value ? 'is-active' : ''}
                  role="tab"
                  aria-selected={visualizacao === value}
                  onClick={() => setVisualizacao(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <div className="kanban-workspace">
            <aside className="kanban-filter-panel" aria-label="Filtros do Kanban">
              <div className="kanban-filter-panel__section">
                <label className="form-label" htmlFor="tarefas-situacao">
                  Situação
                </label>
                <select
                  id="tarefas-situacao"
                  className="form-select form-select-sm"
                  value={filtroSituacao}
                  onChange={(event) => setFiltroSituacao(event.target.value as FiltroSituacao)}
                >
                  {FILTROS_SITUACAO.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {podeApontarHoras ? (
                <div
                  className="kanban-filter-panel__section kanban-hours-dashboard"
                  aria-label="Total das minhas horas apontadas hoje em tarefas"
                >
                  <h2>Minhas horas hoje</h2>
                  <div className="kanban-hours-dashboard__total">
                    <strong>{formatarHoras(dashboardHoras?.total_horas ?? '0.00')}</strong>
                    <span>{formatarDataApontamento(dashboardHoras?.data ?? dataDashboardHoras)}</span>
                  </div>
                  {dashboardHorasQuery.isPending ? (
                    <p className="kanban-hours-dashboard__note mb-0">Carregando horas...</p>
                  ) : null}
                  {dashboardHorasQuery.isError ? (
                    <p className="kanban-hours-dashboard__note mb-0">
                      Não foi possível carregar as horas.
                    </p>
                  ) : null}
                  {!dashboardHorasQuery.isPending &&
                  !dashboardHorasQuery.isError &&
                  Number(dashboardHoras?.total_horas ?? '0') === 0 ? (
                    <p className="kanban-hours-dashboard__note mb-0">Sem horas apontadas hoje.</p>
                  ) : null}
                  {!dashboardHorasQuery.isPending &&
                  !dashboardHorasQuery.isError &&
                  Number(dashboardHoras?.total_horas ?? '0') > 0 ? (
                    <p className="kanban-hours-dashboard__note mb-0">
                      Soma das suas horas apontadas neste dia (exceto canceladas ou rejeitadas).
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="kanban-filter-panel__section">
                <h2>Ativos</h2>
                <div className="kanban-filter-panel__stats">
                  <span>
                    <strong>{totalTarefas}</strong>
                    tarefas no quadro
                  </span>
                  <span>
                    <strong>{totalVisivel}</strong>
                    tarefas filtradas
                  </span>
                  <span>
                    <strong>{tarefasVencidas}</strong>
                    vencidas
                  </span>
                </div>
              </div>

              <div className="kanban-filter-panel__section">
                <h2>Filtros rápidos</h2>
                <fieldset className="kanban-filter-panel__group" aria-label="Situação">
                  {FILTROS_SITUACAO.map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      className={`kanban-filter-panel__option ${
                        filtroSituacao === value ? 'is-active' : ''
                      }`}
                      onClick={() => setFiltroSituacao(value)}
                    >
                      {label}
                    </button>
                  ))}
                </fieldset>
              </div>

              <div className="kanban-filter-panel__section">
                <h2>Filtros avançados</h2>
                <label className="kanban-filter-panel__check">
                  <input
                    type="checkbox"
                    checked={filtroSituacao === 'vencidas'}
                    onChange={() =>
                      setFiltroSituacao((estado) => (estado === 'vencidas' ? 'todas' : 'vencidas'))
                    }
                  />
                  Vencidas
                </label>
                <label className="kanban-filter-panel__check">
                  <input
                    type="checkbox"
                    checked={filtroSituacao === 'concluidas'}
                    onChange={() =>
                      setFiltroSituacao((estado) =>
                        estado === 'concluidas' ? 'todas' : 'concluidas'
                      )
                    }
                  />
                  Entregue
                </label>
                <label className="kanban-filter-panel__check">
                  <input
                    type="checkbox"
                    checked={filtroSituacao === 'abertas'}
                    onChange={() =>
                      setFiltroSituacao((estado) => (estado === 'abertas' ? 'todas' : 'abertas'))
                    }
                  />
                  Abertas
                </label>
              </div>
            </aside>

            {visualizacao === 'kanban' ? (
              <section className="kanban-board" aria-label={`Kanban ${quadro.nome}`}>
                {colunasRenderizadas.map((coluna) => (
                  <div
                    className={`kanban-column ${colunaStatusClass(coluna.status_semantico)} ${
                      dragOverColumnId === coluna.id ? 'is-drag-over' : ''
                    }`}
                    key={coluna.id}
                    data-testid={`kanban-column-${coluna.id}`}
                    onDragOver={(event) => {
                      if (!podeMover) return
                      event.preventDefault()
                      event.dataTransfer.dropEffect = 'move'
                      setDragOverColumnId(coluna.id)
                    }}
                    onDragLeave={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                        setDragOverColumnId(null)
                      }
                    }}
                    onDrop={(event) => handleDrop(event, coluna.id, coluna.tarefas.length)}
                  >
                    <div className="kanban-column__header">
                      <div>
                        <h2>{coluna.nome}</h2>
                        <span>{coluna.status_semantico_display}</span>
                      </div>
                      <div className="kanban-column__header-actions">
                        <strong>{coluna.tarefas.length}</strong>
                        <span aria-hidden="true">...</span>
                      </div>
                    </div>
                    {coluna.limite_wip ? (
                      <div
                        className={`kanban-column__wip ${
                          coluna.tarefas.length > coluna.limite_wip ? 'is-over' : ''
                        }`}
                      >
                        WIP {coluna.tarefas.length}/{coluna.limite_wip}
                      </div>
                    ) : null}
                    <div className="kanban-column__tasks">
                      {coluna.tarefasVisiveis.length === 0 ? (
                        <p className="kanban-column__empty">Sem tarefas nesta coluna.</p>
                      ) : (
                        coluna.tarefasVisiveis.map((tarefa) => (
                          <TarefaCard
                            tarefa={tarefa}
                            key={tarefa.id}
                            podeMover={podeMover}
                            podeApontarHoras={podeApontarHoras}
                            jornadaPermiteIniciarTimer={jornadaPermiteIniciarTimer}
                            arrastando={draggingTaskId === tarefa.id}
                            timerAtivo={sessaoAtiva?.tarefa === tarefa.id}
                            tempoAtivoLabel={
                              sessaoAtiva?.tarefa === tarefa.id
                                ? formatarTempo(timerAtivoSegundos)
                                : null
                            }
                            isSavingTime={
                              iniciarTimerMutation.isPending || pararTimerMutation.isPending
                            }
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onDropBefore={(event, alvo) => handleDrop(event, coluna.id, alvo.ordem)}
                            onOpen={setEditingTask}
                            onStartTimer={handleStartTimer}
                            onStopTimer={handleStopTimer}
                          />
                        ))
                      )}
                    </div>
                    {podeCriar ? (
                      <button
                        type="button"
                        className="kanban-column__add"
                        onClick={() => abrirNovaTarefa()}
                      >
                        + Adicionar tarefa
                      </button>
                    ) : null}
                  </div>
                ))}
              </section>
            ) : null}

            {visualizacao === 'lista' ? (
              <TarefasListaView tarefas={tarefasVisiveis} onOpen={setEditingTask} />
            ) : null}
            {visualizacao === 'calendario' ? (
              <TarefasCalendarioView tarefas={tarefasVisiveis} onOpen={setEditingTask} />
            ) : null}
            {visualizacao === 'dashboard' ? (
              <TarefasDashboardView tarefas={tarefasVisiveis} colunas={colunasRenderizadas} />
            ) : null}
          </div>
        </>
      ) : null}

      {createModalOpen ? (
        <TarefaCreateModal
          colunas={quadro?.colunas ?? []}
          isSubmitting={criarMutation.isPending}
          onClose={() => setCreateModalOpen(false)}
          onSubmit={handleCreateTarefa}
        />
      ) : null}
      {editingTask ? (
        <TarefaEditModal
          tarefa={editingTask}
          colunas={quadro?.colunas ?? []}
          timerAtivo={sessaoAtiva?.tarefa === editingTask.id}
          tempoAtivoSegundos={
            sessaoAtiva?.tarefa === editingTask.id ? timerAtivoSegundos : 0
          }
          podeEditar={podeMover}
          podeClassificar={podeClassificar}
          podeAlterarClassificacaoComApontamentos={podeAlterarClassificacaoComApontamentos}
          podeApontarHoras={podeApontarHoras}
          isSubmitting={
            atualizarMutation.isPending || classificarMutation.isPending
          }
          isSavingTime={iniciarTimerMutation.isPending || pararTimerMutation.isPending}
          onClose={() => setEditingTask(null)}
          onSaveEdicao={handleSaveEdicaoTarefa}
          onStartTimer={handleStartTimer}
          onStopTimer={handleStopTimer}
        />
      ) : null}
    </div>
  )
}
