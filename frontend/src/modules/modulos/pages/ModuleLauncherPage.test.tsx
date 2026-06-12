import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { authUser } from '@/test/factories/authUser'

const useAuthMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

import ModuleLauncherPage from './ModuleLauncherPage'

describe('ModuleLauncherPage', () => {
  it('mostra o configurador de painéis quando o usuario tem permissao do modulo', () => {
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
    const orcamentosHeading = screen.getByRole('heading', { name: 'Orçamentos' })
    const orcamentosCard = orcamentosHeading.closest('article')
    expect(orcamentosCard).toHaveClass('module-card--planned')
    expect(orcamentosCard).toHaveTextContent('Planejado')
    expect(
      within(orcamentosCard as HTMLElement).getByRole('link', {
        name: 'Ver estrutura de Orçamentos',
      })
    ).toHaveAttribute('href', '/erp/orcamentos')
  })

  it('mostra fiscal quando o usuario tem fiscal.visualizar', () => {
    useAuthMock.mockReturnValue({
      user: authUser(['fiscal.visualizar'], { email: 'user@example.com' }),
    })

    render(
      <MemoryRouter>
        <ModuleLauncherPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: 'Fiscal' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Acessar Fiscal' })).toHaveAttribute('href', '/fiscal')
  })

  it('nao mostra fiscal apenas com permissao de catalogo', () => {
    useAuthMock.mockReturnValue({
      user: authUser(['material.visualizar_lista'], { email: 'user@example.com' }),
    })

    render(
      <MemoryRouter>
        <ModuleLauncherPage />
      </MemoryRouter>
    )

    expect(screen.queryByRole('link', { name: 'Acessar Fiscal' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver estrutura de Fiscal' })).toHaveAttribute(
      'href',
      '/fiscal'
    )
  })

  it('mostra tarefas quando o usuario tem permissao do Kanban', () => {
    useAuthMock.mockReturnValue({
      user: authUser(['tarefa.visualizar'], { email: 'user@example.com' }),
    })

    render(
      <MemoryRouter>
        <ModuleLauncherPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: 'Tarefas' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Acessar Tarefas' })).toHaveAttribute(
      'href',
      '/tarefas'
    )
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
