import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { composicaoQueryKeys } from '../composicaoQueryKeys'
import { useAlternativasSugestaoQuery } from './useAlternativasSugestaoQuery'
import { useAprovarSugestaoMutation } from './useAprovarSugestaoMutation'
import { useComposicaoSnapshotQuery } from './useComposicaoSnapshotQuery'
import { useReavaliarPendenciasMutation } from './useReavaliarPendenciasMutation'

const listarAlternativasSugestao = vi.hoisted(() => vi.fn())
const obterComposicaoPorProjeto = vi.hoisted(() => vi.fn())
const aprovarSugestao = vi.hoisted(() => vi.fn())
const reavaliarPendenciasComposicao = vi.hoisted(() => vi.fn())

vi.mock('../services/composicaoService', () => ({
  listarAlternativasSugestao: (...args: unknown[]) => listarAlternativasSugestao(...args),
  obterComposicaoPorProjeto: (...args: unknown[]) => obterComposicaoPorProjeto(...args),
  aprovarSugestao: (...args: unknown[]) => aprovarSugestao(...args),
  reavaliarPendenciasComposicao: (...args: unknown[]) =>
    reavaliarPendenciasComposicao(...args),
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

describe('hooks de query/mutação da composição', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('busca snapshot apenas quando projeto está selecionado', async () => {
    obterComposicaoPorProjeto.mockResolvedValue({ projeto: 'p1' })

    const disabled = renderHook(() => useComposicaoSnapshotQuery(null), {
      wrapper: (props) => wrapper(createClient(), props),
    })
    expect(disabled.result.current.fetchStatus).toBe('idle')
    expect(obterComposicaoPorProjeto).not.toHaveBeenCalled()

    const enabled = renderHook(() => useComposicaoSnapshotQuery('p1'), {
      wrapper: (props) => wrapper(createClient(), props),
    })
    await waitFor(() => expect(enabled.result.current.data).toEqual({ projeto: 'p1' }))
    expect(obterComposicaoPorProjeto).toHaveBeenCalledWith('p1')
  })

  it('busca alternativas somente com sugestão e enabled true', async () => {
    listarAlternativasSugestao.mockResolvedValue([{ id: 'alt1' }])

    const disabled = renderHook(() => useAlternativasSugestaoQuery(null, true), {
      wrapper: (props) => wrapper(createClient(), props),
    })
    expect(disabled.result.current.fetchStatus).toBe('idle')

    const enabledFalse = renderHook(() => useAlternativasSugestaoQuery('s1', false), {
      wrapper: (props) => wrapper(createClient(), props),
    })
    expect(enabledFalse.result.current.fetchStatus).toBe('idle')
    expect(listarAlternativasSugestao).not.toHaveBeenCalled()

    const enabled = renderHook(() => useAlternativasSugestaoQuery('s1', true), {
      wrapper: (props) => wrapper(createClient(), props),
    })
    await waitFor(() => expect(enabled.result.current.data).toEqual([{ id: 'alt1' }]))
    expect(listarAlternativasSugestao).toHaveBeenCalledWith('s1')
  })

  it('aprova sugestão atualizando snapshot quando retornado', async () => {
    const client = createClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    const snapshot = { projeto: 'p1', sugestoes: [] }
    aprovarSugestao.mockResolvedValue({ snapshot })

    const { result } = renderHook(() => useAprovarSugestaoMutation('p1'), {
      wrapper: (props) => wrapper(client, props),
    })

    await result.current.mutateAsync({ sugestaoId: 's1', produtoId: 'prod1' })

    expect(aprovarSugestao).toHaveBeenCalledWith('s1', 'prod1')
    expect(client.getQueryData(composicaoQueryKeys.snapshot('p1'))).toBe(snapshot)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: composicaoQueryKeys.all })
  })

  it('aprova sugestão sem projeto apenas invalida lista geral', async () => {
    const client = createClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    aprovarSugestao.mockResolvedValue({})

    const { result } = renderHook(() => useAprovarSugestaoMutation(null), {
      wrapper: (props) => wrapper(client, props),
    })

    await result.current.mutateAsync({ sugestaoId: 's2' })

    expect(aprovarSugestao).toHaveBeenCalledWith('s2', undefined)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: composicaoQueryKeys.all })
  })

  it('reavalia pendências e rejeita quando não há projeto', async () => {
    const client = createClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    reavaliarPendenciasComposicao.mockResolvedValue({ projeto: 'p2' })

    const { result } = renderHook(() => useReavaliarPendenciasMutation('p2'), {
      wrapper: (props) => wrapper(client, props),
    })

    await result.current.mutateAsync()

    expect(reavaliarPendenciasComposicao).toHaveBeenCalledWith('p2')
    expect(client.getQueryData(composicaoQueryKeys.snapshot('p2'))).toEqual({
      projeto: 'p2',
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: composicaoQueryKeys.all })

    const missing = renderHook(() => useReavaliarPendenciasMutation(null), {
      wrapper: (props) => wrapper(createClient(), props),
    })
    await expect(missing.result.current.mutateAsync()).rejects.toThrow(
      'Projeto não selecionado.'
    )
  })
})
