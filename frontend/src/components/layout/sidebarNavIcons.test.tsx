import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SidebarNavIcon } from '@/components/layout/sidebarNavIcons'

describe('SidebarNavIcon', () => {
  it('renderiza icone para rota conhecida', () => {
    const { container } = render(<SidebarNavIcon to="/projetos" />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('usa icone fallback para rota desconhecida', () => {
    const { container } = render(<SidebarNavIcon to="/rota-inexistente" />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
