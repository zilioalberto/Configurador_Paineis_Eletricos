import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { authUser } from '@/test/factories/authUser'

const useAuthMock = vi.hoisted(() => vi.fn())
const useDashboardResumoQueryMock = vi.hoisted(() => vi.fn())

vi.mock('@/modules/auth/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

vi.mock('@/modules/dashboard/hooks/useDashboardResumoQuery', () => ({
  useDashboardResumoQuery: () => useDashboardResumoQueryMock(),
}))

import DashboardPage from '@/modules/dashboard/pages/DashboardPage'

const resumoMock = {
  projetos: { total: 2, em_andamento: 1, finalizados: 1 },
  composicao: { pendencias_abertas: 3, sugestoes_pendentes: 4 },
  catalogo: { produtos_ativos: 10 },
  cargas: { total: 9 },
  projetos_recentes: [
    {
      id: 'p-1',
      codigo: '04001-26',
      nome: 'Projeto',
      status: 'EM_ANDAMENTO',
      status_display: 'Em andamento',
      atualizado_em: new Date().toISOString(),
    },
  ],
}

function setupDashboardPage(permissoes: string[] = []) {
  useAuthMock.mockReturnValue({ user: authUser(permissoes, { email: 'a@b.com' }) })
  useDashboardResumoQueryMock.mockReturnValue({
    data: resumoMock,
    isPending: false,
    isError: false,
    error: null,
    isFetching: false,
    refetch: vi.fn(),
  })
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  )
}

describe('DashboardPage', () => {
  it('esconde links sem permissao correspondente', () => {
    setupDashboardPage()

    expect(screen.getByText('Projetos ativos')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Abrir composição/i })).not.toBeInTheDocument()
  })

  it('mostra links quando ha permissao', () => {
    setupDashboardPage([
      'projeto.visualizar',
      'material.visualizar_lista',
      'almoxarifado.visualizar_tarefas',
    ])

    expect(screen.getByRole('link', { name: /Abrir composição/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Gerir catálogo/i })).toBeInTheDocument()
  })
})
