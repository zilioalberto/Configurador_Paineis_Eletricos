import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SidebarMenuGroup } from './SidebarMenuGroup'

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(globalThis, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
}

function renderMenu(initialEntry = '/cadastros/clientes') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <SidebarMenuGroup
        id="cadastros"
        label="Cadastros"
        children={[
          { label: 'Clientes', to: '/cadastros/clientes' },
          { label: 'Fornecedores', to: '/cadastros/fornecedores' },
        ]}
      />
    </MemoryRouter>
  )
}

describe('SidebarMenuGroup', () => {
  beforeEach(() => {
    mockMatchMedia(false)
  })

  it('marca grupo ativo quando a rota pertence a um filho', () => {
    renderMenu()

    expect(screen.getByRole('button', { name: /Cadastros/i })).toHaveClass('active')
  })

  it('abre submenu por clique em dispositivos sem hover e fecha ao navegar', () => {
    renderMenu('/cadastros')

    fireEvent.click(screen.getByRole('button', { name: /Cadastros/i }))
    expect(screen.getByRole('link', { name: /Clientes/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: /Clientes/i }))
    expect(screen.queryByRole('link', { name: /Clientes/i })).not.toBeInTheDocument()
  })

  it('abre por hover quando o dispositivo oferece hover', () => {
    mockMatchMedia(true)
    renderMenu('/cadastros')

    fireEvent.mouseEnter(screen.getByRole('button', { name: /Cadastros/i }))

    expect(screen.getByRole('link', { name: /Fornecedores/i })).toBeInTheDocument()
  })
})
