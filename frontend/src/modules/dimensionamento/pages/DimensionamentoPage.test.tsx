import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import DimensionamentoPage from '@/modules/dimensionamento/pages/DimensionamentoPage'

function renderDimensionamentoRedirect(initialEntry: string, destinationText: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/dimensionamento" element={<DimensionamentoPage />} />
        <Route path="/projetos" element={<div>{destinationText}</div>} />
        <Route
          path="/projetos/:id/fluxo/dimensionamento"
          element={<div>{destinationText}</div>}
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('DimensionamentoPage', () => {
  it('redireciona para lista de projetos sem projeto na query', () => {
    renderDimensionamentoRedirect('/dimensionamento', 'Lista projetos')

    expect(screen.getByText('Lista projetos')).toBeInTheDocument()
  })

  it('redireciona para fluxo de dimensionamento com projeto na query', () => {
    renderDimensionamentoRedirect('/dimensionamento?projeto=p1', 'Wizard dimensionamento')

    expect(screen.getByText('Wizard dimensionamento')).toBeInTheDocument()
  })

  it('mantem compatibilidade da rota antiga com id codificado', () => {
    renderDimensionamentoRedirect('/dimensionamento?projeto=abc-123', 'Wizard dimensionamento')

    expect(screen.getByText('Wizard dimensionamento')).toBeInTheDocument()
  })
})
