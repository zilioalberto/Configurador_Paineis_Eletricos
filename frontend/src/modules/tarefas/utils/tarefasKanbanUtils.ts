/** Utilitários de formatação, filtros e payload do Kanban de tarefas. */

import type { AuthUser } from '@/modules/auth/types'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import type {
  ApontamentoHora,
  AtualizarTarefaPayload,
  ColunaKanban,
  CriarTarefaPayload,
  TarefaKanbanItem,
} from '../types/tarefa'
import type { FiltroSituacao, TarefaFormState } from './tarefasKanbanConstants'

export function colunaStatusClass(status: string): string {
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

export function prioridadeClass(prioridade: string): string {
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

export function prioridadeAccentClass(prioridade: string): string {
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

export function formatarPrazo(iso: string | null): string {
  if (!iso) return 'Sem prazo'
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return 'Sem prazo'
  return data.toLocaleDateString('pt-BR', { dateStyle: 'short' })
}

export function formatarDataHora(iso: string | null): string {
  if (!iso) return '-'
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return '-'
  return data.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function formatarDataApontamento(iso: string | null): string {
  if (!iso) return '-'
  const [ano, mes, dia] = iso.split('-')
  if (!ano || !mes || !dia) return iso
  return `${dia}/${mes}/${ano}`
}

export function formatarDataCompleta(iso: string | null): string {
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
export function dataLocalHoje(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatarHoras(horas: string): string {
  const valor = Number(horas)
  if (Number.isNaN(valor)) return `${horas}h`
  return `${valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}h`
}

export function horasEstipuladasApiParaForm(api: string | null | undefined): string {
  if (api == null || api === '') return ''
  const n = Number(api)
  if (Number.isNaN(n)) return ''
  return String(n).replace('.', ',')
}

/** Valor decimal para a API (`null` limpa o campo). */
export function horasEstipuladasFormParaApi(texto: string): string | null {
  const t = texto.trim().replace(/\s/g, '').replace(',', '.')
  if (!t) return null
  const n = Number(t)
  if (Number.isNaN(n) || n < 0) return null
  return n.toFixed(2)
}

export function totalizarHoras(apontamentos: ApontamentoHora[]): string {
  const totalCentavos = apontamentos.reduce((total, apontamento) => {
    const horas = Number(apontamento.horas)
    if (Number.isNaN(horas)) return total
    return total + Math.round(horas * 100)
  }, 0)
  return (totalCentavos / 100).toFixed(2)
}

export function totalizarHorasTarefas(tarefas: TarefaKanbanItem[]): string {
  const totalCentavos = tarefas.reduce((total, tarefa) => {
    const horas = Number(tarefa.total_horas_apontadas)
    if (Number.isNaN(horas)) return total
    return total + Math.round(horas * 100)
  }, 0)
  return (totalCentavos / 100).toFixed(2)
}

export function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return ''
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return ''
  const offsetMs = data.getTimezoneOffset() * 60 * 1000
  return new Date(data.getTime() - offsetMs).toISOString().slice(0, 16)
}

export function formatarTempo(segundos: number): string {
  const seguro = Math.max(0, Math.floor(segundos))
  const horas = Math.floor(seguro / 3600)
  const minutos = Math.floor((seguro % 3600) / 60)
  const resto = seguro % 60
  return [horas, minutos, resto].map((parte) => String(parte).padStart(2, '0')).join(':')
}

export function tarefaToFormState(tarefa: TarefaKanbanItem): TarefaFormState {
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

export function iniciaisResponsavel(nome: string | null): string {
  if (!nome?.trim()) return '?'
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
}

export function referenciasTarefa(tarefa: TarefaKanbanItem): string[] {
  return [tarefa.proposta_referencia, tarefa.ordem_producao_referencia].filter(
    (valor): valor is string => Boolean(valor),
  )
}

export function origemApontamento(apontamento: ApontamentoHora): string {
  return apontamento.sessao_id ? 'Cronômetro' : 'Manual'
}

export function rotuloStatusApontamento(status: string): string {
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

export function tarefaVencida(tarefa: TarefaKanbanItem): boolean {
  if (!tarefa.prazo || tarefaEntregue(tarefa)) return false
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return new Date(tarefa.prazo) < hoje
}

export function tarefaEntregue(tarefa: TarefaKanbanItem): boolean {
  return tarefa.status === 'CONCLUIDA'
}

/** Responsável, criador ou colaborador da tarefa (ex.: marcado na criação). */
export function usuarioEnvolvidoNaTarefa(user: AuthUser | null, tarefa: TarefaKanbanItem): boolean {
  const uid = user?.id
  if (typeof uid !== 'number') return false
  if (tarefa.responsavel === uid) return true
  if (tarefa.criador === uid) return true
  return (tarefa.colaboradores ?? []).includes(uid)
}

export function usuarioPodeClassificarTarefa(user: AuthUser | null, tarefa: TarefaKanbanItem): boolean {
  if (hasPermission(user, PERMISSION_KEYS.TAREFA_CLASSIFICAR)) return true
  return usuarioEnvolvidoNaTarefa(user, tarefa)
}

export function tarefaPrazoTimestamp(tarefa: TarefaKanbanItem): number | null {
  if (!tarefa.prazo) return null
  const timestamp = new Date(tarefa.prazo).getTime()
  return Number.isNaN(timestamp) ? null : timestamp
}

export function tarefaCombinaBusca(tarefa: TarefaKanbanItem, termo: string): boolean {
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

export function tarefaCombinaSituacao(
  tarefa: TarefaKanbanItem,
  filtro: FiltroSituacao
): boolean {
  if (filtro === 'abertas') return !tarefaEntregue(tarefa)
  if (filtro === 'vencidas') return tarefaVencida(tarefa)
  if (filtro === 'concluidas') return tarefaEntregue(tarefa)
  return true
}

export function tarefaFormToPayload(form: TarefaFormState): CriarTarefaPayload {
  const prazoDate = form.prazo ? new Date(form.prazo) : null
  return {
    titulo: form.titulo.trim(),
    descricao: form.descricao.trim(),
    coluna: form.coluna,
    responsavel: form.responsavel ? Number(form.responsavel) : null,
    colaboradores: form.colaboradores.map(Number),
    prioridade: form.prioridade,
    prazo: prazoDate && !Number.isNaN(prazoDate.getTime()) ? prazoDate.toISOString() : null,
    tipo_etapa: form.tipo_etapa,
    proposta_referencia: form.proposta_referencia.trim(),
    ordem_producao_referencia: form.ordem_producao_referencia.trim(),
    horas_estipuladas: horasEstipuladasFormParaApi(form.horas_estipuladas),
  }
}

/** Coluna inicial para novas tarefas (quadro de 3 colunas: Pendentes). */
export function idColunaPendentes(colunas: ColunaKanban[]): string | null {
  const pendente = colunas.find((coluna) => coluna.status_semantico === 'PENDENTE')
  if (pendente) return pendente.id
  const ordenadas = [...colunas].sort((a, b) => a.ordem - b.ordem)
  return ordenadas[0]?.id ?? null
}

export function minDatetimeLocalHoje(): string {
  const inicio = new Date()
  inicio.setHours(0, 0, 0, 0)
  const offsetMs = inicio.getTimezoneOffset() * 60 * 1000
  return new Date(inicio.getTime() - offsetMs).toISOString().slice(0, 16)
}

/** Prazo opcional; se preenchido, não pode ser antes do início do dia atual (hora local). */
export function prazoCriacaoValido(prazoLocal: string): boolean {
  if (!prazoLocal.trim()) return true
  const escolhido = new Date(prazoLocal)
  if (Number.isNaN(escolhido.getTime())) return false
  const inicioHoje = new Date()
  inicioHoje.setHours(0, 0, 0, 0)
  return escolhido >= inicioHoje
}

export function tarefaFormToPayloadNovaTarefa(form: TarefaFormState, colunaId: string): CriarTarefaPayload {
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
    colaboradores: form.colaboradores.map(Number),
    prioridade: form.prioridade,
    prazo: prazoDate && !Number.isNaN(prazoDate.getTime()) ? prazoDate.toISOString() : null,
    tipo_etapa: tipo,
    proposta_referencia: orc,
    ordem_producao_referencia: op,
    horas_estipuladas: horasEstipuladasFormParaApi(form.horas_estipuladas),
  }
}

export function tarefaPayloadSemClassificacao(payload: CriarTarefaPayload): AtualizarTarefaPayload {
  const restante: AtualizarTarefaPayload = { ...payload }
  delete restante.tipo_etapa
  delete restante.proposta_referencia
  delete restante.ordem_producao_referencia
  return restante
}

export function toggleColaborador(colaboradores: string[], colaboradorId: string): string[] {
  if (colaboradores.includes(colaboradorId)) {
    return colaboradores.filter((id) => id !== colaboradorId)
  }
  return [...colaboradores, colaboradorId]
}
