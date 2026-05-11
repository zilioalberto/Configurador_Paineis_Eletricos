import apiClient from '@/services/apiClient'
import type {
  ApontamentoHora,
  AtualizarTarefaPayload,
  AjustarApontamentoPayload,
  ChecklistTarefaItem,
  ClassificarTarefaPayload,
  ColaboradorHorasGestaoOption,
  ComentarioTarefa,
  CriarTarefaPayload,
  HistoricoTarefaItem,
  KanbanTarefasResponse,
  MoverTarefaPayload,
  RegistrarApontamentoHoraPayload,
  RelatorioHorasGestao,
  TarefaDashboardHorasDia,
  TarefaKanbanItem,
  TarefaResponsavelOption,
  TarefaTimerAtivoResponse,
  TarefaTimerPararResponse,
} from '../types/tarefa'

export async function obterKanbanTarefas(quadroId?: string | null): Promise<KanbanTarefasResponse> {
  const response = await apiClient.get<KanbanTarefasResponse>('/tarefas/kanban/', {
    params: quadroId ? { quadro: quadroId } : undefined,
  })
  return response.data
}

export async function criarQuadroPadraoTarefas(): Promise<KanbanTarefasResponse> {
  const response = await apiClient.post<KanbanTarefasResponse>('/tarefas/quadros/padrao/')
  return response.data
}

export async function listarResponsaveisTarefa(): Promise<TarefaResponsavelOption[]> {
  const response = await apiClient.get<TarefaResponsavelOption[]>('/tarefas/responsaveis/')
  return response.data
}

export async function listarApontamentosTarefa(tarefaId: string): Promise<ApontamentoHora[]> {
  const response = await apiClient.get<ApontamentoHora[]>('/tarefas/apontamentos/', {
    params: { tarefa: tarefaId },
  })
  return response.data
}

export async function obterDashboardHorasDia(data?: string): Promise<TarefaDashboardHorasDia> {
  const response = await apiClient.get<TarefaDashboardHorasDia>('/tarefas/dashboard/horas-dia/', {
    params: data ? { data } : undefined,
  })
  return response.data
}

export type RelatorioHorasGestaoParams = {
  data_inicio: string
  data_fim: string
  proposta?: string
  ordem_producao?: string
  /** Id numérico do colaborador (usuário) */
  colaborador?: string
}

export async function obterRelatorioHorasGestao(
  params: RelatorioHorasGestaoParams
): Promise<RelatorioHorasGestao> {
  const query: Record<string, string> = {
    data_inicio: params.data_inicio,
    data_fim: params.data_fim,
  }
  const prop = params.proposta?.trim()
  const op = params.ordem_producao?.trim()
  const colab = params.colaborador?.trim()
  if (prop) query.proposta = prop
  if (op) query.ordem_producao = op
  if (colab) query.colaborador = colab
  const response = await apiClient.get<RelatorioHorasGestao>(
    '/tarefas/relatorios/horas-gestao/',
    { params: query }
  )
  return response.data
}

export type ColaboradoresRelatorioHorasPeriodoParams = {
  data_inicio: string
  data_fim: string
}

export async function listarColaboradoresRelatorioHorasPeriodo(
  params: ColaboradoresRelatorioHorasPeriodoParams
): Promise<ColaboradorHorasGestaoOption[]> {
  const response = await apiClient.get<ColaboradorHorasGestaoOption[]>(
    '/tarefas/relatorios/horas-gestao/colaboradores/',
    {
      params: {
        data_inicio: params.data_inicio,
        data_fim: params.data_fim,
      },
    }
  )
  return response.data
}

export async function criarTarefa(payload: CriarTarefaPayload): Promise<TarefaKanbanItem> {
  const response = await apiClient.post<TarefaKanbanItem>('/tarefas/', payload)
  return response.data
}

export async function atualizarTarefa(
  tarefaId: string,
  payload: AtualizarTarefaPayload
): Promise<TarefaKanbanItem> {
  const response = await apiClient.patch<TarefaKanbanItem>(`/tarefas/${tarefaId}/`, payload)
  return response.data
}

export async function excluirTarefa(tarefaId: string): Promise<void> {
  await apiClient.delete(`/tarefas/${tarefaId}/`)
}

export async function classificarTarefa(
  tarefaId: string,
  payload: ClassificarTarefaPayload
): Promise<TarefaKanbanItem> {
  const response = await apiClient.post<TarefaKanbanItem>(
    `/tarefas/${tarefaId}/classificar/`,
    payload
  )
  return response.data
}

