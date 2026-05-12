import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { tarefasQueryKeys } from '../tarefasQueryKeys'
import { useColaboradoresRelatorioHorasPeriodoQuery } from './useColaboradoresRelatorioHorasPeriodoQuery'
import { useRelatorioHorasGestaoQuery } from './useRelatorioHorasGestaoQuery'
import { useTarefaApontamentosQuery } from './useTarefaApontamentosQuery'
import { useTarefaChecklistQuery } from './useTarefaChecklistQuery'
import { useTarefaComentariosQuery } from './useTarefaComentariosQuery'
import { useTarefaDashboardHorasDiaQuery } from './useTarefaDashboardHorasDiaQuery'
import { useTarefaHistoricoQuery } from './useTarefaHistoricoQuery'
import { useTarefaResponsaveisQuery } from './useTarefaResponsaveisQuery'
import { useTarefaTimerAtivoQuery } from './useTarefaTimerAtivoQuery'

const listarApontamentosTarefa = vi.hoisted(() => vi.fn())
const listarChecklistTarefa = vi.hoisted(() => vi.fn())
const listarColaboradoresRelatorioHorasPeriodo = vi.hoisted(() => vi.fn())
const listarComentariosTarefa = vi.hoisted(() => vi.fn())
const listarHistoricoTarefa = vi.hoisted(() => vi.fn())
const listarResponsaveisTarefa = vi.hoisted(() => vi.fn())
const obterDashboardHorasDia = vi.hoisted(() => vi.fn())
const obterRelatorioHorasGestao = vi.hoisted(() => vi.fn())
const obterTimerAtivoTarefa = vi.hoisted(() => vi.fn())

