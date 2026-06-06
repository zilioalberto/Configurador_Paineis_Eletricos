import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const showToastMock = vi.hoisted(() => vi.fn())
const mutateAsyncMock = vi.hoisted(() => vi.fn())
const navigateMock = vi.hoisted(() => vi.fn())

vi.mock('@/components/feedback', () => ({
  useToast: () => ({ showToast: showToastMock }),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('../hooks/useServicoMutations', () => ({
  useCreateServicoMutation: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}))

import ServicoCreatePage from './ServicoCreatePage'

describe('ServicoCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mutateAsyncMock.mockResolvedValue({ id: 's-new' })
  })

  it('cria serviço e navega para edição', async () => {
    render(
      <MemoryRouter>
        <ServicoCreatePage />
      </MemoryRouter>
    )

    fireEvent.change(screen.getByLabelText(/código/i), { target: { value: 'SRV-1' } })
    fireEvent.change(screen.getByLabelText(/descrição/i), { target: { value: 'Montagem' } })
    fireEvent.click(screen.getByRole('button', { name: /criar serviço/i }))

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalled())
    expect(navigateMock).toHaveBeenCalledWith('/catalogo/servicos/s-new/editar')
    expect(showToastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'success' }))
  })
})
