import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { authUser } from '@/test/factories/authUser'

const useAuthMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

import ModuleLauncherPage from './ModuleLauncherPage'

describe('ModuleLauncherPage', () => {
  it('mostra o configurador quando o usuario tem permissao do modulo', () => {
    useAuthMock.mockReturnValue({
      user: authUser(['projeto.visualizar'], { email: 'user@example.com' }),
    })

    render(
      <MemoryRouter>
        <ModuleLauncherPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Portal ZFW')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Central de módulos' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Configurador de painéis' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Acessar Configurador de painéis' })).toHaveAttribute(
      'href',
      '/dashboard'
    )
    expect(screen.getByRole('heading', { name: 'Orçamentos' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Planejado' })[0]).toBeDisabled()
  })

  it('informa quando nao ha modulo liberado e mantem roadmap visivel', () => {
    useAuthMock.mockReturnValue({
      user: authUser([], { email: 'user@example.com' }),
    })

    render(
      <MemoryRouter>
        <ModuleLauncherPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Nenhum módulo liberado para o seu usuário.'
    )
    expect(screen.getByRole('heading', { name: 'Roadmap do ERP' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'CRM' })).toBeInTheDocument()
  })
})
