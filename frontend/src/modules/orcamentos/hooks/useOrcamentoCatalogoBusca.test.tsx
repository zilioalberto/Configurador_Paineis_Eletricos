import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const buscarProdutosAutocompleteMock = vi.fn()

vi.mock('@/modules/catalogo/services/produtoService', () => ({
  buscarProdutosAutocomplete: (...args: unknown[]) => buscarProdutosAutocompleteMock(...args),
}))

import { ORCAMENTO_CATALOGO_MIN_CHARS, useOrcamentoCatalogoBusca } from './useOrcamentoCatalogoBusca'

describe('useOrcamentoCatalogoBusca', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    buscarProdutosAutocompleteMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('não busca com menos de 2 caracteres', async () => {
    const { result } = renderHook(() => useOrcamentoCatalogoBusca('a'))
    await act(async () => {
      vi.advanceTimersByTime(400)
    })
    expect(result.current.itens).toEqual([])
    expect(buscarProdutosAutocompleteMock).not.toHaveBeenCalled()
    expect(result.current.minChars).toBe(ORCAMENTO_CATALOGO_MIN_CHARS)
  })

  it('busca após debounce e limpa resultados em erro', async () => {
    buscarProdutosAutocompleteMock.mockResolvedValueOnce([{ id: 'p1', codigo: 'X' }])
    const { result, rerender } = renderHook(({ termo }) => useOrcamentoCatalogoBusca(termo), {
      initialProps: { termo: 'ab' },
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(350)
    })
    expect(result.current.itens).toHaveLength(1)

    buscarProdutosAutocompleteMock.mockRejectedValueOnce(new Error('fail'))
    rerender({ termo: 'cont' })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350)
    })
    expect(result.current.itens).toEqual([])

    act(() => result.current.limparResultados())
    expect(result.current.itens).toEqual([])
    expect(result.current.aberto).toBe(false)
  })
})
