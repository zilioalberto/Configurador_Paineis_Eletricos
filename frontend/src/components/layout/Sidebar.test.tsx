import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

const useAuthMock = vi.hoisted(() => vi.fn())
const appMenuItemsMock = vi.hoisted(() => [
  { to: '/', label: 'Dashboard', order: 0 },
  { to: '/admin', label: 'Admin', order: 1, requiresAppAdmin: true },
  { to: '/privado', label: 'Privado', order: 2, requiresPermission: 'x.y' },
])

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@/app/navigation', () => ({
  appMenuItems: appMenuItemsMock,
}))

vi.mock('@/components/layout/sidebarNavIcons', () => ({
  SidebarNavIcon: () => <span data-testid="icon" />,
}))

import Sidebar from '@/components/layout/Sidebar'

describe('Sidebar', () => {
  it('oculta itens sem permissao', () => {
    useAuthMock.mockReturnValue({
      user: { email: 'u@test.com', first_name: '', last_name: '', tipo_usuario: 'USUARIO' },
    })
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )
    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Admin/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Privado/i })).not.toBeInTheDocument()
  })

  it('exibe item com permissao efetiva', () => {
    useAuthMock.mockReturnValue({
      user: {
        email: 'u@test.com',
        first_name: '',
        last_name: '',
        tipo_usuario: 'USUARIO',
        permissoes: ['x.y'],
      },
    })
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    )
    expect(screen.getByRole('link', { name: /Privado/i })).toBeInTheDocument()
  })
})
