import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { catalogoQueryKeys } from '../catalogoQueryKeys'
import { fornecedoresAtivosQueryKey, useFornecedoresAtivosQuery } from './useFornecedoresAtivosQuery'
import { useCategoriaListQuery } from './useCategoriaListQuery'
import { useProdutoDetailQuery } from './useProdutoDetailQuery'
import {
  useCreateProdutoMutation,
  useDeleteProdutoMutation,
  useUpdateProdutoMutation,
} from './useProdutoMutations'

const listarCategoriasProduto = vi.hoisted(() => vi.fn())
const listarFornecedoresAtivos = vi.hoisted(() => vi.fn())
const obterProduto = vi.hoisted(() => vi.fn())
const criarProduto = vi.hoisted(() => vi.fn())
const atualizarProduto = vi.hoisted(() => vi.fn())
const excluirProduto = vi.hoisted(() => vi.fn())

vi.mock('../services/categoriaService', () => ({
  listarCategoriasProduto: () => listarCategoriasProduto(),
}))

vi.mock('../services/parceirosFornecedorService', () => ({
  listarFornecedoresAtivos: () => listarFornecedoresAtivos(),
}))

vi.mock('../services/produtoService', () => ({
  obterProduto: (...args: unknown[]) => obterProduto(...args),
  criarProduto: (...args: unknown[]) => criarProduto(...args),
  atualizarProduto: (...args: unknown[]) => atualizarProduto(...args),
  excluirProduto: (...args: unknown[]) => excluirProduto(...args),
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

describe('hooks do catálogo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('carrega categorias pela query key do catálogo', async () => {
    listarCategoriasProduto.mockResolvedValue([{ id: 'cat1' }])

    const { result } = renderHook(() => useCategoriaListQuery(), {
      wrapper: (props) => wrapper(createClient(), props),
    })

    await waitFor(() => expect(result.current.data).toEqual([{ id: 'cat1' }]))
    expect(listarCategoriasProduto).toHaveBeenCalled()
  })

  it('respeita enabled em fornecedores ativos', async () => {
    listarFornecedoresAtivos.mockResolvedValue([{ id: 'for1' }])
    const client = createClient()

    const disabled = renderHook(() => useFornecedoresAtivosQuery(false), {
      wrapper: (props) => wrapper(client, props),
    })
    expect(disabled.result.current.fetchStatus).toBe('idle')
    expect(listarFornecedoresAtivos).not.toHaveBeenCalled()

    const enabled = renderHook(() => useFornecedoresAtivosQuery(true), {
      wrapper: (props) => wrapper(client, props),
    })
    await waitFor(() => expect(enabled.result.current.data).toEqual([{ id: 'for1' }]))
    expect(client.getQueryData(fornecedoresAtivosQueryKey)).toEqual([{ id: 'for1' }])
  })

  it('carrega detalhe de produto somente com id', async () => {
    obterProduto.mockResolvedValue({ id: 'p1' })

    const disabled = renderHook(() => useProdutoDetailQuery(undefined), {
      wrapper: (props) => wrapper(createClient(), props),
    })
    expect(disabled.result.current.fetchStatus).toBe('idle')
    expect(obterProduto).not.toHaveBeenCalled()

    const enabled = renderHook(() => useProdutoDetailQuery('p1'), {
      wrapper: (props) => wrapper(createClient(), props),
    })
    await waitFor(() => expect(enabled.result.current.data).toEqual({ id: 'p1' }))
    expect(obterProduto).toHaveBeenCalledWith('p1')
  })

  it('cria e atualiza produto invalidando catálogo e cacheando detalhe', async () => {
    const client = createClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    criarProduto.mockResolvedValue({ id: 'novo', codigo: 'N' })
    atualizarProduto.mockResolvedValue({ id: 'novo', codigo: 'A' })

    const create = renderHook(() => useCreateProdutoMutation(), {
      wrapper: (props) => wrapper(client, props),
    })
    await create.result.current.mutateAsync({ codigo: 'N' })
    expect(criarProduto).toHaveBeenCalledWith({ codigo: 'N' })
    expect(client.getQueryData(catalogoQueryKeys.produto('novo'))).toEqual({
      id: 'novo',
      codigo: 'N',
    })

    const update = renderHook(() => useUpdateProdutoMutation(), {
      wrapper: (props) => wrapper(client, props),
    })
    await update.result.current.mutateAsync({ id: 'novo', body: { codigo: 'A' } })
    expect(atualizarProduto).toHaveBeenCalledWith('novo', { codigo: 'A' })
    expect(client.getQueryData(catalogoQueryKeys.produto('novo'))).toEqual({
      id: 'novo',
      codigo: 'A',
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: catalogoQueryKeys.all })
  })

  it('exclui produto removendo cache de detalhe', async () => {
    const client = createClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    client.setQueryData(catalogoQueryKeys.produto('p1'), { id: 'p1' })
    excluirProduto.mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteProdutoMutation(), {
      wrapper: (props) => wrapper(client, props),
    })

    await result.current.mutateAsync('p1')

    expect(excluirProduto).toHaveBeenCalledWith('p1')
    expect(client.getQueryData(catalogoQueryKeys.produto('p1'))).toBeUndefined()
    expect(invalidate).toHaveBeenCalledWith({ queryKey: catalogoQueryKeys.all })
  })
})
