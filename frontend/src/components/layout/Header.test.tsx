import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const mockLogout = vi.fn()

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      email: 'dev@test.com',
      first_name: 'Dev',
      last_name: 'User',
      tipo_usuario: 'ADMIN',
    },
    status: 'ready',
    login: vi.fn(),
    logout: mockLogout,
  }),
}))

import Header from '@/components/layout/Header'

describe('Header', () => {
  it('nao exibe o botao de atalhos', () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route path="*" element={<Header />} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.queryByRole('button', { name: /Atalhos/i })).not.toBeInTheDocument()
  })

  it('abre menu de utilizador e chama logout em Sair', async () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route path="*" element={<Header />} />
        </Routes>
      </MemoryRouter>
    )
    fireEvent.click(screen.getByRole('button', { name: /Olá/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Sair$/i }))
    expect(mockLogout).toHaveBeenCalled()
  })
})
