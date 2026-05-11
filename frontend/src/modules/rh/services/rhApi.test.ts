import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMock = vi.hoisted(() => vi.fn())
const postMock = vi.hoisted(() => vi.fn())
const patchMock = vi.hoisted(() => vi.fn())
const deleteMock = vi.hoisted(() => vi.fn())

vi.mock('@/services/apiClient', () => ({
  default: {
    get: getMock,
    post: postMock,
    patch: patchMock,
    delete: deleteMock,
  },
}))

import { rhApi } from './rhApi'

describe('rhApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lista colaboradores com filtros', async () => {
    getMock.mockResolvedValueOnce({
      data: { results: [{ id: 'c-1', nome: 'Ana', matricula: '001' }] },
    })

    await expect(
      rhApi.listarColaboradores({ ativo: '1', search: 'Ana', departamento: 'd-1' })
    ).resolves.toHaveLength(1)

    expect(getMock).toHaveBeenCalledWith('/rh/colaboradores/', {
      params: {
        ativo: '1',
        search: 'Ana',
        departamento: 'd-1',
        page_size: 500,
      },
    })
  })

  it('cria e atualiza departamento', async () => {
    const payload = { nome: 'Engenharia', codigo: 'ENG', descricao: '', ativo: true }
    postMock.mockResolvedValueOnce({ data: { id: 'd-1', ...payload } })
    patchMock.mockResolvedValueOnce({ data: { id: 'd-1', ...payload, ativo: false } })

    await expect(rhApi.criarDepartamento(payload)).resolves.toMatchObject({ id: 'd-1' })
    await expect(rhApi.atualizarDepartamento('d-1', { ativo: false })).resolves.toMatchObject({
      ativo: false,
    })

    expect(postMock).toHaveBeenCalledWith('/rh/departamentos/', payload)
    expect(patchMock).toHaveBeenCalledWith('/rh/departamentos/d-1/', { ativo: false })
  })

  it('gerencia cargo, equipe, jornada e colaborador', async () => {
    postMock
      .mockResolvedValueOnce({ data: { id: 'cargo-1', nome: 'Projetista' } })
      .mockResolvedValueOnce({ data: { id: 'j-1', nome: 'Comercial' } })
      .mockResolvedValueOnce({ data: { id: 'e-1', nome: 'Projetos' } })
      .mockResolvedValueOnce({ data: { id: 'col-1', nome: 'Ana', matricula: '001' } })
    deleteMock.mockResolvedValue({})

    await expect(
      rhApi.criarCargo({ nome: 'Projetista', descricao: '', ativo: true })
    ).resolves.toMatchObject({ id: 'cargo-1' })
    await expect(
      rhApi.criarJornada({
        nome: 'Comercial',
        carga_horaria_semanal: '44.00',
        dias_semana: [0, 1, 2, 3, 4],
        ativo: true,
      })
    ).resolves.toMatchObject({ id: 'j-1' })
    await expect(
      rhApi.criarEquipe({ nome: 'Projetos', departamento: null, lider: null, ativo: true })
    ).resolves.toMatchObject({ id: 'e-1' })
    await expect(
      rhApi.criarColaborador({ matricula: '001', nome: 'Ana', ativo: true })
    ).resolves.toMatchObject({ id: 'col-1' })
    await expect(rhApi.excluirColaborador('col-1')).resolves.toBeUndefined()

    expect(postMock).toHaveBeenNthCalledWith(1, '/rh/cargos/', {
      nome: 'Projetista',
      descricao: '',
      ativo: true,
    })
    expect(postMock).toHaveBeenNthCalledWith(2, '/rh/jornadas/', {
      nome: 'Comercial',
      carga_horaria_semanal: '44.00',
      dias_semana: [0, 1, 2, 3, 4],
      ativo: true,
    })
    expect(postMock).toHaveBeenNthCalledWith(3, '/rh/equipes/', {
      nome: 'Projetos',
      departamento: null,
      lider: null,
      ativo: true,
    })
    expect(postMock).toHaveBeenNthCalledWith(4, '/rh/colaboradores/', {
      matricula: '001',
      nome: 'Ana',
      ativo: true,
    })
    expect(deleteMock).toHaveBeenCalledWith('/rh/colaboradores/col-1/')
  })

  it('lista utilizadores para vínculo ao colaborador', async () => {
    getMock.mockResolvedValueOnce({
      data: [{ id: 3, email: 'a@x.com', nome: 'Ana' }],
    })

    await expect(
      rhApi.listarUsuariosParaVinculo({ colaborador: 'uuid-col-1', search: 'ana' })
    ).resolves.toHaveLength(1)

    expect(getMock).toHaveBeenCalledWith('/rh/colaboradores/usuarios-vinculo/', {
      params: { colaborador: 'uuid-col-1', search: 'ana' },
    })
  })
})
