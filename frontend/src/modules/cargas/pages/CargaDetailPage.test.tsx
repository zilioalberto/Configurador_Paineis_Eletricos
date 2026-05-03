import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useParams = vi.hoisted(() => vi.fn(() => ({ id: 'c1' })))
const useCargaDetailQuery = vi.hoisted(() => vi.fn())
const useProjetoListQuery = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams,
  }
})

vi.mock('@/modules/cargas/hooks/useCargaDetailQuery', () => ({
  useCargaDetailQuery: (id: string | undefined) => useCargaDetailQuery(id),
}))

vi.mock('@/modules/projetos/hooks/useProjetoListQuery', () => ({
  useProjetoListQuery: () => useProjetoListQuery(),
}))

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      email: 'a@test.com',
      tipo_usuario: 'ADMIN',
      permissoes: [],
    },
  }),
}))

import CargaDetailPage from '@/modules/cargas/pages/CargaDetailPage'

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const baseProjeto = {
  id: 'p1',
  nome: 'Proj',
  codigo: 'P-1',
  status: 'EM_ANDAMENTO',
}

function renderPage(initial = '/cargas/c1', locationState?: { from: string }) {
  const entries =
    locationState !== undefined
      ? [{ pathname: initial, state: locationState }]
      : [initial]
  return render(
    <MemoryRouter initialEntries={entries}>
      <CargaDetailPage />
    </MemoryRouter>,
    { wrapper }
  )
}

