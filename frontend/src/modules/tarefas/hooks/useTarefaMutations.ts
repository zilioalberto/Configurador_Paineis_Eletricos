import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ajustarApontamentoHora,
  atualizarComentarioTarefa,
  atualizarItemChecklist,
  atualizarTarefa,
  aprovarApontamentoHora,
  classificarTarefa,
  concluirTarefa,
  criarComentarioTarefa,
  criarItemChecklist,
  criarQuadroPadraoTarefas,
  criarTarefa,
  excluirTarefa,
  eliminarComentarioTarefa,
  eliminarItemChecklist,
  iniciarTimerTarefa,
  moverTarefa,
  pararTimerTarefa,
  rejeitarApontamentoHora,
  registrarApontamentoHora,
} from '../services/tarefasService'
import { tarefasQueryKeys } from '../tarefasQueryKeys'
import type {
  AjustarApontamentoPayload,
  AtualizarTarefaPayload,
  ChecklistTarefaItem,
  ClassificarTarefaPayload,
  CriarTarefaPayload,
  KanbanTarefasResponse,
  MoverTarefaPayload,
  RegistrarApontamentoHoraPayload,
} from '../types/tarefa'
import { moverTarefaNoKanbanLocal } from '../utils/kanbanLocalState'

export function useCriarTarefaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CriarTarefaPayload) => criarTarefa(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tarefasQueryKeys.all })
    },
  })
}

export function useCriarQuadroPadraoTarefasMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: criarQuadroPadraoTarefas,
    onSuccess: (data) => {
      queryClient.setQueryData(tarefasQueryKeys.kanban(), data)
      void queryClient.invalidateQueries({ queryKey: tarefasQueryKeys.all })
    },
  })
}

export function useAtualizarTarefaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      tarefaId,
      payload,
    }: {
      tarefaId: string
      payload: AtualizarTarefaPayload
    }) => atualizarTarefa(tarefaId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tarefasQueryKeys.all })
    },
  })
}

export function useExcluirTarefaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tarefaId: string) => excluirTarefa(tarefaId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tarefasQueryKeys.all })
    },
  })
}

export function useConcluirTarefaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tarefaId: string) => concluirTarefa(tarefaId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tarefasQueryKeys.all })
    },
  })
}

export function useClassificarTarefaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      tarefaId,
      payload,
    }: {
      tarefaId: string
      payload: ClassificarTarefaPayload
    }) => classificarTarefa(tarefaId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tarefasQueryKeys.all })
    },
  })
}

export function useMoverTarefaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: MoverTarefaPayload) => moverTarefa(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: tarefasQueryKeys.all })
      const anterior = queryClient.getQueryData<KanbanTarefasResponse>(
        tarefasQueryKeys.kanban()
      )

      queryClient.setQueryData<KanbanTarefasResponse | undefined>(
        tarefasQueryKeys.kanban(),
        (atual) =>
          moverTarefaNoKanbanLocal(
            atual,
            payload.tarefaId,
            payload.colunaId,
            payload.ordem ?? Number.MAX_SAFE_INTEGER
          )
      )

      return { anterior }
    },
    onError: (_error, _payload, contexto) => {
      if (contexto?.anterior) {
        queryClient.setQueryData(tarefasQueryKeys.kanban(), contexto.anterior)
      }
    },
    onSuccess: (tarefa, payload) => {
      queryClient.setQueryData<KanbanTarefasResponse | undefined>(
        tarefasQueryKeys.kanban(),
        (atual) =>
          moverTarefaNoKanbanLocal(
            atual,
            tarefa.id,
            tarefa.coluna,
            tarefa.ordem,
            tarefa
          ) ??
          moverTarefaNoKanbanLocal(
            atual,
            payload.tarefaId,
            payload.colunaId,
            payload.ordem ?? Number.MAX_SAFE_INTEGER
          )
      )
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: tarefasQueryKeys.all })
    },
  })
}

export function useRegistrarApontamentoHoraMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RegistrarApontamentoHoraPayload) => registrarApontamentoHora(payload),
    onSuccess: (_data, payload) => {
      void queryClient.invalidateQueries({ queryKey: tarefasQueryKeys.all })
      void queryClient.invalidateQueries({
        queryKey: tarefasQueryKeys.apontamentos(payload.tarefa),
      })
      void queryClient.invalidateQueries({ queryKey: tarefasQueryKeys.all })
    },
  })
}

export function useIniciarTimerTarefaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (tarefaId: string) => iniciarTimerTarefa(tarefaId),
    onSuccess: (data) => {
      queryClient.setQueryData(tarefasQueryKeys.timerAtivo(), data)
      void queryClient.invalidateQueries({ queryKey: tarefasQueryKeys.timerAtivo() })
    },
  })
}

