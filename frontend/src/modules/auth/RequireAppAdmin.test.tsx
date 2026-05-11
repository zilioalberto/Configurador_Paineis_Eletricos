import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authUser } from '@/test/factories/authUser'

const useAuthMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

import RequireAppAdmin from './RequireAppAdmin'

function renderAdminGuard() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route
          path="/admin"
          element={
            <RequireAppAdmin>
              <span>Área administrativa</span>
            </RequireAppAdmin>
          }
        />
        <Route path="/" element={<span>Início</span>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RequireAppAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mostra carregamento enquanto autenticação não está pronta', () => {
    useAuthMock.mockReturnValue({ status: 'loading', user: null })

    const { container } = renderAdminGuard()

    expect(screen.getByRole('status', { hidden: true })).toHaveTextContent('Carregando')
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
  })

  it('renderiza filhos para superusuário', () => {
    useAuthMock.mockReturnValue({
      status: 'ready',
      user: authUser([], { is_superuser: true }),
    })

    renderAdminGuard()

    expect(screen.getByText('Área administrativa')).toBeInTheDocument()
  })

  it('renderiza filhos para tipo ADMIN', () => {
    useAuthMock.mockReturnValue({
      status: 'ready',
      user: authUser([], { tipo_usuario: 'ADMIN' }),
    })

    renderAdminGuard()

    expect(screen.getByText('Área administrativa')).toBeInTheDocument()
  })

  it('redireciona usuário comum', () => {
    useAuthMock.mockReturnValue({
      status: 'ready',
      user: authUser([]),
    })

    renderAdminGuard()

    expect(screen.getByText('Início')).toBeInTheDocument()
  })
})
