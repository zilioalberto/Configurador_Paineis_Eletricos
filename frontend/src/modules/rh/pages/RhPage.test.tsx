import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authUser } from '@/test/factories/authUser'

const showToastMock = vi.hoisted(() => vi.fn())
const listarDepartamentosMock = vi.hoisted(() => vi.fn())
const listarCargosMock = vi.hoisted(() => vi.fn())
const listarJornadasMock = vi.hoisted(() => vi.fn())
const listarEquipesMock = vi.hoisted(() => vi.fn())
const listarColaboradoresMock = vi.hoisted(() => vi.fn())
const listarUsuariosParaVinculoMock = vi.hoisted(() => vi.fn())
const atualizarColaboradorMock = vi.hoisted(() => vi.fn())
const atualizarDepartamentoMock = vi.hoisted(() => vi.fn())
const atualizarCargoMock = vi.hoisted(() => vi.fn())
const atualizarEquipeMock = vi.hoisted(() => vi.fn())
const atualizarJornadaMock = vi.hoisted(() => vi.fn())
const criarColaboradorMock = vi.hoisted(() => vi.fn())
const criarDepartamentoMock = vi.hoisted(() => vi.fn())
const criarCargoMock = vi.hoisted(() => vi.fn())
const criarEquipeMock = vi.hoisted(() => vi.fn())
const criarJornadaMock = vi.hoisted(() => vi.fn())
const excluirColaboradorMock = vi.hoisted(() => vi.fn())
const excluirDepartamentoMock = vi.hoisted(() => vi.fn())
const excluirCargoMock = vi.hoisted(() => vi.fn())
const excluirEquipeMock = vi.hoisted(() => vi.fn())
const excluirJornadaMock = vi.hoisted(() => vi.fn())

vi.mock('@/components/feedback', () => ({
  ConfirmModal: () => null,
  useToast: () => ({ showToast: showToastMock }),
}))

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({
    user: authUser(['rh.editar']),
  }),
}))

vi.mock('../services/rhApi', () => ({
  rhApi: {
    atualizarCargo: (...args: unknown[]) => atualizarCargoMock(...args),
    atualizarColaborador: (...args: unknown[]) => atualizarColaboradorMock(...args),
    atualizarDepartamento: (...args: unknown[]) => atualizarDepartamentoMock(...args),
    atualizarEquipe: (...args: unknown[]) => atualizarEquipeMock(...args),
    atualizarJornada: (...args: unknown[]) => atualizarJornadaMock(...args),
    criarCargo: (...args: unknown[]) => criarCargoMock(...args),
    criarColaborador: (...args: unknown[]) => criarColaboradorMock(...args),
    criarDepartamento: (...args: unknown[]) => criarDepartamentoMock(...args),
    criarEquipe: (...args: unknown[]) => criarEquipeMock(...args),
    criarJornada: (...args: unknown[]) => criarJornadaMock(...args),
    excluirCargo: (...args: unknown[]) => excluirCargoMock(...args),
    excluirColaborador: (...args: unknown[]) => excluirColaboradorMock(...args),
    excluirDepartamento: (...args: unknown[]) => excluirDepartamentoMock(...args),
    excluirEquipe: (...args: unknown[]) => excluirEquipeMock(...args),
    excluirJornada: (...args: unknown[]) => excluirJornadaMock(...args),
    listarCargos: (...args: unknown[]) => listarCargosMock(...args),
    listarColaboradores: (...args: unknown[]) => listarColaboradoresMock(...args),
    listarDepartamentos: (...args: unknown[]) => listarDepartamentosMock(...args),
    listarEquipes: (...args: unknown[]) => listarEquipesMock(...args),
    listarJornadas: (...args: unknown[]) => listarJornadasMock(...args),
    listarUsuariosParaVinculo: (...args: unknown[]) => listarUsuariosParaVinculoMock(...args),
  },
}))

import RhPage from './RhPage'

const departamentoBase = {
  id: 'dep-1',
  nome: 'Engenharia',
  codigo: 'ENG',
  descricao: 'Time técnico',
  ativo: true,
}

const cargoBase = {
  id: 'cargo-1',
  nome: 'Projetista',
  descricao: 'Projetos elétricos',
  ativo: true,
}

const jornadaBase = {
  id: 'jor-1',
  nome: 'Comercial',
  carga_horaria_semanal: '44.00',
  hora_inicio: '08:00:00',
  hora_fim: '17:00:00',
  intervalo_inicio: '12:00:00',
  intervalo_fim: '13:00:00',
  dias_semana: [0, 1, 2, 3, 4],
  ativo: true,
}

