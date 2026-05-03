import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import PlaceholderOutlet from './PlaceholderOutlet'

function renderPlaceholder(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <PlaceholderOutlet />
    </MemoryRouter>
  )
}

describe('PlaceholderOutlet', () => {
  it('usa titulo conhecido pela rota atual', () => {
    renderPlaceholder('/dimensionamento')

    expect(
      screen.getByRole('heading', { name: 'Dimensionamento de condutores' })
    ).toBeInTheDocument()
    expect(screen.getByText('Página em construção.')).toBeInTheDocument()
  })

  it('usa titulo generico para rota sem cadastro', () => {
    renderPlaceholder('/rota-nova')

    expect(screen.getByRole('heading', { name: 'Página' })).toBeInTheDocument()
  })
})