export function usePararTimerTarefaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: pararTimerTarefa,
    onSuccess: () => {
      queryClient.setQueryData(tarefasQueryKeys.timerAtivo(), { sessao: null })
      void queryClient.invalidateQueries({ queryKey: tarefasQueryKeys.kanban() })
      void queryClient.invalidateQueries({ queryKey: tarefasQueryKeys.all })
      void queryClient.invalidateQueries({ queryKey: tarefasQueryKeys.timerAtivo() })
      void queryClient.invalidateQueries({ queryKey: [...tarefasQueryKeys.all, 'horas-dia'] })
    },
  })
}

export function useCriarComentarioTarefaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ tarefaId, texto }: { tarefaId: string; texto: string }) =>
      criarComentarioTarefa(tarefaId, texto),
    onSuccess: (_data, { tarefaId }) => {
      void queryClient.invalidateQueries({
        queryKey: tarefasQueryKeys.comentarios(tarefaId),
      })
      void queryClient.invalidateQueries({
        queryKey: tarefasQueryKeys.historico(tarefaId),
      })
    },
  })
}

export function useAtualizarComentarioTarefaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      comentarioId,
      texto,
    }: {
      tarefaId: string
      comentarioId: string
      texto: string
    }) => atualizarComentarioTarefa(comentarioId, texto),
    onSuccess: (_data, { tarefaId }) => {
      void queryClient.invalidateQueries({
        queryKey: tarefasQueryKeys.comentarios(tarefaId),
      })
    },
  })
}

export function useEliminarComentarioTarefaMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      comentarioId,
    }: {
      tarefaId: string
      comentarioId: string
    }) => eliminarComentarioTarefa(comentarioId),
    onSuccess: (_data, { tarefaId }) => {
      void queryClient.invalidateQueries({
        queryKey: tarefasQueryKeys.comentarios(tarefaId),
      })
    },
  })
}

export function useCriarChecklistItemMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      tarefaId,
      titulo,
      ordem,
    }: {
      tarefaId: string
      titulo: string
      ordem?: number
    }) => criarItemChecklist(tarefaId, titulo, ordem),
    onSuccess: (_data, { tarefaId }) => {
      void queryClient.invalidateQueries({
        queryKey: tarefasQueryKeys.checklist(tarefaId),
      })
    },
  })
}

export function useAtualizarChecklistItemMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      itemId,
      patch,
    }: {
      tarefaId: string
      itemId: string
      patch: Partial<Pick<ChecklistTarefaItem, 'titulo' | 'concluido' | 'ordem'>>
    }) => atualizarItemChecklist(itemId, patch),
    onSuccess: (_data, { tarefaId }) => {
      void queryClient.invalidateQueries({
        queryKey: tarefasQueryKeys.checklist(tarefaId),
      })
    },
  })
}

export function useEliminarChecklistItemMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId }: { tarefaId: string; itemId: string }) => eliminarItemChecklist(itemId),
    onSuccess: (_data, { tarefaId }) => {
      void queryClient.invalidateQueries({
        queryKey: tarefasQueryKeys.checklist(tarefaId),
      })
    },
  })
}

export function useAprovarApontamentoHoraMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ apontamentoId }: { apontamentoId: string; tarefaId: string }) =>
      aprovarApontamentoHora(apontamentoId),
    onSuccess: (_data, { tarefaId }) => {
      void queryClient.invalidateQueries({ queryKey: tarefasQueryKeys.all })
      void queryClient.invalidateQueries({
        queryKey: tarefasQueryKeys.apontamentos(tarefaId),
      })
      void queryClient.invalidateQueries({
        queryKey: tarefasQueryKeys.historico(tarefaId),
      })
      void queryClient.invalidateQueries({ queryKey: [...tarefasQueryKeys.all, 'horas-dia'] })
    },
  })
}

export function useRejeitarApontamentoHoraMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ apontamentoId }: { apontamentoId: string; tarefaId: string }) =>
      rejeitarApontamentoHora(apontamentoId),
    onSuccess: (_data, { tarefaId }) => {
      void queryClient.invalidateQueries({ queryKey: tarefasQueryKeys.all })
      void queryClient.invalidateQueries({
        queryKey: tarefasQueryKeys.apontamentos(tarefaId),
      })
      void queryClient.invalidateQueries({
        queryKey: tarefasQueryKeys.historico(tarefaId),
      })
      void queryClient.invalidateQueries({ queryKey: [...tarefasQueryKeys.all, 'horas-dia'] })
    },
  })
}

export function useAjustarApontamentoHoraMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      apontamentoId,
      payload,
    }: {
      apontamentoId: string
      tarefaId: string
      payload: AjustarApontamentoPayload
    }) => ajustarApontamentoHora(apontamentoId, payload),
    onSuccess: (_data, { tarefaId }) => {
      void queryClient.invalidateQueries({ queryKey: tarefasQueryKeys.all })
      void queryClient.invalidateQueries({
        queryKey: tarefasQueryKeys.apontamentos(tarefaId),
      })
      void queryClient.invalidateQueries({
        queryKey: tarefasQueryKeys.historico(tarefaId),
      })
      void queryClient.invalidateQueries({ queryKey: [...tarefasQueryKeys.all, 'horas-dia'] })
    },
  })
}