describe('CargaDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useParams.mockReturnValue({ id: 'c1' })
    useProjetoListQuery.mockReturnValue({
      data: [baseProjeto],
      isPending: false,
    })
  })

  it('mostra alerta quando id ausente', () => {
    useParams.mockReturnValue({} as { id: string })
    useCargaDetailQuery.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
    })
    renderPage('/cargas/')
    expect(screen.getByText('Carga não informada.')).toBeInTheDocument()
  })

  it('mostra carregando', () => {
    useCargaDetailQuery.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
    })
    renderPage()
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('mostra erro', () => {
    useCargaDetailQuery.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('falha api'),
    })
    renderPage()
    expect(screen.getByText('falha api')).toBeInTheDocument()
  })

  it('renderiza bloco motor com formatação', () => {
    useCargaDetailQuery.mockReturnValue({
      data: {
        id: 'c1',
        projeto: 'p1',
        projeto_codigo: 'P-1',
        projeto_nome: 'Proj',
        tag: 'M1',
        descricao: 'MOTOR 1',
        tipo: 'MOTOR',
        tipo_display: 'Motor',
        quantidade: 1,
        local_instalacao: '',
        observacoes: '',
        exige_protecao: true,
        exige_seccionamento: false,
        exige_comando: true,
        quantidade_entradas_digitais: 0,
        quantidade_entradas_analogicas: 0,
        quantidade_saidas_digitais: 0,
        quantidade_saidas_analogicas: 0,
        quantidade_entradas_rapidas: 0,
        ativo: true,
        motor: {
          potencia_corrente_valor: '1',
          potencia_corrente_unidade: 'CV',
          potencia_kw_calculada: '0.735',
          corrente_calculada_a: '2.5',
          rendimento_percentual: '90',
          fator_potencia: '0.85',
          tipo_partida: 'DIRETA',
          tipo_protecao: 'DISJUNTOR_MOTOR',
          numero_fases: 3,
          tensao_motor: 380,
          reversivel: true,
          freio_motor: false,
        },
      },
      isPending: false,
      isError: false,
      error: null,
    })
    renderPage()
    expect(screen.getByRole('heading', { name: 'Motor' })).toBeInTheDocument()
    expect(screen.getByText(/0\.735/)).toBeInTheDocument()
    expect(screen.getByText(/2\.50 A/)).toBeInTheDocument()
  })

  it('renderiza resistência', () => {
    useCargaDetailQuery.mockReturnValue({
      data: {
        id: 'c1',
        projeto: 'p1',
        projeto_codigo: 'P-1',
        projeto_nome: 'Proj',
        tag: 'R1',
        descricao: 'R',
        tipo: 'RESISTENCIA',
        tipo_display: 'Resistência',
        quantidade: 1,
        local_instalacao: '',
        observacoes: '',
        exige_protecao: true,
        exige_seccionamento: false,
        exige_comando: false,
        quantidade_entradas_digitais: 0,
        quantidade_entradas_analogicas: 0,
        quantidade_saidas_digitais: 0,
        quantidade_saidas_analogicas: 0,
        quantidade_entradas_rapidas: 0,
        ativo: true,
        resistencia: {
          numero_fases: 3,
          tensao_resistencia: 380,
          potencia_kw: '10.50',
          tipo_protecao: 'DISJUNTOR_MOTOR',
          tipo_acionamento: 'CONTATOR',
          tipo_conexao_painel: 'CONEXAO_BORNES_COM_PE',
        },
      },
      isPending: false,
      isError: false,
      error: null,
    })
    renderPage()
    expect(screen.getByRole('heading', { name: 'Resistência' })).toBeInTheDocument()
    expect(screen.getByText(/10\.50 kW/)).toBeInTheDocument()
    expect(screen.getByText('Conexão a bornes com PE')).toBeInTheDocument()
  })

  it('renderiza válvula', () => {
    useParams.mockReturnValue({ id: 'c2' })
    useCargaDetailQuery.mockReturnValue({
      data: {
        id: 'c2',
        projeto: 'p1',
        projeto_codigo: 'P-1',
        projeto_nome: 'Proj',
        tag: 'Y1',
        descricao: 'V',
        tipo: 'VALVULA',
        tipo_display: 'Válvula',
        quantidade: 1,
        local_instalacao: '',
        observacoes: '',
        exige_protecao: false,
        exige_seccionamento: false,
        exige_comando: false,
        quantidade_entradas_digitais: 0,
        quantidade_entradas_analogicas: 0,
        quantidade_saidas_digitais: 0,
        quantidade_saidas_analogicas: 0,
        quantidade_entradas_rapidas: 0,
        ativo: true,
        valvula: {
          tipo_valvula: 'SOLENOIDE',
          possui_feedback: true,
        },
      },
      isPending: false,
      isError: false,
      error: null,
    })
    renderPage('/cargas/c2')
    expect(screen.getByRole('heading', { name: 'Válvula' })).toBeInTheDocument()
  })

  it('renderiza sensor (PNP e corrente CC)', () => {
    useCargaDetailQuery.mockReturnValue({
      data: {
        id: 'c1',
        projeto: 'p1',
        projeto_codigo: 'P-1',
        projeto_nome: 'Proj',
        tag: 'S1',
        descricao: 'S',
        tipo: 'SENSOR',
        tipo_display: 'Sensor',
        quantidade: 1,
        local_instalacao: '',
        observacoes: '',
        exige_protecao: false,
        exige_seccionamento: false,
        exige_comando: false,
        quantidade_entradas_digitais: 0,
        quantidade_entradas_analogicas: 0,
        quantidade_saidas_digitais: 0,
        quantidade_saidas_analogicas: 0,
        quantidade_entradas_rapidas: 0,
        ativo: true,
        sensor: {
          tipo_sensor: 'INDUTIVO',
          tipo_sinal: 'DIGITAL',
          tipo_sinal_analogico: null,
          tensao_alimentacao: 24,
          tipo_corrente: 'CC',
          corrente_consumida_ma: '12.5',
          quantidade_fios: 3,
          pnp: true,
          npn: false,
          normalmente_aberto: true,
          normalmente_fechado: false,
        },
      },
      isPending: false,
      isError: false,
      error: null,
    })
    renderPage()
    expect(screen.getByRole('heading', { name: 'Sensor' })).toBeInTheDocument()
    expect(screen.getByText('Corrente contínua (CC)')).toBeInTheDocument()
    expect(screen.getByText(/12\.50 mA/)).toBeInTheDocument()
  })

  it('renderiza transdutor (corrente CA)', () => {
    useParams.mockReturnValue({ id: 'c3' })
    useCargaDetailQuery.mockReturnValue({
      data: {
        id: 'c3',
        projeto: 'p1',
        projeto_codigo: 'P-1',
        projeto_nome: 'Proj',
        tag: 'T1',
        descricao: 'T',
        tipo: 'TRANSDUTOR',
        tipo_display: 'Transdutor',
        quantidade: 1,
        local_instalacao: '',
        observacoes: '',
        exige_protecao: false,
        exige_seccionamento: false,
        exige_comando: false,
        quantidade_entradas_digitais: 0,
        quantidade_entradas_analogicas: 0,
        quantidade_saidas_digitais: 0,
        quantidade_saidas_analogicas: 0,
        quantidade_entradas_rapidas: 0,
        ativo: true,
        transdutor: {
          tipo_transdutor: 'PRESSAO',
          tipo_sinal_analogico: '4-20mA',
          faixa_medicao: '0-10 bar',
          tensao_alimentacao: 24,
          tipo_corrente: 'CA',
          corrente_consumida_ma: '20',
          quantidade_fios: 2,
        },
      },
      isPending: false,
      isError: false,
      error: null,
    })
    renderPage('/cargas/c3')
    expect(screen.getByRole('heading', { name: 'Transdutor' })).toBeInTheDocument()
    expect(screen.getByText('Corrente alternada (CA)')).toBeInTheDocument()
  })

  it('link Fechar aponta para lista filtrada pelo projeto da carga', () => {
    useCargaDetailQuery.mockReturnValue({
      data: {
        id: 'c1',
        projeto: 'p1',
        projeto_codigo: 'P-1',
        projeto_nome: 'Proj',
        tag: 'M1',
        descricao: 'M',
        tipo: 'MOTOR',
        tipo_display: 'Motor',
        quantidade: 1,
        local_instalacao: '',
        observacoes: '',
        exige_protecao: true,
        exige_seccionamento: false,
        exige_comando: false,
        quantidade_entradas_digitais: 0,
        quantidade_entradas_analogicas: 0,
        quantidade_saidas_digitais: 0,
        quantidade_saidas_analogicas: 0,
        quantidade_entradas_rapidas: 0,
        ativo: true,
        motor: {
          potencia_corrente_valor: '1',
          potencia_corrente_unidade: 'CV',
          potencia_kw_calculada: null,
          corrente_calculada_a: null,
          rendimento_percentual: null,
          fator_potencia: null,
          tipo_partida: 'DIRETA',
          tipo_protecao: 'DISJUNTOR_MOTOR',
          numero_fases: 3,
          tensao_motor: 380,
          reversivel: false,
          freio_motor: false,
        },
      },
      isPending: false,
      isError: false,
      error: null,
    })
    renderPage()
    const fechar = screen.getByRole('link', { name: 'Fechar' })
    expect(fechar).toHaveAttribute('href', '/cargas?projeto=p1')
  })

  it('link Fechar prioriza state.from vindo da listagem', () => {
    useCargaDetailQuery.mockReturnValue({
      data: {
        id: 'c1',
        projeto: 'p1',
        projeto_codigo: 'P-1',
        projeto_nome: 'Proj',
        tag: 'M1',
        descricao: 'M',
        tipo: 'MOTOR',
        tipo_display: 'Motor',
        quantidade: 1,
        local_instalacao: '',
        observacoes: '',
        exige_protecao: true,
        exige_seccionamento: false,
        exige_comando: false,
        quantidade_entradas_digitais: 0,
        quantidade_entradas_analogicas: 0,
        quantidade_saidas_digitais: 0,
        quantidade_saidas_analogicas: 0,
        quantidade_entradas_rapidas: 0,
        ativo: true,
        motor: {
          potencia_corrente_valor: '1',
          potencia_corrente_unidade: 'CV',
          potencia_kw_calculada: null,
          corrente_calculada_a: null,
          rendimento_percentual: null,
          fator_potencia: null,
          tipo_partida: 'DIRETA',
          tipo_protecao: 'DISJUNTOR_MOTOR',
          numero_fases: 3,
          tensao_motor: 380,
          reversivel: false,
          freio_motor: false,
        },
      },
      isPending: false,
      isError: false,
      error: null,
    })
    renderPage('/cargas/c1', { from: '/cargas?projeto=outro-id' })
    const fechar = screen.getByRole('link', { name: 'Fechar' })
    expect(fechar).toHaveAttribute('href', '/cargas?projeto=outro-id')
  })

  it('link editar quando projeto editável', () => {
    useCargaDetailQuery.mockReturnValue({
      data: {
        id: 'c1',
        projeto: 'p1',
        projeto_codigo: 'P-1',
        projeto_nome: 'Proj',
        tag: 'M1',
        descricao: 'M',
        tipo: 'MOTOR',
        tipo_display: 'Motor',
        quantidade: 1,
        local_instalacao: '',
        observacoes: '',
        exige_protecao: true,
        exige_seccionamento: false,
        exige_comando: false,
        quantidade_entradas_digitais: 0,
        quantidade_entradas_analogicas: 0,
        quantidade_saidas_digitais: 0,
        quantidade_saidas_analogicas: 0,
        quantidade_entradas_rapidas: 0,
        ativo: true,
        motor: {
          potencia_corrente_valor: '1',
          potencia_corrente_unidade: 'CV',
          potencia_kw_calculada: null,
          corrente_calculada_a: null,
          rendimento_percentual: null,
          fator_potencia: null,
          tipo_partida: 'DIRETA',
          tipo_protecao: 'DISJUNTOR_MOTOR',
          numero_fases: 3,
          tensao_motor: 380,
          reversivel: false,
          freio_motor: false,
        },
      },
      isPending: false,
      isError: false,
      error: null,
    })
    renderPage()
    const edit = screen.getByRole('link', { name: 'Editar' })
    expect(edit).toHaveAttribute('href', '/cargas/c1/editar')
  })
})
