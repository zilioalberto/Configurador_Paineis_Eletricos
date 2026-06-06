import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { authUser } from '@/test/factories/authUser'

const useAuthMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

import RequireAnyPermission from './RequireAnyPermission'

function renderWithRoutes() {
  return render(
    <MemoryRouter initialEntries={['/restrito']}>
      <Routes>
        <Route
          path="/restrito"
          element={
            <RequireAnyPermission permissions={['erp.ver', 'fiscal.ver']}>
              <span>Conteúdo autorizado</span>
            </RequireAnyPermission>
          }
        />
        <Route path="/" element={<span>Início</span>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RequireAnyPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mostra carregamento enquanto auth não está pronto', () => {
    useAuthMock.mockReturnValue({ status: 'loading', user: null })

    const { container } = renderWithRoutes()

    expect(screen.getByRole('status', { hidden: true })).toHaveTextContent('Carregando')
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
  })

  it('renderiza filhos quando usuário tem uma das permissões', () => {
    useAuthMock.mockReturnValue({
      status: 'ready',
      user: authUser(['fiscal.ver']),
    })

    renderWithRoutes()

    expect(screen.getByText('Conteúdo autorizado')).toBeInTheDocument()
  })

  it('redireciona quando usuário não tem nenhuma permissão', () => {
    useAuthMock.mockReturnValue({
      status: 'ready',
      user: authUser([]),
    })

    renderWithRoutes()

    expect(screen.getByText('Início')).toBeInTheDocument()
  })
})
