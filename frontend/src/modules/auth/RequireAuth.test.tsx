import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMock = vi.fn()

vi.mock('@/services/apiClient', () => ({
  default: { get: (...args: unknown[]) => getMock(...args) },
}))

vi.mock('@/modules/auth/refreshAccessToken', () => ({
  refreshAccessToken: vi.fn().mockResolvedValue('x'),
}))

import { AuthProvider } from '@/modules/auth/AuthContext'
import RequireAuth from '@/modules/auth/RequireAuth'
import { tokenStorage } from '@/modules/auth/tokenStorage'

function Child() {
  return <div>rota-protegida</div>
}

describe('RequireAuth', () => {
  beforeEach(() => {
    tokenStorage.clear()
    getMock.mockReset()
  })

  it('mostra verificação de sessão enquanto o contexto está a carregar', async () => {
    getMock.mockImplementation(() => new Promise(() => {}))
    tokenStorage.setTokens('a', 'r')
    render(
      <MemoryRouter initialEntries={['/x']}>
        <AuthProvider>
          <Routes>
            <Route element={<RequireAuth />}>
              <Route path="/x" element={<Child />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getAllByText(/A verificar sessão/i).length).toBeGreaterThan(0)
    })
  })

  it('renderiza rotas filhas quando há utilizador', async () => {
    tokenStorage.setTokens('a', 'r')
    getMock.mockResolvedValue({
      data: { email: 'a@b.com', first_name: '', last_name: '', tipo_usuario: 'ADM' },
    })
    render(
      <MemoryRouter initialEntries={['/x']}>
        <AuthProvider>
          <Routes>
            <Route element={<RequireAuth />}>
              <Route path="/x" element={<Child />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.getByText('rota-protegida')).toBeInTheDocument())
  })

  it('redireciona para login sem utilizador', async () => {
    render(
      <MemoryRouter initialEntries={['/x']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>página-login</div>} />
            <Route element={<RequireAuth />}>
              <Route path="/x" element={<Child />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    )
    await waitFor(() => expect(screen.getByText('página-login')).toBeInTheDocument())
  })
})