export async function concluirTarefa(tarefaId: string): Promise<TarefaKanbanItem> {
  const response = await apiClient.post<TarefaKanbanItem>(`/tarefas/${tarefaId}/concluir/`)
  return response.data
}

export async function moverTarefa({
  tarefaId,
  colunaId,
  ordem,
}: MoverTarefaPayload): Promise<TarefaKanbanItem> {
  const response = await apiClient.post<TarefaKanbanItem>(`/tarefas/${tarefaId}/mover/`, {
    coluna_id: colunaId,
    ...(ordem === undefined ? {} : { ordem }),
  })
  return response.data
}

export async function registrarApontamentoHora(
  payload: RegistrarApontamentoHoraPayload
): Promise<ApontamentoHora> {
  const response = await apiClient.post<ApontamentoHora>('/tarefas/apontamentos/', payload)
  return response.data
}

export async function obterTimerAtivoTarefa(): Promise<TarefaTimerAtivoResponse> {
  const response = await apiClient.get<TarefaTimerAtivoResponse>('/tarefas/timer/ativo/')
  return response.data
}

export async function iniciarTimerTarefa(
  tarefaId: string
): Promise<TarefaTimerAtivoResponse> {
  const response = await apiClient.post<TarefaTimerAtivoResponse>(
    `/tarefas/${tarefaId}/timer/iniciar/`
  )
  return response.data
}

export async function pararTimerTarefa(): Promise<TarefaTimerPararResponse> {
  const response = await apiClient.post<TarefaTimerPararResponse>('/tarefas/timer/parar/')
  return response.data
}

export async function listarHistoricoTarefa(tarefaId: string): Promise<HistoricoTarefaItem[]> {
  const response = await apiClient.get<HistoricoTarefaItem[]>('/tarefas/historico/', {
    params: { tarefa: tarefaId },
  })
  return response.data
}

export async function listarComentariosTarefa(tarefaId: string): Promise<ComentarioTarefa[]> {
  const response = await apiClient.get<ComentarioTarefa[]>('/tarefas/comentarios/', {
    params: { tarefa: tarefaId },
  })
  return response.data
}

export async function criarComentarioTarefa(
  tarefaId: string,
  texto: string
): Promise<ComentarioTarefa> {
  const response = await apiClient.post<ComentarioTarefa>('/tarefas/comentarios/', {
    tarefa: tarefaId,
    comentario: texto,
  })
  return response.data
}

export async function atualizarComentarioTarefa(
  id: string,
  texto: string
): Promise<ComentarioTarefa> {
  const response = await apiClient.patch<ComentarioTarefa>(`/tarefas/comentarios/${id}/`, {
    comentario: texto,
  })
  return response.data
}

export async function eliminarComentarioTarefa(id: string): Promise<void> {
  await apiClient.delete(`/tarefas/comentarios/${id}/`)
}

export async function listarChecklistTarefa(tarefaId: string): Promise<ChecklistTarefaItem[]> {
  const response = await apiClient.get<ChecklistTarefaItem[]>('/tarefas/checklist/', {
    params: { tarefa: tarefaId },
  })
  return response.data
}

export async function criarItemChecklist(
  tarefaId: string,
  titulo: string,
  ordem?: number
): Promise<ChecklistTarefaItem> {
  const response = await apiClient.post<ChecklistTarefaItem>('/tarefas/checklist/', {
    tarefa: tarefaId,
    titulo,
    ...(ordem !== undefined ? { ordem } : {}),
  })
  return response.data
}

export async function atualizarItemChecklist(
  id: string,
  patch: Partial<Pick<ChecklistTarefaItem, 'titulo' | 'concluido' | 'ordem'>>
): Promise<ChecklistTarefaItem> {
  const response = await apiClient.patch<ChecklistTarefaItem>(`/tarefas/checklist/${id}/`, patch)
  return response.data
}

export async function eliminarItemChecklist(id: string): Promise<void> {
  await apiClient.delete(`/tarefas/checklist/${id}/`)
}

export async function aprovarApontamentoHora(id: string): Promise<ApontamentoHora> {
  const response = await apiClient.post<ApontamentoHora>(`/tarefas/apontamentos/${id}/aprovar/`)
  return response.data
}

export async function rejeitarApontamentoHora(id: string): Promise<ApontamentoHora> {
  const response = await apiClient.post<ApontamentoHora>(`/tarefas/apontamentos/${id}/rejeitar/`)
  return response.data
}

export async function ajustarApontamentoHora(
  id: string,
  payload: AjustarApontamentoPayload
): Promise<ApontamentoHora> {
  const response = await apiClient.post<ApontamentoHora>(
    `/tarefas/apontamentos/${id}/ajustar/`,
    payload
  )
  return response.data
}
