import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { CargaModelo } from '@/modules/cargas/types/carga'

const listarModelosCarga = vi.hoisted(() =>
  vi.fn((): Promise<CargaModelo[]> => Promise.resolve([]))
)
const criarModeloCarga = vi.hoisted(() =>
  vi.fn((): Promise<CargaModelo> =>
    Promise.resolve({
      id: 'm1',
      nome: 'X',
      tipo: 'MOTOR',
      payload: {},
      ativo: true,
    })
  )
)
const atualizarModeloCarga = vi.hoisted(() =>
  vi.fn((): Promise<CargaModelo> =>
    Promise.resolve({
      id: 'm1',
      nome: 'X',
      tipo: 'MOTOR',
      payload: {},
      ativo: true,
    })
  )
)
const deletarModeloCarga = vi.hoisted(() => vi.fn(() => Promise.resolve()))

vi.mock('@/modules/cargas/services/cargaService', () => ({
  listarModelosCarga,
  criarModeloCarga,
  atualizarModeloCarga,
  deletarModeloCarga,
}))

const showToastFn = vi.hoisted(() => vi.fn())

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastFn }),
}))

import CargaModelosPage from '@/modules/cargas/pages/CargaModelosPage'

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

function renderCargaModelosPage() {
  return render(<CargaModelosPage />, { wrapper })
}

function mockModelosLista(modelos: CargaModelo[] = []) {
  listarModelosCarga.mockResolvedValue(modelos)
}

describe('CargaModelosPage', () => {
  it('lista modelos e avisa quando nome está vazio ao gravar', async () => {
    showToastFn.mockClear()
    mockModelosLista([
      {
        id: 'mm',
        nome: 'Modelo A',
        tipo: 'MOTOR',
        payload: { quantidade: 1 },
        ativo: true,
      } satisfies CargaModelo,
    ])

    renderCargaModelosPage()

    expect(await screen.findByRole('heading', { name: /Modelos de carga/i })).toBeInTheDocument()
    expect(await screen.findByText('Modelo A')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Salvar modelo/i }))
    expect(showToastFn).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'warning',
        message: expect.stringContaining('nome'),
      })
    )
    expect(criarModeloCarga).not.toHaveBeenCalled()
  })

  it('cria modelo quando nome preenchido', async () => {
    showToastFn.mockClear()
    criarModeloCarga.mockClear()
    mockModelosLista()

    renderCargaModelosPage()

    fireEvent.change(screen.getByPlaceholderText(/Motor trifásico/i), {
      target: { value: 'Novo modelo' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Salvar modelo/i }))

    await waitFor(() => expect(criarModeloCarga).toHaveBeenCalled())
    expect(showToastFn).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'success' })
    )
  })

  it('edita modelo existente e depois exclui', async () => {
    showToastFn.mockClear()
    atualizarModeloCarga.mockClear()
    deletarModeloCarga.mockClear()
    mockModelosLista([
      {
        id: 'm1',
        nome: 'Modelo Motor',
        tipo: 'MOTOR',
        payload: {
          quantidade: 1,
          motor: {
            potencia_corrente_valor: '2',
            potencia_corrente_unidade: 'CV',
            rendimento_percentual: '85',
            fator_potencia: '0.85',
            tipo_partida: 'DIRETA',
            tipo_protecao: 'DISJUNTOR_MOTOR',
            tipo_conexao_painel: 'CONEXAO_BORNES_COM_PE',
            tempo_partida_s: '',
            reversivel: false,
            freio_motor: false,
          },
        },
        ativo: true,
      } satisfies CargaModelo,
    ])

    renderCargaModelosPage()
    expect(await screen.findByText('Modelo Motor')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Editar/i }))
    fireEvent.change(screen.getByPlaceholderText(/Motor trifásico/i), {
      target: { value: 'Modelo Motor v2' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Salvar alterações/i }))

    await waitFor(() => expect(atualizarModeloCarga).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('button', { name: /Excluir/i }))
    await waitFor(() => expect(deletarModeloCarga).toHaveBeenCalledWith('m1'))
  })

  it('mostra toast de erro ao falhar criação', async () => {
    criarModeloCarga.mockRejectedValueOnce(new Error('erro ao criar'))
    showToastFn.mockClear()
    mockModelosLista()

    renderCargaModelosPage()
    fireEvent.change(screen.getByPlaceholderText(/Motor trifásico/i), {
      target: { value: 'Modelo com falha' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Salvar modelo/i }))

    await waitFor(() =>
      expect(showToastFn).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'danger',
          title: 'Falha ao criar modelo',
        })
      )
    )
  })

  it('alterna tipo e renderiza blocos específicos', async () => {
    mockModelosLista()
    renderCargaModelosPage()

    const tipoSelect = screen
      .getAllByRole('combobox')
      .find((el) => (el as HTMLSelectElement).querySelector('option[value="VALVULA"]'))
    expect(tipoSelect).toBeTruthy()
    const tipoSelectEl = tipoSelect as HTMLElement
    fireEvent.change(tipoSelectEl, { target: { value: 'VALVULA' } })
    expect(await screen.findByText('Parâmetros da válvula')).toBeInTheDocument()

    fireEvent.change(tipoSelectEl, { target: { value: 'RESISTENCIA' } })
    expect(await screen.findByText('Parâmetros da resistência')).toBeInTheDocument()

    fireEvent.change(tipoSelectEl, { target: { value: 'SENSOR' } })
    expect(await screen.findByText('Parâmetros do sensor')).toBeInTheDocument()

    fireEvent.change(tipoSelectEl, { target: { value: 'TRANSDUTOR' } })
    expect(await screen.findByText('Parâmetros do transdutor')).toBeInTheDocument()
  })
})
