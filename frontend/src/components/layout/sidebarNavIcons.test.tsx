import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SidebarNavIcon } from '@/components/layout/sidebarNavIcons'

describe('SidebarNavIcon', () => {
  it.each([
    '/',
    '/projetos',
    '/cargas',
    '/cargas/modelos',
    '/catalogo',
    '/dimensionamento',
    '/composicao',
    '/administracao/utilizadores',
  ])('renderiza ícone para rota conhecida: %s', (to) => {
    const { container } = render(<SidebarNavIcon to={to} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    expect(svg?.getAttribute('class')).toContain('app-sidebar-nav-icon')
  })

  it('usa icone fallback para rota desconhecida', () => {
    const { container } = render(<SidebarNavIcon to="/rota-inexistente" />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
