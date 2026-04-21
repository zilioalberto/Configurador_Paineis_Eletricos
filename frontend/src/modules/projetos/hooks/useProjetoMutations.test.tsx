import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { cargaQueryKeys } from '@/modules/cargas/cargaQueryKeys'
import { composicaoQueryKeys } from '@/modules/composicao/composicaoQueryKeys'
import { dimensionamentoQueryKeys } from '@/modules/dimensionamento/dimensionamentoQueryKeys'

import { dashboardQueryKeys } from '@/modules/dashboard/dashboardQueryKeys'

import { projetoQueryKeys } from '../projetoQueryKeys'
import type { ProjetoFormData } from '../types/projeto'
import {
  useCreateProjetoMutation,
  useDeleteProjetoMutation,
  useUpdateProjetoMutation,
} from './useProjetoMutations'

const criarProjeto = vi.hoisted(() => vi.fn())
const atualizarProjeto = vi.hoisted(() => vi.fn())
const deletarProjeto = vi.hoisted(() => vi.fn())

vi.mock('../services/projetoService', () => ({
  criarProjeto: (...args: unknown[]) => criarProjeto(...args),
  atualizarProjeto: (...args: unknown[]) => atualizarProjeto(...args),
  deletarProjeto: (...args: unknown[]) => deletarProjeto(...args),
}))

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function qcWrapper(qc: QueryClient, { children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useProjetoMutations', () => {
  it('create invalida listas e grava detalhe', async () => {
    criarProjeto.mockResolvedValue({
      id: 'novo-p',
      tensao_nominal: 380,
    })

    const qc = createClient()
    const inv = vi.spyOn(qc, 'invalidateQueries')

    const { result } = renderHook(() => useCreateProjetoMutation(), {
      wrapper: (props) => qcWrapper(qc, props),
    })

    await result.current.mutateAsync({} as ProjetoFormData)

    await waitFor(() => expect(criarProjeto).toHaveBeenCalled())

    expect(inv).toHaveBeenCalledWith({ queryKey: projetoQueryKeys.all })
    expect(inv).toHaveBeenCalledWith({ queryKey: dashboardQueryKeys.all })
    expect(qc.getQueryData(projetoQueryKeys.detail('novo-p'))).toEqual(
      expect.objectContaining({ id: 'novo-p' })
    )
  })

  it('update com mudança de tensão invalida cargas, composição e dimensionamento', async () => {
    atualizarProjeto.mockResolvedValue({
      id: 'p42',
      tensao_nominal: 220,
    })

    const qc = createClient()
    qc.setQueryData(projetoQueryKeys.detail('p42'), {
      id: 'p42',
      tensao_nominal: 380,
    })

    const inv = vi.spyOn(qc, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateProjetoMutation(), {
      wrapper: (props) => qcWrapper(qc, props),
    })

    await result.current.mutateAsync({
      id: 'p42',
      data: {} as ProjetoFormData,
    })

    await waitFor(() => expect(atualizarProjeto).toHaveBeenCalled())

    expect(inv).toHaveBeenCalledWith({
      queryKey: composicaoQueryKeys.snapshot('p42'),
    })
    expect(inv).toHaveBeenCalledWith({
      queryKey: dimensionamentoQueryKeys.porProjeto('p42'),
    })
    expect(inv).toHaveBeenCalledWith({
      queryKey: cargaQueryKeys.list('p42'),
    })
    expect(inv).toHaveBeenCalledWith({ queryKey: cargaQueryKeys.all })
  })

  it('update sem mudança de tensão não dispara invalidação extra de cargas', async () => {
    atualizarProjeto.mockResolvedValue({
      id: 'p7',
      tensao_nominal: 380,
    })

    const qc = createClient()
    qc.setQueryData(projetoQueryKeys.detail('p7'), {
      id: 'p7',
      tensao_nominal: 380,
    })

    const inv = vi.spyOn(qc, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateProjetoMutation(), {
      wrapper: (props) => qcWrapper(qc, props),
    })

    await result.current.mutateAsync({
      id: 'p7',
      data: {} as ProjetoFormData,
    })

    await waitFor(() => expect(atualizarProjeto).toHaveBeenCalled())

    expect(inv).not.toHaveBeenCalledWith({
      queryKey: composicaoQueryKeys.snapshot('p7'),
    })
  })

  it('delete remove query de detalhe', async () => {
    deletarProjeto.mockResolvedValue(undefined)
    const qc = createClient()
    const rm = vi.spyOn(qc, 'removeQueries')

    const { result } = renderHook(() => useDeleteProjetoMutation(), {
      wrapper: (props) => qcWrapper(qc, props),
    })

    await result.current.mutateAsync('del-id')

    await waitFor(() => expect(deletarProjeto).toHaveBeenCalled())

    expect(rm).toHaveBeenCalledWith({
      queryKey: projetoQueryKeys.detail('del-id'),
    })
  })
})
