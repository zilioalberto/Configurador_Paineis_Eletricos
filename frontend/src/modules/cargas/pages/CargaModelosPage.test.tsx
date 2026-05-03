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

function selectComOpcao(value: string) {
  const select = screen
    .getAllByRole('combobox')
    .find((el) =>
      Array.from((el as HTMLSelectElement).options).some((o) => o.value === value)
    )
  expect(select).toBeTruthy()
  return select as HTMLSelectElement
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
            numero_fases: 3,
            tensao_motor: 380,
            rendimento_percentual: '85',
            fator_potencia: '0.85',
            tipo_partida: 'DIRETA',
            tipo_protecao: 'DISJUNTOR_MOTOR',
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

  it('permite cancelar edição e mostra erro ao falhar atualização', async () => {
    showToastFn.mockClear()
    atualizarModeloCarga.mockClear()
    atualizarModeloCarga.mockRejectedValueOnce(new Error('erro ao atualizar'))
    mockModelosLista([
      {
        id: 'm1',
        nome: 'Modelo Motor',
        tipo: 'MOTOR',
        payload: {
          quantidade: 2,
          motor: { tipo_protecao: 'DISJUNTOR_MOTOR_TERMICO' },
        },
        ativo: false,
      } satisfies CargaModelo,
    ])

    renderCargaModelosPage()
    expect(await screen.findByText('Modelo Motor')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Editar/i }))
    expect(screen.getByRole('heading', { name: /Editar modelo/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Cancelar edição/i }))
    expect(screen.getByRole('heading', { name: /Novo modelo/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Editar/i }))
    fireEvent.change(screen.getByPlaceholderText(/Motor trifásico/i), {
      target: { value: 'Modelo com falha' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Salvar alterações/i }))

    await waitFor(() =>
      expect(showToastFn).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'danger',
          title: 'Falha ao atualizar modelo',
        })
      )
    )
  })

  it('mostra erro ao falhar exclusão', async () => {
    showToastFn.mockClear()
    deletarModeloCarga.mockRejectedValueOnce(new Error('erro ao excluir'))
    mockModelosLista([
      {
        id: 'm-del',
        nome: 'Modelo para excluir',
        tipo: 'VALVULA',
        payload: {},
        ativo: true,
      } satisfies CargaModelo,
    ])

    renderCargaModelosPage()
    expect(await screen.findByText('Modelo para excluir')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Excluir/i }))

    await waitFor(() =>
      expect(showToastFn).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'danger',
          title: 'Falha ao excluir modelo',
        })
      )
    )
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

    const tipoSelectEl = selectComOpcao('VALVULA')
    fireEvent.change(tipoSelectEl, { target: { value: 'VALVULA' } })
    expect(await screen.findByText('Parâmetros da válvula')).toBeInTheDocument()

    fireEvent.change(tipoSelectEl, { target: { value: 'RESISTENCIA' } })
    expect(await screen.findByText('Parâmetros da resistência')).toBeInTheDocument()

    fireEvent.change(tipoSelectEl, { target: { value: 'SENSOR' } })
    expect(await screen.findByText('Parâmetros do sensor')).toBeInTheDocument()

    fireEvent.change(tipoSelectEl, { target: { value: 'TRANSDUTOR' } })
    expect(await screen.findByText('Parâmetros do transdutor')).toBeInTheDocument()
  })

  it('aplica validações de sensor para PNP/NPN e tipo de sinal', async () => {
    mockModelosLista()
    renderCargaModelosPage()

    const tipoSelectEl = selectComOpcao('SENSOR')
    fireEvent.change(tipoSelectEl, { target: { value: 'SENSOR' } })

    const tipoSinalSelect = screen
      .getAllByRole('combobox')
      .find((el) => (el as HTMLSelectElement).value === 'DIGITAL') as HTMLSelectElement
    expect(tipoSinalSelect).toBeTruthy()
    const pnpCheckbox = screen.getByLabelText('PNP') as HTMLInputElement
    const npnCheckbox = screen.getByLabelText('NPN') as HTMLInputElement

    fireEvent.click(pnpCheckbox)
    expect(pnpCheckbox.checked).toBe(true)
    expect(npnCheckbox.checked).toBe(false)

    fireEvent.click(npnCheckbox)
    expect(npnCheckbox.checked).toBe(true)
    expect(pnpCheckbox.checked).toBe(false)

    fireEvent.change(tipoSinalSelect, { target: { value: 'ANALOGICO' } })
    expect(pnpCheckbox).toBeDisabled()
    expect(npnCheckbox).toBeDisabled()
    expect(pnpCheckbox.checked).toBe(false)
    expect(npnCheckbox.checked).toBe(false)
  })

  it('configura relé de interface e feedback em válvula antes de salvar', async () => {
    showToastFn.mockClear()
    criarModeloCarga.mockClear()
    mockModelosLista()
    renderCargaModelosPage()

    fireEvent.change(screen.getByPlaceholderText(/Motor trifásico/i), {
      target: { value: 'Válvula com interface' },
    })
    fireEvent.change(selectComOpcao('VALVULA'), { target: { value: 'VALVULA' } })
    expect(await screen.findByText('Parâmetros da válvula')).toBeInTheDocument()

    fireEvent.change(selectComOpcao('RELE_INTERFACE'), {
      target: { value: 'RELE_INTERFACE' },
    })
    expect(screen.getByText('Tipo de relé de interface')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Possui feedback'))

    fireEvent.click(screen.getByRole('button', { name: /Salvar modelo/i }))

    await waitFor(() => expect(criarModeloCarga).toHaveBeenCalled())
    expect(criarModeloCarga).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'VALVULA',
        payload: expect.objectContaining({
          valvula: expect.objectContaining({
            tipo_acionamento: 'RELE_INTERFACE',
            tipo_rele_interface: 'ELETROMECANICA',
            possui_feedback: true,
          }),
        }),
      })
    )
  })

  it('configura resistência com relé e transdutor com faixa de medição', async () => {
    showToastFn.mockClear()
    criarModeloCarga.mockClear()
    mockModelosLista()
    renderCargaModelosPage()

    fireEvent.change(selectComOpcao('RESISTENCIA'), {
      target: { value: 'RESISTENCIA' },
    })
    expect(await screen.findByText('Parâmetros da resistência')).toBeInTheDocument()
    fireEvent.change(selectComOpcao('RELE_INTERFACE'), {
      target: { value: 'RELE_INTERFACE' },
    })
    expect(screen.getByText('Tipo de relé de interface')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText(/Motor trifásico/i), {
      target: { value: 'Transdutor pressão' },
    })
    fireEvent.change(selectComOpcao('TRANSDUTOR'), {
      target: { value: 'TRANSDUTOR' },
    })
    expect(await screen.findByText('Parâmetros do transdutor')).toBeInTheDocument()
    const faixaMedicao = screen
      .getAllByRole('textbox')
      .find((el) => (el as HTMLInputElement).value === '') as HTMLInputElement
    fireEvent.change(faixaMedicao, { target: { value: '0-10 bar' } })

    fireEvent.click(screen.getByRole('button', { name: /Salvar modelo/i }))

    await waitFor(() => expect(criarModeloCarga).toHaveBeenCalled())
    expect(criarModeloCarga).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: 'TRANSDUTOR',
        payload: expect.objectContaining({
          transdutor: expect.objectContaining({ faixa_medicao: '0-10 bar' }),
        }),
      })
    )
  })
})
