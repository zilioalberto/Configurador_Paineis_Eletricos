import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { composicaoQueryKeys } from '../composicaoQueryKeys'
import { useGerarSugestoesMutation } from './useGerarSugestoesMutation'
import {
  useAdicionarInclusaoManualMutation,
  useRemoverInclusaoManualMutation,
} from './useInclusaoManualMutations'

const adicionarInclusaoManual = vi.hoisted(() => vi.fn())
const gerarSugestoesComposicao = vi.hoisted(() => vi.fn())
const removerInclusaoManual = vi.hoisted(() => vi.fn())

vi.mock('../services/composicaoService', () => ({
  adicionarInclusaoManual: (...args: unknown[]) => adicionarInclusaoManual(...args),
  gerarSugestoesComposicao: (...args: unknown[]) => gerarSugestoesComposicao(...args),
  removerInclusaoManual: (...args: unknown[]) => removerInclusaoManual(...args),
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

describe('hooks de mutação da composição', () => {
  it('gera sugestões e atualiza snapshot do projeto', async () => {
    const snapshot = { projeto: 'p1', sugestoes: [], pendencias: [] }
    gerarSugestoesComposicao.mockResolvedValue(snapshot)
    const qc = createClient()
    const inv = vi.spyOn(qc, 'invalidateQueries')

    const { result } = renderHook(() => useGerarSugestoesMutation('p1'), {
      wrapper: (props) => wrapper(qc, props),
    })

    await result.current.mutateAsync(false)

    expect(gerarSugestoesComposicao).toHaveBeenCalledWith('p1', false)
    expect(qc.getQueryData(composicaoQueryKeys.snapshot('p1'))).toBe(snapshot)
    expect(inv).toHaveBeenCalledWith({ queryKey: composicaoQueryKeys.all })
  })

  it('gera sugestões com limparAntes padrão e rejeita sem projeto', async () => {
    gerarSugestoesComposicao.mockResolvedValue({ projeto: 'p2' })
    const qc = createClient()

    const { result: ok } = renderHook(() => useGerarSugestoesMutation('p2'), {
      wrapper: (props) => wrapper(qc, props),
    })
    await ok.current.mutateAsync(undefined)
    expect(gerarSugestoesComposicao).toHaveBeenCalledWith('p2', true)

    const { result: erro } = renderHook(() => useGerarSugestoesMutation(null), {
      wrapper: (props) => wrapper(createClient(), props),
    })
    await expect(erro.current.mutateAsync(undefined)).rejects.toThrow('Projeto não selecionado.')
  })

  it('adiciona inclusão manual e grava snapshot', async () => {
    const snapshot = { projeto: 'p3', inclusoes_manuais: [] }
    adicionarInclusaoManual.mockResolvedValue({ snapshot })
    const qc = createClient()
    const inv = vi.spyOn(qc, 'invalidateQueries')

    const { result } = renderHook(() => useAdicionarInclusaoManualMutation('p3'), {
      wrapper: (props) => wrapper(qc, props),
    })

    await result.current.mutateAsync({ produto_id: 'prod-1', quantidade: '2' })

    expect(adicionarInclusaoManual).toHaveBeenCalledWith('p3', {
      produto_id: 'prod-1',
      quantidade: '2',
    })
    expect(qc.getQueryData(composicaoQueryKeys.snapshot('p3'))).toBe(snapshot)
    expect(inv).toHaveBeenCalledWith({ queryKey: composicaoQueryKeys.all })
  })

  it('rejeita inclusão manual sem projeto', async () => {
    const { result } = renderHook(() => useAdicionarInclusaoManualMutation(null), {
      wrapper: (props) => wrapper(createClient(), props),
    })

    await expect(result.current.mutateAsync({ produto_id: 'p' })).rejects.toThrow(
      'projetoId ausente'
    )
  })

  it('remove inclusão manual e invalida composição mesmo sem snapshot', async () => {
    removerInclusaoManual.mockResolvedValue({})
    const qc = createClient()
    const inv = vi.spyOn(qc, 'invalidateQueries')

    const { result } = renderHook(() => useRemoverInclusaoManualMutation('p4'), {
      wrapper: (props) => wrapper(qc, props),
    })

    await result.current.mutateAsync('inc-1')

    await waitFor(() => expect(removerInclusaoManual).toHaveBeenCalledWith('inc-1'))
    expect(inv).toHaveBeenCalledWith({ queryKey: composicaoQueryKeys.all })
  })
})
