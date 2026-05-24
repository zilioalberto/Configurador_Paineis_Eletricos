import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { tarefasQueryKeys } from '../tarefasQueryKeys'
import {
  useAjustarApontamentoHoraMutation,
  useAprovarApontamentoHoraMutation,
  useAtualizarChecklistItemMutation,
  useAtualizarComentarioTarefaMutation,
  useAtualizarTarefaMutation,
  useClassificarTarefaMutation,
  useConcluirTarefaMutation,
  useCriarChecklistItemMutation,
  useCriarComentarioTarefaMutation,
  useCriarQuadroPadraoTarefasMutation,
  useCriarTarefaMutation,
  useEliminarChecklistItemMutation,
  useEliminarComentarioTarefaMutation,
  useExcluirTarefaMutation,
  useIniciarTimerTarefaMutation,
  useMoverTarefaMutation,
  usePararTimerTarefaMutation,
  useRegistrarApontamentoHoraMutation,
  useRejeitarApontamentoHoraMutation,
} from './useTarefaMutations'

const ajustarApontamentoHora = vi.hoisted(() => vi.fn())
const atualizarComentarioTarefa = vi.hoisted(() => vi.fn())
const atualizarItemChecklist = vi.hoisted(() => vi.fn())
const atualizarTarefa = vi.hoisted(() => vi.fn())
const aprovarApontamentoHora = vi.hoisted(() => vi.fn())
const classificarTarefa = vi.hoisted(() => vi.fn())
const concluirTarefa = vi.hoisted(() => vi.fn())
const criarComentarioTarefa = vi.hoisted(() => vi.fn())
const criarItemChecklist = vi.hoisted(() => vi.fn())
const criarQuadroPadraoTarefas = vi.hoisted(() => vi.fn())
const criarTarefa = vi.hoisted(() => vi.fn())
const excluirTarefa = vi.hoisted(() => vi.fn())
const eliminarComentarioTarefa = vi.hoisted(() => vi.fn())
const eliminarItemChecklist = vi.hoisted(() => vi.fn())
const iniciarTimerTarefa = vi.hoisted(() => vi.fn())
const moverTarefa = vi.hoisted(() => vi.fn())
const pararTimerTarefa = vi.hoisted(() => vi.fn())
const rejeitarApontamentoHora = vi.hoisted(() => vi.fn())
const registrarApontamentoHora = vi.hoisted(() => vi.fn())

