import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const obterMock = vi.hoisted(() => vi.fn())
const patchMock = vi.hoisted(() => vi.fn())
const recalcularMock = vi.hoisted(() => vi.fn())
const obterMecanicoMock = vi.hoisted(() => vi.fn())
const calcularMecanicoMock = vi.hoisted(() => vi.fn())
const salvarMecanicoMock = vi.hoisted(() => vi.fn())

vi.mock('../services/dimensionamentoService', () => ({
  obterDimensionamentoPorProjeto: obterMock,
  patchCondutoresDimensionamento: patchMock,
  recalcularDimensionamento: recalcularMock,
  obterDimensionamentoMecanico: obterMecanicoMock,
  calcularDimensionamentoMecanico: calcularMecanicoMock,
  salvarEscolhasDimensionamentoMecanico: salvarMecanicoMock,
}))

import { dimensionamentoQueryKeys } from '../dimensionamentoQueryKeys'
import { useCalcularDimensionamentoMecanicoMutation } from './useCalcularDimensionamentoMecanicoMutation'
import { useDimensionamentoMecanicoQuery } from './useDimensionamentoMecanicoQuery'
import { useDimensionamentoQuery } from './useDimensionamentoQuery'
import { usePatchCondutoresDimensionamentoMutation } from './usePatchCondutoresDimensionamentoMutation'
import { useRecalcularDimensionamentoMutation } from './useRecalcularDimensionamentoMutation'
import { useSalvarDimensionamentoMecanicoEscolhasMutation } from './useSalvarDimensionamentoMecanicoEscolhasMutation'

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('hooks de dimensionamento', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useDimensionamentoQuery fica desabilitado sem projeto', () => {
    const client = createClient()

    renderHook(() => useDimensionamentoQuery(null), {
      wrapper: createWrapper(client),
    })

    expect(obterMock).not.toHaveBeenCalled()
  })

  it('useDimensionamentoQuery carrega dados do projeto', async () => {
    const client = createClient()
    obterMock.mockResolvedValueOnce({ id: 'dim-1', projeto: 'proj-1' })

    const { result } = renderHook(() => useDimensionamentoQuery('proj-1'), {
      wrapper: createWrapper(client),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(obterMock).toHaveBeenCalledWith('proj-1')
    expect(result.current.data).toEqual({ id: 'dim-1', projeto: 'proj-1' })
  })

  it('usePatchCondutoresDimensionamentoMutation rejeita sem projeto selecionado', async () => {
    const client = createClient()
    const { result } = renderHook(() => usePatchCondutoresDimensionamentoMutation(null), {
      wrapper: createWrapper(client),
    })

    await expect(result.current.mutateAsync({ circuitos: [] })).rejects.toThrow(
      'Projeto não selecionado.'
    )

    expect(patchMock).not.toHaveBeenCalled()
  })

  it('usePatchCondutoresDimensionamentoMutation atualiza cache e invalida consultas', async () => {
    const client = createClient()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    const data = { id: 'dim-atualizado', projeto: 'proj-2' }
    const payload = {
      circuitos: [{ id: 'c1', secao_condutor_fase_escolhida_mm2: '4' }],
      confirmar_revisao: true,
    }
    patchMock.mockResolvedValueOnce(data)

    const { result } = renderHook(() => usePatchCondutoresDimensionamentoMutation('proj-2'), {
      wrapper: createWrapper(client),
    })

    await act(async () => {
      await result.current.mutateAsync(payload)
    })

    expect(patchMock).toHaveBeenCalledWith('proj-2', payload)
    expect(client.getQueryData(dimensionamentoQueryKeys.porProjeto('proj-2'))).toEqual(data)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: dimensionamentoQueryKeys.all })
  })

  it('useRecalcularDimensionamentoMutation rejeita sem projeto selecionado', async () => {
    const client = createClient()
    const { result } = renderHook(() => useRecalcularDimensionamentoMutation(null), {
      wrapper: createWrapper(client),
    })

    await expect(result.current.mutateAsync()).rejects.toThrow('Projeto não selecionado.')

    expect(recalcularMock).not.toHaveBeenCalled()
  })

  it('useRecalcularDimensionamentoMutation atualiza cache e invalida consultas', async () => {
    const client = createClient()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    const data = { id: 'dim-recalculado', projeto: 'proj-3' }
    recalcularMock.mockResolvedValueOnce(data)

    const { result } = renderHook(() => useRecalcularDimensionamentoMutation('proj-3'), {
      wrapper: createWrapper(client),
    })

    await act(async () => {
      await result.current.mutateAsync()
    })

    expect(recalcularMock).toHaveBeenCalledWith('proj-3')
    expect(client.getQueryData(dimensionamentoQueryKeys.porProjeto('proj-3'))).toEqual(data)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: dimensionamentoQueryKeys.all })
  })
})

describe('hooks de dimensionamento mecânico', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('useDimensionamentoMecanicoQuery fica desabilitado sem projeto', () => {
    const client = createClient()

    renderHook(() => useDimensionamentoMecanicoQuery(null), {
      wrapper: createWrapper(client),
    })

    expect(obterMecanicoMock).not.toHaveBeenCalled()
  })

  it('useDimensionamentoMecanicoQuery carrega dados do projeto', async () => {
    const client = createClient()
    obterMecanicoMock.mockResolvedValueOnce({ area_componentes_mm2: '1200' })

    const { result } = renderHook(() => useDimensionamentoMecanicoQuery('proj-m1'), {
      wrapper: createWrapper(client),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(obterMecanicoMock).toHaveBeenCalledWith('proj-m1')
    expect(result.current.data).toEqual({ area_componentes_mm2: '1200' })
  })

  it('useCalcularDimensionamentoMecanicoMutation invalida consultas mecânico e resumo', async () => {
    const client = createClient()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    calcularMecanicoMock.mockResolvedValueOnce({ canaletas_verticais: 2 })

    const { result } = renderHook(() => useCalcularDimensionamentoMecanicoMutation('proj-m2'), {
      wrapper: createWrapper(client),
    })

    await act(async () => {
      await result.current.mutateAsync()
    })

    expect(calcularMecanicoMock).toHaveBeenCalledWith('proj-m2')
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: dimensionamentoQueryKeys.mecanico('proj-m2'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: dimensionamentoQueryKeys.porProjeto('proj-m2'),
    })
  })

  it('useSalvarDimensionamentoMecanicoEscolhasMutation persiste escolhas', async () => {
    const client = createClient()
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    const payload = {
      painel_produto_id: 'painel-1',
      canaletas_verticais: 3,
    }
    salvarMecanicoMock.mockResolvedValueOnce({ canaletas_verticais: 3 })

    const { result } = renderHook(() => useSalvarDimensionamentoMecanicoEscolhasMutation('proj-m3'), {
      wrapper: createWrapper(client),
    })

    await act(async () => {
      await result.current.mutateAsync(payload)
    })

    expect(salvarMecanicoMock).toHaveBeenCalledWith('proj-m3', payload)
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: dimensionamentoQueryKeys.mecanico('proj-m3'),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: dimensionamentoQueryKeys.porProjeto('proj-m3'),
    })
  })
})
