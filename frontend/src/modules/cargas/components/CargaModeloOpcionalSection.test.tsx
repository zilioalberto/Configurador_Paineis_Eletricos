import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CargaModelo } from '@/modules/cargas/types/carga'

import CargaModeloOpcionalSection from './CargaModeloOpcionalSection'

const useQueryMock = vi.hoisted(() =>
  vi.fn((_options: unknown) => ({
    data: [] as CargaModelo[],
    isPending: false,
  }))
)

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}))

function makeModelo(overrides: Partial<CargaModelo> = {}): CargaModelo {
  return {
    id: 'm1',
    nome: 'Motor teste',
    tipo: 'MOTOR',
    payload: {},
    ativo: true,
    ...overrides,
  }
}

describe('CargaModeloOpcionalSection', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useQueryMock.mockClear()
    useQueryMock.mockImplementation((_options: unknown) => ({
      data: [],
      isPending: false,
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renderiza o bloco de modelo opcional', () => {
    const onAplicar = vi.fn()
    render(
      <CargaModeloOpcionalSection modeloQueryScope="test" onAplicarModelo={onAplicar} />
    )

    expect(screen.getByRole('heading', { name: /Modelo de carga \(opcional\)/i })).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(/Filtrar ou abrir a lista para ver todos/i)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Digite para filtrar no servidor ou use/i)
    ).toBeInTheDocument()
  })

  it('após buscar e clicar no modelo, onAplicarModelo é chamado de imediato', async () => {
    const modelo = makeModelo()
    useQueryMock.mockImplementation((_options: unknown) => ({
      data: [modelo],
      isPending: false,
    }))

    const onAplicar = vi.fn()
    render(
      <CargaModeloOpcionalSection modeloQueryScope="test-scope" onAplicarModelo={onAplicar} />
    )

    const input = screen.getByPlaceholderText(/Filtrar ou abrir a lista para ver todos/i)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'mo' } })
    await act(async () => {
      vi.advanceTimersByTime(350)
    })

    expect(screen.getByText('Motor teste')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Motor teste/i }))

    expect(onAplicar).toHaveBeenCalledTimes(1)
    expect(onAplicar).toHaveBeenCalledWith(modelo)

    expect(
      useQueryMock.mock.calls.some((call) => {
        const opts = call[0] as unknown as { queryKey?: readonly string[] }
        return opts.queryKey?.join('|') === 'cargas|modelos|test-scope|mo'
      })
    ).toBe(true)
  })

  it('Enter na lista aplica modelo diretamente', async () => {
    const modelo = makeModelo({ id: 'm2', nome: 'Valvula X', tipo: 'VALVULA' })
    useQueryMock.mockImplementation((_options: unknown) => ({
      data: [modelo],
      isPending: false,
    }))

    const onAplicar = vi.fn()
    render(
      <CargaModeloOpcionalSection modeloQueryScope="test" onAplicarModelo={onAplicar} />
    )

    const input = screen.getByPlaceholderText(/Filtrar ou abrir a lista para ver todos/i)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'va' } })
    await act(async () => {
      vi.advanceTimersByTime(350)
    })

    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    expect(onAplicar).toHaveBeenCalledWith(modelo)
  })
})