vi.mock('../services/tarefasService', () => ({
  ajustarApontamentoHora: (...args: unknown[]) => ajustarApontamentoHora(...args),
  atualizarComentarioTarefa: (...args: unknown[]) => atualizarComentarioTarefa(...args),
  atualizarItemChecklist: (...args: unknown[]) => atualizarItemChecklist(...args),
  atualizarTarefa: (...args: unknown[]) => atualizarTarefa(...args),
  aprovarApontamentoHora: (...args: unknown[]) => aprovarApontamentoHora(...args),
  classificarTarefa: (...args: unknown[]) => classificarTarefa(...args),
  concluirTarefa: (...args: unknown[]) => concluirTarefa(...args),
  criarComentarioTarefa: (...args: unknown[]) => criarComentarioTarefa(...args),
  criarItemChecklist: (...args: unknown[]) => criarItemChecklist(...args),
  criarQuadroPadraoTarefas: (...args: unknown[]) => criarQuadroPadraoTarefas(...args),
  criarTarefa: (...args: unknown[]) => criarTarefa(...args),
  excluirTarefa: (...args: unknown[]) => excluirTarefa(...args),
  eliminarComentarioTarefa: (...args: unknown[]) => eliminarComentarioTarefa(...args),
  eliminarItemChecklist: (...args: unknown[]) => eliminarItemChecklist(...args),
  iniciarTimerTarefa: (...args: unknown[]) => iniciarTimerTarefa(...args),
  moverTarefa: (...args: unknown[]) => moverTarefa(...args),
  pararTimerTarefa: (...args: unknown[]) => pararTimerTarefa(...args),
  rejeitarApontamentoHora: (...args: unknown[]) => rejeitarApontamentoHora(...args),
  registrarApontamentoHora: (...args: unknown[]) => registrarApontamentoHora(...args),
}))

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function wrapper(client: QueryClient, { children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function renderMutation<TResult>(hook: () => TResult, client = createClient()) {
  return {
    client,
    ...renderHook(hook, {
      wrapper: (props) => wrapper(client, props),
    }),
  }
}

describe('useTarefaMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const fn of [
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
    ]) {
      fn.mockResolvedValue({ id: 'ok' })
    }
  })

  it('invalida cache em mutações básicas de tarefa', async () => {
    const client = createClient()
    const inv = vi.spyOn(client, 'invalidateQueries')
    const cases: Array<{
      hook: () => { mutateAsync: (payload: never) => Promise<unknown> }
      payload: unknown
      service: ReturnType<typeof vi.fn>
    }> = [
      {
        hook: useCriarTarefaMutation,
        payload: { titulo: 'Tarefa' },
        service: criarTarefa,
      },
      {
        hook: useAtualizarTarefaMutation,
        payload: { tarefaId: 't1', payload: { titulo: 'Novo' } },
        service: atualizarTarefa,
      },
      { hook: useExcluirTarefaMutation, payload: 't1', service: excluirTarefa },
      { hook: useConcluirTarefaMutation, payload: 't1', service: concluirTarefa },
      {
        hook: useClassificarTarefaMutation,
        payload: { tarefaId: 't1', payload: { prioridade: 'ALTA' } },
        service: classificarTarefa,
      },
    ]

    for (const item of cases) {
      const { result } = renderMutation(item.hook, client)
      await result.current.mutateAsync(item.payload as never)
      expect(item.service).toHaveBeenCalled()
    }

    expect(inv).toHaveBeenCalledWith({ queryKey: tarefasQueryKeys.all })
  })

  it('cria quadro padrão e grava kanban no cache', async () => {
    const kanban = { quadro: { colunas: [] } }
    criarQuadroPadraoTarefas.mockResolvedValueOnce(kanban)
    const { client, result } = renderMutation(useCriarQuadroPadraoTarefasMutation)

    await result.current.mutateAsync(undefined)

    expect(client.getQueryData(tarefasQueryKeys.kanban())).toBe(kanban)
  })

  it('move tarefa com atualização otimista e confirma retorno da API', async () => {
    const client = createClient()
    const inv = vi.spyOn(client, 'invalidateQueries')
    client.setQueryData(tarefasQueryKeys.kanban(), {
      quadro: {
        colunas: [
          {
            id: 'todo',
            titulo: 'A fazer',
            ordem: 0,
            tarefas: [{ id: 't1', titulo: 'Tarefa', coluna: 'todo', ordem: 0 }],
          },
          { id: 'done', titulo: 'Feito', ordem: 1, tarefas: [] },
        ],
      },
    })
    moverTarefa.mockResolvedValueOnce({
      id: 't1',
      titulo: 'Tarefa atualizada',
      coluna: 'done',
      ordem: 0,
    })
    const { result } = renderMutation(useMoverTarefaMutation, client)

    await result.current.mutateAsync({ tarefaId: 't1', colunaId: 'done', ordem: 0 })

    const cache = client.getQueryData<{
      quadro: { colunas: Array<{ id: string; tarefas: Array<{ id: string; titulo: string }> }> }
    }>(tarefasQueryKeys.kanban())
    expect(cache?.quadro.colunas[1].tarefas[0]).toEqual(
      expect.objectContaining({ id: 't1', titulo: 'Tarefa atualizada' })
    )
    expect(inv).toHaveBeenCalledWith({ queryKey: tarefasQueryKeys.all })
  })

  it('restaura cache quando mover tarefa falha', async () => {
    const anterior = {
      quadro: {
        colunas: [
          {
            id: 'todo',
            titulo: 'A fazer',
            ordem: 0,
            tarefas: [{ id: 't1', titulo: 'Tarefa', coluna: 'todo', ordem: 0 }],
          },
          { id: 'done', titulo: 'Feito', ordem: 1, tarefas: [] },
        ],
      },
    }
    const client = createClient()
    client.setQueryData(tarefasQueryKeys.kanban(), anterior)
    moverTarefa.mockRejectedValueOnce(new Error('falhou'))
    const { result } = renderMutation(useMoverTarefaMutation, client)

    await expect(
      result.current.mutateAsync({ tarefaId: 't1', colunaId: 'done' })
    ).rejects.toThrow('falhou')

    expect(client.getQueryData(tarefasQueryKeys.kanban())).toStrictEqual(anterior)
  })

  it('atualiza timer ativo e invalida consultas relacionadas', async () => {
    const timer = { sessao: { id: 's1' } }
    iniciarTimerTarefa.mockResolvedValueOnce(timer)
    const client = createClient()
    const inv = vi.spyOn(client, 'invalidateQueries')

    const iniciar = renderMutation(useIniciarTimerTarefaMutation, client)
    await iniciar.result.current.mutateAsync('t1')
    expect(client.getQueryData(tarefasQueryKeys.timerAtivo())).toBe(timer)

    const parar = renderMutation(usePararTimerTarefaMutation, client)
    await parar.result.current.mutateAsync(undefined)

    expect(client.getQueryData(tarefasQueryKeys.timerAtivo())).toEqual({ sessao: null })
    expect(inv).toHaveBeenCalledWith({ queryKey: tarefasQueryKeys.kanban() })
    expect(inv).toHaveBeenCalledWith({ queryKey: [...tarefasQueryKeys.all, 'horas-dia'] })
  })

  it('invalida comentários e histórico', async () => {
    const client = createClient()
    const inv = vi.spyOn(client, 'invalidateQueries')

    await renderMutation(useCriarComentarioTarefaMutation, client).result.current.mutateAsync({
      tarefaId: 't1',
      texto: 'Olá',
    })
    await renderMutation(useAtualizarComentarioTarefaMutation, client).result.current.mutateAsync({
      tarefaId: 't1',
      comentarioId: 'c1',
      texto: 'Editado',
    })
    await renderMutation(useEliminarComentarioTarefaMutation, client).result.current.mutateAsync({
      tarefaId: 't1',
      comentarioId: 'c1',
    })

    expect(criarComentarioTarefa).toHaveBeenCalledWith('t1', 'Olá')
    expect(atualizarComentarioTarefa).toHaveBeenCalledWith('c1', 'Editado')
    expect(eliminarComentarioTarefa).toHaveBeenCalledWith('c1')
    expect(inv).toHaveBeenCalledWith({ queryKey: tarefasQueryKeys.comentarios('t1') })
    expect(inv).toHaveBeenCalledWith({ queryKey: tarefasQueryKeys.historico('t1') })
  })

  it('invalida checklist da tarefa', async () => {
    const client = createClient()
    const inv = vi.spyOn(client, 'invalidateQueries')

    await renderMutation(useCriarChecklistItemMutation, client).result.current.mutateAsync({
      tarefaId: 't1',
      titulo: 'Item',
      ordem: 2,
    })
    await renderMutation(useAtualizarChecklistItemMutation, client).result.current.mutateAsync({
      tarefaId: 't1',
      itemId: 'i1',
      patch: { concluido: true },
    })
    await renderMutation(useEliminarChecklistItemMutation, client).result.current.mutateAsync({
      tarefaId: 't1',
      itemId: 'i1',
    })

    expect(criarItemChecklist).toHaveBeenCalledWith('t1', 'Item', 2)
    expect(atualizarItemChecklist).toHaveBeenCalledWith('i1', { concluido: true })
    expect(eliminarItemChecklist).toHaveBeenCalledWith('i1')
    expect(inv).toHaveBeenCalledWith({ queryKey: tarefasQueryKeys.checklist('t1') })
  })

  it('registra e modera apontamentos de horas', async () => {
    const client = createClient()
    const inv = vi.spyOn(client, 'invalidateQueries')

    await renderMutation(useRegistrarApontamentoHoraMutation, client).result.current.mutateAsync({
      tarefa: 't1',
      data: '2026-05-11',
      horas: '0.5',
    })
    await renderMutation(useAprovarApontamentoHoraMutation, client).result.current.mutateAsync({
      tarefaId: 't1',
      apontamentoId: 'a1',
    })
    await renderMutation(useRejeitarApontamentoHoraMutation, client).result.current.mutateAsync({
      tarefaId: 't1',
      apontamentoId: 'a1',
    })
    await renderMutation(useAjustarApontamentoHoraMutation, client).result.current.mutateAsync({
      tarefaId: 't1',
      apontamentoId: 'a1',
      payload: { justificativa_ajuste: 'Correção', horas: '0.75' },
    })

    await waitFor(() => {
      expect(registrarApontamentoHora).toHaveBeenCalledWith({
        tarefa: 't1',
        data: '2026-05-11',
        horas: '0.5',
      })
      expect(aprovarApontamentoHora).toHaveBeenCalledWith('a1')
      expect(rejeitarApontamentoHora).toHaveBeenCalledWith('a1')
      expect(ajustarApontamentoHora).toHaveBeenCalledWith('a1', {
        justificativa_ajuste: 'Correção',
        horas: '0.75',
      })
    })
    expect(inv).toHaveBeenCalledWith({ queryKey: tarefasQueryKeys.apontamentos('t1') })
    expect(inv).toHaveBeenCalledWith({ queryKey: tarefasQueryKeys.historico('t1') })
  })
})
