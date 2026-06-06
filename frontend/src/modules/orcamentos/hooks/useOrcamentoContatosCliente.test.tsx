import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const listarContatosClienteMock = vi.fn()

vi.mock('../services/orcamentosApi', () => ({
  listarContatosCliente: (...args: unknown[]) => listarContatosClienteMock(...args),
}))

import {
  contatoIdValidoParaLista,
  useOrcamentoContatosCliente,
} from './useOrcamentoContatosCliente'
import type { ContatoClienteDto } from '../types/orcamentos'

function contatoCliente(partial: Pick<ContatoClienteDto, 'id' | 'nome'>): ContatoClienteDto {
  return {
    parceiro: 'par-1',
    cargo: '',
    email: '',
    telefone: '',
    principal: false,
    observacoes: '',
    ...partial,
  }
}

describe('contatoIdValidoParaLista', () => {
  it('mantém id quando existe na lista', () => {
    expect(contatoIdValidoParaLista('c1', [contatoCliente({ id: 'c1', nome: 'Ana' })])).toBe('c1')
  })

  it('limpa id inválido ou vazio', () => {
    expect(contatoIdValidoParaLista('c2', [contatoCliente({ id: 'c1', nome: 'Ana' })])).toBe('')
    expect(contatoIdValidoParaLista('', [contatoCliente({ id: 'c1', nome: 'Ana' })])).toBe('')
  })
})

describe('useOrcamentoContatosCliente', () => {
  const showToast = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('limpa contatos quando clienteId está vazio', () => {
    const onContatosCarregados = vi.fn()
    const { result } = renderHook(() =>
      useOrcamentoContatosCliente('', showToast, onContatosCarregados)
    )

    expect(result.current).toEqual([])
    expect(onContatosCarregados).toHaveBeenCalledWith([])
    expect(listarContatosClienteMock).not.toHaveBeenCalled()
  })

  it('carrega contatos do cliente', async () => {
    const contatos = [contatoCliente({ id: 'c1', nome: 'Ana' })]
    listarContatosClienteMock.mockResolvedValueOnce(contatos)
    const onContatosCarregados = vi.fn()

    const { result } = renderHook(() =>
      useOrcamentoContatosCliente('cli-1', showToast, onContatosCarregados)
    )

    await waitFor(() => expect(result.current).toEqual(contatos))
    expect(listarContatosClienteMock).toHaveBeenCalledWith('cli-1')
    expect(onContatosCarregados).toHaveBeenCalledWith(contatos)
  })

  it('avisa em falha e limpa contatos', async () => {
    listarContatosClienteMock.mockRejectedValueOnce(new Error('rede'))
    const onContatosCarregados = vi.fn()

    const { result } = renderHook(() =>
      useOrcamentoContatosCliente('cli-2', showToast, onContatosCarregados)
    )

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith({
        variant: 'warning',
        title: 'Contatos',
        message: 'Não foi possível carregar os contatos do cliente.',
      })
    )
    expect(result.current).toEqual([])
    expect(onContatosCarregados).toHaveBeenCalledWith([])
  })

  it('ignora resposta após desmontagem', async () => {
    let resolve: (value: unknown) => void = () => undefined
    listarContatosClienteMock.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r
      })
    )

    const { unmount } = renderHook(() => useOrcamentoContatosCliente('cli-3', showToast))

    unmount()

    await act(async () => {
      resolve([contatoCliente({ id: 'c1', nome: 'Ana' })])
    })

    expect(showToast).not.toHaveBeenCalled()
  })
})
