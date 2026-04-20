import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockLogin = vi.fn()
const mockNavigate = vi.fn()

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    status: 'ready',
    login: mockLogin,
    logout: vi.fn(),
  }),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null, pathname: '/login', key: 'k' }),
  }
})

import LoginPage from '@/modules/auth/pages/LoginPage'

describe('LoginPage', () => {
  beforeEach(() => {
    mockLogin.mockReset()
    mockNavigate.mockReset()
    mockLogin.mockResolvedValue(undefined)
  })

  it('submete credenciais e navega após login', async () => {
    render(<LoginPage />)
    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: '  u@test.com  ' } })
    fireEvent.change(screen.getByLabelText(/Senha/i), { target: { value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }))
    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith('u@test.com', 'secret')
    )
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }))
  })

  it('mostra mensagem quando login falha', async () => {
    const { ApiError } = await import('@/services/http/ApiError')
    mockLogin.mockRejectedValueOnce(new ApiError('Credenciais inválidas.', { status: 401 }))
    render(<LoginPage />)
    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText(/Senha/i), { target: { value: 'bad' } })
    fireEvent.click(screen.getByRole('button', { name: /Entrar/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Credenciais inválidas'))
  })
})