vi.mock('../services/tarefasService', () => ({
  listarApontamentosTarefa: (...args: unknown[]) => listarApontamentosTarefa(...args),
  listarChecklistTarefa: (...args: unknown[]) => listarChecklistTarefa(...args),
  listarColaboradoresRelatorioHorasPeriodo: (...args: unknown[]) =>
    listarColaboradoresRelatorioHorasPeriodo(...args),
  listarComentariosTarefa: (...args: unknown[]) => listarComentariosTarefa(...args),
  listarHistoricoTarefa: (...args: unknown[]) => listarHistoricoTarefa(...args),
  listarResponsaveisTarefa: (...args: unknown[]) => listarResponsaveisTarefa(...args),
  obterDashboardHorasDia: (...args: unknown[]) => obterDashboardHorasDia(...args),
  obterRelatorioHorasGestao: (...args: unknown[]) => obterRelatorioHorasGestao(...args),
  obterTimerAtivoTarefa: (...args: unknown[]) => obterTimerAtivoTarefa(...args),
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

describe('hooks de query de tarefas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listarApontamentosTarefa.mockResolvedValue(['apontamento'])
    listarChecklistTarefa.mockResolvedValue(['check'])
    listarColaboradoresRelatorioHorasPeriodo.mockResolvedValue(['colaborador'])
    listarComentariosTarefa.mockResolvedValue(['comentario'])
    listarHistoricoTarefa.mockResolvedValue(['historico'])
    listarResponsaveisTarefa.mockResolvedValue(['resp'])
    obterDashboardHorasDia.mockResolvedValue({ total: 1 })
    obterRelatorioHorasGestao.mockResolvedValue({ linhas: [] })
    obterTimerAtivoTarefa.mockResolvedValue({ sessao: null })
  })

  it('executa queries vinculadas a uma tarefa', async () => {
    const qc = createClient()
    const opts = { wrapper: (props: { children: ReactNode }) => wrapper(qc, props) }

    renderHook(() => useTarefaApontamentosQuery('t1'), opts)
    renderHook(() => useTarefaChecklistQuery('t1'), opts)
    renderHook(() => useTarefaComentariosQuery('t1'), opts)
    renderHook(() => useTarefaHistoricoQuery('t1'), opts)
    renderHook(() => useTarefaTimerAtivoQuery(true), opts)

    await waitFor(() => {
      expect(listarApontamentosTarefa).toHaveBeenCalledWith('t1')
      expect(listarChecklistTarefa).toHaveBeenCalledWith('t1')
      expect(listarComentariosTarefa).toHaveBeenCalledWith('t1')
      expect(listarHistoricoTarefa).toHaveBeenCalledWith('t1')
      expect(obterTimerAtivoTarefa).toHaveBeenCalled()
    })
  })

  it('não executa queries desabilitadas', async () => {
    const qc = createClient()
    const opts = { wrapper: (props: { children: ReactNode }) => wrapper(qc, props) }

    const apontamentos = renderHook(() => useTarefaApontamentosQuery(null), opts)
    const relatorio = renderHook(
      () =>
        useRelatorioHorasGestaoQuery(
          { data_inicio: '2026-05-01', data_fim: '2026-05-31' },
          false
        ),
      opts
    )

    expect(apontamentos.result.current.fetchStatus).toBe('idle')
    expect(relatorio.result.current.fetchStatus).toBe('idle')
    expect(listarApontamentosTarefa).not.toHaveBeenCalled()
    expect(obterRelatorioHorasGestao).not.toHaveBeenCalled()
  })

  it('executa queries de gestão de horas e responsáveis', async () => {
    const qc = createClient()
    const opts = { wrapper: (props: { children: ReactNode }) => wrapper(qc, props) }
    const params = { data_inicio: '2026-05-01', data_fim: '2026-05-31' }

    renderHook(() => useRelatorioHorasGestaoQuery(params, true), opts)
    renderHook(() => useColaboradoresRelatorioHorasPeriodoQuery(params, true), opts)
    renderHook(() => useTarefaDashboardHorasDiaQuery('u1', '2026-05-11', true), opts)
    renderHook(() => useTarefaResponsaveisQuery(), opts)

    await waitFor(() => {
      expect(obterRelatorioHorasGestao).toHaveBeenCalledWith(params)
      expect(listarColaboradoresRelatorioHorasPeriodo).toHaveBeenCalledWith(params)
      expect(obterDashboardHorasDia).toHaveBeenCalledWith('2026-05-11')
      expect(listarResponsaveisTarefa).toHaveBeenCalled()
    })
  })

  it('grava relatório de horas na cache pela query key', async () => {
    obterRelatorioHorasGestao.mockResolvedValueOnce({ linhas: [{ id: 1 }] })
    const qc = createClient()
    const paramsRel = {
      data_inicio: '2026-01-01',
      data_fim: '2026-01-31',
      proposta: 'X',
    } as const

    const { result } = renderHook(() => useRelatorioHorasGestaoQuery(paramsRel, true), {
      wrapper: (props) => wrapper(qc, props),
    })

    await waitFor(() => expect(result.current.data).toEqual({ linhas: [{ id: 1 }] }))
    expect(qc.getQueryData(tarefasQueryKeys.relatorioHorasGestao(paramsRel))).toEqual({
      linhas: [{ id: 1 }],
    })
  })

  it('não busca colaboradores com período inválido ou datas em falta', () => {
    const qc = createClient()
    const opts = { wrapper: (props: { children: ReactNode }) => wrapper(qc, props) }

    const ordemErrada = renderHook(
      () =>
        useColaboradoresRelatorioHorasPeriodoQuery(
          { data_inicio: '2026-06-01', data_fim: '2026-05-01' },
          true
        ),
      opts
    )
    const semInicio = renderHook(
      () => useColaboradoresRelatorioHorasPeriodoQuery({ data_inicio: '', data_fim: '2026-05-01' }, true),
      opts
    )

    expect(ordemErrada.result.current.fetchStatus).toBe('idle')
    expect(semInicio.result.current.fetchStatus).toBe('idle')
    expect(listarColaboradoresRelatorioHorasPeriodo).not.toHaveBeenCalled()
  })

  it('não busca dashboard de horas do dia sem utilizador ou com query desativada', () => {
    const qc = createClient()
    const opts = { wrapper: (props: { children: ReactNode }) => wrapper(qc, props) }

    const semUser = renderHook(() => useTarefaDashboardHorasDiaQuery(undefined, '2026-05-11', true), opts)
    const userIdVazio = renderHook(() => useTarefaDashboardHorasDiaQuery('', '2026-05-11', true), opts)
    const desligado = renderHook(() => useTarefaDashboardHorasDiaQuery('u1', '2026-05-11', false), opts)

    expect(semUser.result.current.fetchStatus).toBe('idle')
    expect(userIdVazio.result.current.fetchStatus).toBe('idle')
    expect(desligado.result.current.fetchStatus).toBe('idle')
    expect(obterDashboardHorasDia).not.toHaveBeenCalled()
  })

  it('não lista responsáveis quando enabled é false', () => {
    const qc = createClient()
    const { result } = renderHook(() => useTarefaResponsaveisQuery(false), {
      wrapper: (props) => wrapper(qc, props),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(listarResponsaveisTarefa).not.toHaveBeenCalled()
  })

  it('carrega timer ativo com sessão', async () => {
    obterTimerAtivoTarefa.mockResolvedValueOnce({
      sessao: {
        id: 'sess-1',
        tarefa: 't1',
        tarefa_titulo: 'Tarefa',
        colaborador: 1,
        colaborador_nome: null,
        iniciado_em: '2026-05-11T10:00:00Z',
        finalizado_em: null,
        etapa: 'aberta',
        observacoes: '',
        apontamento: null,
        duracao_segundos: 0,
      },
    })
    const qc = createClient()

    const { result } = renderHook(() => useTarefaTimerAtivoQuery(true), {
      wrapper: (props) => wrapper(qc, props),
    })

    await waitFor(() => expect(result.current.data?.sessao?.id).toBe('sess-1'))
    expect(obterTimerAtivoTarefa).toHaveBeenCalled()
  })
})