const equipeBase = {
  id: 'eq-1',
  nome: 'Automação',
  departamento: 'dep-1',
  departamento_nome: 'Engenharia',
  lider: null,
  lider_nome: '',
  descricao: 'Equipe de automação',
  ativo: true,
}

const colaboradorBase = {
  id: 'col-1',
  usuario: 7,
  usuario_email: 'maria@empresa.com',
  matricula: 'M001',
  nome: 'Maria Silva',
  email: 'maria@empresa.com',
  telefone: '11999990000',
  documento: '12345678900',
  cargo: 'cargo-1',
  cargo_nome: 'Projetista',
  departamento: 'dep-1',
  departamento_nome: 'Engenharia',
  equipe: 'eq-1',
  equipe_nome: 'Automação',
  jornada: 'jor-1',
  jornada_nome: 'Comercial',
  data_admissao: '2026-01-10',
  data_demissao: null,
  ativo: true,
  observacoes: 'Alocada em projetos',
}

function setupRhPage() {
  showToastMock.mockClear()
  listarDepartamentosMock.mockResolvedValue([departamentoBase])
  listarCargosMock.mockResolvedValue([cargoBase])
  listarJornadasMock.mockResolvedValue([jornadaBase])
  listarEquipesMock.mockResolvedValue([equipeBase])
  listarColaboradoresMock.mockResolvedValue([colaboradorBase])
  listarUsuariosParaVinculoMock.mockResolvedValue([{ id: 9, email: 'novo@empresa.com', nome: 'Novo' }])
  atualizarColaboradorMock.mockImplementation(async (_id: string, payload: Record<string, unknown>) => ({
    ...colaboradorBase,
    ...payload,
  }))
  atualizarDepartamentoMock.mockImplementation(async (_id: string, payload: Record<string, unknown>) => ({
    ...departamentoBase,
    ...payload,
  }))
  atualizarCargoMock.mockResolvedValue(cargoBase)
  atualizarEquipeMock.mockResolvedValue(equipeBase)
  atualizarJornadaMock.mockResolvedValue(jornadaBase)
  criarColaboradorMock.mockResolvedValue(colaboradorBase)
  criarDepartamentoMock.mockResolvedValue(departamentoBase)
  criarCargoMock.mockResolvedValue(cargoBase)
  criarEquipeMock.mockResolvedValue(equipeBase)
  criarJornadaMock.mockResolvedValue(jornadaBase)
  excluirColaboradorMock.mockResolvedValue(undefined)
  excluirDepartamentoMock.mockResolvedValue(undefined)
  excluirCargoMock.mockResolvedValue(undefined)
  excluirEquipeMock.mockResolvedValue(undefined)
  excluirJornadaMock.mockResolvedValue(undefined)
}

function renderRhPage() {
  return render(
    <MemoryRouter>
      <RhPage />
    </MemoryRouter>
  )
}

describe('RhPage', () => {
  beforeEach(setupRhPage)

  it('carrega colaborador e salva alteracoes', async () => {
    renderRhPage()

    await screen.findByText('Maria Silva')
    fireEvent.click(screen.getAllByRole('button', { name: 'Abrir' })[0])
    fireEvent.change(screen.getByLabelText('Nome'), {
      target: { value: 'Maria Santos' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(atualizarColaboradorMock).toHaveBeenCalled())
    expect(atualizarColaboradorMock).toHaveBeenCalledWith(
      'col-1',
      expect.objectContaining({
        matricula: 'M001',
        nome: 'Maria Santos',
        departamento: 'dep-1',
      })
    )
  })

  it('alterna para departamentos e salva registro simples', async () => {
    renderRhPage()

    await screen.findByText('Maria Silva')
    fireEvent.click(screen.getByRole('button', { name: 'Departamentos' }))
    fireEvent.click(screen.getByRole('button', { name: 'Engenharia' }))
    fireEvent.change(screen.getByLabelText('Código'), {
      target: { value: 'ENG-PROJ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(atualizarDepartamentoMock).toHaveBeenCalled())
    expect(atualizarDepartamentoMock).toHaveBeenCalledWith(
      'dep-1',
      expect.objectContaining({
        nome: 'Engenharia',
        codigo: 'ENG-PROJ',
      })
    )
  })
})
