import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useServicoDetailQueryMock = vi.hoisted(() => vi.fn())
const mutateAsyncMock = vi.hoisted(() => vi.fn())
const showToastMock = vi.hoisted(() => vi.fn())

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

vi.mock('../hooks/useServicoDetailQuery', () => ({
  useServicoDetailQuery: (...args: unknown[]) => useServicoDetailQueryMock(...args),
}))

vi.mock('../hooks/useServicoMutations', () => ({
  useUpdateServicoMutation: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}))

import ServicoEditPage from './ServicoEditPage'

describe('ServicoEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useServicoDetailQueryMock.mockReturnValue({
      data: {
        id: 's-1',
        codigo: 'SRV-1',
        descricao: 'Instalação',
        categoria: '',
        unidade_medida: 'UN',
        preco_base: '100.00',
        ativo: true,
      },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
  })

  it('renderiza formulário com dados do serviço', async () => {
    render(
      <MemoryRouter initialEntries={['/catalogo/servicos/s-1/editar']}>
        <Routes>
          <Route path="/catalogo/servicos/:id/editar" element={<ServicoEditPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByDisplayValue('SRV-1')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Instalação')).toBeInTheDocument()
  })

  it('mostra erro quando serviço não carrega', () => {
    useServicoDetailQueryMock.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('Não encontrado'),
      refetch: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/catalogo/servicos/s-1/editar']}>
        <Routes>
          <Route path="/catalogo/servicos/:id/editar" element={<ServicoEditPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Não encontrado')).toBeInTheDocument()
  })
})
