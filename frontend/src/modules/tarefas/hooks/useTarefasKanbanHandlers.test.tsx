import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TarefaKanbanItem } from '../types/tarefa'
import { useTarefasKanbanHandlers } from './useTarefasKanbanHandlers'

const showToastMock = vi.hoisted(() => vi.fn())

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

function tarefa(overrides: Partial<TarefaKanbanItem> = {}): TarefaKanbanItem {
  return {
    id: 't-1',
    titulo: 'Tarefa',
    descricao: '',
    coluna: 'c-1',
    responsavel: 1,
    responsavel_nome: 'Ana',
    colaboradores: [],
    colaboradores_nomes: [],
    prioridade: 'MEDIA',
    prioridade_display: 'Média',
    prazo: null,
    status: 'ABERTA',
    status_display: 'Aberta',
    proposta_referencia: '',
    ordem_producao_referencia: '',
    ordem: 0,
    concluida_em: null,
    total_horas_apontadas: '0',
    pode_iniciar: true,
    ...overrides,
  }
}

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('useTarefasKanbanHandlers', () => {
  const setCreateModalOpen = vi.fn()
  const setEditingTask = vi.fn()
  const setDraggingTaskId = vi.fn()
  const setDragOverColumnId = vi.fn()
  const onTimerTick = vi.fn()

  const criar = { mutateAsync: vi.fn(), isPending: false }
  const atualizar = { mutateAsync: vi.fn(), isPending: false }
  const classificar = { mutateAsync: vi.fn(), isPending: false }
  const mover = { mutateAsync: vi.fn(), isPending: false }
  const iniciarTimer = { mutateAsync: vi.fn(), isPending: false }
  const pararTimer = { mutateAsync: vi.fn(), isPending: false }
  const criarQuadro = { mutateAsync: vi.fn(), isPending: false }

  const user = {
    id: 1,
    email: 'a@test.com',
    permissoes: [
      'tarefa.editar',
      'tarefa.classificar',
      'tarefa.criar',
      'tarefa.apontar_horas',
    ],
  } as never

  beforeEach(() => {
    vi.clearAllMocks()
    criar.mutateAsync.mockResolvedValue({})
    atualizar.mutateAsync.mockResolvedValue({})
    classificar.mutateAsync.mockResolvedValue({})
    mover.mutateAsync.mockResolvedValue({})
    iniciarTimer.mutateAsync.mockResolvedValue({})
    pararTimer.mutateAsync.mockResolvedValue({})
    criarQuadro.mutateAsync.mockResolvedValue({})
  })

  function renderHandlers(editingTask: TarefaKanbanItem | null = tarefa()) {
    return renderHook(
      () =>
        useTarefasKanbanHandlers(
          user,
          { criar, atualizar, classificar, mover, iniciarTimer, pararTimer, criarQuadro },
          {
            sessaoAtiva: null,
            jornadaPermiteIniciar: true,
            onTimerTick,
          },
          editingTask,
          true,
          't-1',
          { setCreateModalOpen, setEditingTask, setDraggingTaskId, setDragOverColumnId }
        ),
      { wrapper: createWrapper() }
    )
  }

  it('handleCreateTarefa fecha modal e exibe sucesso', async () => {
    const { result } = renderHandlers(null)
    await act(async () => {
      await result.current.handleCreateTarefa({
        titulo: 'Nova',
        descricao: '',
        coluna: 'c-1',
        responsavel: null,
        colaboradores: [],
        prioridade: 'MEDIA',
        prazo: null,
        tipo_etapa: 'INTERNA',
        proposta_referencia: '',
        ordem_producao_referencia: '',
        horas_estipuladas: null,
      })
    })
    expect(criar.mutateAsync).toHaveBeenCalled()
    expect(setCreateModalOpen).toHaveBeenCalledWith(false)
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success', message: 'Tarefa criada com sucesso.' })
    )
  })

  it('handleStartTimer bloqueia tarefa entregue', async () => {
    const { result } = renderHandlers()
    await act(async () => {
      await result.current.handleStartTimer(tarefa({ status: 'CONCLUIDA' }))
    })
    expect(iniciarTimer.mutateAsync).not.toHaveBeenCalled()
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'warning',
        message: 'Tarefas entregues não aceitam contagem de horas.',
      })
    )
  })

  it('handleStartTimer inicia cronômetro e atualiza tick', async () => {
    const { result } = renderHandlers()
    await act(async () => {
      await result.current.handleStartTimer(tarefa())
    })
    expect(iniciarTimer.mutateAsync).toHaveBeenCalledWith('t-1')
    expect(onTimerTick).toHaveBeenCalled()
  })

  it('handleDrop move tarefa quando podeMover', async () => {
    const { result } = renderHandlers(null)
    const preventDefault = vi.fn()
    const stopPropagation = vi.fn()
    const event = {
      preventDefault,
      stopPropagation,
      dataTransfer: { getData: () => 't-1' },
    } as never

    act(() => {
      result.current.handleDrop(event, 'c-2', 0)
    })

    await waitFor(() => {
      expect(mover.mutateAsync).toHaveBeenCalledWith({
        tarefaId: 't-1',
        colunaId: 'c-2',
        ordem: 0,
      })
    })
    expect(setDraggingTaskId).toHaveBeenCalledWith(null)
  })

  it('pararTimerAutomaticoJornada encerra sessão com toast de sucesso', async () => {
    const { result } = renderHandlers(null)
    await act(async () => {
      result.current.pararTimerAutomaticoJornada()
    })
    await waitFor(() => {
      expect(pararTimer.mutateAsync).toHaveBeenCalled()
      expect(showToastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Contagem encerrada automaticamente ao fim da jornada.',
        })
      )
    })
  })
})
