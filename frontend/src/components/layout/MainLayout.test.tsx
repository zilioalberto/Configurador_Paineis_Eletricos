import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./Header', () => ({
  default: ({
    mobileNavOpen,
    onOpenMobileNav,
  }: {
    mobileNavOpen: boolean
    onOpenMobileNav: () => void
  }) => (
    <header>
      <button type="button" onClick={onOpenMobileNav}>
        abrir
      </button>
      {mobileNavOpen ? 'aberto' : 'fechado'}
    </header>
  ),
}))

vi.mock('./Sidebar', () => ({
  default: ({
    mobileOpen,
    onNavigate,
  }: {
    mobileOpen: boolean
    onNavigate: () => void
  }) => (
    <aside>
      <span>{mobileOpen ? 'sidebar-aberto' : 'sidebar-fechado'}</span>
      <button type="button" onClick={onNavigate}>
        nav
      </button>
    </aside>
  ),
}))

vi.mock('./AppFooter', () => ({
  default: () => <footer>Rodape</footer>,
}))

import MainLayout from '@/components/layout/MainLayout'

describe('MainLayout', () => {
  it('renderiza shell com outlet e fallback de children', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<span>Pagina filha</span>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(document.querySelector('.app-shell')).toBeTruthy()
    expect(screen.getByText('Pagina filha')).toBeInTheDocument()
    expect(screen.getByText('Rodape')).toBeInTheDocument()
  })
})
