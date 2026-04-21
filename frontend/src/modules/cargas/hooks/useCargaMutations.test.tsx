import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { composicaoQueryKeys } from '@/modules/composicao/composicaoQueryKeys'
import { dimensionamentoQueryKeys } from '@/modules/dimensionamento/dimensionamentoQueryKeys'

import { cargaQueryKeys } from '../cargaQueryKeys'
import { useCreateCargaMutation, useDeleteCargaMutation, useUpdateCargaMutation } from './useCargaMutations'

const criarCarga = vi.hoisted(() => vi.fn())
const atualizarCarga = vi.hoisted(() => vi.fn())
const deletarCarga = vi.hoisted(() => vi.fn())

vi.mock('../services/cargaService', () => ({
  criarCarga: (...args: unknown[]) => criarCarga(...args),
  atualizarCarga: (...args: unknown[]) => atualizarCarga(...args),
  deletarCarga: (...args: unknown[]) => deletarCarga(...args),
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

describe('useCargaMutations', () => {
  it('create invalida caches do projeto afetado', async () => {
    criarCarga.mockResolvedValue({
      id: 'c99',
      projeto: 'proj-x',
    })
    const qc = createClient()
    const inv = vi.spyOn(qc, 'invalidateQueries')

    const { result } = renderHook(() => useCreateCargaMutation(), {
      wrapper: (props) => wrapper(qc, props),
    })

    await result.current.mutateAsync({ projeto: 'proj-x' })

    await waitFor(() => {
      expect(criarCarga).toHaveBeenCalled()
    })

    expect(inv).toHaveBeenCalledWith({ queryKey: composicaoQueryKeys.snapshot('proj-x') })
    expect(inv).toHaveBeenCalledWith({
      queryKey: dimensionamentoQueryKeys.porProjeto('proj-x'),
    })
    expect(inv).toHaveBeenCalledWith({ queryKey: cargaQueryKeys.list('proj-x') })
  })

  it('update invalida composição e dimensionamento', async () => {
    atualizarCarga.mockResolvedValue({
      id: 'c1',
      projeto: 'p9',
    })
    const qc = createClient()
    const inv = vi.spyOn(qc, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateCargaMutation(), {
      wrapper: (props) => wrapper(qc, props),
    })

    await result.current.mutateAsync({
      id: 'c1',
      body: {},
    })

    await waitFor(() => expect(atualizarCarga).toHaveBeenCalled())

    expect(inv).toHaveBeenCalledWith({
      queryKey: composicaoQueryKeys.snapshot('p9'),
    })
    expect(inv).toHaveBeenCalledWith({
      queryKey: dimensionamentoQueryKeys.porProjeto('p9'),
    })
  })

  it('delete com projetoId invalida snapshot e lista', async () => {
    deletarCarga.mockResolvedValue(undefined)
    const qc = createClient()
    const rm = vi.spyOn(qc, 'removeQueries')
    const inv = vi.spyOn(qc, 'invalidateQueries')

    const { result } = renderHook(() => useDeleteCargaMutation('pro-1'), {
      wrapper: (props) => wrapper(qc, props),
    })

    await result.current.mutateAsync('cid')

    await waitFor(() => expect(deletarCarga).toHaveBeenCalled())

    expect(inv).toHaveBeenCalledWith({
      queryKey: composicaoQueryKeys.snapshot('pro-1'),
    })
    expect(rm).toHaveBeenCalledWith({ queryKey: cargaQueryKeys.detail('cid') })
  })
})
