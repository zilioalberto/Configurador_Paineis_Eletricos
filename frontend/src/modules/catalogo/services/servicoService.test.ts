import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMock = vi.fn()
const postMock = vi.fn()
const putMock = vi.fn()
const deleteMock = vi.fn()

vi.mock('@/services/apiClient', () => ({
  default: {
    get: (...a: unknown[]) => getMock(...a),
    post: (...a: unknown[]) => postMock(...a),
    put: (...a: unknown[]) => putMock(...a),
    delete: (...a: unknown[]) => deleteMock(...a),
  },
}))

import {
  atualizarServico,
  buscarServicosAutocomplete,
  criarServico,
  excluirServico,
  listarServicos,
  obterServico,
} from './servicoService'

describe('servicoService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('listarServicos normaliza paginação DRF', async () => {
    getMock.mockResolvedValueOnce({
      data: {
        count: 2,
        next: null,
        previous: null,
        results: [{ id: 's1', codigo: 'SRV-1' }],
      },
    })
    const page = await listarServicos(1, 50)
    expect(page.items).toHaveLength(1)
    expect(page.total).toBe(2)
    expect(getMock).toHaveBeenCalledWith('/catalogo/servicos/', {
      params: { page: 1, page_size: 50 },
    })
  })

  it('buscarServicosAutocomplete exige mínimo de caracteres', async () => {
    expect(await buscarServicosAutocomplete('a')).toEqual([])
    getMock.mockResolvedValueOnce({ data: [{ id: 's1', codigo: 'SRV' }] })
    await buscarServicosAutocomplete('mont', 1)
    expect(getMock).toHaveBeenCalledWith('/catalogo/servicos/', { params: { search: 'mont' } })
  })

  it('CRUD de serviço', async () => {
    getMock.mockResolvedValueOnce({ data: { id: 's1', codigo: 'SRV-1' } })
    postMock.mockResolvedValueOnce({ data: { id: 's2', codigo: 'SRV-2' } })
    putMock.mockResolvedValueOnce({ data: { id: 's1', codigo: 'SRV-1', descricao: 'Novo' } })
    deleteMock.mockResolvedValueOnce({})

    await expect(obterServico('s1')).resolves.toMatchObject({ id: 's1' })
    await expect(criarServico({ codigo: 'SRV-2' })).resolves.toMatchObject({ id: 's2' })
    await expect(atualizarServico('s1', { descricao: 'Novo' })).resolves.toMatchObject({
      descricao: 'Novo',
    })
    await expect(excluirServico('s1')).resolves.toBeUndefined()
  })
})
