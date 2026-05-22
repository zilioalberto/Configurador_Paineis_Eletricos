import { useCallback, type DragEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { AuthUser } from '@/modules/auth/types'
import { hasPermission } from '@/modules/auth/permissions'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { useToast } from '@/components/feedback'
import { tarefasQueryKeys } from '../tarefasQueryKeys'
import type {
  AtualizarTarefaPayload,
  ClassificarTarefaPayload,
  CriarTarefaPayload,
  TarefaKanbanItem,
} from '../types/tarefa'
import type { TarefaFormState } from '../utils/tarefasKanbanConstants'
import {
  tarefaEntregue,
  tarefaFormToPayload,
  tarefaPayloadSemClassificacao,
  usuarioPodeClassificarTarefa,
} from '../utils/tarefasKanbanUtils'

type Mutations = {
  criar: { mutateAsync: (p: CriarTarefaPayload) => Promise<unknown>; isPending: boolean }
  atualizar: {
    mutateAsync: (p: { tarefaId: string; payload: AtualizarTarefaPayload }) => Promise<unknown>
    isPending: boolean
  }
  classificar: {
    mutateAsync: (p: { tarefaId: string; payload: ClassificarTarefaPayload }) => Promise<unknown>
    isPending: boolean
  }
  mover: {
    mutateAsync: (p: { tarefaId: string; colunaId: string; ordem: number }) => Promise<unknown>
    isPending: boolean
  }
  iniciarTimer: { mutateAsync: (id: string) => Promise<unknown>; isPending: boolean }
  pararTimer: { mutateAsync: () => Promise<unknown>; isPending: boolean }
  criarQuadro: { mutateAsync: () => Promise<unknown>; isPending: boolean }
}

type TimerState = {
  sessaoAtiva: { tarefa: string; iniciado_em: string } | null | undefined
  jornadaPermiteIniciar: boolean
  jornadaMensagem?: string | null
  onTimerTick: () => void
}

export function useTarefasKanbanHandlers(
  user: AuthUser | null,
  mutations: Mutations,
  timer: TimerState,
  editingTask: TarefaKanbanItem | null,
  podeMover: boolean,
  draggingTaskId: string | null,
  setters: {
    setCreateModalOpen: (v: boolean) => void
    setEditingTask: (v: TarefaKanbanItem | null) => void
    setDraggingTaskId: (v: string | null) => void
    setDragOverColumnId: (v: string | null) => void
  }
) {
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const { sessaoAtiva, jornadaPermiteIniciar, onTimerTick } = timer

  const handleCreateTarefa = useCallback(
    async (payload: CriarTarefaPayload) => {
      try {
        await mutations.criar.mutateAsync(payload)
        setters.setCreateModalOpen(false)
        showToast({ variant: 'success', message: 'Tarefa criada com sucesso.' })
      } catch (err) {
        showToast({
          variant: 'danger',
          title: 'Não foi possível criar a tarefa',
          message: err instanceof Error ? err.message : 'Tente novamente.',
        })
      }
    },
    [mutations.criar, setters, showToast]
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
          await mutations.atualizar.mutateAsync({ tarefaId, payload: full })
        } else if (podeEditarTarefa) {
          await mutations.atualizar.mutateAsync({
            tarefaId,
            payload: tarefaPayloadSemClassificacao(full),
          })
        } else if (podeClassificarTarefa) {
          await mutations.classificar.mutateAsync({
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
        setters.setEditingTask(null)
        showToast({ variant: 'success', message: 'Tarefa atualizada.' })
      } catch (err) {
        showToast({
          variant: 'danger',
          title: 'Não foi possível atualizar a tarefa',
          message: err instanceof Error ? err.message : 'Tente novamente.',
        })
      }
    },
    [editingTask, mutations.atualizar, mutations.classificar, setters, showToast, user]
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
      if (!jornadaPermiteIniciar) {
        showToast({
          variant: 'warning',
          message:
            timer.jornadaMensagem?.trim() ||
            'Fora da jornada de trabalho; não é possível iniciar o cronómetro.',
        })
        return
      }

      try {
        if (sessaoAtiva && sessaoAtiva.tarefa !== tarefa.id) {
          await mutations.pararTimer.mutateAsync()
        }
        await mutations.iniciarTimer.mutateAsync(tarefa.id)
        onTimerTick()
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
    [jornadaPermiteIniciar, mutations.iniciarTimer, mutations.pararTimer, onTimerTick, sessaoAtiva, showToast, timer.jornadaMensagem]
  )

  const handleStopTimer = useCallback(async () => {
    if (!sessaoAtiva) return
    try {
      await mutations.pararTimer.mutateAsync()
      showToast({ variant: 'success', message: 'Horas registradas na tarefa.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Não foi possível registrar as horas',
        message: err instanceof Error ? err.message : 'Tente novamente.',
      })
    }
  }, [mutations.pararTimer, sessaoAtiva, showToast])

  const handleCriarQuadroPadrao = useCallback(async () => {
    try {
      await mutations.criarQuadro.mutateAsync()
      showToast({ variant: 'success', message: 'Quadro padrão criado.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Não foi possível criar o quadro',
        message: err instanceof Error ? err.message : 'Tente novamente.',
      })
    }
  }, [mutations.criarQuadro, showToast])

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLElement>, tarefa: TarefaKanbanItem) => {
      if (!podeMover) return
      setters.setDraggingTaskId(tarefa.id)
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', tarefa.id)
    },
    [podeMover, setters]
  )

  const handleDragEnd = useCallback(() => {
    setters.setDraggingTaskId(null)
    setters.setDragOverColumnId(null)
  }, [setters])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>, colunaId: string, ordem: number) => {
      event.preventDefault()
      event.stopPropagation()
      setters.setDragOverColumnId(null)
      if (!podeMover) return
      const tarefaId = event.dataTransfer.getData('text/plain') || draggingTaskId
      if (!tarefaId) return

      mutations.mover
        .mutateAsync({ tarefaId, colunaId, ordem })
        .then(() => showToast({ variant: 'success', message: 'Tarefa movida.' }))
        .catch((err) => {
          showToast({
            variant: 'danger',
            title: 'Não foi possível mover a tarefa',
            message: err instanceof Error ? err.message : 'Tente novamente.',
          })
        })
        .finally(() => setters.setDraggingTaskId(null))
    },
    [draggingTaskId, mutations.mover, podeMover, setters, showToast]
  )

  const pararTimerAutomaticoJornada = useCallback(() => {
    mutations.pararTimer
      .mutateAsync()
      .then(() => {
        showToast({
          variant: 'success',
          message: 'Contagem encerrada automaticamente ao fim da jornada.',
        })
      })
      .catch(() => {
        queryClient.invalidateQueries({ queryKey: tarefasQueryKeys.timerAtivo() }).catch(() => undefined)
        queryClient.invalidateQueries({ queryKey: tarefasQueryKeys.kanban() }).catch(() => undefined)
      })
  }, [mutations.pararTimer, queryClient, showToast])

  return {
    handleCreateTarefa,
    handleSaveEdicaoTarefa,
    handleStartTimer,
    handleStopTimer,
    handleCriarQuadroPadrao,
    handleDragStart,
    handleDragEnd,
    handleDrop,
    pararTimerAutomaticoJornada,
  }
}
