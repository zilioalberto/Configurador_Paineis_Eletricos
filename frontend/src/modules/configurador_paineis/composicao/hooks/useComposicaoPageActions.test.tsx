import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/services/http/ApiError'
import { composicaoQueryKeys } from '../composicaoQueryKeys'
import { useComposicaoPageActions } from './useComposicaoPageActions'

const aprovarMutateAsync = vi.hoisted(() => vi.fn())
const reabrirMutateAsync = vi.hoisted(() => vi.fn())
const gerarMutateAsync = vi.hoisted(() => vi.fn())
const reavaliarMutateAsync = vi.hoisted(() => vi.fn())

vi.mock('./useAprovarSugestaoMutation', () => ({
  useAprovarSugestaoMutation: () => ({ mutateAsync: aprovarMutateAsync, isPending: false }),
}))
vi.mock('./useReabrirComposicaoItemMutation', () => ({
  useReabrirComposicaoItemMutation: () => ({ mutateAsync: reabrirMutateAsync, isPending: false }),
}))
vi.mock('./useGerarSugestoesMutation', () => ({
  useGerarSugestoesMutation: () => ({ mutateAsync: gerarMutateAsync, isPending: false }),
}))
vi.mock('./useReavaliarPendenciasMutation', () => ({
  useReavaliarPendenciasMutation: () => ({ mutateAsync: reavaliarMutateAsync, isPending: false }),
}))
vi.mock('../services/composicaoService', () => ({
  exportarComposicaoListaPdf: vi.fn(),
  exportarComposicaoListaXlsx: vi.fn(),
}))

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function wrapper(client: QueryClient, { children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

type SetupOverrides = Partial<Parameters<typeof useComposicaoPageActions>[0]>

function setup(overrides: SetupOverrides = {}) {
  const showToast = vi.fn()
  const setAlterarSugestao = vi.fn()
  const setItemReabrir = vi.fn()
  const setAprovandoTodas = vi.fn()
  const qc = createClient()
  const invalidateSpy = vi.spyOn(qc, 'invalidateQueries')

  const params = {
    projetoId: 'p1',
    podeEditar: true,
    projetoSelecionado: undefined,
    snapshot: undefined,
    loadingSnap: false,
    isError: false,
    showToast,
    setAlterarSugestao,
    setConfirmExportFmt: vi.fn(),
    setExportando: vi.fn(),
    setAprovandoTodas,
    setItemReabrir,
    itemReabrir: null,
    ...overrides,
  } as Parameters<typeof useComposicaoPageActions>[0]

  const view = renderHook(() => useComposicaoPageActions(params), {
    wrapper: (props) => wrapper(qc, props),
  })
  return { view, showToast, setAlterarSugestao, setItemReabrir, setAprovandoTodas, invalidateSpy }
}

describe('useComposicaoPageActions — tratamento de erro de aprovação', () => {
  beforeEach(() => {
    aprovarMutateAsync.mockReset()
    reabrirMutateAsync.mockReset()
    gerarMutateAsync.mockReset()
    reavaliarMutateAsync.mockReset()
    // O efeito de auto-gerar dispara quando há snapshot carregado; resolve com um
    // payload válido para não poluir as asserções dos caminhos de erro.
    gerarMutateAsync.mockResolvedValue({
      geracao: { erros_etapas: [], sugestoes_descartadas_aprovadas: 0 },
    })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('onAprovar com erro genérico mostra toast de falha (sem invalidar snapshot)', async () => {
    aprovarMutateAsync.mockRejectedValue(new Error('boom'))
    const { view, showToast, invalidateSpy } = setup({ podeEditar: true })

    await act(async () => {
      await view.result.current.onAprovar('sug-1', null)
    })

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'danger', title: 'Não foi possível aprovar' })
    )
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it('onAprovar com conflito 409 invalida snapshot e mostra aviso', async () => {
    aprovarMutateAsync.mockRejectedValue(new ApiError('conflito', { status: 409 }))
    const { view, showToast, invalidateSpy } = setup({ podeEditar: true })

    await act(async () => {
      await view.result.current.onAprovar('sug-1', null)
    })

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: composicaoQueryKeys.snapshot('p1'),
      })
    )
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'warning', title: 'Composição desatualizada' })
    )
  })

  it('onReabrirItemAprovado com erro genérico mostra toast de falha', async () => {
    reabrirMutateAsync.mockRejectedValue(new Error('boom'))
    const itemReabrir = { id: 'cmp-1' } as Parameters<typeof useComposicaoPageActions>[0]['itemReabrir']
    const { view, showToast } = setup({ podeEditar: true, itemReabrir })

    await act(async () => {
      await view.result.current.onReabrirItemAprovado()
    })

    expect(reabrirMutateAsync).toHaveBeenCalledWith({ composicaoItemId: 'cmp-1' })
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'danger',
        title: 'Não foi possível reabrir item aprovado',
      })
    )
  })

  it('onAprovarTodas com erro genérico mostra toast de falha e libera flag', async () => {
    aprovarMutateAsync.mockRejectedValue(new Error('boom'))
    const snapshot = {
      sugestoes: [{ id: 'sug-1' }, { id: 'sug-2' }],
    } as Parameters<typeof useComposicaoPageActions>[0]['snapshot']
    const { view, showToast, setAprovandoTodas } = setup({ podeEditar: true, snapshot })

    await act(async () => {
      await view.result.current.onAprovarTodas()
    })

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'danger', title: 'Não foi possível aprovar todas' })
    )
    expect(setAprovandoTodas).toHaveBeenLastCalledWith(false)
  })
})
