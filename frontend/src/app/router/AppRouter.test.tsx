import { render, screen, waitFor } from '@testing-library/react'
import { Outlet } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/modules/auth/RequireAuth', () => ({
  default: () => <Outlet />,
}))

vi.mock('@/components/layout/MainLayout', () => ({
  default: () => (
    <main>
      <Outlet />
    </main>
  ),
}))

vi.mock('@/modules/auth/pages/LoginPage', () => ({
  default: () => <span>Página de login</span>,
}))

vi.mock('@/app/navigation', () => ({
  appChildRoutes: [
    { path: '/', element: <span>Dashboard mock</span> },
    { path: '/catalogo', element: <span>Catálogo mock</span> },
  ],
}))

import AppRouter from './AppRouter'

describe('AppRouter', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('renderiza rota filha dentro do layout autenticado', () => {
    window.history.pushState({}, '', '/catalogo')

    render(<AppRouter />)

    expect(screen.getByText('Catálogo mock')).toBeInTheDocument()
  })

  it('renderiza página de login preguiçosa', async () => {
    window.history.pushState({}, '', '/login')

    render(<AppRouter />)

    await waitFor(() => {
      expect(screen.getByText('Página de login')).toBeInTheDocument()
    })
  })
})
